import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createPaginatedResponse } from '../../common/utils/response';
import { PrismaService } from '../../database/prisma.service';
import { QueryWastageDto } from './dto/query-wastage.dto';

@Injectable()
export class WastageService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryWastageDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: Prisma.WastageEntryWhereInput = {};
    if (query.userId) where.userId = query.userId;
    if (query.rollId) where.rollId = query.rollId;
    if (query.productId) where.productId = query.productId;
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
      this.prisma.wastageEntry.count({ where }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async getUserWastageSummary(dateFrom?: string, dateTo?: string) {
    const where: Prisma.WastageEntryWhereInput = {};
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
      include: {
        user: { select: { id: true, username: true } },
        unit: { select: { abbreviation: true } },
      },
    });

    // Group by user
    const byUser = new Map<string, { userId: string; username: string; totalEntries: number; totalQuantity: number; unit: string }>();
    for (const e of entries) {
      const key = e.userId;
      const existing = byUser.get(key);
      if (existing) {
        existing.totalEntries++;
        existing.totalQuantity += Number(e.quantity);
      } else {
        byUser.set(key, {
          userId: e.userId,
          username: e.user.username,
          totalEntries: 1,
          totalQuantity: Number(e.quantity),
          unit: e.unit.abbreviation,
        });
      }
    }

    return {
      data: Array.from(byUser.values()).map((u) => ({
        ...u,
        totalQuantity: u.totalQuantity.toFixed(4),
      })),
    };
  }
}
