import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Start seeding database...');

  // ==========================================
  // 1. SEED PERMISSIONS
  // ==========================================
  console.log('🔑 Seeding permissions...');
  const permissions = [
    { name: 'read:products', description: 'View catalog products' },
    { name: 'write:products', description: 'Create and update products' },
    { name: 'read:sales', description: 'View sales invoices and payments' },
    { name: 'write:sales', description: 'Create and process sales invoices' },
    { name: 'read:purchases', description: 'View purchase orders and rolls' },
    { name: 'write:purchases', description: 'Create and process purchase orders' },
    { name: 'read:inventory', description: 'View inventory rolls and movements' },
    { name: 'write:inventory', description: 'Adjust, reconcile or report inventory wastage' },
    { name: 'read:ledger', description: 'View financial ledgers' },
    { name: 'write:ledger', description: 'Make direct ledger adjustments' },
    { name: 'read:users', description: 'View system users' },
    { name: 'write:users', description: 'Manage system users and access roles' },
    { name: 'read:settings', description: 'View application settings' },
    { name: 'write:settings', description: 'Modify application and company settings' },
  ];

  const permissionMap = new Map<string, string>();
  for (const p of permissions) {
    const perm = await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description },
      create: p,
    });
    permissionMap.set(perm.name, perm.id);
  }
  console.log(`✅ Seeded ${permissionMap.size} permissions.`);

  // ==========================================
  // 2. SEED ROLES
  // ==========================================
  console.log('👥 Seeding roles...');
  const roles = [
    { name: 'Admin', description: 'Full system administrator with access to all modules and configurations.' },
    { name: 'Manager', description: 'Business operations manager. Full catalog, inventory, ledger, sales, and purchase management.' },
    { name: 'Cashier', description: 'Retail cashier. Performs sales operations and views catalog.' },
    { name: 'Sales', description: 'POS-only operator. Can only access the New Sale screen and process sales.' },
    { name: 'Inventory Staff', description: 'Warehouse and stock operator. Manages product, batch, roll, and inventory movements.' },
    { name: 'Accountant', description: 'Financial accountant. Manages financial ledgers and views reports.' },
  ];

  const roleMap = new Map<string, string>();
  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    roleMap.set(role.name, role.id);
  }
  console.log(`✅ Seeded ${roleMap.size} roles.`);

  // ==========================================
  // 3. SEED ROLE-PERMISSION ASSOCIATIONS
  // ==========================================
  console.log('🔗 Associating roles and permissions...');

  const allPermissionNames = Array.from(permissionMap.keys());

  const rolePermissionMap: Record<string, string[]> = {
    Admin: allPermissionNames,
    Manager: [
      'read:products', 'write:products',
      'read:sales', 'write:sales',
      'read:purchases', 'write:purchases',
      'read:inventory', 'write:inventory',
      'read:ledger', 'write:ledger',
      'read:settings',
    ],
    Cashier: ['read:products', 'read:sales', 'write:sales'],
    Sales: ['write:sales'],
    'Inventory Staff': ['read:products', 'write:products', 'read:inventory', 'write:inventory'],
    Accountant: ['read:sales', 'read:purchases', 'read:ledger', 'write:ledger'],
  };

  let rolePermissionCount = 0;
  for (const [roleName, permNames] of Object.entries(rolePermissionMap)) {
    const roleId = roleMap.get(roleName);
    if (!roleId) continue;

    for (const name of permNames) {
      const permissionId = permissionMap.get(name);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
      rolePermissionCount++;
    }
  }
  console.log(`✅ Seeded ${rolePermissionCount} role-permission mappings.`);

  // ==========================================
  // 4. SEED CURRENCIES
  // ==========================================
  console.log('💱 Seeding currencies...');
  const currencies = [
    { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨',   decimalPlaces: 2, isBaseCurrency: true  },
    { code: 'AED', name: 'UAE Dirham',      symbol: 'د.إ', decimalPlaces: 2, isBaseCurrency: false },
    { code: 'USD', name: 'US Dollar',       symbol: '$',   decimalPlaces: 2, isBaseCurrency: false },
    { code: 'EUR', name: 'Euro',            symbol: '€',   decimalPlaces: 2, isBaseCurrency: false },
    { code: 'GBP', name: 'British Pound',   symbol: '£',   decimalPlaces: 2, isBaseCurrency: false },
    { code: 'SAR', name: 'Saudi Riyal',     symbol: '﷼',  decimalPlaces: 2, isBaseCurrency: false },
    { code: 'INR', name: 'Indian Rupee',    symbol: '₹',   decimalPlaces: 2, isBaseCurrency: false },
    { code: 'CNY', name: 'Chinese Yuan',    symbol: '¥',   decimalPlaces: 2, isBaseCurrency: false },
    { code: 'TRY', name: 'Turkish Lira',    symbol: '₺',   decimalPlaces: 2, isBaseCurrency: false },
  ];
  for (const c of currencies) {
    await prisma.currency.upsert({
      where: { code: c.code },
      // Only update metadata — never reset isBaseCurrency (admin may have changed it)
      update: { name: c.name, symbol: c.symbol, decimalPlaces: c.decimalPlaces },
      create: c,
    });
  }
  console.log(`✅ Seeded ${currencies.length} currencies.`);

  // Seed self-rates (1:1) for each currency so exchange-rate lookups always have a fallback.
  // Only create if no rate exists for that pair — never overwrite admin-entered rates.
  console.log('📈 Seeding self-rates...');
  let selfRateCount = 0;
  for (const c of currencies) {
    const existing = await prisma.currencyExchangeRate.findFirst({
      where: { fromCurrencyCode: c.code, toCurrencyCode: c.code },
    });
    if (!existing) {
      await prisma.currencyExchangeRate.create({
        data: {
          fromCurrencyCode: c.code,
          toCurrencyCode: c.code,
          rate: 1,
          isCurrent: true,
          notes: 'Self-rate seeded automatically',
        },
      });
      selfRateCount++;
    }
  }
  console.log(`✅ Seeded ${selfRateCount} new self-rates (${currencies.length - selfRateCount} already existed).`);

  // ==========================================
  // 5. SEED MEASUREMENT UNITS
  // ==========================================
  console.log('📐 Seeding units...');
  const units = [
    { name: 'Yard', abbreviation: 'yd' },
    { name: 'Meter', abbreviation: 'm' },
    { name: 'Piece', abbreviation: 'pc' },
  ];

  const unitMap = new Map<string, string>();
  for (const u of units) {
    const unit = await prisma.unit.upsert({
      where: { abbreviation: u.abbreviation },
      update: { name: u.name },
      create: u,
    });
    unitMap.set(unit.abbreviation, unit.id);
  }
  console.log(`✅ Seeded ${unitMap.size} units.`);

  // ==========================================
  // 6. SEED UNIT CONVERSIONS
  // ==========================================
  console.log('🔄 Seeding unit conversions...');
  const yardId = unitMap.get('yd');
  const meterId = unitMap.get('m');

  if (yardId && meterId) {
    const conversions = [
      { fromUnitId: yardId, toUnitId: meterId, factor: 0.9144 },
      { fromUnitId: meterId, toUnitId: yardId, factor: 1.093613 },
    ];

    for (const conv of conversions) {
      const existing = await prisma.unitConversion.findFirst({
        where: { fromUnitId: conv.fromUnitId, toUnitId: conv.toUnitId },
      });

      if (existing) {
        await prisma.unitConversion.update({ where: { id: existing.id }, data: { factor: conv.factor } });
      } else {
        await prisma.unitConversion.create({ data: conv });
      }
    }
    console.log('✅ Seeded conversions (Yard ↔ Meter).');
  }

  // ==========================================
  // 7. SEED DEFAULT COMPANY SETTINGS
  // ==========================================
  console.log('🏢 Seeding company settings...');
  const companySettings = [
    { key: 'company_name', value: 'Textile POS & ERP Ltd.', description: 'Official registered company name' },
    { key: 'company_currency', value: 'PKR', description: 'Base/primary currency for sales and internal accounting' },
    { key: 'company_timezone', value: 'Asia/Dubai', description: 'System base timezone for operations' },
    { key: 'company_tax_rate', value: '5.00', description: 'Standard VAT tax rate percentage' },
  ];

  for (const s of companySettings) {
    await prisma.companySetting.upsert({
      where: { key: s.key },
      // Only update description — never reset values (admin may have changed them)
      update: { description: s.description },
      create: s,
    });
  }
  console.log(`✅ Seeded ${companySettings.length} company settings (values preserved if already set).`);

  // ==========================================
  // 8. SEED DEFAULT USERS
  // ==========================================
  console.log('👤 Seeding default users...');

  const adminHash = await argon2.hash('Admin@123');
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { email: 'admin@textilepos.com', passwordHash: adminHash, status: 'ACTIVE' },
    create: { username: 'admin', email: 'admin@textilepos.com', passwordHash: adminHash, status: 'ACTIVE' },
  });

  const adminRoleId = roleMap.get('Admin');
  if (adminRoleId) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: adminRoleId } },
      update: {},
      create: { userId: adminUser.id, roleId: adminRoleId },
    });
  }
  console.log('✅ Seeded admin user (username: admin, password: Admin@123).');

  const cashierHash = await argon2.hash('Cashier@123');
  const cashierUser = await prisma.user.upsert({
    where: { username: 'cashier' },
    update: { email: 'cashier@textilepos.com', passwordHash: cashierHash, status: 'ACTIVE' },
    create: { username: 'cashier', email: 'cashier@textilepos.com', passwordHash: cashierHash, status: 'ACTIVE' },
  });

  const cashierRoleId = roleMap.get('Cashier');
  if (cashierRoleId) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: cashierUser.id, roleId: cashierRoleId } },
      update: {},
      create: { userId: cashierUser.id, roleId: cashierRoleId },
    });
  }
  console.log('✅ Seeded cashier user (username: cashier, password: Cashier@123).');

  const salesHash = await argon2.hash('Sales@123');
  const salesUser = await prisma.user.upsert({
    where: { username: 'sales' },
    update: { email: 'sales@textilepos.com', passwordHash: salesHash, status: 'ACTIVE' },
    create: { username: 'sales', email: 'sales@textilepos.com', passwordHash: salesHash, status: 'ACTIVE' },
  });

  const salesRoleId = roleMap.get('Sales');
  if (salesRoleId) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: salesUser.id, roleId: salesRoleId } },
      update: {},
      create: { userId: salesUser.id, roleId: salesRoleId },
    });
  }
  console.log('✅ Seeded sales user (username: sales, password: Sales@123).');

  // ==========================================
  // 9. SEED SAMPLE CATEGORIES
  // ==========================================
  console.log('🗂️  Seeding categories...');
  const categoryData = [
    { name: 'Fabric',      description: 'Raw fabric rolls and cloth' },
    { name: 'Ready-Made',  description: 'Finished garments and ready-made items' },
    { name: 'Accessories', description: 'Buttons, zippers, trims, and notions' },
    { name: 'Cut Pieces',  description: 'Pre-cut fabric pieces' },
  ];
  const categoryMap = new Map<string, string>();
  for (const c of categoryData) {
    let cat = await prisma.category.findFirst({ where: { name: c.name } });
    if (cat) {
      cat = await prisma.category.update({ where: { id: cat.id }, data: { description: c.description } });
    } else {
      cat = await prisma.category.create({ data: c });
    }
    categoryMap.set(cat.name, cat.id);
  }
  console.log(`✅ Seeded ${categoryMap.size} categories.`);

  // ==========================================
  // 10. SEED SAMPLE BRANDS
  // ==========================================
  console.log('🏷️  Seeding brands...');
  const brandData = [
    { name: 'AlKaram',   description: 'AlKaram Studio' },
    { name: 'Gul Ahmed', description: 'Gul Ahmed Textile Mills' },
    { name: 'Sapphire',  description: 'Sapphire Fibres Ltd.' },
    { name: 'Unbranded', description: 'Generic / no brand' },
  ];
  const brandMap = new Map<string, string>();
  for (const b of brandData) {
    const brand = await prisma.brand.upsert({
      where: { name: b.name },
      update: { description: b.description },
      create: b,
    });
    brandMap.set(brand.name, brand.id);
  }
  console.log(`✅ Seeded ${brandMap.size} brands.`);

  // ==========================================
  // 11. SEED SAMPLE COLORS
  // ==========================================
  console.log('🎨 Seeding colors...');
  const colorData = [
    { name: 'White',       colorCode: '#FFFFFF' },
    { name: 'Black',       colorCode: '#000000' },
    { name: 'Navy Blue',   colorCode: '#001F5B' },
    { name: 'Sky Blue',    colorCode: '#87CEEB' },
    { name: 'Red',         colorCode: '#FF0000' },
    { name: 'Green',       colorCode: '#008000' },
    { name: 'Brown',       colorCode: '#8B4513' },
    { name: 'Grey',        colorCode: '#808080' },
    { name: 'Cream',       colorCode: '#FFFDD0' },
    { name: 'Maroon',      colorCode: '#800000' },
  ];
  const colorMap = new Map<string, string>();
  for (const c of colorData) {
    const color = await prisma.color.upsert({
      where: { name: c.name },
      update: { colorCode: c.colorCode, isActive: true },
      create: { name: c.name, colorCode: c.colorCode, isActive: true },
    });
    colorMap.set(color.name, color.id);
  }
  console.log(`✅ Seeded ${colorMap.size} colors.`);

  // ==========================================
  // 12. SEED SAMPLE DESIGNS
  // ==========================================
  console.log('🖼️  Seeding designs...');
  const designData = [
    { name: 'Plain',       designCode: 'PLN' },
    { name: 'Stripe',      designCode: 'STR' },
    { name: 'Check',       designCode: 'CHK' },
    { name: 'Floral',      designCode: 'FLR' },
    { name: 'Geometric',   designCode: 'GEO' },
    { name: 'Embroidered', designCode: 'EMB' },
  ];
  const designMap = new Map<string, string>();
  for (const d of designData) {
    const design = await prisma.design.upsert({
      where: { name: d.name },
      update: { designCode: d.designCode, isActive: true },
      create: { name: d.name, designCode: d.designCode, isActive: true },
    });
    designMap.set(design.name, design.id);
  }
  console.log(`✅ Seeded ${designMap.size} designs.`);

  // ==========================================
  // 13. SEED SAMPLE SUPPLIER
  // ==========================================
  console.log('🏭 Seeding suppliers...');
  const supplierData = [
    { name: 'Karachi Fabric House',  contactName: 'Ahmed Raza',          phone: '+92-21-1234567',  email: 'sales@kfh.pk',   address: '12-B, SITE Area, Karachi'       },
    { name: 'Dubai Textile Traders', contactName: 'Khalid Al-Mansoori',  phone: '+971-4-9876543',  email: 'info@dtt.ae',    address: 'Al Quoz Industrial Area, Dubai' },
    { name: 'Global Fabric Co.',     contactName: 'John Smith',          phone: '+1-212-5551234',  email: 'john@gfc.com',   address: 'New York, USA'                  },
  ];
  const supplierMap = new Map<string, string>();
  for (const s of supplierData) {
    let supplier = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (supplier) {
      supplier = await prisma.supplier.update({
        where: { id: supplier.id },
        data: { contactName: s.contactName, phone: s.phone, email: s.email, address: s.address },
      });
    } else {
      supplier = await prisma.supplier.create({ data: s });
    }
    supplierMap.set(supplier.name, supplier.id);
  }
  console.log(`✅ Seeded ${supplierMap.size} suppliers.`);

  // ==========================================
  // 14. SEED SAMPLE CUSTOMERS
  // ==========================================
  console.log('👥 Seeding customers...');
  const customerData = [
    { name: 'Walk-in Customer', phone: null,              email: null,                      type: 'RETAIL' as const    },
    { name: 'Sara Boutique',    phone: '+92-333-1234567', email: 'sara@boutique.pk',        type: 'RETAIL' as const    },
    { name: 'City Garments',    phone: '+92-21-3456789',  email: 'orders@citygarments.pk',  type: 'WHOLESALE' as const },
  ];
  for (const c of customerData) {
    let customer = await prisma.customer.findFirst({ where: { name: c.name } });
    if (customer) {
      await prisma.customer.update({ where: { id: customer.id }, data: { phone: c.phone, email: c.email, type: c.type } });
    } else {
      await prisma.customer.create({ data: { name: c.name, phone: c.phone, email: c.email, type: c.type } });
    }
  }
  console.log(`✅ Seeded ${customerData.length} customers.`);

  // ==========================================
  // 15. SEED SAMPLE PRODUCTS
  // ==========================================
  console.log('📦 Seeding sample products...');

  const yardUnitId = unitMap.get('yd')!;
  const pieceUnitId = unitMap.get('pc')!;

  const fabricCatId = categoryMap.get('Fabric')!;
  const accessoryCatId = categoryMap.get('Accessories')!;
  const cutCatId = categoryMap.get('Cut Pieces')!;
  const readyMadeCatId = categoryMap.get('Ready-Made')!;
  const alkaramBrandId = brandMap.get('AlKaram')!;
  const gulAhmedBrandId = brandMap.get('Gul Ahmed')!;
  const sapphireBrandId = brandMap.get('Sapphire')!;
  const unbrandedId = brandMap.get('Unbranded')!;

  const productData = [
    // FABRIC_ROLL products
    {
      productCode: 'FAB-001',
      name: 'Lawn Summer Print',
      productType: 'FABRIC_ROLL' as const,
      retailPrice: '450.00',
      wholesalePrice: '380.00',
      status: 'ACTIVE' as const,
      categoryId: fabricCatId,
      brandId: alkaramBrandId,
      defaultUnitId: yardUnitId,
      description: 'Soft lawn fabric with summer floral prints',
    },
    {
      productCode: 'FAB-002',
      name: 'Cotton Voile Plain',
      productType: 'FABRIC_ROLL' as const,
      retailPrice: '280.00',
      wholesalePrice: '220.00',
      status: 'ACTIVE' as const,
      categoryId: fabricCatId,
      brandId: gulAhmedBrandId,
      defaultUnitId: yardUnitId,
      description: 'Lightweight plain cotton voile',
    },
    {
      productCode: 'FAB-003',
      name: 'Khaddar Winter Check',
      productType: 'FABRIC_ROLL' as const,
      retailPrice: '520.00',
      wholesalePrice: '440.00',
      status: 'ACTIVE' as const,
      categoryId: fabricCatId,
      brandId: sapphireBrandId,
      defaultUnitId: yardUnitId,
      description: 'Heavy winter khaddar with check pattern',
    },
    // FIXED_PRODUCT products
    {
      productCode: 'ACC-001',
      name: 'Metal Buttons (Pack of 12)',
      productType: 'FIXED_PRODUCT' as const,
      retailPrice: '120.00',
      wholesalePrice: '90.00',
      status: 'ACTIVE' as const,
      categoryId: accessoryCatId,
      brandId: unbrandedId,
      defaultUnitId: pieceUnitId,
      description: 'Decorative metal shirt buttons, pack of 12',
    },
    {
      productCode: 'ACC-002',
      name: 'YKK Zipper 7 inch',
      productType: 'FIXED_PRODUCT' as const,
      retailPrice: '45.00',
      wholesalePrice: '30.00',
      status: 'ACTIVE' as const,
      categoryId: accessoryCatId,
      brandId: unbrandedId,
      defaultUnitId: pieceUnitId,
      description: 'YKK brand 7-inch invisible zipper',
    },
    {
      productCode: 'RDY-001',
      name: 'Shalwar Kameez (Stitched)',
      productType: 'FIXED_PRODUCT' as const,
      retailPrice: '1800.00',
      wholesalePrice: '1500.00',
      status: 'ACTIVE' as const,
      categoryId: readyMadeCatId,
      brandId: alkaramBrandId,
      defaultUnitId: pieceUnitId,
      description: 'Pre-stitched shalwar kameez set',
    },
    // CUT_PIECE products
    {
      productCode: 'CUT-001',
      name: 'Lawn 3-Piece Cut',
      productType: 'CUT_PIECE' as const,
      retailPrice: '1200.00',
      wholesalePrice: '980.00',
      status: 'ACTIVE' as const,
      categoryId: cutCatId,
      brandId: gulAhmedBrandId,
      defaultUnitId: pieceUnitId,
      description: '3-piece lawn suit cut from roll',
    },
  ];

  const productMap = new Map<string, string>();
  for (const p of productData) {
    const product = await prisma.product.upsert({
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
    productMap.set(product.productCode, product.id);
  }
  console.log(`✅ Seeded ${productMap.size} products (3 FABRIC_ROLL, 3 FIXED_PRODUCT, 1 CUT_PIECE).`);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
