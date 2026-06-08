import { Injectable } from '@nestjs/common';
import { Prisma, WastageSourceType } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { createPaginatedResponse } from '../../common/utils/response';
import { PrismaService } from '../../database/prisma.service';
import { ManualWastageDto } from './dto/manual-wastage.dto';
import { QueryWastageDto } from './dto/query-wastage.dto';

const WASTAGE_INCLUDE = {
  product: { select: { id: true, name: true, productCode: true } },
  roll: { select: { id: true, rollNumber: true, barcode: true } },
  unit: { select: { id: true, name: true, abbreviation: true } },
  user: { select: { id: true, username: true } },
  responsibleUser: { select: { id: true, username: true } },
  saleInvoice: { select: { id: true, invoiceNumber: true } },
  rollReconciliation: { select: { id: true, reconciliationResult: true } },
} as const;

@Injectable()
export class WastageService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryWastageDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: Prisma.WastageEntryWhereInput = {};
    if (query.userId) where.userId = query.userId;
    if (query.responsibleUserId) where.responsibleUserId = query.responsibleUserId;
    if (query.rollId) where.rollId = query.rollId;
    if (query.productId) where.productId = query.productId;
    if (query.sourceType) where.sourceType = query.sourceType;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const to = new Date(query.dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.wastageEntry.findMany({
        where,
        include: WASTAGE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.wastageEntry.count({ where }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findByRoll(rollId: string) {
    const entries = await this.prisma.wastageEntry.findMany({
      where: { rollId },
      include: WASTAGE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return { data: entries };
  }

  async getSummary(dateFrom?: string, dateTo?: string, sourceType?: WastageSourceType) {
    const where: Prisma.WastageEntryWhereInput = {};
    if (sourceType) where.sourceType = sourceType;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const entries = await this.prisma.wastageEntry.findMany({
      where,
      select: {
        quantity: true,
        sourceType: true,
        productId: true,
        product: { select: { name: true, productCode: true } },
      },
    });

    let total = new Prisma.Decimal(0);
    let saleOvercut = new Prisma.Decimal(0);
    let manualDamage = new Prisma.Decimal(0);
    let manualWastage = new Prisma.Decimal(0);
    let reconciliationLoss = new Prisma.Decimal(0);

    const productMap = new Map<string, { productId: string; name: string; productCode: string; total: Prisma.Decimal }>();

    for (const e of entries) {
      const qty = new Prisma.Decimal(e.quantity.toString());
      total = total.plus(qty);
      if (e.sourceType === 'SALE_OVERCUT') saleOvercut = saleOvercut.plus(qty);
      else if (e.sourceType === 'MANUAL_DAMAGE') manualDamage = manualDamage.plus(qty);
      else if (e.sourceType === 'MANUAL_WASTAGE') manualWastage = manualWastage.plus(qty);
      else if (e.sourceType === 'RECONCILIATION_LOSS') reconciliationLoss = reconciliationLoss.plus(qty);

      const existing = productMap.get(e.productId);
      if (existing) {
        existing.total = existing.total.plus(qty);
      } else {
        productMap.set(e.productId, {
          productId: e.productId,
          name: e.product.name,
          productCode: e.product.productCode,
          total: qty,
        });
      }
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => (b.total.greaterThan(a.total) ? 1 : -1))
      .slice(0, 5)
      .map((p) => ({ ...p, total: p.total.toFixed(4) }));

    return {
      data: {
        entryCount: entries.length,
        totalWastageYard: total.toFixed(4),
        saleOvercutWastageYard: saleOvercut.toFixed(4),
        manualDamageWastageYard: manualDamage.toFixed(4),
        manualWastageYard: manualWastage.toFixed(4),
        reconciliationLossYard: reconciliationLoss.toFixed(4),
        topProductsByWastage: topProducts,
      },
    };
  }

  async getUserWastageSummary(dateFrom?: string, dateTo?: string, sourceType?: WastageSourceType) {
    const where: Prisma.WastageEntryWhereInput = {};
    if (sourceType) where.sourceType = sourceType;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const entries = await this.prisma.wastageEntry.findMany({
      where,
      select: {
        userId: true,
        quantity: true,
        sourceType: true,
        user: { select: { id: true, username: true } },
        unit: { select: { abbreviation: true } },
      },
    });

    const byUser = new Map<
      string,
      { userId: string; username: string; totalEntries: number; totalQuantity: Prisma.Decimal; unit: string }
    >();

    for (const e of entries) {
      const qty = new Prisma.Decimal(e.quantity.toString());
      const existing = byUser.get(e.userId);
      if (existing) {
        existing.totalEntries++;
        existing.totalQuantity = existing.totalQuantity.plus(qty);
      } else {
        byUser.set(e.userId, {
          userId: e.userId,
          username: e.user.username,
          totalEntries: 1,
          totalQuantity: qty,
          unit: e.unit.abbreviation,
        });
      }
    }

    return {
      data: Array.from(byUser.values())
        .sort((a, b) => (b.totalQuantity.greaterThan(a.totalQuantity) ? 1 : -1))
        .map((u) => ({ ...u, totalQuantity: u.totalQuantity.toFixed(4) })),
    };
  }

  async createManual(dto: ManualWastageDto, createdByUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const roll = await tx.roll.findUnique({
        where: { id: dto.rollId },
        include: { product: true },
      });
      if (!roll) throw AppError.notFound('Roll not found', 'ROLL_NOT_FOUND');

      if (roll.status === 'SOLD' || roll.status === 'FINISHED') {
        throw AppError.badRequest(
          `Cannot record wastage on a roll with status ${roll.status}`,
          'ROLL_NOT_ACTIVE',
        );
      }

      if (!dto.reason?.trim()) {
        throw AppError.badRequest('Reason is required for manual wastage', 'REASON_REQUIRED');
      }

      // Find the unit by abbreviation or name (case-insensitive via normalization)
      const unitSearch = dto.unit.toLowerCase();
      const unit = await tx.unit.findFirst({
        where: {
          OR: [
            { abbreviation: unitSearch },
            { name: unitSearch },
            { abbreviation: dto.unit },
            { name: dto.unit },
          ],
        },
      });
      if (!unit) throw AppError.badRequest(`Unit "${dto.unit}" not found`, 'UNIT_NOT_FOUND');

      // Convert to yards (base unit)
      const quantityInUnit = new Prisma.Decimal(dto.quantity);
      if (quantityInUnit.lessThanOrEqualTo(0)) {
        throw AppError.badRequest('Quantity must be greater than zero', 'INVALID_QUANTITY');
      }

      // Simple unit conversion: assume yard or meter only
      let quantityYard: Prisma.Decimal;
      const unitAbbr = unit.abbreviation.toLowerCase();
      if (unitAbbr === 'm' || unitAbbr === 'meter' || unitAbbr === 'metre') {
        quantityYard = quantityInUnit.times('1.09361').toDecimalPlaces(4);
      } else {
        // Treat as yards
        quantityYard = quantityInUnit.toDecimalPlaces(4);
      }

      const remainingBefore = new Prisma.Decimal(roll.remainingLengthYard.toString());
      if (quantityYard.greaterThan(remainingBefore)) {
        throw AppError.badRequest(
          `Wastage quantity (${quantityYard.toFixed(4)} yd) exceeds roll remaining length (${remainingBefore.toFixed(4)} yd)`,
          'QUANTITY_EXCEEDS_REMAINING',
        );
      }

      if (dto.responsibleUserId) {
        const responsible = await tx.user.findUnique({ where: { id: dto.responsibleUserId } });
        if (!responsible) throw AppError.badRequest('Responsible user not found', 'USER_NOT_FOUND');
      }

      const remainingAfter = remainingBefore.minus(quantityYard).toDecimalPlaces(4);

      // Find or use yard unit for movement
      const yardUnit = await tx.unit.findFirst({
        where: { OR: [{ abbreviation: 'yd' }, { abbreviation: 'yard' }] },
      });
      if (!yardUnit) throw AppError.badRequest('Yard unit not found in system', 'UNIT_NOT_FOUND');

      // Create wastage entry
      const wastageEntry = await tx.wastageEntry.create({
        data: {
          rollId: dto.rollId,
          productId: roll.productId,
          quantity: quantityYard.toFixed(4),
          unitId: yardUnit.id,
          sourceType: dto.sourceType,
          reason: dto.reason.trim(),
          responsibleUserId: dto.responsibleUserId ?? null,
          userId: createdByUserId,
        },
        include: WASTAGE_INCLUDE,
      });

      // Deduct from roll
      const newStatus =
        remainingAfter.isZero()
          ? 'FINISHED'
          : (roll.status as string);

      await tx.roll.update({
        where: { id: dto.rollId },
        data: {
          remainingLengthYard: remainingAfter.toFixed(4),
          status: newStatus as any,
        },
      });

      // Inventory movement
      await tx.inventoryMovement.create({
        data: {
          productId: roll.productId,
          rollId: dto.rollId,
          movementType: 'WASTAGE',
          direction: 'OUT',
          quantity: quantityYard.toFixed(4),
          unitId: yardUnit.id,
          beforeQuantity: remainingBefore.toFixed(4),
          afterQuantity: remainingAfter.toFixed(4),
          referenceType: 'WASTAGE_ENTRY',
          referenceId: wastageEntry.id,
          remarks: dto.reason.trim(),
          userId: createdByUserId,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: createdByUserId,
          action: 'MANUAL_WASTAGE',
          tableName: 'wastage_entries',
          recordId: wastageEntry.id,
          oldValues: JSON.stringify({ remainingLengthYard: remainingBefore.toFixed(4) }),
          newValues: JSON.stringify({
            wastageEntryId: wastageEntry.id,
            sourceType: dto.sourceType,
            quantityYard: quantityYard.toFixed(4),
            reason: dto.reason,
            responsibleUserId: dto.responsibleUserId ?? null,
            rollRemainingAfter: remainingAfter.toFixed(4),
          }),
        },
      });

      const updatedRoll = await tx.roll.findUnique({ where: { id: dto.rollId } });
      return { data: { wastageEntry, roll: updatedRoll } };
    });
  }
}
