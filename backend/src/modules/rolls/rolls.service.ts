import { Injectable } from '@nestjs/common';
import { Prisma, RollStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { createPaginatedResponse } from '../../common/utils/response';
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
  constructor(private readonly prisma: PrismaService) {}

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

  async findByBarcode(barcode: string) {
    const roll = await this.prisma.roll.findUnique({
      where: { barcode },
      include: ROLL_INCLUDE,
    });
    if (!roll) throw AppError.notFound('Roll not found', 'ROLL_NOT_FOUND');
    return roll;
  }
}
