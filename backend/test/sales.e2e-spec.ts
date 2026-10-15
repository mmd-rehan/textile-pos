import { randomUUID } from 'crypto';
import { createTestContext, TestContext } from './helpers/app';
import { Catalog, createCatalog, createCustomer, createPurchase, dec } from './helpers/fixtures';

describe('Sales (retail POS)', () => {
  let ctx: TestContext;
  let catalog: Catalog;

  beforeAll(async () => {
    ctx = await createTestContext();
    catalog = await createCatalog(ctx);
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  const rollLine = (rollId: string, billedQuantity: number, extra: Record<string, unknown> = {}) => ({
    productId: catalog.rollProductId,
    rollId,
    billedQuantity,
    unit: 'YARD',
    unitPrice: 5,
    ...extra,
  });

  const getRoll = (id: string) => ctx.prisma.roll.findUniqueOrThrow({ where: { id } });

  describe('roll deduction', () => {
    it('deducts the exact billed length and records a SALE movement', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [100] });
      const roll = rolls[0];

      const invoice = await ctx.admin.ok(
        ctx.admin.post('/sales/retail', { lines: [rollLine(roll.id, 12.5)], payments: [{ method: 'CASH', amount: 62.5 }] }),
      );

      expect(dec(invoice.netAmount)).toBe(62.5);
      expect(invoice.status).toBe('PAID');
      expect(dec((await getRoll(roll.id)).remainingLengthYard)).toBe(87.5);

      const movements = await ctx.prisma.inventoryMovement.findMany({ where: { referenceId: invoice.id } });
      expect(movements).toHaveLength(1);
      expect(movements[0]).toMatchObject({ movementType: 'SALE', direction: 'OUT', rollId: roll.id });
      expect(dec(movements[0].quantity)).toBe(12.5);
      expect(dec(movements[0].beforeQuantity)).toBe(100);
      expect(dec(movements[0].afterQuantity)).toBe(87.5);
      expect(await ctx.prisma.wastageEntry.count({ where: { saleInvoiceId: invoice.id } })).toBe(0);
    });

    it('deducts the actual cut and records the overcut as wastage, billing only the billed length', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [50] });
      const roll = rolls[0];

      const invoice = await ctx.admin.ok(
        ctx.admin.post('/sales/retail', {
          lines: [rollLine(roll.id, 10, { actualCutQuantity: 10.25 })],
          payments: [{ method: 'CASH', amount: 50 }],
        }),
      );

      expect(dec(invoice.netAmount)).toBe(50);
      expect(dec((await getRoll(roll.id)).remainingLengthYard)).toBe(39.75);
      const wastage = await ctx.prisma.wastageEntry.findMany({ where: { saleInvoiceId: invoice.id } });
      expect(wastage).toHaveLength(1);
      expect(wastage[0]).toMatchObject({ sourceType: 'SALE_OVERCUT', rollId: roll.id });
      expect(dec(wastage[0].quantity)).toBe(0.25);
    });

    it('converts metres to yards when deducting a roll', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [100] });
      const roll = rolls[0];
      const factor = await ctx.prisma.unitConversion.findFirstOrThrow({
        where: { fromUnit: { abbreviation: 'm' }, toUnit: { abbreviation: 'yd' } },
      });

      await ctx.admin.ok(
        ctx.admin.post('/sales/retail', {
          lines: [rollLine(roll.id, 10, { unit: 'METER' })],
          payments: [{ method: 'CASH', amount: 50 }],
        }),
      );

      const expectedCut = Number((10 * dec(factor.factor)).toFixed(4));
      expect(dec((await getRoll(roll.id)).remainingLengthYard)).toBeCloseTo(100 - expectedCut, 4);
    });

    it('marks a roll SOLD when it is cut to zero', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [8] });
      await ctx.admin.ok(
        ctx.admin.post('/sales/retail', { lines: [rollLine(rolls[0].id, 8)], payments: [{ method: 'CASH', amount: 40 }] }),
      );
      const roll = await getRoll(rolls[0].id);
      expect(dec(roll.remainingLengthYard)).toBe(0);
      expect(roll.status).toBe('SOLD');

      const again = await ctx.admin.post('/sales/retail', {
        lines: [rollLine(rolls[0].id, 1)],
        payments: [{ method: 'CASH', amount: 5 }],
      });
      expect(again.status).toBe(400);
      expect(again.body.error?.code).toBe('ROLL_NOT_AVAILABLE');
    });

    it('keeps decimal precision for fractional lengths and prices', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [10] });
      const invoice = await ctx.admin.ok(
        ctx.admin.post('/sales/retail', {
          lines: [rollLine(rolls[0].id, 0.1, { unitPrice: 0.3 })],
          payments: [{ method: 'CASH', amount: 0.03 }],
        }),
      );
      expect(invoice.netAmount).toBe('0.03');
      expect((await getRoll(rolls[0].id)).remainingLengthYard.toString()).toBe('9.9');
    });
  });

  describe('payments', () => {
    it('records change separately so paid never exceeds the invoice total', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [10] });
      const invoice = await ctx.admin.ok(
        ctx.admin.post('/sales/retail', { lines: [rollLine(rolls[0].id, 3)], payments: [{ method: 'CASH', amount: 20 }] }),
      );
      expect(dec(invoice.netAmount)).toBe(15);
      expect(dec(invoice.paidAmount)).toBe(15);
      expect(dec(invoice.changeAmount)).toBe(5);
      expect(dec(invoice.dueAmount)).toBe(0);
      expect(invoice.salePayments.map((p: any) => dec(p.amount))).toEqual([20]);
    });

    it('records no change on an exact or partial payment', async () => {
      const customer = await createCustomer(ctx.admin);
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [10] });
      const invoice = await ctx.admin.ok(
        ctx.admin.post('/sales/retail', { customerId: customer.id, lines: [rollLine(rolls[0].id, 3)], payments: [{ method: 'CASH', amount: 10 }] }),
      );
      expect(dec(invoice.paidAmount)).toBe(10);
      expect(dec(invoice.changeAmount)).toBe(0);
      expect(dec(invoice.dueAmount)).toBe(5);
    });
  });

  describe('negative stock prevention', () => {
    it('rejects cutting more than the roll has left', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [5] });
      const res = await ctx.admin.post('/sales/retail', {
        lines: [rollLine(rolls[0].id, 5, { actualCutQuantity: 5.5 })],
        payments: [{ method: 'CASH', amount: 25 }],
      });
      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('INSUFFICIENT_ROLL_LENGTH');
      expect(dec((await getRoll(rolls[0].id)).remainingLengthYard)).toBe(5);
    });

    it('rejects selling more units than are on hand', async () => {
      const { stockItemIds } = await createPurchase(ctx, catalog, { rollLengths: [], itemQuantity: 3 });
      const res = await ctx.admin.post('/sales/retail', {
        quantityLines: [{ productId: catalog.fixedProductId, productStockItemId: stockItemIds[0], quantity: 4, unitPrice: 3 }],
        payments: [{ method: 'CASH', amount: 12 }],
      });
      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('INSUFFICIENT_STOCK');
    });

    it('rejects the same roll on two lines (would bypass the length check)', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [100] });
      const res = await ctx.admin.post('/sales/retail', {
        lines: [rollLine(rolls[0].id, 60), rollLine(rolls[0].id, 60)],
        payments: [{ method: 'CASH', amount: 600 }],
      });
      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('DUPLICATE_ROLL_LINE');
    });

    it('rejects the same stock item on two lines', async () => {
      const { stockItemIds } = await createPurchase(ctx, catalog, { rollLengths: [], itemQuantity: 5 });
      const line = { productId: catalog.fixedProductId, productStockItemId: stockItemIds[0], quantity: 3, unitPrice: 3 };
      const res = await ctx.admin.post('/sales/retail', { quantityLines: [line, line], payments: [{ method: 'CASH', amount: 18 }] });
      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('DUPLICATE_STOCK_ITEM_LINE');
    });

    it('never oversells a roll under concurrent sales', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [30] });
      const results = await Promise.all(
        [...Array(5)].map(() =>
          ctx.admin.post('/sales/retail', { lines: [rollLine(rolls[0].id, 10)], payments: [{ method: 'CASH', amount: 50 }] }),
        ),
      );
      const succeeded = results.filter((r) => r.status < 300).length;
      for (const r of results.filter((r) => r.status >= 300)) {
        expect([400, 409]).toContain(r.status);
      }
      const roll = await getRoll(rolls[0].id);
      expect(dec(roll.remainingLengthYard)).toBe(30 - succeeded * 10);
      expect(dec(roll.remainingLengthYard)).toBeGreaterThanOrEqual(0);
      const sold = await ctx.prisma.inventoryMovement.aggregate({
        where: { rollId: rolls[0].id, movementType: 'SALE' },
        _sum: { quantity: true },
      });
      expect(dec(sold._sum.quantity ?? 0)).toBe(succeeded * 10);
    });
  });

  describe('transaction rollback', () => {
    it('leaves no invoice, movement or roll change when a later line fails', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [40, 5] });
      const good = rolls.find((r) => Number(r.originalLengthYard) === 40)!;
      const short = rolls.find((r) => Number(r.originalLengthYard) === 5)!;
      const before = await ctx.prisma.saleInvoice.count();

      const res = await ctx.admin.post('/sales/retail', {
        lines: [rollLine(good.id, 10), rollLine(short.id, 6)],
        payments: [{ method: 'CASH', amount: 80 }],
      });

      expect(res.status).toBe(400);
      expect(await ctx.prisma.saleInvoice.count()).toBe(before);
      expect(dec((await getRoll(good.id)).remainingLengthYard)).toBe(40);
      expect(await ctx.prisma.inventoryMovement.count({ where: { rollId: good.id, movementType: 'SALE' } })).toBe(0);
    });

    it('rolls back stock deductions when the credit limit is exceeded', async () => {
      const customer = await createCustomer(ctx.admin, { type: 'CREDIT', creditLimit: 10 });
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [20] });

      const res = await ctx.admin.post('/sales/retail', {
        customerId: customer.id,
        lines: [rollLine(rolls[0].id, 4)],
        payments: [{ method: 'CASH', amount: 1 }],
      });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('CREDIT_LIMIT_EXCEEDED');
      expect(dec((await getRoll(rolls[0].id)).remainingLengthYard)).toBe(20);
      expect(await ctx.prisma.customerLedgerEntry.count({ where: { customerId: customer.id } })).toBe(0);
    });
  });

  describe('customer credit', () => {
    it('requires a customer when the sale is not fully paid', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [10] });
      const res = await ctx.admin.post('/sales/retail', {
        lines: [rollLine(rolls[0].id, 2)],
        payments: [{ method: 'CASH', amount: 1 }],
      });
      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('CUSTOMER_REQUIRED_FOR_CREDIT');
    });

    it('debits the unpaid balance to the customer ledger', async () => {
      const customer = await createCustomer(ctx.admin);
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [10] });

      const invoice = await ctx.admin.ok(
        ctx.admin.post('/sales/retail', {
          customerId: customer.id,
          lines: [rollLine(rolls[0].id, 4)],
          payments: [{ method: 'CASH', amount: 5 }],
        }),
      );

      expect(invoice.status).toBe('PARTIALLY_PAID');
      expect(dec(invoice.dueAmount)).toBe(15);
      const entries = await ctx.prisma.customerLedgerEntry.findMany({ where: { customerId: customer.id } });
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ referenceType: 'SALE_INVOICE', referenceId: invoice.id });
      expect(dec(entries[0].debit)).toBe(15);
      expect(dec(entries[0].balanceAfter)).toBe(15);
      const updated = await ctx.prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
      expect(dec(updated.currentBalance)).toBe(15);
    });

    it('credits customer payments to the ledger and balance', async () => {
      const customer = await createCustomer(ctx.admin);
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [10] });
      await ctx.admin.ok(
        ctx.admin.post('/sales/retail', {
          customerId: customer.id,
          lines: [rollLine(rolls[0].id, 6)],
          payments: [],
        }),
      );

      await ctx.admin.ok(ctx.admin.post(`/customers/${customer.id}/payments`, { amount: 12.5, paymentMethod: 'CASH' }));

      const updated = await ctx.prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
      expect(dec(updated.currentBalance)).toBe(17.5);
      const last = await ctx.prisma.customerLedgerEntry.findFirstOrThrow({
        where: { customerId: customer.id, credit: { gt: 0 } },
      });
      expect(dec(last.credit)).toBe(12.5);
      expect(dec(last.balanceAfter)).toBe(17.5);
    });

    it('does not lose updates under concurrent customer payments', async () => {
      const customer = await createCustomer(ctx.admin);
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [20] });
      await ctx.admin.ok(
        ctx.admin.post('/sales/retail', { customerId: customer.id, lines: [rollLine(rolls[0].id, 10)], payments: [] }),
      );

      const results = await Promise.all(
        [...Array(5)].map(() => ctx.admin.post(`/customers/${customer.id}/payments`, { amount: 5, paymentMethod: 'CASH' })),
      );

      expect(results.map((r) => r.status).every((s) => s < 300)).toBe(true);
      const updated = await ctx.prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
      expect(dec(updated.currentBalance)).toBe(25);
    });
  });

  describe('idempotency', () => {
    it('returns the original invoice for a repeated Idempotency-Key and deducts stock once', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [100] });
      const key = randomUUID();
      const body = { lines: [rollLine(rolls[0].id, 10)], payments: [{ method: 'CASH', amount: 50 }] };

      const first = await ctx.admin.ok(ctx.admin.post('/sales/retail', body, { 'Idempotency-Key': key }));
      const second = await ctx.admin.ok(ctx.admin.post('/sales/retail', body, { 'Idempotency-Key': key }));

      expect(second.id).toBe(first.id);
      expect(second.invoiceNumber).toBe(first.invoiceNumber);
      expect(dec((await getRoll(rolls[0].id)).remainingLengthYard)).toBe(90);
    });

    it('creates separate invoices without a key', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [100] });
      const body = { lines: [rollLine(rolls[0].id, 10)], payments: [{ method: 'CASH', amount: 50 }] };
      const a = await ctx.admin.ok(ctx.admin.post('/sales/retail', body));
      const b = await ctx.admin.ok(ctx.admin.post('/sales/retail', body));
      expect(a.id).not.toBe(b.id);
      expect(dec((await getRoll(rolls[0].id)).remainingLengthYard)).toBe(80);
    });
  });

  describe('concurrency', () => {
    const sell = (rollId: string, extra: Record<string, unknown> = {}, headers?: Record<string, string>) =>
      ctx.admin.post('/sales/retail', { lines: [rollLine(rollId, 1)], payments: [{ method: 'CASH', amount: 5 }], ...extra }, headers);

    it('lets several tills sell different rolls at the same moment with unique invoice numbers', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [10, 10, 10, 10, 10, 10] });
      const results = await Promise.all(rolls.map((r) => sell(r.id)));
      expect(results.map((r) => r.status)).toEqual(results.map(() => 201));
      const numbers = results.map((r) => r.body.data.invoiceNumber);
      expect(new Set(numbers).size).toBe(numbers.length);
    });

    it('queues concurrent sales on the same roll instead of failing them', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [10] });
      const results = await Promise.all([...Array(4)].map(() => sell(rolls[0].id)));
      expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201]);
      expect(dec((await getRoll(rolls[0].id)).remainingLengthYard)).toBe(6);
    });

    it('keeps the customer balance right under concurrent credit sales', async () => {
      const customer = await createCustomer(ctx.admin);
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [10, 10, 10, 10] });
      const results = await Promise.all(rolls.map((r) => sell(r.id, { customerId: customer.id, payments: [] })));
      expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201]);
      const updated = await ctx.prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
      expect(dec(updated.currentBalance)).toBe(20);
      const ledger = await ctx.prisma.customerLedgerEntry.findMany({ where: { customerId: customer.id } });
      expect(ledger.map((e) => dec(e.balanceAfter)).sort((a, b) => a - b)).toEqual([5, 10, 15, 20]);
    });

    it('creates one invoice when the same Idempotency-Key is submitted twice at once', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [10] });
      const key = randomUUID();
      const [a, b] = await Promise.all([sell(rolls[0].id, {}, { 'Idempotency-Key': key }), sell(rolls[0].id, {}, { 'Idempotency-Key': key })]);
      expect([a.status, b.status]).toEqual([201, 201]);
      expect(a.body.data.id).toBe(b.body.data.id);
      expect(dec((await getRoll(rolls[0].id)).remainingLengthYard)).toBe(9);
    });

    it('continues numbering from existing invoices when the day counter is missing', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [10, 10] });
      const first = await ctx.admin.ok(sell(rolls[0].id));
      const prefix = first.invoiceNumber.replace(/-\d+$/, '');
      await ctx.prisma.documentSequence.delete({ where: { key: prefix } });
      const second = await ctx.admin.ok(sell(rolls[1].id));
      const n = (inv: string) => Number(inv.split('-').pop());
      expect(n(second.invoiceNumber)).toBe(n(first.invoiceNumber) + 1);
    });
  });

  describe('quantity products', () => {
    it('deducts on-hand quantity and records a SALE movement for the stock item', async () => {
      const { stockItemIds } = await createPurchase(ctx, catalog, { rollLengths: [], itemQuantity: 10 });
      const before = await ctx.prisma.productStockItem.findUniqueOrThrow({ where: { id: stockItemIds[0] } });
      const invoice = await ctx.admin.ok(
        ctx.admin.post('/sales/retail', {
          quantityLines: [{ productId: catalog.fixedProductId, productStockItemId: stockItemIds[0], quantity: 4, unitPrice: 3 }],
          payments: [{ method: 'CASH', amount: 12 }],
        }),
      );
      const item = await ctx.prisma.productStockItem.findUniqueOrThrow({ where: { id: stockItemIds[0] } });
      expect(dec(item.quantityOnHand)).toBe(dec(before.quantityOnHand) - 4);
      const movement = await ctx.prisma.inventoryMovement.findFirstOrThrow({ where: { referenceId: invoice.id } });
      expect(movement).toMatchObject({ movementType: 'SALE', direction: 'OUT', productStockItemId: stockItemIds[0] });
    });
  });
});
