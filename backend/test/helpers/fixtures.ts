import { randomUUID } from 'crypto';
import argon2 from 'argon2';
import { TestApi, TestContext } from './app';

const uid = () => randomUUID().slice(0, 8);

export interface Catalog {
  supplierId: string;
  rollProductId: string;
  fixedProductId: string;
}

/** Creates a supplier plus one FABRIC_ROLL and one FIXED_PRODUCT product. */
export async function createCatalog(ctx: TestContext): Promise<Catalog> {
  const { admin, prisma } = ctx;
  const [yard, piece] = await Promise.all([
    prisma.unit.findUniqueOrThrow({ where: { abbreviation: 'yd' } }),
    prisma.unit.findUniqueOrThrow({ where: { abbreviation: 'pc' } }),
  ]);
  const category = await admin.ok(admin.post('/categories', { name: `Category ${uid()}` }));
  const supplier = await admin.ok(admin.post('/suppliers', { name: `Supplier ${uid()}` }));
  const rollProduct = await admin.ok(
    admin.post('/products', {
      productCode: `ROLL-${uid()}`,
      name: 'Test Lawn',
      productType: 'FABRIC_ROLL',
      categoryId: category.id,
      defaultUnitId: yard.id,
      retailPrice: 5,
      wholesalePrice: 4,
    }),
  );
  const fixedProduct = await admin.ok(
    admin.post('/products', {
      productCode: `FIX-${uid()}`,
      name: 'Test Zipper',
      productType: 'FIXED_PRODUCT',
      categoryId: category.id,
      defaultUnitId: piece.id,
      retailPrice: 3,
      wholesalePrice: 2,
    }),
  );
  return { supplierId: supplier.id, rollProductId: rollProduct.id, fixedProductId: fixedProduct.id };
}

export interface PurchaseResult {
  purchase: any;
  rolls: any[];
  stockItemIds: string[];
}

/** Posts a purchase and returns it with the created rolls and stock item ids. */
export async function createPurchase(
  ctx: TestContext,
  catalog: Catalog,
  opts: { rollLengths?: number[]; itemQuantity?: number; paidAmount?: number } = {},
): Promise<PurchaseResult> {
  const { admin, prisma } = ctx;
  const rollLengths = opts.rollLengths ?? [100];
  const purchase = await admin.ok(
    admin.post('/purchases', {
      supplierId: catalog.supplierId,
      paidAmount: opts.paidAmount ?? 0,
      rolls: rollLengths.map((len) => ({
        productId: catalog.rollProductId,
        originalLengthYard: len,
        purchasePricePerYard: 2,
        salePricePerYard: 5,
      })),
      items: opts.itemQuantity
        ? [{ productId: catalog.fixedProductId, quantity: opts.itemQuantity, purchasePricePerUnit: 1, salePricePerUnit: 3 }]
        : undefined,
    }),
  );
  const rolls = await prisma.roll.findMany({
    where: { purchaseRolls: { some: { purchaseOrderId: purchase.id } } },
    orderBy: { rollNumber: 'asc' },
  });
  const movements = await prisma.inventoryMovement.findMany({
    where: { referenceId: purchase.id, productStockItemId: { not: null } },
    select: { productStockItemId: true },
  });
  return { purchase, rolls, stockItemIds: [...new Set(movements.map((m) => m.productStockItemId!))] };
}

export async function createCustomer(api: TestApi, overrides: Record<string, unknown> = {}) {
  return api.ok(api.post('/customers', { name: `Customer ${uid()}`, phone: `0300${Date.now() % 10000000}`, ...overrides }));
}

/** Creates an active user with the given seeded role and returns a logged-in client. */
export async function loginAsRole(ctx: TestContext, roleName: string): Promise<TestApi> {
  const role = await ctx.prisma.role.findUniqueOrThrow({ where: { name: roleName } });
  const username = `${roleName.toLowerCase().replace(/\s+/g, '-')}-${uid()}`;
  const password = 'role-user-password';
  await ctx.prisma.user.create({
    data: {
      username,
      email: `${username}@textilepos.test`,
      passwordHash: await argon2.hash(password),
      status: 'ACTIVE',
      userRoles: { create: { roleId: role.id } },
    },
  });
  return ctx.anon.login(username, password);
}

export const dec = (v: unknown) => Number(v);
