export type ColumnKind = 'text' | 'money' | 'qty' | 'int' | 'date' | 'datetime';

export const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const NUM_FMT: Partial<Record<ColumnKind, string>> = {
  money: '#,##0.00',
  qty: '#,##0.0000',
  int: '0',
  date: 'yyyy-mm-dd',
  datetime: 'yyyy-mm-dd hh:mm',
};

// Decimal values arrive as strings / Prisma.Decimal; Excel cells need numbers
// to be summable. This is display output only — no arithmetic happens here.
export function cellValue(kind: ColumnKind | undefined, v: unknown) {
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
