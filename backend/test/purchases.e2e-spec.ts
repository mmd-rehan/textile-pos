import { createTestContext, TestContext } from './helpers/app';
import { Catalog, createCatalog, createPurchase, dec } from './helpers/fixtures';

describe('Purchases', () => {
  let ctx: TestContext;
  let catalog: Catalog;

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  beforeEach(async () => {
    // fresh supplier per test so balances start at zero
    catalog = await createCatalog(ctx);
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  const supplierBalance = async () =>
    dec((await ctx.prisma.supplier.findUniqueOrThrow({ where: { id: catalog.supplierId } })).currentBalance);

  it('posts multiple rolls with their own lengths, movements and costing', async () => {
    const { purchase, rolls } = await createPurchase(ctx, catalog, { rollLengths: [45.5, 60, 72.25] });

    expect(rolls.map((r) => dec(r.originalLengthYard))).toEqual(expect.arrayContaining([45.5, 60, 72.25]));
    for (const roll of rolls) {
      expect(roll.status).toBe('IN_STOCK');
      expect(dec(roll.remainingLengthYard)).toBe(dec(roll.originalLengthYard));
      expect(roll.barcode).toBeTruthy();
    }
    expect(new Set(rolls.map((r) => r.barcode)).size).toBe(3);

    const movements = await ctx.prisma.inventoryMovement.findMany({ where: { referenceId: purchase.id } });
    expect(movements).toHaveLength(3);
    for (const m of movements) expect(m).toMatchObject({ movementType: 'PURCHASE', direction: 'IN' });
    expect(movements.reduce((s, m) => s + dec(m.quantity), 0)).toBeCloseTo(177.75, 4);

    // 177.75 yd x 2.00
    expect(dec(purchase.totalOriginalCurrency)).toBe(355.5);
    expect(dec(purchase.dueAmountOriginalCurrency)).toBe(355.5);
    expect(purchase.status).not.toBe('PAID');
  });

  it('adds quantity stock for fixed products with a movement', async () => {
    const { purchase, stockItemIds } = await createPurchase(ctx, catalog, { rollLengths: [], itemQuantity: 25 });
    expect(stockItemIds).toHaveLength(1);
    const movement = await ctx.prisma.inventoryMovement.findFirstOrThrow({ where: { referenceId: purchase.id } });
    expect(movement).toMatchObject({ movementType: 'PURCHASE', direction: 'IN', productStockItemId: stockItemIds[0] });
    expect(dec(movement.quantity)).toBe(25);
  });

  it('records the unpaid amount on the supplier balance and ledger', async () => {
    const { purchase } = await createPurchase(ctx, catalog, { rollLengths: [50], paidAmount: 30 });

    expect(dec(purchase.paidAmountOriginalCurrency)).toBe(30);
    expect(dec(purchase.dueAmountOriginalCurrency)).toBe(70);
    expect(await supplierBalance()).toBe(70);
    const last = await ctx.prisma.supplierLedgerEntry.findFirstOrThrow({
      where: { supplierId: catalog.supplierId },
      orderBy: { createdAt: 'desc' },
    });
    expect(dec(last.balanceAfterBase)).toBe(70);
  });

  it('stores original currency, exchange rate and base amounts for a foreign-currency purchase', async () => {
    const base = await ctx.prisma.companySetting.findUnique({ where: { key: 'company_currency' } });
    const foreign = base?.value === 'AED' ? 'USD' : 'AED';
    const purchase = await ctx.admin.ok(
      ctx.admin.post('/purchases', {
        supplierId: catalog.supplierId,
        currency: foreign,
        exchangeRateToBaseCurrency: 0.5,
        rolls: [{ productId: catalog.rollProductId, originalLengthYard: 10, purchasePricePerYard: 3, salePricePerYard: 5 }],
      }),
    );
    expect(purchase.purchaseCurrencyCode).toBe(foreign);
    expect(dec(purchase.exchangeRateToBaseCurrency)).toBe(0.5);
    expect(dec(purchase.totalOriginalCurrency)).toBe(30);
    expect(dec(purchase.totalBaseCurrency)).toBe(15);
  });

  it('posts concurrent purchases with unique PO numbers', async () => {
    const results = await Promise.all(
      [...Array(4)].map(() =>
        ctx.admin.post('/purchases', {
          supplierId: catalog.supplierId,
          rolls: [{ productId: catalog.rollProductId, originalLengthYard: 5, purchasePricePerYard: 1, salePricePerYard: 2 }],
        }),
      ),
    );
    expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201]);
    expect(new Set(results.map((r) => r.body.data.poNumber)).size).toBe(4);
    expect(await supplierBalance()).toBe(20);
  });

  it('does not lose stock when a purchase and a sale change the same stock item at once', async () => {
    const { stockItemIds } = await createPurchase(ctx, catalog, { rollLengths: [], itemQuantity: 10 });
    const before = dec((await ctx.prisma.productStockItem.findUniqueOrThrow({ where: { id: stockItemIds[0] } })).quantityOnHand);
    const [sale, purchase] = await Promise.all([
      ctx.admin.post('/sales/retail', {
        quantityLines: [{ productId: catalog.fixedProductId, productStockItemId: stockItemIds[0], quantity: 3, unitPrice: 3 }],
        payments: [{ method: 'CASH', amount: 9 }],
      }),
      ctx.admin.post('/purchases', {
        supplierId: catalog.supplierId,
        items: [{ productId: catalog.fixedProductId, quantity: 5, purchasePricePerUnit: 1, salePricePerUnit: 3 }],
      }),
    ]);
    expect([sale.status, purchase.status]).toEqual([201, 201]);
    const after = dec((await ctx.prisma.productStockItem.findUniqueOrThrow({ where: { id: stockItemIds[0] } })).quantityOnHand);
    expect(after).toBe(before - 3 + 5);
  });

  it('requires an exchange rate for a foreign-currency purchase instead of assuming 1:1', async () => {
    const base = await ctx.prisma.companySetting.findUnique({ where: { key: 'company_currency' } });
    const foreign = base?.value === 'AED' ? 'USD' : 'AED';
    const res = await ctx.admin.post('/purchases', {
      supplierId: catalog.supplierId,
      currency: foreign,
      rolls: [{ productId: catalog.rollProductId, originalLengthYard: 10, purchasePricePerYard: 3, salePricePerYard: 5 }],
    });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('EXCHANGE_RATE_REQUIRED');
    expect(await supplierBalance()).toBe(0);
  });

  it('rejects an initial payment larger than the purchase total', async () => {
    const res = await ctx.admin.post('/purchases', {
      supplierId: catalog.supplierId,
      paidAmount: 25,
      rolls: [{ productId: catalog.rollProductId, originalLengthYard: 10, purchasePricePerYard: 2, salePricePerYard: 5 }],
    });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('PAID_EXCEEDS_TOTAL');
  });

  describe('supplier payments', () => {
    it('reduces the due amount, supplier balance and marks the purchase PAID', async () => {
      const { purchase } = await createPurchase(ctx, catalog, { rollLengths: [50] });

      await ctx.admin.ok(
        ctx.admin.post(`/purchases/${purchase.id}/payments`, { amount: 40, paymentMethod: 'CASH', paymentDate: new Date().toISOString() }),
      );
      let po = await ctx.prisma.purchaseOrder.findUniqueOrThrow({ where: { id: purchase.id } });
      expect(dec(po.dueAmountOriginalCurrency)).toBe(60);
      expect(await supplierBalance()).toBe(60);

      await ctx.admin.ok(
        ctx.admin.post(`/purchases/${purchase.id}/payments`, { amount: 60, paymentMethod: 'BANK', paymentDate: new Date().toISOString() }),
      );
      po = await ctx.prisma.purchaseOrder.findUniqueOrThrow({ where: { id: purchase.id } });
      expect(dec(po.dueAmountOriginalCurrency)).toBe(0);
      expect(po.status).toBe('PAID');
      expect(await supplierBalance()).toBe(0);
    });

    it('rejects paying more than is due', async () => {
      const { purchase } = await createPurchase(ctx, catalog, { rollLengths: [10] });
      const res = await ctx.admin.post(`/purchases/${purchase.id}/payments`, {
        amount: 20.01,
        paymentMethod: 'CASH',
        paymentDate: new Date().toISOString(),
      });
      expect(res.status).toBe(400);
      expect(await supplierBalance()).toBe(20);
    });

    it('never overpays under concurrent payments', async () => {
      const { purchase } = await createPurchase(ctx, catalog, { rollLengths: [100] }); // due 200
      const results = await Promise.all(
        [...Array(6)].map(() =>
          ctx.admin.post(`/purchases/${purchase.id}/payments`, { amount: 50, paymentMethod: 'CASH', paymentDate: new Date().toISOString() }),
        ),
      );
      const ok = results.filter((r) => r.status < 300).length;
      expect(ok).toBeLessThanOrEqual(4);
      const po = await ctx.prisma.purchaseOrder.findUniqueOrThrow({ where: { id: purchase.id } });
      expect(dec(po.dueAmountOriginalCurrency)).toBe(200 - ok * 50);
      expect(await supplierBalance()).toBe(200 - ok * 50);
      expect(await ctx.prisma.supplierPayment.count({ where: { purchaseOrderId: purchase.id } })).toBe(ok);
    });
  });
});
