import { Injectable } from '@nestjs/common';
import { AttachmentStatus } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  ATTACHMENT_STORAGE_DIR,
  AllowedMime,
  MAX_ATTACHMENT_SIZE_BYTES,
  MIME_EXTENSION_MAP,
} from './purchase-attachments.constants';

interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class PurchaseAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    this.ensureStorageDir();
  }

  private ensureStorageDir() {
    if (!fs.existsSync(ATTACHMENT_STORAGE_DIR)) {
      fs.mkdirSync(ATTACHMENT_STORAGE_DIR, { recursive: true });
    }
  }

  async upload(purchaseId: string, file: UploadedFile | undefined, userId: string) {
    if (!file || !file.buffer) {
      throw AppError.badRequest('No file provided in the request', 'NO_FILE_PROVIDED');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as AllowedMime)) {
      throw AppError.badRequest(
        `Unsupported file type "${file.mimetype}". Allowed: PDF, JPG, PNG, WEBP.`,
        'UNSUPPORTED_FILE_TYPE',
      );
    }

    const originalExt = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(originalExt)) {
      throw AppError.badRequest(
        `Unsupported file extension "${originalExt}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}.`,
        'UNSUPPORTED_FILE_EXTENSION',
      );
    }

    if (file.size <= 0 || file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw AppError.badRequest(
        `File size ${file.size} exceeds maximum of ${MAX_ATTACHMENT_SIZE_BYTES} bytes.`,
        'FILE_TOO_LARGE',
      );
    }

    const purchase = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseId },
      select: { id: true, supplierId: true, poNumber: true },
    });
    if (!purchase) throw AppError.notFound('Purchase order not found', 'PO_NOT_FOUND');

    const safeExt = MIME_EXTENSION_MAP[file.mimetype as AllowedMime];
    const storedFileName = `${crypto.randomUUID()}${safeExt}`;

    // Make sure the join stays inside the storage dir — defence in depth
    // against any future code path that touches stored_file_name.
    const fullPath = path.resolve(ATTACHMENT_STORAGE_DIR, storedFileName);
    if (!fullPath.startsWith(ATTACHMENT_STORAGE_DIR + path.sep)) {
      throw AppError.badRequest('Invalid storage path', 'INVALID_STORAGE_PATH');
    }

    this.ensureStorageDir();

    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    fs.writeFileSync(fullPath, file.buffer);

    const safeOriginalName = path.basename(file.originalname).slice(0, 255);

    const attachment = await this.prisma.purchaseAttachment.create({
      data: {
        purchaseOrderId: purchase.id,
        supplierId: purchase.supplierId,
        originalFileName: safeOriginalName,
        storedFileName,
        storagePath: ATTACHMENT_STORAGE_DIR,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileHash,
        uploadedByUserId: userId,
        status: AttachmentStatus.ACTIVE,
      },
      include: {
        uploadedBy: { select: { id: true, username: true } },
        supplier: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, poNumber: true } },
      },
    });

    await this.auditService.log({
      userId,
      action: 'PURCHASE_ATTACHMENT_UPLOADED',
      tableName: 'purchase_attachments',
      recordId: attachment.id,
      newValues: {
        attachmentId: attachment.id,
        purchaseOrderId: purchase.id,
        poNumber: purchase.poNumber,
        supplierId: purchase.supplierId,
        originalFileName: safeOriginalName,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileHash,
      },
    });

    return this.toPublic(attachment);
  }

  async listForPurchase(purchaseId: string) {
    const purchase = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseId },
      select: { id: true },
    });
    if (!purchase) throw AppError.notFound('Purchase order not found', 'PO_NOT_FOUND');

    const attachments = await this.prisma.purchaseAttachment.findMany({
      where: { purchaseOrderId: purchaseId, status: AttachmentStatus.ACTIVE },
      include: {
        uploadedBy: { select: { id: true, username: true } },
        supplier: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, poNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return attachments.map((a) => this.toPublic(a));
  }

  async getDownloadable(purchaseId: string, attachmentId: string, userId: string) {
    const attachment = await this.prisma.purchaseAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        purchaseOrder: { select: { id: true, poNumber: true } },
      },
    });
    if (!attachment || attachment.status !== AttachmentStatus.ACTIVE) {
      throw AppError.notFound('Attachment not found', 'ATTACHMENT_NOT_FOUND');
    }
    if (attachment.purchaseOrderId !== purchaseId) {
      throw AppError.notFound('Attachment does not belong to this purchase', 'ATTACHMENT_MISMATCH');
    }

    // Re-resolve the on-disk path from the trusted constant + stored name
    // (never use the DB storagePath directly for path joining).
    const fullPath = path.resolve(ATTACHMENT_STORAGE_DIR, attachment.storedFileName);
    if (!fullPath.startsWith(ATTACHMENT_STORAGE_DIR + path.sep)) {
      throw AppError.badRequest('Invalid storage path', 'INVALID_STORAGE_PATH');
    }
    if (!fs.existsSync(fullPath)) {
      throw AppError.notFound('Stored file is missing on disk', 'FILE_MISSING');
    }

    await this.auditService.log({
      userId,
      action: 'PURCHASE_ATTACHMENT_DOWNLOADED',
      tableName: 'purchase_attachments',
      recordId: attachment.id,
      newValues: {
        attachmentId: attachment.id,
        purchaseOrderId: attachment.purchaseOrderId,
        poNumber: attachment.purchaseOrder.poNumber,
        originalFileName: attachment.originalFileName,
      },
    });

    return {
      fullPath,
      mimeType: attachment.mimeType,
      originalFileName: attachment.originalFileName,
      fileSize: attachment.fileSize,
    };
  }

  private toPublic(a: any) {
    return {
      id: a.id,
      purchaseOrderId: a.purchaseOrderId,
      supplierId: a.supplierId,
      originalFileName: a.originalFileName,
      mimeType: a.mimeType,
      fileSize: a.fileSize,
      uploadedByUserId: a.uploadedByUserId,
      uploadedBy: a.uploadedBy ? { id: a.uploadedBy.id, username: a.uploadedBy.username } : null,
      supplier: a.supplier ?? null,
      purchaseOrder: a.purchaseOrder ?? null,
      status: a.status,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }
}
