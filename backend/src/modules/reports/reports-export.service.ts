import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { AppError } from '../../common/errors/app-error';
import { ReportsService } from './reports.service';

// Exports reuse the paginated report queries so filters and calculations
// stay identical to what the report screens show.
const PAGE_SIZE = 100;
const MAX_ROWS = 50_000;

type ColumnKind = 'text' | 'money' | 'qty' | 'int' | 'date' | 'datetime';

interface Column<T> {
  header: string;
  kind?: ColumnKind;
  width?: number;
  value: (row: T) => string | number | Date | null | undefined;
}

interface Sheet<T> {
  title: string;
  columns: Column<T>[];
  rows: T[];
}

export interface ExportFile {
  buffer: Buffer;
  filename: string;
}

const NUM_FMT: Partial<Record<ColumnKind, string>> = {
  money: '#,##0.00',
  qty: '#,##0.0000',
  int: '0',
  date: 'yyyy-mm-dd',
  datetime: 'yyyy-mm-dd hh:mm',
};

type Filters = Record<string, string | undefined>;

// Same permission each report's on-screen endpoint requires.
const EXPORT_PERMISSIONS: Record<string, string> = {
  sales: 'read:sales',
  'sales-monthly': 'read:sales',
  'sales-products': 'read:sales',
  'customers-outstanding': 'read:sales',
  'inventory-stock': 'read:inventory',
  'inventory-low-stock': 'read:inventory',
  'inventory-movements': 'read:inventory',
  wastage: 'read:inventory',
  purchases: 'read:purchases',
};

@Injectable()
export class ReportsExportService {
  constructor(private readonly reports: ReportsService) {}

  async export(report: string, f: Filters, userPermissions: string[]): Promise<ExportFile> {
    const required = EXPORT_PERMISSIONS[report];
    if (!required) throw AppError.notFound(`Unknown report: ${report}`, 'REPORT_NOT_FOUND');
    if (!userPermissions.includes(required)) {
      throw AppError.forbidden('Insufficient permissions', 'FORBIDDEN');
    }

    switch (report) {
      case 'sales':
        return this.build('sales', {
          title: 'Sales',
          rows: await this.all((page) =>
            this.reports.getSalesReport({ startDate: f.startDate, endDate: f.endDate, saleType: f.saleType, status: f.status, page, limit: PAGE_SIZE }),
          ),
          columns: [
            { header: 'Invoice #', value: (r: any) => r.invoiceNumber, width: 22 },
            { header: 'Date', kind: 'datetime', value: (r: any) => r.createdAt },
            { header: 'Type', value: (r: any) => r.saleType },
            { header: 'Customer', value: (r: any) => r.customer?.name ?? 'Walk-in', width: 24 },
            { header: 'Cashier', value: (r: any) => r.cashier?.username },
            { header: 'Items', kind: 'int', value: (r: any) => r._count?.saleInvoiceItems },
            { header: 'Subtotal', kind: 'money', value: (r: any) => r.totalAmount },
            { header: 'Discount', kind: 'money', value: (r: any) => r.discountAmount },
            { header: 'Tax', kind: 'money', value: (r: any) => r.taxAmount },
            { header: 'Net', kind: 'money', value: (r: any) => r.netAmount },
            { header: 'Paid', kind: 'money', value: (r: any) => r.paidAmount },
            { header: 'Due', kind: 'money', value: (r: any) => r.dueAmount },
            { header: 'Status', value: (r: any) => r.status },
          ],
        });

      case 'sales-monthly': {
        const res = await this.reports.getMonthlySalesSummary({ year: f.year ? Number(f.year) : undefined, saleType: f.saleType });
        return this.build(`sales-monthly-summary-${res.year}`, {
          title: `Monthly ${res.year}`,
          rows: res.months,
          columns: [
            { header: 'Month', value: (r) => r.month },
            { header: 'Invoices', kind: 'int', value: (r) => r.invoiceCount },
            { header: 'Net', kind: 'money', value: (r) => r.netAmount },
            { header: 'Paid', kind: 'money', value: (r) => r.paidAmount },
            { header: 'Due', kind: 'money', value: (r) => r.dueAmount },
          ],
        });
      }

      case 'sales-products':
        return this.build('sales-by-product', {
          title: 'By Product',
          rows: await this.all((page) =>
            this.reports.getProductSalesSummary({ startDate: f.startDate, endDate: f.endDate, saleType: f.saleType, page, limit: PAGE_SIZE }),
          ),
          columns: [
            { header: 'Code', value: (r: any) => r.productCode },
            { header: 'Product', value: (r: any) => r.productName, width: 30 },
            { header: 'Type', value: (r: any) => r.productType },
            { header: 'Lines', kind: 'int', value: (r: any) => r.lineCount },
            { header: 'Quantity', kind: 'qty', value: (r: any) => r.totalQty },
            { header: 'Revenue', kind: 'money', value: (r: any) => r.totalRevenue },
          ],
        });

      case 'inventory-stock':
        return this.build('inventory-stock', {
          title: 'Stock',
          rows: await this.all((page) => this.reports.getStockReport({ productType: f.productType, page, limit: PAGE_SIZE })),
          columns: [
            { header: 'Code', value: (r: any) => r.productCode },
            { header: 'Product', value: (r: any) => r.name, width: 30 },
            { header: 'Type', value: (r: any) => r.productType },
            { header: 'Category', value: (r: any) => r.category?.name },
            { header: 'Rolls', kind: 'int', value: (r: any) => r.rollCount },
            { header: 'Remaining (yd)', kind: 'qty', value: (r: any) => r.totalRemainingYard },
            { header: 'Stock Qty', kind: 'qty', value: (r: any) => r.totalStockQty },
            { header: 'Retail Price', kind: 'money', value: (r: any) => r.retailPrice },
            { header: 'Wholesale Price', kind: 'money', value: (r: any) => r.wholesalePrice },
          ],
        });

      case 'inventory-low-stock':
        return this.build('inventory-low-stock', {
          title: 'Low Stock',
          rows: await this.all((page) =>
            this.reports.getLowStockRolls({ threshold: f.threshold ? Number(f.threshold) : undefined, page, limit: PAGE_SIZE }),
          ),
          columns: [
            { header: 'Roll #', value: (r: any) => r.rollNumber, width: 22 },
            { header: 'Product', value: (r: any) => r.product?.name, width: 30 },
            { header: 'Color', value: (r: any) => r.color?.name },
            { header: 'Design', value: (r: any) => r.design?.name },
            { header: 'Original (yd)', kind: 'qty', value: (r: any) => r.originalLengthYard },
            { header: 'Remaining (yd)', kind: 'qty', value: (r: any) => r.remainingLengthYard },
            { header: 'Location', value: (r: any) => r.location },
            { header: 'Status', value: (r: any) => r.status },
          ],
        });

      case 'inventory-movements':
        return this.build('inventory-movements', {
          title: 'Movements',
          rows: await this.all((page) =>
            this.reports.getRollMovementsReport({ startDate: f.startDate, endDate: f.endDate, movementType: f.movementType, productId: f.productId, page, limit: PAGE_SIZE }),
          ),
          columns: [
            { header: 'Date', kind: 'datetime', value: (r: any) => r.createdAt },
            { header: 'Type', value: (r: any) => r.movementType },
            { header: 'Direction', value: (r: any) => r.direction },
            { header: 'Product', value: (r: any) => r.product?.name, width: 30 },
            { header: 'Roll #', value: (r: any) => r.roll?.rollNumber, width: 22 },
            { header: 'Quantity', kind: 'qty', value: (r: any) => r.quantity },
            { header: 'Unit', value: (r: any) => r.unit?.abbreviation },
            { header: 'Before', kind: 'qty', value: (r: any) => r.beforeQuantity },
            { header: 'After', kind: 'qty', value: (r: any) => r.afterQuantity },
            { header: 'Reference', value: (r: any) => r.referenceType },
            { header: 'User', value: (r: any) => r.user?.username },
            { header: 'Remarks', value: (r: any) => r.remarks, width: 40 },
          ],
        });

      case 'customers-outstanding':
        return this.build('customers-outstanding', {
          title: 'Outstanding',
          rows: await this.all((page) => this.reports.getCustomerOutstandingReport({ search: f.search, page, limit: PAGE_SIZE })),
          columns: [
            { header: 'Customer', value: (r: any) => r.name, width: 28 },
            { header: 'Phone', value: (r: any) => r.phone },
            { header: 'Email', value: (r: any) => r.email, width: 26 },
            { header: 'Type', value: (r: any) => r.type },
            { header: 'Invoices', kind: 'int', value: (r: any) => r._count?.saleInvoices },
            { header: 'Credit Limit', kind: 'money', value: (r: any) => r.creditLimit },
            { header: 'Balance', kind: 'money', value: (r: any) => r.currentBalance },
          ],
        });

      case 'wastage':
        return this.build('wastage', {
          title: 'Wastage',
          rows: await this.all((page) => this.reports.getWastageReport({ startDate: f.startDate, endDate: f.endDate, page, limit: PAGE_SIZE })),
          columns: [
            { header: 'Date', kind: 'datetime', value: (r: any) => r.createdAt },
            { header: 'Product', value: (r: any) => r.product?.name, width: 30 },
            { header: 'Roll #', value: (r: any) => r.roll?.rollNumber, width: 22 },
            { header: 'Quantity', kind: 'qty', value: (r: any) => r.quantity },
            { header: 'Unit', value: (r: any) => r.unit?.abbreviation },
            { header: 'User', value: (r: any) => r.user?.username },
            { header: 'Reason', value: (r: any) => r.reason, width: 50 },
          ],
        });

      case 'purchases':
        return this.build('purchases', {
          title: 'Purchases',
          rows: await this.all((page) =>
            this.reports.getPurchaseReport({ startDate: f.startDate, endDate: f.endDate, supplierId: f.supplierId, status: f.status, page, limit: PAGE_SIZE }),
          ),
          columns: [
            { header: 'PO #', value: (r: any) => r.poNumber, width: 22 },
            { header: 'Order Date', kind: 'date', value: (r: any) => r.orderDate ?? r.createdAt },
            { header: 'Supplier', value: (r: any) => r.supplier?.name, width: 26 },
            { header: 'Rolls', kind: 'int', value: (r: any) => r._count?.purchaseRolls },
            { header: 'Items', kind: 'int', value: (r: any) => r._count?.purchaseItems },
            { header: 'Currency', value: (r: any) => r.purchaseCurrencyCode },
            { header: 'Total (orig.)', kind: 'money', value: (r: any) => r.totalOriginalCurrency },
            { header: 'Paid (orig.)', kind: 'money', value: (r: any) => r.paidAmountOriginalCurrency },
            { header: 'Due (orig.)', kind: 'money', value: (r: any) => r.dueAmountOriginalCurrency },
            { header: 'Exchange Rate', value: (r: any) => r.exchangeRateToBaseCurrency?.toString() },
            { header: 'Total (base)', kind: 'money', value: (r: any) => r.totalBaseCurrency },
            { header: 'Status', value: (r: any) => r.status },
          ],
        });

      default:
        throw AppError.notFound(`Unknown report: ${report}`, 'REPORT_NOT_FOUND');
    }
  }

  private async all<T>(fetchPage: (page: number) => Promise<{ data?: T[] | null; meta?: any }>): Promise<T[]> {
    const rows: T[] = [];
    for (let page = 1; ; page++) {
      const res = await fetchPage(page);
      rows.push(...(res.data ?? []));
      if (rows.length > MAX_ROWS) {
        throw AppError.badRequest(
          `Export is limited to ${MAX_ROWS.toLocaleString()} rows. Narrow the filters and try again.`,
          'EXPORT_TOO_LARGE',
        );
      }
      if (!res.meta?.hasNextPage) return rows;
    }
  }

  private async build<T>(name: string, sheet: Sheet<T>): Promise<ExportFile> {
    const wb = new ExcelJS.Workbook();
    wb.created = new Date();
    const ws = wb.addWorksheet(sheet.title);

    ws.columns = sheet.columns.map((c) => ({
      header: c.header,
      width: c.width ?? Math.max(12, c.header.length + 2),
      style: c.kind && NUM_FMT[c.kind] ? { numFmt: NUM_FMT[c.kind] } : {},
    }));
    const header = ws.getRow(1);
    header.font = { bold: true };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    for (const row of sheet.rows) {
      ws.addRow(sheet.columns.map((c) => cellValue(c.kind, c.value(row))));
    }

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const stamp = new Date().toISOString().slice(0, 10);
    return { buffer, filename: `${name}-${stamp}.xlsx` };
  }
}

// Decimal values arrive as strings / Prisma.Decimal; Excel cells need numbers
// to be summable. This is display output only — no arithmetic happens here.
function cellValue(kind: ColumnKind | undefined, v: unknown) {
  if (v === null || v === undefined || v === '') return null;
  switch (kind) {
    case 'money':
    case 'qty':
    case 'int': {
      const n = Number(v.toString());
      return Number.isFinite(n) ? n : v.toString();
    }
    case 'date':
    case 'datetime':
      return v instanceof Date ? v : new Date(v as string);
    default:
      return v instanceof Date ? v : String(v);
  }
}
