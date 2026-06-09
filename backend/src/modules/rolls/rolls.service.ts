import { Injectable } from '@nestjs/common';
import { Prisma, RollStatus } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { createPaginatedResponse } from '../../common/utils/response';
import { PrismaService } from '../../database/prisma.service';
import { FeatureFlagsService } from '../settings/feature-flags.service';
import { MarkFinishedDto } from './dto/mark-finished.dto';
import { QueryReconciliationsDto } from './dto/query-reconciliations.dto';
import { QueryRollMovementsDto } from './dto/query-roll-movements.dto';
import { QueryRollDto } from './dto/query-roll.dto';
import { ReconcileRollDto } from './dto/reconcile-roll.dto';

const ROLL_INCLUDE = {
  product: { select: { id: true, name: true, productCode: true } },
  color: { select: { id: true, name: true, colorCode: true } },
  design: { select: { id: true, name: true, designCode: true } },
  batch: { select: { id: true, batchNumber: true } },
  purchaseRolls: {
    take: 1,
    orderBy: { createdAt: 'desc' as const },
    include: {
      purchaseOrder: {
        select: {
          id: true,
          poNumber: true,
          orderDate: true,
          purchaseCurrencyCode: true,
          exchangeRateToBaseCurrency: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class RollsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async findAll(query: QueryRollDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.RollWhereInput = {};
    if (query.search) {
      where.OR = [
        { rollNumber: { contains: query.search } },
        { barcode: { contains: query.search } },
        { product: { name: { contains: query.search } } },
      ];
    }
    if (query.productId) where.productId = query.productId;
    if (query.batchId) where.batchId = query.batchId;
    if (query.colorId) where.colorId = query.colorId;
    if (query.status) where.status = query.status as RollStatus;

    const [data, total] = await Promise.all([
      this.prisma.roll.findMany({
        where,
        include: ROLL_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.roll.count({ where }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const roll = await this.prisma.roll.findUnique({
      where: { id },
      include: {
        ...ROLL_INCLUDE,
        inventoryMovements: {
          include: { unit: { select: { id: true, abbreviation: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!roll) throw AppError.notFound('Roll not found', 'ROLL_NOT_FOUND');
    return roll;
  }

  async findMovements(id: string, query: QueryRollMovementsDto) {
    const roll = await this.prisma.roll.findUnique({ where: { id }, select: { id: true } });
    if (!roll) throw AppError.notFound('Roll not found', 'ROLL_NOT_FOUND');

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryMovementWhereInput = { rollId: id };
    if (query.movementType) where.movementType = query.movementType as any;
    if (query.direction) where.direction = query.direction as any;

    const [data, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        include: {
          unit: { select: { id: true, name: true, abbreviation: true } },
          user: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findByBarcode(barcode: string) {
    const roll = await this.prisma.roll.findUnique({
      where: { barcode },
      include: ROLL_INCLUDE,
    });
    if (!roll) throw AppError.notFound('Roll not found', 'ROLL_NOT_FOUND');
    return roll;
  }

  async findReconciliations(id: string, query: QueryReconciliationsDto) {
    const roll = await this.prisma.roll.findUnique({ where: { id }, select: { id: true } });
    if (!roll) throw AppError.notFound('Roll not found', 'ROLL_NOT_FOUND');

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.rollReconciliation.findMany({
        where: { rollId: id },
        include: {
          user: { select: { id: true, username: true } },
          remnant: { select: { id: true, lengthYard: true, status: true, barcode: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.rollReconciliation.count({ where: { rollId: id } }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async reconcile(rollId: string, userId: string, dto: ReconcileRollDto) {
    if (dto.createRemnant) {
      await this.featureFlags.assertEnabled('REMNANT_MANAGEMENT');
    }

    return this.prisma.$transaction(async (tx) => {
      const roll = await tx.roll.findUnique({
        where: { id: rollId },
        include: { product: true },
      });
      if (!roll) throw AppError.notFound('Roll not found', 'ROLL_NOT_FOUND');

      if (roll.status === 'SOLD' || roll.status === 'FINISHED') {
        throw AppError.badRequest(
          `Cannot reconcile a roll with status ${roll.status}`,
          'ROLL_NOT_RECONCILABLE',
        );
      }

      const expectedLength = new Prisma.Decimal(roll.remainingLengthYard.toString());
      const actualLength = new Prisma.Decimal(dto.physicalLengthYard);

      if (actualLength.isNegative()) {
        throw AppError.badRequest('Physical length cannot be negative', 'INVALID_LENGTH');
      }

      const discrepancy = actualLength.minus(expectedLength);
      const isMismatch = !discrepancy.abs().lessThanOrEqualTo(new Prisma.Decimal('0.001'));

      if (isMismatch && !dto.reason?.trim()) {
        throw AppError.badRequest('Reason is required when there is a discrepancy', 'REASON_REQUIRED');
      }

      let reconciliationResult: 'MATCHED' | 'SHRINKAGE' | 'EXCESS' | 'REMNANT';
      if (dto.createRemnant) {
        reconciliationResult = 'REMNANT';
      } else if (!isMismatch) {
        reconciliationResult = 'MATCHED';
      } else if (discrepancy.isNegative()) {
        reconciliationResult = 'SHRINKAGE';
      } else {
        reconciliationResult = 'EXCESS';
      }

      // Find the yard unit
      const yardUnit = await tx.unit.findFirst({
        where: { OR: [{ abbreviation: 'yd' }, { abbreviation: 'yard' }] },
      });
      if (!yardUnit) throw AppError.badRequest('Yard unit not found in system', 'UNIT_NOT_FOUND');

      // 1. Create reconciliation record
      const reconciliation = await tx.rollReconciliation.create({
        data: {
          rollId,
          expectedLength: expectedLength.toFixed(4),
          actualLength: actualLength.toFixed(4),
          discrepancy: discrepancy.toFixed(4),
          reconciliationResult,
          reason: dto.reason ?? 'No discrepancy',
          remarks: dto.remarks,
          userId,
        },
      });

      // 2. Record discrepancy movement if physical != system
      if (isMismatch) {
        await tx.inventoryMovement.create({
          data: {
            productId: roll.productId,
            rollId,
            movementType: discrepancy.isNegative() ? 'WASTAGE' : 'ADJUSTMENT',
            direction: discrepancy.isNegative() ? 'OUT' : 'IN',
            quantity: discrepancy.abs().toFixed(4),
            unitId: yardUnit.id,
            beforeQuantity: expectedLength.toFixed(4),
            afterQuantity: actualLength.toFixed(4),
            referenceType: 'RECONCILIATION',
            referenceId: reconciliation.id,
            remarks: dto.reason,
            userId,
          },
        });

        // Record wastage entry for shrinkage (only when wastage_tracking is enabled)
        const wastageFlag = await tx.featureFlag.findUnique({ where: { name: 'wastage_tracking' } });
        if (discrepancy.isNegative() && (wastageFlag?.isEnabled ?? false)) {
          await tx.wastageEntry.create({
            data: {
              rollId,
              productId: roll.productId,
              quantity: discrepancy.abs().toFixed(4),
              unitId: yardUnit.id,
              sourceType: 'RECONCILIATION_LOSS',
              reconciliationId: reconciliation.id,
              reason: dto.reason,
              userId,
            },
          });
        }

        // Update roll remaining to physical value
        await tx.roll.update({
          where: { id: rollId },
          data: { remainingLengthYard: actualLength.toFixed(4) },
        });
      }

      // 3. Create remnant if requested
      let remnant = null;
      if (dto.createRemnant) {
        if (actualLength.isZero()) {
          throw AppError.badRequest('Cannot create a remnant from a roll with zero remaining length', 'ZERO_LENGTH_REMNANT');
        }

        remnant = await tx.remnant.create({
          data: {
            rollId,
            reconciliationId: reconciliation.id,
            productId: roll.productId,
            batchId: roll.batchId,
            lengthYard: actualLength.toFixed(4),
            barcode: dto.remnantBarcode ?? null,
            salePrice: dto.remnantSalePrice ? new Prisma.Decimal(dto.remnantSalePrice).toFixed(2) : null,
            reason: dto.reason,
            status: 'AVAILABLE',
            createdFrom: 'RECONCILIATION',
          },
        });

        // Movement: remaining length moved out to remnant
        await tx.inventoryMovement.create({
          data: {
            productId: roll.productId,
            rollId,
            movementType: 'RECONCILIATION',
            direction: 'OUT',
            quantity: actualLength.toFixed(4),
            unitId: yardUnit.id,
            beforeQuantity: actualLength.toFixed(4),
            afterQuantity: '0.0000',
            referenceType: 'REMNANT',
            referenceId: remnant.id,
            remarks: `Converted to remnant: ${dto.reason}`,
            userId,
          },
        });

        // Mark roll finished with zero remaining
        await tx.roll.update({
          where: { id: rollId },
          data: { remainingLengthYard: '0.0000', status: 'FINISHED' },
        });
      }

      // 4. Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ROLL_RECONCILIATION',
          tableName: 'rolls',
          recordId: rollId,
          oldValues: JSON.stringify({
            remainingLengthYard: expectedLength.toFixed(4),
            status: roll.status,
          }),
          newValues: JSON.stringify({
            remainingLengthYard: dto.createRemnant ? '0.0000' : actualLength.toFixed(4),
            reconciliationResult,
            remnantCreated: !!remnant,
          }),
        },
      });

      return { reconciliation, remnant };
    });
  }

  async markFinished(rollId: string, userId: string, dto: MarkFinishedDto) {
    return this.prisma.$transaction(async (tx) => {
      const roll = await tx.roll.findUnique({ where: { id: rollId } });
      if (!roll) throw AppError.notFound('Roll not found', 'ROLL_NOT_FOUND');

      if (roll.status === 'FINISHED') {
        throw AppError.badRequest('Roll is already finished', 'ALREADY_FINISHED');
      }
      if (roll.status === 'SOLD') {
        throw AppError.badRequest('Cannot mark a fully sold roll as finished', 'ROLL_SOLD');
      }

      const yardUnit = await tx.unit.findFirst({
        where: { OR: [{ abbreviation: 'yd' }, { abbreviation: 'yard' }] },
      });
      if (!yardUnit) throw AppError.badRequest('Yard unit not found in system', 'UNIT_NOT_FOUND');

      const remaining = new Prisma.Decimal(roll.remainingLengthYard.toString());

      // If there is remaining stock, write it off as an adjustment out
      if (remaining.greaterThan(0)) {
        await tx.inventoryMovement.create({
          data: {
            productId: roll.productId,
            rollId,
            movementType: 'ADJUSTMENT',
            direction: 'OUT',
            quantity: remaining.toFixed(4),
            unitId: yardUnit.id,
            beforeQuantity: remaining.toFixed(4),
            afterQuantity: '0.0000',
            referenceType: 'ROLL_FINISHED',
            referenceId: rollId,
            remarks: dto.reason,
            userId,
          },
        });
      }

      const updatedRoll = await tx.roll.update({
        where: { id: rollId },
        data: { status: 'FINISHED', remainingLengthYard: '0.0000' },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ROLL_MARKED_FINISHED',
          tableName: 'rolls',
          recordId: rollId,
          oldValues: JSON.stringify({ status: roll.status, remainingLengthYard: remaining.toFixed(4) }),
          newValues: JSON.stringify({ status: 'FINISHED', remainingLengthYard: '0.0000' }),
        },
      });

      return updatedRoll;
    });
  }
}
