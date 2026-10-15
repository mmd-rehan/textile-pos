import { createTestContext, TestApi, TestContext } from './helpers/app';
import { Catalog, createCatalog, createPurchase, loginAsRole } from './helpers/fixtures';

describe('Authentication and permissions', () => {
  let ctx: TestContext;
  let catalog: Catalog;
  let cashier: TestApi;

  beforeAll(async () => {
    ctx = await createTestContext();
    catalog = await createCatalog(ctx);
    cashier = await loginAsRole(ctx, 'Cashier');
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  it('rejects requests without a token', async () => {
    expect((await ctx.anon.get('/sales')).status).toBe(401);
    expect((await ctx.anon.post('/sales/retail', {})).status).toBe(401);
  });

  it('rejects a bad password', async () => {
    const res = await ctx.anon.post('/auth/login', { identifier: 'test-admin', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    expect((await ctx.anon.withToken('not-a-jwt').get('/sales')).status).toBe(401);
  });

  it('forbids a cashier from posting purchases, reconciling rolls and recording wastage', async () => {
    const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [10] });

    const purchase = await cashier.post('/purchases', {
      supplierId: catalog.supplierId,
      rolls: [{ productId: catalog.rollProductId, originalLengthYard: 10, purchasePricePerYard: 2, salePricePerYard: 5 }],
    });
    expect(purchase.status).toBe(403);

    const reconcile = await cashier.post(`/rolls/${rolls[0].id}/reconcile`, { physicalLengthYard: '1', reason: 'x' });
    expect(reconcile.status).toBe(403);

    const wastage = await cashier.post('/wastage/manual', {
      rollId: rolls[0].id,
      quantity: '1',
      unit: 'YARD',
      sourceType: 'MANUAL_DAMAGE',
      reason: 'x',
    });
    expect(wastage.status).toBe(403);

    const roll = await ctx.prisma.roll.findUniqueOrThrow({ where: { id: rolls[0].id } });
    expect(Number(roll.remainingLengthYard)).toBe(10);
  });

  it('forbids a cashier from managing users and settings', async () => {
    expect((await cashier.get('/users')).status).toBe(403);
    expect((await cashier.put('/settings/company', {})).status).toBe(403);
    expect((await cashier.put('/settings/flags/creditSales', { isEnabled: false })).status).toBe(403);
  });

  it('lets a cashier run the whole POS flow: scan, search, sell, print', async () => {
    const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [10] });

    await cashier.ok(cashier.get(`/barcodes/${encodeURIComponent(rolls[0].barcode!)}/lookup`));
    await cashier.ok(cashier.get('/products/pos-search?search=Test&limit=10'));
    await cashier.ok(cashier.get('/settings/tax'));
    const company = await cashier.ok(cashier.get('/settings/company'));
    expect(company.company_currency).toBeTruthy();
    const flags = await cashier.ok(cashier.get('/settings/flags'));
    expect(flags.creditSales).toBe(true);
    const invoice = await cashier.ok(
      cashier.post('/sales/retail', {
        lines: [{ productId: catalog.rollProductId, rollId: rolls[0].id, billedQuantity: 1, unit: 'YARD', unitPrice: 5 }],
        payments: [{ method: 'CASH', amount: 5 }],
      }),
    );
    await cashier.ok(cashier.get(`/sales/${invoice.id}/receipt`));
  });
});
