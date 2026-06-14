import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { createPaginatedResponse } from '../../common/utils/response';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SupplierStatementQueryDto } from './dto/supplier-statement-query.dto';
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

  async getStatement(supplierId: string, query: SupplierStatementQueryDto) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: {
        id: true, name: true, contactName: true, phone: true, email: true,
        address: true, currentBalance: true,
      },
    });
    if (!supplier) throw AppError.notFound('Supplier not found', 'SUPPLIER_NOT_FOUND');

    const fromDate = query.fromDate ? new Date(query.fromDate) : null;
    const toDate = query.toDate ? new Date(query.toDate) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    if (fromDate && toDate && fromDate > toDate) {
      throw AppError.badRequest('fromDate must be before or equal to toDate', 'INVALID_DATE_RANGE');
    }

    // Opening balance = sum of debits/credits BEFORE fromDate.
    // Ledger uses creditBaseCurrency to mean "supplier owes us less" (we paid)
    // and debitBaseCurrency for what we paid out. Actually based on existing
    // service: purchase creates a CREDIT (we owe supplier more), payment creates
    // a DEBIT (we paid them, reducing what we owe). Balance grows on credit.
    let openingBalanceBase = new Prisma.Decimal(0);
    if (fromDate) {
      const prior = await this.prisma.supplierLedgerEntry.findMany({
        where: { supplierId, createdAt: { lt: fromDate } },
        select: { creditBaseCurrency: true, debitBaseCurrency: true },
      });
      for (const e of prior) {
        openingBalanceBase = openingBalanceBase
          .plus(new Prisma.Decimal(e.creditBaseCurrency.toString()))
          .minus(new Prisma.Decimal(e.debitBaseCurrency.toString()));
      }
    }

    const entries = await this.prisma.supplierLedgerEntry.findMany({
      where: {
        supplierId,
        ...(fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    // Pre-fetch reference data (PO numbers, payment dates) for description hints.
    const poIds = entries
      .filter((e) => e.referenceType === 'PURCHASE_ORDER')
      .map((e) => e.referenceId);
    const paymentPoIds = entries
      .filter((e) => e.referenceType === 'SUPPLIER_PAYMENT')
      .map((e) => e.referenceId);

    const allPoIds = Array.from(new Set([...poIds, ...paymentPoIds]));
    const purchases = allPoIds.length
      ? await this.prisma.purchaseOrder.findMany({
          where: { id: { in: allPoIds } },
          select: { id: true, poNumber: true, orderDate: true },
        })
      : [];
    const poMap = new Map(purchases.map((p) => [p.id, p]));

    let running = new Prisma.Decimal(openingBalanceBase.toString());
    const rows = entries.map((e) => {
      const creditOriginal = new Prisma.Decimal(e.creditOriginalCurrency.toString());
      const debitOriginal = new Prisma.Decimal(e.debitOriginalCurrency.toString());
      const creditBase = new Prisma.Decimal(e.creditBaseCurrency.toString());
      const debitBase = new Prisma.Decimal(e.debitBaseCurrency.toString());

      running = running.plus(creditBase).minus(debitBase);

      const ref = poMap.get(e.referenceId);
      const referenceNumber = ref?.poNumber ?? e.referenceId;
      const description =
        e.referenceType === 'PURCHASE_ORDER'
          ? `Purchase ${referenceNumber}`
          : e.referenceType === 'SUPPLIER_PAYMENT'
            ? `Payment for ${referenceNumber}`
            : e.referenceType;

      return {
        id: e.id,
        date: e.createdAt,
        referenceNumber,
        referenceType: e.referenceType,
        referenceId: e.referenceId,
        description,
        currencyCode: e.currencyCode,
        baseCurrencyCodeAtTime: e.baseCurrencyCodeAtTime,
        exchangeRateToBaseCurrency: e.exchangeRateToBaseCurrency.toString(),
        debitOriginalCurrency: debitOriginal.toString(),
        creditOriginalCurrency: creditOriginal.toString(),
        debitBaseCurrency: debitBase.toString(),
        creditBaseCurrency: creditBase.toString(),
        balanceAfterBase: running.toDecimalPlaces(2).toString(),
        remarks: e.remarks ?? null,
      };
    });

    const totals = entries.reduce(
      (acc, e) => {
        acc.totalDebitBase = acc.totalDebitBase.plus(
          new Prisma.Decimal(e.debitBaseCurrency.toString()),
        );
        acc.totalCreditBase = acc.totalCreditBase.plus(
          new Prisma.Decimal(e.creditBaseCurrency.toString()),
        );
        return acc;
      },
      { totalDebitBase: new Prisma.Decimal(0), totalCreditBase: new Prisma.Decimal(0) },
    );

    const closingBalanceBase = openingBalanceBase
      .plus(totals.totalCreditBase)
      .minus(totals.totalDebitBase);

    const baseCurrencySetting = await this.prisma.companySetting.findUnique({
      where: { key: 'company_currency' },
    });
    const baseCurrencyCode = baseCurrencySetting?.value ?? 'PKR';

    return {
      supplier: {
        id: supplier.id,
        name: supplier.name,
        contactName: supplier.contactName,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        currentBalance: supplier.currentBalance.toString(),
      },
      baseCurrencyCode,
      fromDate: fromDate ? fromDate.toISOString() : null,
      toDate: toDate ? toDate.toISOString() : null,
      openingBalanceBase: openingBalanceBase.toDecimalPlaces(2).toString(),
      closingBalanceBase: closingBalanceBase.toDecimalPlaces(2).toString(),
      totalDebitBase: totals.totalDebitBase.toDecimalPlaces(2).toString(),
      totalCreditBase: totals.totalCreditBase.toDecimalPlaces(2).toString(),
      entries: rows,
      generatedAt: new Date().toISOString(),
    };
  }
}
