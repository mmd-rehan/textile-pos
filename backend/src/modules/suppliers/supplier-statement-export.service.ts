import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { cellValue, ColumnKind, NUM_FMT } from '../../common/utils/excel';
import { SupplierStatementQueryDto } from './dto/supplier-statement-query.dto';
import { SuppliersService } from './suppliers.service';

type Statement = Awaited<ReturnType<SuppliersService['getStatement']>>;
type Entry = Statement['entries'][number];

const COLUMNS: { header: string; kind?: ColumnKind; width: number; value: (e: Entry) => unknown }[] = [
  { header: 'Date', kind: 'datetime', width: 18, value: (e) => e.date },
  { header: 'Reference', width: 22, value: (e) => e.referenceNumber },
  { header: 'Description', width: 30, value: (e) => e.description },
  { header: 'Currency', width: 10, value: (e) => e.currencyCode },
  { header: 'Rate to base', kind: 'qty', width: 13, value: (e) => e.exchangeRateToBaseCurrency },
  { header: 'Debit (orig.)', kind: 'money', width: 14, value: (e) => e.debitOriginalCurrency },
  { header: 'Credit (orig.)', kind: 'money', width: 14, value: (e) => e.creditOriginalCurrency },
  { header: 'Debit (base)', kind: 'money', width: 14, value: (e) => e.debitBaseCurrency },
  { header: 'Credit (base)', kind: 'money', width: 14, value: (e) => e.creditBaseCurrency },
  { header: 'Balance (base)', kind: 'money', width: 15, value: (e) => e.balanceAfterBase },
  { header: 'Remarks', width: 30, value: (e) => e.remarks },
];

/** Excel version of the supplier statement screen, built from the same query. */
@Injectable()
export class SupplierStatementExportService {
  constructor(private readonly suppliers: SuppliersService) {}

  async export(supplierId: string, query: SupplierStatementQueryDto) {
    const stmt = await this.suppliers.getStatement(supplierId, query);

    const wb = new ExcelJS.Workbook();
    wb.created = new Date();
    const ws = wb.addWorksheet('Statement');
    ws.columns = COLUMNS.map((c) => ({ width: c.width }));

    const period = `${stmt.fromDate ? stmt.fromDate.slice(0, 10) : 'Beginning'} to ${stmt.toDate ? stmt.toDate.slice(0, 10) : 'today'}`;
    const summary: [string, unknown, ColumnKind?][] = [
      ['Supplier', stmt.supplier.name],
      ['Period', period],
      ['Base currency', stmt.baseCurrencyCode],
      ['Opening balance', stmt.openingBalanceBase, 'money'],
      ['Total debit (paid)', stmt.totalDebitBase, 'money'],
      ['Total credit (purchased)', stmt.totalCreditBase, 'money'],
      ['Closing balance', stmt.closingBalanceBase, 'money'],
    ];
    ws.addRow(['Supplier Statement']).font = { bold: true, size: 14 };
    for (const [label, value, kind] of summary) {
      const row = ws.addRow([label, cellValue(kind, value)]);
      row.getCell(1).font = { bold: true };
      if (kind && NUM_FMT[kind]) row.getCell(2).numFmt = NUM_FMT[kind]!;
    }
    ws.addRow([]);

    const header = ws.addRow(COLUMNS.map((c) => c.header));
    header.font = { bold: true };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
    ws.views = [{ state: 'frozen', ySplit: header.number }];

    for (const entry of stmt.entries) {
      const row = ws.addRow(COLUMNS.map((c) => cellValue(c.kind, c.value(entry))));
      COLUMNS.forEach((c, i) => {
        if (c.kind && NUM_FMT[c.kind]) row.getCell(i + 1).numFmt = NUM_FMT[c.kind]!;
      });
    }

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const safeName = stmt.supplier.name.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'supplier';
    const stamp = new Date().toISOString().slice(0, 10);
    return { buffer, filename: `supplier-statement-${safeName}-${stamp}.xlsx` };
  }
}
