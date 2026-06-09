import { Injectable } from '@nestjs/common';
import { Prisma, RemnantStatus } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { createPaginatedResponse } from '../../common/utils/response';
import { PrismaService } from '../../database/prisma.service';
import { FeatureFlagsService } from '../settings/feature-flags.service';
import { CreateRemnantDto } from './dto/create-remnant.dto';
import { QueryRemnantsDto } from './dto/query-remnants.dto';

const TERMINAL_ROLL_STATUSES = ['FINISHED', 'SOLD', 'WASTED', 'DAMAGED'] as const;

const REMNANT_INCLUDE = {
  originalRoll: {
    select: { id: true, rollNumber: true, barcode: true, status: true },
  },
  product: { select: { id: true, name: true, productCode: true } },
  batch: { select: { id: true, batchNumber: true } },
} as const;

@Injectable()
export class RemnantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
  ) { }

  async findAll(query: QueryRemnantsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: Prisma.RemnantWhereInput = {};
    if (query.rollId) where.rollId = query.rollId;
    if (query.productId) where.productId = query.productId;
    if (query.status) where.status = query.status as RemnantStatus;
    if (query.search) {
      where.OR = [
        { barcode: { contains: query.search } },
        { product: { name: { contains: query.search } } },
        { originalRoll: { rollNumber: { contains: query.search } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.remnant.findMany({
        where,
        include: REMNANT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.remnant.count({ where }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async create(dto: CreateRemnantDto, userId: string) {
    await this.featureFlags.assertEnabled('REMNANT_MANAGEMENT');

    return this.prisma.$transaction(async (tx) => {
      // Lock the source roll within the transaction
      const roll = await tx.roll.findUnique({
        where: { id: dto.rollId },
        select: {
          id: true,
          productId: true,
          batchId: true,
          status: true,
          remainingLengthYard: true,
        },
      });
      if (!roll) throw AppError.notFound('Roll not found', 'ROLL_NOT_FOUND');

      // Rule 11: block finished / already-consumed rolls
      if ((TERMINAL_ROLL_STATUSES as readonly string[]).includes(roll.status)) {
        throw AppError.badRequest(
          `Cannot create a remnant from a roll with status ${roll.status}`,
          'ROLL_NOT_ELIGIBLE',
        );
      }

      // Rule 4: length must be > 0
      const lengthYard = new Prisma.Decimal(dto.lengthYard);
      if (lengthYard.isNegative() || lengthYard.isZero()) {
        throw AppError.badRequest('Remnant length must be greater than zero', 'INVALID_LENGTH');
      }

      // Rule 5: length must not exceed remaining
      const remaining = new Prisma.Decimal(roll.remainingLengthYard.toString());
      if (lengthYard.greaterThan(remaining)) {
        throw AppError.badRequest(
          `Remnant length (${lengthYard.toFixed(4)} yd) exceeds roll remaining (${remaining.toFixed(4)} yd)`,
          'LENGTH_EXCEEDS_REMAINING',
        );
      }

      // Barcode uniqueness
      if (dto.barcode) {
        const existing = await tx.remnant.findFirst({ where: { barcode: dto.barcode } });
        if (existing) throw AppError.conflict('Barcode already in use', 'BARCODE_CONFLICT');
      }

      // Find the yard unit for the inventory movement
      const yardUnit = await tx.unit.findFirst({
        where: { OR: [{ abbreviation: 'yd' }, { abbreviation: 'yard' }] },
      });
      if (!yardUnit) throw AppError.badRequest('Yard unit not found in system', 'UNIT_NOT_FOUND');

      // Compute new remaining length
      const newRemaining = remaining.minus(lengthYard);
      const rollFullyConverted = newRemaining.isZero();

      // Rule 8: create the remnant record
      const remnant = await tx.remnant.create({
        data: {
          rollId: dto.rollId,
          productId: roll.productId,
          batchId: roll.batchId,
          lengthYard: lengthYard.toFixed(4),
          barcode: dto.barcode ?? null,
          salePrice: dto.salePrice ? new Prisma.Decimal(dto.salePrice).toFixed(2) : null,
          reason: dto.reason,
          status: 'AVAILABLE',
          createdFrom: 'MANUAL',
        },
        include: REMNANT_INCLUDE,
      });

      // Rules 6 & 7: reduce source roll remaining; mark FINISHED if fully converted
      await tx.roll.update({
        where: { id: dto.rollId },
        data: {
          remainingLengthYard: newRemaining.toFixed(4),
          ...(rollFullyConverted ? { status: 'FINISHED' } : {}),
        },
      });

      // Rule 9: inventory movement – fabric OUT of the roll
      await tx.inventoryMovement.create({
        data: {
          productId: roll.productId,
          rollId: dto.rollId,
          movementType: 'REMNANT_CREATED',
          direction: 'OUT',
          quantity: lengthYard.toFixed(4),
          unitId: yardUnit.id,
          beforeQuantity: remaining.toFixed(4),
          afterQuantity: newRemaining.toFixed(4),
          referenceType: 'REMNANT',
          referenceId: remnant.id,
          remarks: dto.reason,
          userId,
        },
      });

      // Rule 10: audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'REMNANT_CREATED',
          tableName: 'remnants',
          recordId: remnant.id,
          oldValues: JSON.stringify({
            rollRemainingLengthYard: remaining.toFixed(4),
            rollStatus: roll.status,
          }),
          newValues: JSON.stringify({
            remnantId: remnant.id,
            remnantLengthYard: lengthYard.toFixed(4),
            rollRemainingLengthYard: newRemaining.toFixed(4),
            rollStatus: rollFullyConverted ? 'FINISHED' : roll.status,
          }),
        },
      });

      return remnant;
    });
  }
}
