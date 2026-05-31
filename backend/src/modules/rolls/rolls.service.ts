import { Injectable } from '@nestjs/common';
import { Prisma, RollStatus } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { createPaginatedResponse } from '../../common/utils/response';
import { PrismaService } from '../../database/prisma.service';
import { QueryRollMovementsDto } from './dto/query-roll-movements.dto';
import { QueryRollDto } from './dto/query-roll.dto';

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
  constructor(private readonly prisma: PrismaService) { }

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
}
