import { createTestContext, TestContext } from './helpers/app';
import { Catalog, createCatalog, createPurchase, dec } from './helpers/fixtures';

describe('Inventory: reconciliation, remnants, barcodes', () => {
  let ctx: TestContext;
  let catalog: Catalog;

  beforeAll(async () => {
    ctx = await createTestContext();
    catalog = await createCatalog(ctx);
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  const getRoll = (id: string) => ctx.prisma.roll.findUniqueOrThrow({ where: { id } });

  describe('roll reconciliation', () => {
    it('records a loss as wastage with a WASTAGE movement and sets the counted length', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [50] });
      await ctx.admin.ok(
        ctx.admin.post(`/rolls/${rolls[0].id}/reconcile`, { physicalLengthYard: '47.5', reason: 'Physical count short' }),
      );

      expect(dec((await getRoll(rolls[0].id)).remainingLengthYard)).toBe(47.5);
      const rec = await ctx.prisma.rollReconciliation.findFirstOrThrow({ where: { rollId: rolls[0].id } });
      expect(dec(rec.discrepancy)).toBe(-2.5);
      const wastage = await ctx.prisma.wastageEntry.findFirstOrThrow({ where: { rollId: rolls[0].id } });
      expect(wastage.sourceType).toBe('RECONCILIATION_LOSS');
      expect(dec(wastage.quantity)).toBe(2.5);
      const movement = await ctx.prisma.inventoryMovement.findFirstOrThrow({
        where: { rollId: rolls[0].id, movementType: 'WASTAGE' },
      });
      expect(movement.direction).toBe('OUT');
      expect(dec(movement.quantity)).toBe(2.5);
    });

    it('requires a reason when the count differs', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [50] });
      const res = await ctx.admin.post(`/rolls/${rolls[0].id}/reconcile`, { physicalLengthYard: '49', reason: '' });
      expect(res.status).toBe(400);
      expect(dec((await getRoll(rolls[0].id)).remainingLengthYard)).toBe(50);
    });

    it('rejects a negative physical length', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [50] });
      const res = await ctx.admin.post(`/rolls/${rolls[0].id}/reconcile`, { physicalLengthYard: '-1', reason: 'typo' });
      expect(res.status).toBe(400);
      expect(dec((await getRoll(rolls[0].id)).remainingLengthYard)).toBe(50);
    });

    it('records a gain as an IN adjustment without wastage', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [50] });
      await ctx.admin.ok(ctx.admin.post(`/rolls/${rolls[0].id}/reconcile`, { physicalLengthYard: '51', reason: 'Recount' }));
      expect(dec((await getRoll(rolls[0].id)).remainingLengthYard)).toBe(51);
      expect(await ctx.prisma.wastageEntry.count({ where: { rollId: rolls[0].id } })).toBe(0);
      const movement = await ctx.prisma.inventoryMovement.findFirstOrThrow({
        where: { rollId: rolls[0].id, movementType: 'ADJUSTMENT' },
      });
      expect(movement.direction).toBe('IN');
    });
  });

  describe('remnants', () => {
    it('cuts a remnant from a roll, deducting its length with a movement', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [20] });
      const remnant = await ctx.admin.ok(
        ctx.admin.post('/remnants', { rollId: rolls[0].id, lengthYard: '1.75', reason: 'End piece' }),
      );

      expect(dec(remnant.lengthYard)).toBe(1.75);
      expect(remnant.status).toBe('AVAILABLE');
      expect(dec((await getRoll(rolls[0].id)).remainingLengthYard)).toBe(18.25);
      const movement = await ctx.prisma.inventoryMovement.findFirstOrThrow({
        where: { rollId: rolls[0].id, movementType: 'REMNANT_CREATED' },
      });
      expect(dec(movement.quantity)).toBe(1.75);
    });

    it('rejects a remnant longer than the roll', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [2] });
      const res = await ctx.admin.post('/remnants', { rollId: rolls[0].id, lengthYard: '2.5', reason: 'too long' });
      expect(res.status).toBe(400);
      expect(dec((await getRoll(rolls[0].id)).remainingLengthYard)).toBe(2);
    });

    it('marks the roll FINISHED when the whole roll becomes a remnant', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [3] });
      await ctx.admin.ok(ctx.admin.post('/remnants', { rollId: rolls[0].id, lengthYard: '3', reason: 'Last piece' }));
      const roll = await getRoll(rolls[0].id);
      expect(dec(roll.remainingLengthYard)).toBe(0);
      expect(roll.status).toBe('FINISHED');
    });

    it('applies both a remnant and a sale that hit the same roll concurrently', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [20] });
      const [sale, remnant] = await Promise.all([
        ctx.admin.post('/sales/retail', {
          lines: [{ productId: catalog.rollProductId, rollId: rolls[0].id, billedQuantity: 10, unit: 'YARD', unitPrice: 5 }],
          payments: [{ method: 'CASH', amount: 50 }],
        }),
        ctx.admin.post('/remnants', { rollId: rolls[0].id, lengthYard: '5', reason: 'Offcut' }),
      ]);
      expect([sale.status, remnant.status]).toEqual([201, 201]);
      expect(dec((await getRoll(rolls[0].id)).remainingLengthYard)).toBe(5);
    });
  });

  describe('barcode lookup', () => {
    it('finds a roll by its barcode', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [12] });
      const data = await ctx.admin.ok(ctx.admin.get(`/barcodes/${encodeURIComponent(rolls[0].barcode!)}/lookup`));
      expect(data.type).toBe('ROLL');
      expect(data.blocked).toBe(false);
      expect(data.roll.id).toBe(rolls[0].id);
      expect(dec(data.roll.remainingLengthYard)).toBe(12);
    });

    it('flags a sold roll as blocked', async () => {
      const { rolls } = await createPurchase(ctx, catalog, { rollLengths: [2] });
      await ctx.admin.ok(
        ctx.admin.post('/sales/retail', {
          lines: [{ productId: catalog.rollProductId, rollId: rolls[0].id, billedQuantity: 2, unit: 'YARD', unitPrice: 5 }],
          payments: [{ method: 'CASH', amount: 10 }],
        }),
      );
      const data = await ctx.admin.ok(ctx.admin.get(`/barcodes/${encodeURIComponent(rolls[0].barcode!)}/lookup`));
      expect(data.blocked).toBe(true);
    });

    it('finds a product by its barcode', async () => {
      const product = await ctx.prisma.product.update({
        where: { id: catalog.fixedProductId },
        data: { barcode: `PRD-${Date.now()}` },
      });
      const data = await ctx.admin.ok(ctx.admin.get(`/barcodes/${product.barcode}/lookup`));
      expect(data.type).toBe('PRODUCT');
    });

    it('returns 404 for an unknown barcode', async () => {
      const res = await ctx.admin.get('/barcodes/NOPE-000000/lookup');
      expect(res.status).toBe(404);
    });
  });
});
