import { randomUUID } from 'crypto';
import { createTestContext, TestContext } from './helpers/app';
import { Catalog, createCatalog, createCustomer, createPurchase, dec } from './helpers/fixtures';

describe('Customer payments are applied to the oldest unpaid invoices', () => {
  let ctx: TestContext;
  let catalog: Catalog;

  beforeAll(async () => {
    ctx = await createTestContext();
    catalog = await createCatalog(ctx);
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  /** Creates a credit sale of `yards` x 5.00 with nothing paid. */
  async function creditSale(customerId: string, yards: number) {
    const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [100] });
    return ctx.admin.ok(
      ctx.admin.post('/sales/retail', {
        customerId,
        lines: [{ productId: catalog.rollProductId, rollId: rolls[0].id, billedQuantity: yards, unit: 'YARD', unitPrice: 5 }],
        payments: [],
      }),
    );
  }
  const invoice = (id: string) => ctx.prisma.saleInvoice.findUniqueOrThrow({ where: { id } });
  const pay = (customerId: string, amount: number, extra: Record<string, unknown> = {}) =>
    ctx.admin.post(`/customers/${customerId}/payments`, { amount, paymentMethod: 'CASH', ...extra });

  it('pays off the oldest invoice first and part-pays the next', async () => {
    const customer = await createCustomer(ctx.admin);
    const older = await creditSale(customer.id, 4); // 20 due
    const newer = await creditSale(customer.id, 6); // 30 due

    const payment = await ctx.admin.ok(pay(customer.id, 25));

    expect(payment.allocations).toEqual([
      expect.objectContaining({ invoiceId: older.id, amount: '20', dueAfter: '0' }),
      expect.objectContaining({ invoiceId: newer.id, amount: '5', dueAfter: '25' }),
    ]);
    expect(dec(payment.unallocatedAmount)).toBe(0);

    const a = await invoice(older.id);
    expect([dec(a.paidAmount), dec(a.dueAmount), a.status, a.paymentStatus]).toEqual([20, 0, 'PAID', 'PAID']);
    const b = await invoice(newer.id);
    expect([dec(b.paidAmount), dec(b.dueAmount), b.status, b.paymentStatus]).toEqual([5, 25, 'PARTIALLY_PAID', 'PARTIALLY_PAID']);

    const rows = await ctx.prisma.customerPaymentAllocation.findMany({ where: { paymentId: payment.id } });
    expect(rows.map((r) => dec(r.amount)).sort((x, y) => x - y)).toEqual([5, 20]);
  });

  it('keeps outstanding invoices in step with the customer balance', async () => {
    const customer = await createCustomer(ctx.admin);
    await creditSale(customer.id, 4);
    await creditSale(customer.id, 6);
    await ctx.admin.ok(pay(customer.id, 12.5));

    const outstanding = await ctx.admin.ok(ctx.admin.get(`/customers/${customer.id}/outstanding`));
    expect(dec(outstanding.currentBalance)).toBe(37.5);
    expect(dec(outstanding.totalOutstandingAmount)).toBe(37.5);
    expect(outstanding.unpaidInvoicesCount).toBe(2);
  });

  it('starts from a part-paid sale and leaves an overpayment as customer credit', async () => {
    const customer = await createCustomer(ctx.admin);
    const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [100] });
    const sale = await ctx.admin.ok(
      ctx.admin.post('/sales/retail', {
        customerId: customer.id,
        lines: [{ productId: catalog.rollProductId, rollId: rolls[0].id, billedQuantity: 10, unit: 'YARD', unitPrice: 5 }],
        payments: [{ method: 'CASH', amount: 15 }],
      }),
    ); // 50 total, 35 due

    const payment = await ctx.admin.ok(pay(customer.id, 50));

    expect(payment.allocations).toEqual([expect.objectContaining({ invoiceId: sale.id, amount: '35', dueAfter: '0' })]);
    expect(dec(payment.unallocatedAmount)).toBe(15);
    const inv = await invoice(sale.id);
    expect([dec(inv.paidAmount), dec(inv.dueAmount), inv.status]).toEqual([50, 0, 'PAID']);
    const c = await ctx.prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(dec(c.currentBalance)).toBe(-15);
  });

  it('records a payment with no open invoices as credit only', async () => {
    const customer = await createCustomer(ctx.admin);
    const payment = await ctx.admin.ok(pay(customer.id, 10));
    expect(payment.allocations).toEqual([]);
    expect(dec(payment.unallocatedAmount)).toBe(10);
  });

  it('never over-applies under concurrent payments', async () => {
    const customer = await createCustomer(ctx.admin);
    const invoices = [await creditSale(customer.id, 2), await creditSale(customer.id, 4), await creditSale(customer.id, 4)]; // 10 + 20 + 20

    const results = await Promise.all([...Array(6)].map(() => pay(customer.id, 10)));
    expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201, 201, 201]);

    for (const inv of invoices) {
      const row = await invoice(inv.id);
      expect(dec(row.dueAmount)).toBe(0);
      expect(dec(row.paidAmount)).toBe(dec(row.netAmount));
      const applied = await ctx.prisma.customerPaymentAllocation.aggregate({ where: { invoiceId: inv.id }, _sum: { amount: true } });
      expect(dec(applied._sum.amount)).toBe(dec(row.netAmount));
    }
    const c = await ctx.prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(dec(c.currentBalance)).toBe(-10);
  });

  it('does not apply a retried payment twice', async () => {
    const customer = await createCustomer(ctx.admin);
    const sale = await creditSale(customer.id, 6); // 30 due
    const key = randomUUID();

    const first = await ctx.admin.ok(pay(customer.id, 10, { idempotencyKey: key }));
    const second = await ctx.admin.ok(pay(customer.id, 10, { idempotencyKey: key }));

    expect(second.id).toBe(first.id);
    expect(second.allocations).toEqual([expect.objectContaining({ invoiceId: sale.id, amount: '10' })]);
    expect(dec((await invoice(sale.id)).dueAmount)).toBe(20);
    expect(await ctx.prisma.customerPaymentAllocation.count({ where: { invoiceId: sale.id } })).toBe(1);
  });

  it('writes the allocations into the audit log', async () => {
    const customer = await createCustomer(ctx.admin);
    const sale = await creditSale(customer.id, 2);
    const payment = await ctx.admin.ok(pay(customer.id, 10));
    const log = await ctx.prisma.auditLog.findFirstOrThrow({ where: { action: 'CUSTOMER_PAYMENT_RECORDED', recordId: payment.id } });
    const values = JSON.parse(log.newValues!);
    expect(values.allocations).toEqual([expect.objectContaining({ invoiceId: sale.id, amount: '10' })]);
  });
});
