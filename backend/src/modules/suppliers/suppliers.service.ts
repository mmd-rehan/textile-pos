import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { createPaginatedResponse } from '../../common/utils/response';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { contactName: { contains: query.search } },
            { phone: { contains: query.search } },
          ],
        }
      : undefined;

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        include: { _count: { select: { purchaseOrders: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { purchaseOrders: true } },
      },
    });
    if (!supplier) throw AppError.notFound('Supplier not found', 'SUPPLIER_NOT_FOUND');
    return supplier;
  }

  async create(dto: CreateSupplierDto) {
    if (dto.email) {
      const exists = await this.prisma.supplier.findUnique({ where: { email: dto.email } });
      if (exists) throw AppError.conflict('Email already in use', 'SUPPLIER_EMAIL_EXISTS');
    }
    if (dto.phone) {
      const exists = await this.prisma.supplier.findUnique({ where: { phone: dto.phone } });
      if (exists) throw AppError.conflict('Phone already in use', 'SUPPLIER_PHONE_EXISTS');
    }

    return this.prisma.supplier.create({
      data: {
        name: dto.name,
        contactName: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
      },
    });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);

    if (dto.email) {
      const exists = await this.prisma.supplier.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (exists) throw AppError.conflict('Email already in use', 'SUPPLIER_EMAIL_EXISTS');
    }
    if (dto.phone) {
      const exists = await this.prisma.supplier.findFirst({
        where: { phone: dto.phone, NOT: { id } },
      });
      if (exists) throw AppError.conflict('Phone already in use', 'SUPPLIER_PHONE_EXISTS');
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name,
        contactName: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
      },
    });
  }

  async remove(id: string) {
    const supplier = await this.findOne(id);
    const poCount = (supplier as any)._count?.purchaseOrders ?? 0;
    if (poCount > 0) {
      throw AppError.conflict('Cannot delete supplier with purchase orders', 'SUPPLIER_HAS_ORDERS');
    }
    await this.prisma.supplier.delete({ where: { id } });
    return { id };
  }

  async getLedger(supplierId: string, query: PaginationDto) {
    await this.findOne(supplierId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierLedgerEntryWhereInput = { supplierId };
    const [data, total] = await Promise.all([
      this.prisma.supplierLedgerEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplierLedgerEntry.count({ where }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }
}
