import Decimal from 'decimal.js';

/**
 * Cart preview maths for the POS screens.
 *
 * Mirrors backend/src/modules/sales/sales.service.ts step for step (same
 * decimal library and rounding as Prisma.Decimal: ROUND_HALF_UP, lengths to 4
 * places, money to 2) so the preview matches what the server will save. The
 * backend stays the source of truth; nothing here is sent as a total.
 */

/** Used until the configured metre→yard factor has loaded (seeded value). */
export const DEFAULT_METER_TO_YARD = '1.09361';
const YARD_TO_METER = new Decimal('0.9144');

const ZERO = new Decimal(0);

/** Parses user input; anything empty or invalid counts as 0. */
export function dec(value: string | number | null | undefined): Decimal {
  if (value === null || value === undefined) return ZERO;
  const s = String(value).trim();
  if (s === '') return ZERO;
  try {
    const d = new Decimal(s);
    return d.isFinite() ? d : ZERO;
  } catch {
    return ZERO;
  }
}

/**
 * True for a non-negative decimal with at most `places` decimals, e.g. a
 * quantity (4) or money (2) field. Rejects "1e3", "-1", "1.2.3", "abc".
 */
export function isValidDecimalInput(value: string, places: number): boolean {
  return new RegExp(`^\\d+(\\.\\d{0,${places}})?$|^\\.\\d{1,${places}}$`).test(value.trim());
}

export interface RollLineInput {
  unit: 'YARD' | 'METER';
  billedQuantity: string;
  /** Empty means "same as billed". */
  actualCutQuantity: string;
  remainingLengthYard: string;
  unitPrice: string;
  discountAmount: string;
  /** Wholesale: sell everything left on the roll, billed in yards. */
  isFullRoll?: boolean;
}

export interface RollLineValues {
  billed: Decimal;
  billedYard: Decimal;
  actualCutYard: Decimal;
  remainingAfterCut: Decimal;
  wastageYard: Decimal;
  grossSubTotal: Decimal;
  subTotal: Decimal;
  /** Cut is longer than what is left on the roll — the server will reject it. */
  exceedsRoll: boolean;
  /** Discount larger than the line amount — the server will reject it. */
  negativeSubtotal: boolean;
}

export function rollLineValues(line: RollLineInput, meterToYard: string = DEFAULT_METER_TO_YARD): RollLineValues {
  const remaining = dec(line.remainingLengthYard);
  let billed: Decimal;
  let actualCut: Decimal;
  let factor: Decimal;
  if (line.isFullRoll) {
    billed = remaining;
    actualCut = remaining;
    factor = new Decimal(1);
  } else {
    billed = dec(line.billedQuantity);
    actualCut = line.actualCutQuantity.trim() !== '' ? dec(line.actualCutQuantity) : billed;
    factor = line.unit === 'METER' ? dec(meterToYard) : new Decimal(1);
  }

  const billedYard = billed.times(factor).toDecimalPlaces(4);
  const actualCutYard = actualCut.times(factor).toDecimalPlaces(4);
  const wastageYard = actualCutYard.gt(billedYard) ? actualCutYard.minus(billedYard).toDecimalPlaces(4) : ZERO;
  const grossSubTotal = billed.times(dec(line.unitPrice)).toDecimalPlaces(2);
  const rawSubTotal = grossSubTotal.minus(dec(line.discountAmount)).toDecimalPlaces(2);

  return {
    billed,
    billedYard,
    actualCutYard,
    remainingAfterCut: remaining.minus(actualCutYard).toDecimalPlaces(4),
    wastageYard,
    grossSubTotal,
    subTotal: Decimal.max(rawSubTotal, ZERO),
    exceedsRoll: actualCutYard.gt(remaining),
    negativeSubtotal: rawSubTotal.lt(0),
  };
}

export interface QuantityLineInput {
  quantity: string;
  unitPrice: string;
  discountAmount: string;
}

export function quantityLineValues(line: QuantityLineInput) {
  const grossSubTotal = dec(line.quantity).times(dec(line.unitPrice)).toDecimalPlaces(2);
  const rawSubTotal = grossSubTotal.minus(dec(line.discountAmount)).toDecimalPlaces(2);
  return { grossSubTotal, subTotal: Decimal.max(rawSubTotal, ZERO), negativeSubtotal: rawSubTotal.lt(0) };
}

export type CartLineInput = ({ lineType: 'ROLL' } & RollLineInput) | ({ lineType: 'QUANTITY' } & QuantityLineInput);

export interface InvoiceTotals {
  subtotal: Decimal;
  discountTotal: Decimal;
  taxableAmount: Decimal;
  taxAmount: Decimal;
  grandTotal: Decimal;
  totalPaid: Decimal;
  due: Decimal;
  change: Decimal;
}

export function invoiceTotals(
  lines: CartLineInput[],
  payments: { amount: string }[],
  tax: { enabled: boolean; ratePercent: string | number },
  meterToYard: string = DEFAULT_METER_TO_YARD,
): InvoiceTotals {
  const subtotal = lines
    .reduce((s, l) => s.plus(l.lineType === 'ROLL' ? rollLineValues(l, meterToYard).grossSubTotal : quantityLineValues(l).grossSubTotal), ZERO)
    .toDecimalPlaces(2);
  const discountTotal = lines.reduce((s, l) => s.plus(dec(l.discountAmount)), ZERO).toDecimalPlaces(2);
  const taxableAmount = Decimal.max(subtotal.minus(discountTotal), ZERO).toDecimalPlaces(2);
  const taxAmount = tax.enabled ? taxableAmount.times(dec(tax.ratePercent)).dividedBy(100).toDecimalPlaces(2) : ZERO;
  const grandTotal = taxableAmount.plus(taxAmount).toDecimalPlaces(2);
  const totalPaid = payments.reduce((s, p) => s.plus(dec(p.amount)), ZERO).toDecimalPlaces(2);
  const due = Decimal.max(grandTotal.minus(totalPaid), ZERO).toDecimalPlaces(2);
  const change = Decimal.max(totalPaid.minus(grandTotal), ZERO).toDecimalPlaces(2);
  return { subtotal, discountTotal, taxableAmount, taxAmount, grandTotal, totalPaid, due, change };
}

/** Converts a per-unit price when the line switches between yards and metres. */
export function convertUnitPrice(price: string, to: 'YARD' | 'METER'): string {
  const p = dec(price);
  return (to === 'METER' ? p.times(YARD_TO_METER) : p.dividedBy(YARD_TO_METER)).toDecimalPlaces(2).toFixed(2);
}
