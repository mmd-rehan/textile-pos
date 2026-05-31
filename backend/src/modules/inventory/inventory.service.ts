import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createPaginatedResponse } from '../../common/utils/response';
import { PrismaService } from '../../database/prisma.service';
import { QueryMovementsDto } from './dto/query-movements.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) { }

  async findMovements(query: QueryMovementsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryMovementWhereInput = {};
    if (query.productId) where.productId = query.productId;
    if (query.rollId) where.rollId = query.rollId;
    if (query.movementType) where.movementType = query.movementType as any;
    if (query.direction) where.direction = query.direction as any;
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
      this.prisma.inventoryMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, productCode: true } },
          roll: { select: { id: true, rollNumber: true, barcode: true } },
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

  async getStockSummary() {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        productCode: true,
        productType: true,
        retailPrice: true,
        wholesalePrice: true,
        rolls: {
          select: {
            id: true,
            status: true,
            originalLengthYard: true,
            remainingLengthYard: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const summary = products.map((p) => {
      const rollCounts = { IN_STOCK: 0, ALLOCATED: 0, SOLD: 0, WASTED: 0, DAMAGED: 0 };
      let totalOriginalYard = 0;
      let totalRemainingYard = 0;

      for (const roll of p.rolls) {
        rollCounts[roll.status] = (rollCounts[roll.status] ?? 0) + 1;
        totalOriginalYard += Number(roll.originalLengthYard);
        totalRemainingYard += Number(roll.remainingLengthYard);
      }

      return {
        productId: p.id,
        productCode: p.productCode,
        name: p.name,
        productType: p.productType,
        retailPrice: p.retailPrice,
        wholesalePrice: p.wholesalePrice,
        totalRolls: p.rolls.length,
        rollCounts,
        totalOriginalYard: totalOriginalYard.toFixed(4),
        totalRemainingYard: totalRemainingYard.toFixed(4),
      };
    });

    return { data: summary };
  }
}
