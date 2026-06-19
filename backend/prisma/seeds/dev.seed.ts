/**
 * Dev / demo seed — SAMPLE BUSINESS DATA ONLY.
 *
 * This is the previous richer seed (categories, brands, colors, designs,
 * suppliers, customers, sample products) preserved here so it never runs as part
 * of a normal/production install. It is opt-in only:
 *
 *   npm run db:seed:dev            (standard seed + this)
 *   SEED_DEV_DATA=true npx prisma db seed
 *
 * Safety:
 *   - Aborts when NODE_ENV=production unless ALLOW_DEV_SEED_IN_PRODUCTION=true.
 *   - Idempotent: re-running upserts the same recognizable demo records.
 *   - Depends on the standard seed having created units first.
 *   - Creates no sales / purchases / rolls / ledger movements.
 */

import { PrismaClient } from '@prisma/client';
import { bump, envBool, logStats, newStats } from './seed-utils';

export async function runDevSeed(prisma: PrismaClient): Promise<void> {
  const isProd = (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
  if (isProd && !envBool('ALLOW_DEV_SEED_IN_PRODUCTION')) {
    console.log(
      '🛑  Dev/demo seed aborted: NODE_ENV=production. Set ALLOW_DEV_SEED_IN_PRODUCTION=true to force.',
    );
    return;
  }

  console.log('');
  console.log('🧪  DEMO DATA — seeding sample business records (dev seed).');
  console.log('    Do not run this against a real shop database.');

  // ── Categories ──────────────────────────────────────────────────────────────
  const categoryData = [
    { name: 'Fabric',      description: 'Raw fabric rolls and cloth' },
    { name: 'Ready-Made',  description: 'Finished garments and ready-made items' },
    { name: 'Accessories', description: 'Buttons, zippers, trims, and notions' },
    { name: 'Cut Pieces',  description: 'Pre-cut fabric pieces' },
  ];
  const categoryMap = new Map<string, string>();
  const catStats = newStats();
  for (const c of categoryData) {
    const existing = await prisma.category.findFirst({ where: { name: c.name } });
    let cat;
    if (existing) {
      cat = await prisma.category.update({ where: { id: existing.id }, data: { description: c.description } });
    } else {
      cat = await prisma.category.create({ data: c });
    }
    categoryMap.set(cat.name, cat.id);
    bump(catStats, !existing);
  }
  logStats('Demo categories', catStats);

  // ── Brands ────────────────────────────────────────────────────────────────
  const brandData = [
    { name: 'AlKaram',   description: 'AlKaram Studio' },
    { name: 'Gul Ahmed', description: 'Gul Ahmed Textile Mills' },
    { name: 'Sapphire',  description: 'Sapphire Fibres Ltd.' },
    { name: 'Unbranded', description: 'Generic / no brand' },
  ];
  const brandMap = new Map<string, string>();
  const brandStats = newStats();
  for (const b of brandData) {
    const existing = await prisma.brand.findUnique({ where: { name: b.name } });
    const brand = await prisma.brand.upsert({
      where: { name: b.name },
      update: { description: b.description },
      create: b,
    });
    brandMap.set(brand.name, brand.id);
    bump(brandStats, !existing);
  }
  logStats('Demo brands', brandStats);

  // ── Colors ──────────────────────────────────────────────────────────────
  const colorData = [
    { name: 'White',     colorCode: '#FFFFFF' },
    { name: 'Black',     colorCode: '#000000' },
    { name: 'Navy Blue', colorCode: '#001F5B' },
    { name: 'Sky Blue',  colorCode: '#87CEEB' },
    { name: 'Red',       colorCode: '#FF0000' },
    { name: 'Green',     colorCode: '#008000' },
    { name: 'Brown',     colorCode: '#8B4513' },
    { name: 'Grey',      colorCode: '#808080' },
    { name: 'Cream',     colorCode: '#FFFDD0' },
    { name: 'Maroon',    colorCode: '#800000' },
  ];
  const colorStats = newStats();
  for (const c of colorData) {
    const existing = await prisma.color.findUnique({ where: { name: c.name } });
    await prisma.color.upsert({
      where: { name: c.name },
      update: { colorCode: c.colorCode, isActive: true },
      create: { name: c.name, colorCode: c.colorCode, isActive: true },
    });
    bump(colorStats, !existing);
  }
  logStats('Demo colors', colorStats);

  // ── Designs ───────────────────────────────────────────────────────────────
  const designData = [
    { name: 'Plain',       designCode: 'PLN' },
    { name: 'Stripe',      designCode: 'STR' },
    { name: 'Check',       designCode: 'CHK' },
    { name: 'Floral',      designCode: 'FLR' },
    { name: 'Geometric',   designCode: 'GEO' },
    { name: 'Embroidered', designCode: 'EMB' },
  ];
  const designStats = newStats();
  for (const d of designData) {
    const existing = await prisma.design.findUnique({ where: { name: d.name } });
    await prisma.design.upsert({
      where: { name: d.name },
      update: { designCode: d.designCode, isActive: true },
      create: { name: d.name, designCode: d.designCode, isActive: true },
    });
    bump(designStats, !existing);
  }
  logStats('Demo designs', designStats);

  // ── Suppliers ───────────────────────────────────────────────────────────────
  const supplierData = [
    { name: 'Karachi Fabric House',  contactName: 'Ahmed Raza',         phone: '+92-21-1234567', email: 'sales@kfh.pk', address: '12-B, SITE Area, Karachi' },
    { name: 'Dubai Textile Traders', contactName: 'Khalid Al-Mansoori', phone: '+971-4-9876543', email: 'info@dtt.ae',  address: 'Al Quoz Industrial Area, Dubai' },
    { name: 'Global Fabric Co.',     contactName: 'John Smith',         phone: '+1-212-5551234', email: 'john@gfc.com', address: 'New York, USA' },
  ];
  const supplierStats = newStats();
  for (const s of supplierData) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (existing) {
      await prisma.supplier.update({
        where: { id: existing.id },
        data: { contactName: s.contactName, phone: s.phone, email: s.email, address: s.address },
      });
    } else {
      await prisma.supplier.create({ data: s });
    }
    bump(supplierStats, !existing);
  }
  logStats('Demo suppliers', supplierStats);

  // ── Customers ───────────────────────────────────────────────────────────────
  const customerData = [
    { name: 'Walk-in Customer', phone: null,              email: null,                     type: 'RETAIL' as const },
    { name: 'Sara Boutique',    phone: '+92-333-1234567', email: 'sara@boutique.pk',       type: 'RETAIL' as const },
    { name: 'City Garments',    phone: '+92-21-3456789',  email: 'orders@citygarments.pk', type: 'WHOLESALE' as const },
  ];
  const customerStats = newStats();
  for (const c of customerData) {
    const existing = await prisma.customer.findFirst({ where: { name: c.name } });
    if (existing) {
      await prisma.customer.update({ where: { id: existing.id }, data: { phone: c.phone, email: c.email, type: c.type } });
    } else {
      await prisma.customer.create({ data: { name: c.name, phone: c.phone, email: c.email, type: c.type } });
    }
    bump(customerStats, !existing);
  }
  logStats('Demo customers', customerStats);

  // ── Products ───────────────────────────────────────────────────────────────
  // Units come from the standard seed; look them up rather than re-creating.
  const yardUnit  = await prisma.unit.findUnique({ where: { abbreviation: 'yd' } });
  const pieceUnit = await prisma.unit.findUnique({ where: { abbreviation: 'pc' } });
  if (!yardUnit || !pieceUnit) {
    console.log('   ⚠️  Units (yd/pc) not found — run the standard seed first. Skipping demo products.');
    return;
  }

  const fabricCatId    = categoryMap.get('Fabric')!;
  const accessoryCatId = categoryMap.get('Accessories')!;
  const cutCatId       = categoryMap.get('Cut Pieces')!;
  const readyMadeCatId = categoryMap.get('Ready-Made')!;
  const alkaramBrandId  = brandMap.get('AlKaram')!;
  const gulAhmedBrandId = brandMap.get('Gul Ahmed')!;
  const sapphireBrandId = brandMap.get('Sapphire')!;
  const unbrandedId     = brandMap.get('Unbranded')!;

  const productData = [
    // FABRIC_ROLL products
    { productCode: 'FAB-001', name: 'Lawn Summer Print',    productType: 'FABRIC_ROLL' as const,   retailPrice: '450.00',  wholesalePrice: '380.00',  status: 'ACTIVE' as const, categoryId: fabricCatId,    brandId: alkaramBrandId,  defaultUnitId: yardUnit.id,  description: 'Soft lawn fabric with summer floral prints' },
    { productCode: 'FAB-002', name: 'Cotton Voile Plain',   productType: 'FABRIC_ROLL' as const,   retailPrice: '280.00',  wholesalePrice: '220.00',  status: 'ACTIVE' as const, categoryId: fabricCatId,    brandId: gulAhmedBrandId, defaultUnitId: yardUnit.id,  description: 'Lightweight plain cotton voile' },
    { productCode: 'FAB-003', name: 'Khaddar Winter Check', productType: 'FABRIC_ROLL' as const,   retailPrice: '520.00',  wholesalePrice: '440.00',  status: 'ACTIVE' as const, categoryId: fabricCatId,    brandId: sapphireBrandId, defaultUnitId: yardUnit.id,  description: 'Heavy winter khaddar with check pattern' },
    // FIXED_PRODUCT products
    { productCode: 'ACC-001', name: 'Metal Buttons (Pack of 12)', productType: 'FIXED_PRODUCT' as const, retailPrice: '120.00', wholesalePrice: '90.00', status: 'ACTIVE' as const, categoryId: accessoryCatId, brandId: unbrandedId,     defaultUnitId: pieceUnit.id, description: 'Decorative metal shirt buttons, pack of 12' },
    { productCode: 'ACC-002', name: 'YKK Zipper 7 inch',          productType: 'FIXED_PRODUCT' as const, retailPrice: '45.00',  wholesalePrice: '30.00', status: 'ACTIVE' as const, categoryId: accessoryCatId, brandId: unbrandedId,     defaultUnitId: pieceUnit.id, description: 'YKK brand 7-inch invisible zipper' },
    { productCode: 'RDY-001', name: 'Shalwar Kameez (Stitched)',  productType: 'FIXED_PRODUCT' as const, retailPrice: '1800.00', wholesalePrice: '1500.00', status: 'ACTIVE' as const, categoryId: readyMadeCatId, brandId: alkaramBrandId,  defaultUnitId: pieceUnit.id, description: 'Pre-stitched shalwar kameez set' },
    // CUT_PIECE products
    { productCode: 'CUT-001', name: 'Lawn 3-Piece Cut',           productType: 'CUT_PIECE' as const,     retailPrice: '1200.00', wholesalePrice: '980.00', status: 'ACTIVE' as const, categoryId: cutCatId,       brandId: gulAhmedBrandId, defaultUnitId: pieceUnit.id, description: '3-piece lawn suit cut from roll' },
  ];

  const productStats = newStats();
  for (const p of productData) {
    const existing = await prisma.product.findUnique({ where: { productCode: p.productCode } });
    await prisma.product.upsert({
      where: { productCode: p.productCode },
      update: {
        name: p.name,
        retailPrice: p.retailPrice,
        wholesalePrice: p.wholesalePrice,
        status: p.status,
        description: p.description,
      },
      create: p,
    });
    bump(productStats, !existing);
  }
  logStats('Demo products', productStats);

  console.log('🧪  Demo data seed complete.');
}
