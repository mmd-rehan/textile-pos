import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as fs from 'fs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { MAX_ATTACHMENT_SIZE_BYTES } from './purchase-attachments.constants';
import { PurchaseAttachmentsService } from './purchase-attachments.service';

interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('purchases/:purchaseId/attachments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseAttachmentsController {
  constructor(private readonly service: PurchaseAttachmentsService) {}

  @Post()
  @RequirePermissions('purchases.attach_invoice')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
    }),
  )
  async upload(
    @Param('purchaseId') purchaseId: string,
    @UploadedFile() file: MulterFile,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.service.upload(purchaseId, file, user.id);
    return { data };
  }

  @Get()
  @RequirePermissions('purchases.view_attachment')
  async list(@Param('purchaseId') purchaseId: string) {
    const data = await this.service.listForPurchase(purchaseId);
    return { data };
  }

  @Get(':attachmentId/download')
  @RequirePermissions('purchases.download_attachment')
  async download(
    @Param('purchaseId') purchaseId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: { id: string },
    @Res() res: Response,
  ) {
    const file = await this.service.getDownloadable(purchaseId, attachmentId, user.id);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.fileSize.toString());
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.originalFileName)}"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = fs.createReadStream(file.fullPath);
    stream.pipe(res);
  }
}
