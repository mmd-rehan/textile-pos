import { describe, expect, it } from 'vitest';
import {
  convertUnitPrice,
  dec,
  invoiceTotals,
  isValidDecimalInput,
  quantityLineValues,
  rollLineValues,
  type RollLineInput,
} from './pos-math';

const roll = (over: Partial<RollLineInput> = {}): RollLineInput => ({
  unit: 'YARD',
  billedQuantity: '',
  actualCutQuantity: '',
  remainingLengthYard: '100',
  unitPrice: '5',
  discountAmount: '0',
  ...over,
});

describe('rollLineValues', () => {
  it('bills and deducts the exact length when no actual cut is entered', () => {
    const v = rollLineValues(roll({ billedQuantity: '12.5' }));
    expect(v.billedYard.toString()).toBe('12.5');
    expect(v.actualCutYard.toString()).toBe('12.5');
    expect(v.remainingAfterCut.toString()).toBe('87.5');
    expect(v.wastageYard.toString()).toBe('0');
    expect(v.subTotal.toString()).toBe('62.5');
  });

  it('deducts the actual cut and shows the overcut as wastage, billing only the billed length', () => {
    const v = rollLineValues(roll({ billedQuantity: '10', actualCutQuantity: '10.25', remainingLengthYard: '50' }));
    expect(v.wastageYard.toString()).toBe('0.25');
    expect(v.remainingAfterCut.toString()).toBe('39.75');
    expect(v.subTotal.toString()).toBe('50');
  });

  it('converts metres with the configured factor, rounded to 4 places like the server', () => {
    const v = rollLineValues(roll({ unit: 'METER', billedQuantity: '10' }), '1.09361');
    expect(v.billedYard.toString()).toBe('10.9361');
    expect(v.remainingAfterCut.toString()).toBe('89.0639');
  });

  it('allows cutting exactly what is left (the old 1.093613 constant flagged this as too long)', () => {
    const v = rollLineValues(roll({ unit: 'METER', billedQuantity: '10', remainingLengthYard: '10.9361' }), '1.09361');
    expect(v.exceedsRoll).toBe(false);
    expect(v.remainingAfterCut.toString()).toBe('0');
  });

  it('flags a cut longer than the roll', () => {
    expect(rollLineValues(roll({ billedQuantity: '5', actualCutQuantity: '5.5', remainingLengthYard: '5' })).exceedsRoll).toBe(true);
  });

  it('flags a discount larger than the line amount instead of silently clamping it', () => {
    const v = rollLineValues(roll({ billedQuantity: '2', discountAmount: '11' }));
    expect(v.negativeSubtotal).toBe(true);
    expect(v.subTotal.toString()).toBe('0');
  });

  it('rounds money half-up to 2 places (float maths gave 1.00 here)', () => {
    expect(rollLineValues(roll({ billedQuantity: '1.005', unitPrice: '1' })).grossSubTotal.toFixed(2)).toBe('1.01');
  });

  it('bills a wholesale full roll at its remaining yards, ignoring the unit and typed quantity', () => {
    const v = rollLineValues(roll({ isFullRoll: true, unit: 'METER', billedQuantity: '3', remainingLengthYard: '42.5', unitPrice: '2' }));
    expect(v.billedYard.toString()).toBe('42.5');
    expect(v.remainingAfterCut.toString()).toBe('0');
    expect(v.subTotal.toString()).toBe('85');
  });
});

describe('quantityLineValues', () => {
  it('multiplies and subtracts the discount exactly', () => {
    const v = quantityLineValues({ quantity: '3', unitPrice: '0.1', discountAmount: '0' });
    expect(v.subTotal.toString()).toBe('0.3'); // float: 0.30000000000000004
  });
});

describe('invoiceTotals', () => {
  const lines = [
    { lineType: 'ROLL' as const, ...roll({ billedQuantity: '3' }) },
    { lineType: 'QUANTITY' as const, quantity: '2', unitPrice: '2.5', discountAmount: '1' },
  ];

  it('totals lines, discount and tax like the server', () => {
    const t = invoiceTotals(lines, [{ amount: '' }], { enabled: true, ratePercent: '5' });
    expect(t.subtotal.toString()).toBe('20');
    expect(t.discountTotal.toString()).toBe('1');
    expect(t.taxableAmount.toString()).toBe('19');
    expect(t.taxAmount.toString()).toBe('0.95');
    expect(t.grandTotal.toString()).toBe('19.95');
    expect(t.due.toString()).toBe('19.95');
  });

  it('reports change, not a negative due, when more is tendered', () => {
    const t = invoiceTotals(lines, [{ amount: '15' }, { amount: '10' }], { enabled: false, ratePercent: 0 });
    expect(t.grandTotal.toString()).toBe('19');
    expect(t.totalPaid.toString()).toBe('25');
    expect(t.due.toString()).toBe('0');
    expect(t.change.toString()).toBe('6');
  });

  it('rounds tax half-up to the cent', () => {
    const t = invoiceTotals([{ lineType: 'QUANTITY', quantity: '1', unitPrice: '0.5', discountAmount: '0' }], [], {
      enabled: true,
      ratePercent: '5',
    });
    expect(t.taxAmount.toString()).toBe('0.03'); // 0.025 → 0.03
  });
});

describe('input helpers', () => {
  it('treats empty and invalid input as zero', () => {
    expect(dec('').toString()).toBe('0');
    expect(dec('abc').toString()).toBe('0');
    expect(dec(undefined).toString()).toBe('0');
  });

  it.each([
    ['12', 2, true],
    ['12.5', 2, true],
    ['.75', 2, true],
    ['12.345', 2, false],
    ['12.3456', 4, true],
    ['-1', 2, false],
    ['1e3', 2, false],
    ['1.2.3', 2, false],
    ['', 2, false],
  ])('isValidDecimalInput(%s, %d) is %s', (value, places, ok) => {
    expect(isValidDecimalInput(value as string, places as number)).toBe(ok);
  });

  it('converts unit prices between yards and metres', () => {
    expect(convertUnitPrice('10', 'METER')).toBe('9.14');
    expect(convertUnitPrice('9.14', 'YARD')).toBe('10.00');
  });
});
