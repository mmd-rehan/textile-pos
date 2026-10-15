import * as ExcelJS from 'exceljs';
import { createTestContext, TestContext } from './helpers/app';
import { Catalog, createCatalog, createPurchase, loginAsRole } from './helpers/fixtures';

describe('Batches and Excel exports', () => {
  let ctx: TestContext;
  let catalog: Catalog;

  beforeAll(async () => {
    ctx = await createTestContext();
    catalog = await createCatalog(ctx);
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  describe('batches', () => {
    it('creates, renames, clears the supplier and deletes an unused batch', async () => {
      const number = `B-${Date.now()}`;
      const batch = await ctx.admin.ok(
        ctx.admin.post('/batches', { batchNumber: number, supplierId: catalog.supplierId, receivedAt: new Date().toISOString() }),
      );
      expect(batch.supplier.id).toBe(catalog.supplierId);

      const dup = await ctx.admin.post('/batches', { batchNumber: number });
      expect(dup.status).toBe(409);

      const updated = await ctx.admin.ok(ctx.admin.put(`/batches/${batch.id}`, { batchNumber: `${number}-X`, supplierId: null }));
      expect(updated.batchNumber).toBe(`${number}-X`);
      expect(updated.supplierId).toBeNull();

      const del = await ctx.admin.ok(ctx.admin.delete(`/batches/${batch.id}`));
      expect(del.id).toBe(batch.id);
    });

    it('refuses to delete a batch that has rolls', async () => {
      const number = `B-ROLLS-${Date.now()}`;
      const purchase = await ctx.admin.ok(
        ctx.admin.post('/purchases', {
          supplierId: catalog.supplierId,
          batchNumber: number,
          rolls: [{ productId: catalog.rollProductId, originalLengthYard: 10, purchasePricePerYard: 1, salePricePerYard: 2 }],
        }),
      );
      expect(purchase.id).toBeTruthy();
      const batch = await ctx.prisma.batch.findUniqueOrThrow({ where: { batchNumber: number } });
      const res = await ctx.admin.delete(`/batches/${batch.id}`);
      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('BATCH_HAS_ROLLS');
    });

    it('forbids a cashier from creating batches', async () => {
      const cashier = await loginAsRole(ctx, 'Cashier');
      expect((await cashier.post('/batches', { batchNumber: `B-C-${Date.now()}` })).status).toBe(403);
    });
  });

  describe('supplier statement export', () => {
    it('exports the same entries and balances as the statement screen', async () => {
      const { purchase } = await createPurchase(ctx, catalog, { rollLengths: [50] }); // 100 owed
      await ctx.admin.ok(
        ctx.admin.post(`/purchases/${purchase.id}/payments`, { amount: 40, paymentMethod: 'CASH', paymentDate: new Date().toISOString() }),
      );
      const stmt = await ctx.admin.ok(ctx.admin.get(`/suppliers/${catalog.supplierId}/statement`));

      const res = await ctx.admin.download(`/suppliers/${catalog.supplierId}/statement/export`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect(res.headers['content-disposition']).toMatch(/supplier-statement-.+\.xlsx/);

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(res.body as unknown as ArrayBuffer);
      const ws = wb.getWorksheet('Statement')!;
      const values = (r: number) => (ws.getRow(r).values as unknown[]).slice(1);
      const labelRow = (label: string) => {
        for (let r = 1; r <= ws.rowCount; r++) if (values(r)[0] === label) return values(r);
        throw new Error(`row ${label} not found`);
      };
      expect(labelRow('Closing balance')[1]).toBe(Number(stmt.closingBalanceBase));
      let headerRow = 0;
      for (let r = 1; r <= ws.rowCount; r++) if (values(r)[0] === 'Date') headerRow = r;
      expect(ws.rowCount - headerRow).toBe(stmt.entries.length);
      const lastBalance = values(ws.rowCount)[9];
      expect(lastBalance).toBe(Number(stmt.entries[stmt.entries.length - 1].balanceAfterBase));
    });

    it('requires suppliers.view_statement', async () => {
      const cashier = await loginAsRole(ctx, 'Cashier');
      const res = await cashier.download(`/suppliers/${catalog.supplierId}/statement/export`);
      expect(res.status).toBe(403);
    });
  });

  describe('report exports', () => {
    it.each(['sales', 'inventory-stock', 'wastage', 'purchases', 'customers-outstanding'])(
      'exports %s as a valid workbook with a header row',
      async (report) => {
        const res = await ctx.admin.download(`/reports/export/${report}`);
        expect(res.status).toBe(200);
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(res.body as unknown as ArrayBuffer);
        expect(wb.worksheets[0].rowCount).toBeGreaterThanOrEqual(1);
      },
    );

    it('rejects an unknown report and a missing permission', async () => {
      expect((await ctx.admin.download('/reports/export/nope')).status).toBe(404);
      const cashier = await loginAsRole(ctx, 'Cashier');
      expect((await cashier.download('/reports/export/purchases')).status).toBe(403);
    });
  });
});
