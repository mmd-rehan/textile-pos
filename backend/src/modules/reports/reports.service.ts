import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createPaginatedResponse } from '../../common/utils/response';
import { PrismaService } from '../../database/prisma.service';

const LOW_STOCK_THRESHOLD_YD = new Prisma.Decimal(10);

function dayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function dayEnd(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function monthEnd(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function parseDate(s: string | undefined, fallback: Date): Date {
  if (!s) return fallback;
  const d = new Date(s);
  return isNaN(d.getTime()) ? fallback : d;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Dashboard summary ─────────────────────────────────────────────────────

  async getDashboardSummary() {
    const now = new Date();
    const tStart = dayStart(now);
    const tEnd = dayEnd(now);
    const mStart = monthStart(now);
    const mEnd = monthEnd(now);

    const [
      todaySales,
      totalOutstanding,
      lowStockCount,
      remnantsAvailable,
      wastageMonth,
      topProducts,
    ] = await Promise.all([
      this.prisma.saleInvoice.aggregate({
        where: { createdAt: { gte: tStart, lte: tEnd } },
        _sum: { netAmount: true, paidAmount: true, taxAmount: true },
        _count: { id: true },
      }),
      this.prisma.customer.aggregate({
        where: { currentBalance: { gt: 0 } },
        _sum: { currentBalance: true },
        _count: { id: true },
      }),
      this.prisma.roll.count({
        where: {
          status: { in: ['IN_STOCK', 'ALLOCATED'] },
          remainingLengthYard: { lt: LOW_STOCK_THRESHOLD_YD },
        },
      }),
      this.prisma.remnant.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.wastageEntry.aggregate({
        where: { createdAt: { gte: mStart, lte: mEnd } },
        _sum: { quantity: true },
        _count: { id: true },
      }),
      // Fast-moving: top 5 products by sale count this month (placeholder aggregation)
      this.prisma.saleInvoiceItem.groupBy({
        by: ['productId'],
        where: { saleInvoice: { createdAt: { gte: mStart, lte: mEnd } } },
        _sum: { subTotal: true },
        orderBy: { _sum: { subTotal: 'desc' } },
        take: 5,
      }),
    ]);

    // Fetch product names for top products
    const productIds = topProducts.map((p) => p.productId);
    const products =
      productIds.length > 0
        ? await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, productCode: true },
          })
        : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    return {
      today: {
        invoiceCount: todaySales._count.id,
        grandTotal: todaySales._sum.netAmount?.toString() ?? '0',
        paidAmount: todaySales._sum.paidAmount?.toString() ?? '0',
        taxTotal: todaySales._sum.taxAmount?.toString() ?? '0',
      },
      totalOutstandingCredit: {
        amount: totalOutstanding._sum.currentBalance?.toString() ?? '0',
        customerCount: totalOutstanding._count.id,
      },
      lowStockRollsCount: lowStockCount,
      remnantsAvailableCount: remnantsAvailable,
      wastageThisMonth: {
        quantityYard: wastageMonth._sum.quantity?.toString() ?? '0',
        entryCount: wastageMonth._count.id,
      },
      fastMovingProducts: topProducts.map((p) => ({
        productId: p.productId,
        name: productMap.get(p.productId)?.name ?? '—',
        productCode: productMap.get(p.productId)?.productCode ?? '',
        totalRevenue: p._sum.subTotal?.toString() ?? '0',
      })),
    };
  }

  // ── Sales report (paginated invoices with date filter) ────────────────────

  async getSalesReport(query: {
    startDate?: string;
    endDate?: string;
    saleType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const now = new Date();
    const start = dayStart(parseDate(query.startDate, monthStart(now)));
    const end = dayEnd(parseDate(query.endDate, now));
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.SaleInvoiceWhereInput = {
      createdAt: { gte: start, lte: end },
    };
    if (query.saleType) where.saleType = query.saleType as any;
    if (query.status) where.status = query.status as any;

    const [data, total, totals] = await Promise.all([
      this.prisma.saleInvoice.findMany({
        where,
        select: {
          id: true,
          invoiceNumber: true,
          createdAt: true,
          saleType: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          discountAmount: true,
          taxableAmount: true,
          taxEnabled: true,
          taxRatePercent: true,
          taxLabel: true,
          taxAmount: true,
          netAmount: true,
          paidAmount: true,
          dueAmount: true,
          customer: { select: { id: true, name: true } },
          cashier: { select: { id: true, username: true } },
          _count: { select: { saleInvoiceItems: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.saleInvoice.count({ where }),
      this.prisma.saleInvoice.aggregate({
        where,
        _sum: { netAmount: true, paidAmount: true, dueAmount: true, discountAmount: true, taxAmount: true },
        _count: { id: true },
      }),
    ]);

    return {
      ...createPaginatedResponse(data, total, page, limit),
      totals: {
        invoiceCount: totals._count.id,
        grandTotal: totals._sum.netAmount?.toString() ?? '0',
        paidAmount: totals._sum.paidAmount?.toString() ?? '0',
        dueAmount: totals._sum.dueAmount?.toString() ?? '0',
        discountAmount: totals._sum.discountAmount?.toString() ?? '0',
        taxTotal: totals._sum.taxAmount?.toString() ?? '0',
      },
    };
  }

  // ── Monthly sales summary (raw group-by) ──────────────────────────────────

  async getMonthlySalesSummary(query: { year?: number; saleType?: string }) {
    const year = query.year ?? new Date().getFullYear();
    const startDate = new Date(year, 0, 1, 0, 0, 0);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    const saleTypeFilter = query.saleType
      ? Prisma.sql`AND sale_type = ${query.saleType}`
      : Prisma.empty;

    type MonthRow = {
      month: string;
      count: bigint;
      net_amount: string;
      paid_amount: string;
      due_amount: string;
    };
    const rows = await this.prisma.$queryRaw<MonthRow[]>`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        COUNT(*)                          AS count,
        SUM(net_amount)                   AS net_amount,
        SUM(paid_amount)                  AS paid_amount,
        SUM(due_amount)                   AS due_amount
      FROM sale_invoices
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
        ${saleTypeFilter}
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `;

    return {
      year,
      saleType: query.saleType ?? 'ALL',
      months: rows.map((r) => ({
        month: r.month,
        invoiceCount: Number(r.count),
        netAmount: r.net_amount ?? '0',
        paidAmount: r.paid_amount ?? '0',
        dueAmount: r.due_amount ?? '0',
      })),
    };
  }

  // ── Current stock report ──────────────────────────────────────────────────

  async getStockReport(query: { page?: number; limit?: number; productType?: string }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const productWhere: Prisma.ProductWhereInput = { status: 'ACTIVE' };
    if (query.productType) productWhere.productType = query.productType as any;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: productWhere,
        select: {
          id: true,
          name: true,
          productCode: true,
          productType: true,
          retailPrice: true,
          wholesalePrice: true,
          category: { select: { id: true, name: true } },
          rolls: {
            where: { status: { in: ['IN_STOCK', 'ALLOCATED'] } },
            select: { id: true, remainingLengthYard: true, status: true },
          },
          productStockItems: {
            where: { isActive: true },
            select: { id: true, quantityOnHand: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where: productWhere }),
    ]);

    const data = products.map((p) => {
      const totalRemainingYard = p.rolls.reduce(
        (s, r) => s.plus(new Prisma.Decimal(r.remainingLengthYard.toString())),
        new Prisma.Decimal(0),
      );
      const totalStockQty = p.productStockItems.reduce(
        (s, i) => s.plus(new Prisma.Decimal(i.quantityOnHand.toString())),
        new Prisma.Decimal(0),
      );
      return {
        id: p.id,
        name: p.name,
        productCode: p.productCode,
        productType: p.productType,
        retailPrice: p.retailPrice.toString(),
        wholesalePrice: p.wholesalePrice.toString(),
        category: p.category,
        rollCount: p.rolls.length,
        totalRemainingYard: totalRemainingYard.toString(),
        stockItemCount: p.productStockItems.length,
        totalStockQty: totalStockQty.toString(),
      };
    });

    return createPaginatedResponse(data, total, page, limit);
  }

  // ── Low stock rolls ───────────────────────────────────────────────────────

  async getLowStockRolls(query: {
    threshold?: number;
    page?: number;
    limit?: number;
  }) {
    const threshold = new Prisma.Decimal(query.threshold ?? 10);
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.RollWhereInput = {
      status: { in: ['IN_STOCK', 'ALLOCATED'] },
      remainingLengthYard: { lt: threshold },
    };

    const [data, total] = await Promise.all([
      this.prisma.roll.findMany({
        where,
        select: {
          id: true,
          rollNumber: true,
          status: true,
          remainingLengthYard: true,
          originalLengthYard: true,
          location: true,
          product: { select: { id: true, name: true, productCode: true } },
          color: { select: { id: true, name: true } },
          design: { select: { id: true, name: true } },
        },
        orderBy: { remainingLengthYard: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.roll.count({ where }),
    ]);

    return {
      ...createPaginatedResponse(data, total, page, limit),
      threshold: threshold.toString(),
    };
  }

  // ── Roll movement report ──────────────────────────────────────────────────

  async getRollMovementsReport(query: {
    startDate?: string;
    endDate?: string;
    movementType?: string;
    productId?: string;
    page?: number;
    limit?: number;
  }) {
    const now = new Date();
    const start = dayStart(parseDate(query.startDate, monthStart(now)));
    const end = dayEnd(parseDate(query.endDate, now));
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryMovementWhereInput = {
      createdAt: { gte: start, lte: end },
    };
    if (query.movementType) where.movementType = query.movementType as any;
    if (query.productId) where.productId = query.productId;

    const [data, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        select: {
          id: true,
          movementType: true,
          direction: true,
          quantity: true,
          beforeQuantity: true,
          afterQuantity: true,
          referenceType: true,
          referenceId: true,
          remarks: true,
          createdAt: true,
          product: { select: { id: true, name: true, productCode: true } },
          roll: { select: { id: true, rollNumber: true } },
          unit: { select: { abbreviation: true } },
          user: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  // ── Customer outstanding report ───────────────────────────────────────────

  async getCustomerOutstandingReport(query: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      currentBalance: { gt: 0 },
      status: 'ACTIVE',
    };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { phone: { contains: query.search } },
        { email: { contains: query.search } },
      ];
    }

    const [data, total, totals] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          type: true,
          currentBalance: true,
          creditLimit: true,
          _count: { select: { saleInvoices: true } },
        },
        orderBy: { currentBalance: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
      this.prisma.customer.aggregate({
        where,
        _sum: { currentBalance: true },
      }),
    ]);

    return {
      ...createPaginatedResponse(data, total, page, limit),
      totalOutstanding: totals._sum.currentBalance?.toString() ?? '0',
    };
  }

  // ── Wastage report ────────────────────────────────────────────────────────

  async getWastageReport(query: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const now = new Date();
    const start = dayStart(parseDate(query.startDate, monthStart(now)));
    const end = dayEnd(parseDate(query.endDate, now));
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.WastageEntryWhereInput = {
      createdAt: { gte: start, lte: end },
    };

    const [data, total, totals] = await Promise.all([
      this.prisma.wastageEntry.findMany({
        where,
        select: {
          id: true,
          quantity: true,
          reason: true,
          createdAt: true,
          product: { select: { id: true, name: true, productCode: true } },
          roll: { select: { id: true, rollNumber: true } },
          unit: { select: { abbreviation: true } },
          user: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.wastageEntry.count({ where }),
      this.prisma.wastageEntry.aggregate({
        where,
        _sum: { quantity: true },
        _count: { id: true },
      }),
    ]);

    return {
      ...createPaginatedResponse(data, total, page, limit),
      totalQuantityYard: (totals._sum as any).quantity?.toString() ?? '0',
      totalEntries: totals._count.id,
    };
  }

  // ── Purchase report ───────────────────────────────────────────────────────

  async getPurchaseReport(query: {
    startDate?: string;
    endDate?: string;
    supplierId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const now = new Date();
    const start = dayStart(parseDate(query.startDate, monthStart(now)));
    const end = dayEnd(parseDate(query.endDate, now));
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = {
      createdAt: { gte: start, lte: end },
    };
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.status) where.status = query.status as any;

    const [data, total, totals] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        select: {
          id: true,
          poNumber: true,
          purchaseCurrencyCode: true,
          exchangeRateToBaseCurrency: true,
          totalOriginalCurrency: true,
          totalBaseCurrency: true,
          paidAmountOriginalCurrency: true,
          dueAmountOriginalCurrency: true,
          status: true,
          orderDate: true,
          createdAt: true,
          supplier: { select: { id: true, name: true } },
          _count: { select: { purchaseRolls: true, purchaseItems: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
      this.prisma.purchaseOrder.aggregate({
        where,
        _sum: { totalBaseCurrency: true, paidAmountOriginalCurrency: true },
        _count: { id: true },
      }),
    ]);

    return {
      ...createPaginatedResponse(data, total, page, limit),
      totals: {
        orderCount: totals._count.id,
        totalBaseCurrency: totals._sum.totalBaseCurrency?.toString() ?? '0',
      },
    };
  }

  // ── Product-wise sales summary ────────────────────────────────────────────

  async getProductSalesSummary(query: {
    startDate?: string;
    endDate?: string;
    saleType?: string;
    page?: number;
    limit?: number;
  }) {
    const now = new Date();
    const start = dayStart(parseDate(query.startDate, monthStart(now)));
    const end = dayEnd(parseDate(query.endDate, now));
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;
    const saleTypeFilter = query.saleType
      ? Prisma.sql`AND si.sale_type = ${query.saleType}`
      : Prisma.empty;

    type ProductRow = {
      product_id: string;
      product_name: string;
      product_code: string;
      product_type: string;
      line_count: bigint;
      total_qty: string;
      total_revenue: string;
    };
    type CountRow = { total: bigint };

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<ProductRow[]>`
        SELECT
          p.id              AS product_id,
          p.name            AS product_name,
          p.product_code    AS product_code,
          p.product_type    AS product_type,
          COUNT(i.id)       AS line_count,
          SUM(CAST(i.billed_quantity AS DECIMAL(14,4))) AS total_qty,
          SUM(CAST(i.sub_total AS DECIMAL(14,2)))       AS total_revenue
        FROM sale_invoice_items i
        JOIN products p ON i.product_id = p.id
        JOIN sale_invoices si ON i.invoice_id = si.id
        WHERE si.created_at >= ${start}
          AND si.created_at <= ${end}
          ${saleTypeFilter}
        GROUP BY p.id, p.name, p.product_code, p.product_type
        ORDER BY total_revenue DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      this.prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(DISTINCT i.product_id) AS total
        FROM sale_invoice_items i
        JOIN sale_invoices si ON i.invoice_id = si.id
        WHERE si.created_at >= ${start}
          AND si.created_at <= ${end}
          ${saleTypeFilter}
      `,
    ]);

    const total = Number(countRows[0]?.total ?? 0);
    const data = rows.map((r) => ({
      productId: r.product_id,
      productName: r.product_name,
      productCode: r.product_code,
      productType: r.product_type,
      lineCount: Number(r.line_count),
      totalQty: r.total_qty ?? '0',
      totalRevenue: r.total_revenue ?? '0',
    }));

    return createPaginatedResponse(data, total, page, limit);
  }
}
