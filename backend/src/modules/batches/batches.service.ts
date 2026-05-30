import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { createPaginatedResponse } from '../../common/utils/response';

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = query.search
      ? { batchNumber: { contains: query.search } }
      : undefined;

    const [data, total] = await Promise.all([
      this.prisma.batch.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          _count: { select: { rolls: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.batch.count({ where }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true } },
        _count: { select: { rolls: true } },
      },
    });
    if (!batch) throw AppError.notFound('Batch not found', 'BATCH_NOT_FOUND');
    return batch;
  }

  async create(dto: CreateBatchDto) {
    const existing = await this.prisma.batch.findUnique({ where: { batchNumber: dto.batchNumber } });
    if (existing) throw AppError.conflict('Batch number already exists', 'BATCH_EXISTS');

    return this.prisma.batch.create({
      data: {
        batchNumber: dto.batchNumber,
        supplierId: dto.supplierId,
        notes: dto.notes,
        receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : undefined,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateBatchDto) {
    await this.findOne(id);

    if (dto.batchNumber) {
      const existing = await this.prisma.batch.findFirst({
        where: { batchNumber: dto.batchNumber, NOT: { id } },
      });
      if (existing) throw AppError.conflict('Batch number already exists', 'BATCH_EXISTS');
    }

    return this.prisma.batch.update({
      where: { id },
      data: {
        batchNumber: dto.batchNumber,
        supplierId: dto.supplierId,
        notes: dto.notes,
        receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : undefined,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    const batch = await this.findOne(id);
    const rollCount = (batch as any)._count?.rolls ?? 0;
    if (rollCount > 0) {
      throw AppError.conflict('Cannot delete batch with associated rolls', 'BATCH_HAS_ROLLS');
    }
    await this.prisma.batch.delete({ where: { id } });
    return { id };
  }
}
