import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { createPaginatedResponse, createSuccessResponse } from '../../common/utils/response';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateCustomerPaymentDto } from './dto/create-customer-payment.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryCustomersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { phone: { contains: query.search } },
        { email: { contains: query.search } },
      ];
    }
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { saleInvoices: true } } },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { saleInvoices: true } } },
    });
    if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    if (dto.phone) {
      const existing = await this.prisma.customer.findUnique({ where: { phone: dto.phone } });
      if (existing) throw AppError.conflict('Phone number already in use', 'PHONE_EXISTS');
    }
    if (dto.email) {
      const existing = await this.prisma.customer.findUnique({ where: { email: dto.email } });
      if (existing) throw AppError.conflict('Email already in use', 'EMAIL_EXISTS');
    }

    return this.prisma.customer.create({
      data: {
        name: dto.name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        type: dto.type ?? 'RETAIL',
        status: dto.status ?? 'ACTIVE',
        creditLimit: dto.creditLimit != null ? new Prisma.Decimal(dto.creditLimit.toString()) : null,
      },
    });
  }

  async update(id: string, dto: UpdateCustomerDto, userId: string) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

    if (dto.phone && dto.phone !== existing.phone) {
      const conflict = await this.prisma.customer.findFirst({
        where: { phone: dto.phone, id: { not: id } },
      });
      if (conflict) throw AppError.conflict('Phone number already in use', 'PHONE_EXISTS');
    }
    if (dto.email && dto.email !== existing.email) {
      const conflict = await this.prisma.customer.findFirst({
        where: { email: dto.email, id: { not: id } },
      });
      if (conflict) throw AppError.conflict('Email already in use', 'EMAIL_EXISTS');
    }

    const newCreditLimit =
      dto.creditLimit !== undefined
        ? dto.creditLimit != null
          ? new Prisma.Decimal(dto.creditLimit.toString())
          : null
        : existing.creditLimit;

    const creditLimitChanged =
      dto.creditLimit !== undefined &&
      newCreditLimit?.toString() !== (existing.creditLimit?.toString() ?? null);

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        email: dto.email !== undefined ? (dto.email ?? null) : existing.email,
        phone: dto.phone !== undefined ? (dto.phone ?? null) : existing.phone,
        address: dto.address !== undefined ? (dto.address ?? null) : existing.address,
        type: dto.type ?? existing.type,
        status: dto.status ?? existing.status,
        creditLimit: newCreditLimit,
      },
    });

    if (creditLimitChanged) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'CUSTOMER_CREDIT_LIMIT_CHANGED',
          tableName: 'customers',
          recordId: id,
          oldValues: JSON.stringify({ creditLimit: existing.creditLimit?.toString() ?? null }),
          newValues: JSON.stringify({ creditLimit: newCreditLimit?.toString() ?? null }),
        },
      });
    }

    return updated;
  }

  async getLedger(id: string, query: { page?: number; limit?: number }) {
    const customer = await this.prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.customerLedgerEntry.findMany({
        where: { customerId: id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customerLedgerEntry.count({ where: { customerId: id } }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async recordPayment(id: string, dto: CreateCustomerPaymentDto, userId: string) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.customerPayment.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return existing;
    }

    const amount = new Prisma.Decimal(dto.amount.toString()).toDecimalPlaces(2);
    if (amount.lte(0)) {
      throw AppError.badRequest('Payment amount must be positive', 'INVALID_AMOUNT');
    }

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id } });
      if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

      const prevBalance = new Prisma.Decimal(customer.currentBalance.toString());
      const newBalance = prevBalance.minus(amount).toDecimalPlaces(2);

      const payment = await tx.customerPayment.create({
        data: {
          customerId: id,
          amount,
          paymentMethod: dto.paymentMethod,
          idempotencyKey: dto.idempotencyKey ?? null,
          notes: dto.notes ?? null,
          receivedById: userId,
        },
      });

      await tx.customerLedgerEntry.create({
        data: {
          customerId: id,
          debit: new Prisma.Decimal(0),
          credit: amount,
          balanceAfter: newBalance,
          referenceType: 'CUSTOMER_PAYMENT',
          referenceId: payment.id,
          remarks: dto.notes ?? `Payment received — ${dto.paymentMethod}`,
        },
      });

      await tx.customer.update({
        where: { id },
        data: { currentBalance: newBalance },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CUSTOMER_PAYMENT_RECORDED',
          tableName: 'customer_payments',
          recordId: payment.id,
          newValues: JSON.stringify({
            customerId: id,
            amount: amount.toString(),
            paymentMethod: dto.paymentMethod,
            balanceBefore: prevBalance.toString(),
            balanceAfter: newBalance.toString(),
          }),
        },
      });

      return payment;
    });
  }

  async getOutstanding(id: string) {
    const customer = await this.findOne(id);
    const balance = new Prisma.Decimal(customer.currentBalance.toString());

    const [unpaidCount, unpaidAgg] = await Promise.all([
      this.prisma.saleInvoice.count({
        where: { customerId: id, paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] } },
      }),
      this.prisma.saleInvoice.aggregate({
        where: { customerId: id, paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] } },
        _sum: { dueAmount: true },
      }),
    ]);

    const creditLimit = customer.creditLimit
      ? new Prisma.Decimal(customer.creditLimit.toString())
      : null;

    return createSuccessResponse({
      customerId: id,
      customerName: customer.name,
      customerType: customer.type,
      currentBalance: balance.toFixed(2),
      creditLimit: creditLimit?.toFixed(2) ?? null,
      availableCredit: creditLimit ? creditLimit.minus(balance).toFixed(2) : null,
      unpaidInvoicesCount: unpaidCount,
      totalOutstandingAmount: (unpaidAgg._sum.dueAmount ?? new Prisma.Decimal(0)).toFixed(2),
    });
  }
}
