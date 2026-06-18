/**
 * Production-safe standard seed.
 *
 * Seeds only system/standard data:
 *   - permissions, roles, role-permission mappings
 *   - currencies and self exchange rates (1:1)
 *   - units and conversions
 *   - company settings, app settings (numbering, tax, barcode, measurement)
 *   - feature flags
 *   - one Admin user (only if none exists)
 *
 * It does NOT create demo business data (no products, customers, suppliers,
 * categories, brands, colors, designs, sales, purchases, rolls or ledgers).
 *
 * It is fully idempotent: safe to re-run. It never overwrites admin-edited
 * values; it never deletes existing records.
 *
 * Configuration via env vars (optional, falls back to safe defaults):
 *   SEED_ADMIN_USERNAME       default "admin"
 *   SEED_ADMIN_EMAIL          default "admin@textilepos.local"
 *   SEED_ADMIN_PASSWORD       required for first install (or use --reset)
 *   SEED_ADMIN_NAME           informational, not persisted (username is identity)
 *   SEED_RESET_ADMIN_PASSWORD "true" to force-reset existing admin's password
 *   SEED_COMPANY_NAME         default "Al Noor Textile Trading"
 *   SEED_BASE_CURRENCY        default "AED" (must be in currency seed list)
 */

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

type Stats = { created: number; skipped: number };
const bump = (s: Stats, created: boolean) => (created ? s.created++ : s.skipped++);
const log = (label: string, s: Stats) =>
  console.log(`   ${label}: ${s.created} created, ${s.skipped} already present`);

function envOr(key: string, fallback: string): string {
  const v = process.env[key];
  return v && v.trim().length > 0 ? v.trim() : fallback;
}

function envBool(key: string, fallback = false): boolean {
  const v = process.env[key];
  if (!v) return fallback;
  return ['true', '1', 'yes', 'y'].includes(v.trim().toLowerCase());
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. Permissions
// ──────────────────────────────────────────────────────────────────────────────
const PERMISSIONS: { name: string; description: string }[] = [
  // Legacy (still referenced by current guards — must remain)
  { name: 'read:products',                description: 'View catalog products (legacy)' },
  { name: 'write:products',               description: 'Create/update products (legacy)' },
  { name: 'read:sales',                   description: 'View sales (legacy)' },
  { name: 'write:sales',                  description: 'Create/process sales (legacy)' },
  { name: 'read:purchases',               description: 'View purchases (legacy)' },
  { name: 'write:purchases',              description: 'Create/process purchases (legacy)' },
  { name: 'read:inventory',               description: 'View inventory (legacy)' },
  { name: 'write:inventory',              description: 'Adjust inventory (legacy)' },
  { name: 'read:ledger',                  description: 'View ledgers (legacy)' },
  { name: 'write:ledger',                 description: 'Make ledger adjustments (legacy)' },
  { name: 'read:users',                   description: 'View users (legacy)' },
  { name: 'write:users',                  description: 'Manage users (legacy)' },
  { name: 'read:settings',                description: 'View settings (legacy)' },
  { name: 'write:settings',               description: 'Modify settings (legacy)' },

  // Standard milestone permissions
  { name: 'auth.me',                      description: 'Read current authenticated user profile' },
  { name: 'users.manage',                 description: 'Manage system users' },
  { name: 'roles.manage',                 description: 'Manage roles and role-permission mappings' },
  { name: 'settings.manage',              description: 'Manage application and company settings' },
  { name: 'audit.view',                   description: 'View audit logs' },

  { name: 'products.manage',              description: 'Create and update catalog products' },
  { name: 'categories.manage',            description: 'Manage product categories' },
  { name: 'brands.manage',                description: 'Manage product brands' },
  { name: 'colors.manage',                description: 'Manage colors master data' },
  { name: 'designs.manage',               description: 'Manage designs master data' },
  { name: 'batches.manage',               description: 'Manage inventory batches / dye-lots' },

  { name: 'suppliers.manage',             description: 'Create and update suppliers' },
  { name: 'purchases.create',             description: 'Create purchase orders' },
  { name: 'purchases.view',               description: 'View purchase orders' },
  { name: 'purchases.pay',                description: 'Record supplier payments against a purchase' },
  { name: 'purchases.attach_invoice',     description: 'Upload supplier invoice/receipt attachments to purchases' },
  { name: 'purchases.view_attachment',    description: 'View purchase attachment metadata and list' },
  { name: 'purchases.download_attachment',description: 'Download/view stored purchase invoice files' },
  { name: 'suppliers.view_statement',     description: 'View supplier account statement' },

  { name: 'inventory.view',               description: 'View inventory rolls and movements' },
  { name: 'inventory.create_roll',        description: 'Create a roll record' },
  { name: 'inventory.adjust_stock',       description: 'Adjust stock quantities or roll length' },
  { name: 'inventory.reconcile_roll',     description: 'Reconcile a roll against physical count' },

  { name: 'barcode.lookup',               description: 'Lookup a barcode (product or roll)' },
  { name: 'barcode.generate',             description: 'Generate barcodes for products / rolls' },

  { name: 'sales.create_retail',          description: 'Create retail sale invoices via POS' },
  { name: 'sales.create_wholesale',       description: 'Create wholesale sale invoices' },
  { name: 'sales.view',                   description: 'View own sale invoices' },
  { name: 'sales.view_all',               description: 'View all sale invoices' },

  { name: 'customers.manage',             description: 'Create and update customer records' },
  { name: 'customers.create_basic',       description: 'Quick-create a basic customer at POS' },
  { name: 'ledger.view_customer',         description: 'View customer ledger' },
  { name: 'ledger.record_payment',        description: 'Record a customer payment' },

  { name: 'wastage.view',                 description: 'View wastage entries' },
  { name: 'wastage.create_manual',        description: 'Manually create a wastage entry' },
  { name: 'wastage.view_reports',         description: 'View wastage reports' },

  { name: 'remnants.view',                description: 'View remnants' },
  { name: 'remnants.manage',              description: 'Create / sell / discard remnants' },

  { name: 'reports.view_sales',           description: 'View sales reports' },
  { name: 'reports.view_inventory',       description: 'View inventory reports' },
  { name: 'reports.view_financial',       description: 'View financial reports' },
];

// ──────────────────────────────────────────────────────────────────────────────
// 2. Roles
// ──────────────────────────────────────────────────────────────────────────────
const ROLES: { name: string; description: string }[] = [
  { name: 'Admin',           description: 'Full system administrator.' },
  { name: 'Manager',         description: 'Business operations manager. Catalog, inventory, sales, purchases, ledger.' },
  { name: 'Cashier',         description: 'Retail cashier. Sells from POS and views catalog.' },
  { name: 'Inventory Staff', description: 'Warehouse / stock operator. Manages products, batches, rolls and stock.' },
  { name: 'Accountant',      description: 'Financial accountant. Manages ledgers and views reports.' },
];

// Reasonable default per-role permission set (mappings are additive only —
// existing custom mappings are never removed).
const ROLE_PERMISSIONS: Record<string, string[] | 'ALL'> = {
  Admin: 'ALL',
  Manager: [
    // legacy
    'read:products', 'write:products',
    'read:sales', 'write:sales',
    'read:purchases', 'write:purchases',
    'read:inventory', 'write:inventory',
    'read:ledger', 'write:ledger',
    'read:settings',
    // new
    'auth.me',
    'products.manage', 'categories.manage', 'brands.manage',
    'colors.manage', 'designs.manage', 'batches.manage',
    'suppliers.manage', 'suppliers.view_statement',
    'purchases.create', 'purchases.view', 'purchases.pay',
    'purchases.attach_invoice', 'purchases.view_attachment', 'purchases.download_attachment',
    'inventory.view', 'inventory.create_roll', 'inventory.adjust_stock', 'inventory.reconcile_roll',
    'barcode.lookup', 'barcode.generate',
    'sales.create_retail', 'sales.create_wholesale', 'sales.view', 'sales.view_all',
    'customers.manage', 'customers.create_basic',
    'ledger.view_customer', 'ledger.record_payment',
    'wastage.view', 'wastage.create_manual', 'wastage.view_reports',
    'remnants.view', 'remnants.manage',
    'reports.view_sales', 'reports.view_inventory', 'reports.view_financial',
  ],
  Cashier: [
    'read:products', 'read:sales', 'write:sales',
    'auth.me',
    'sales.create_retail', 'sales.view',
    'customers.create_basic',
    'ledger.view_customer', 'ledger.record_payment',
    'barcode.lookup',
    'remnants.view',
  ],
  'Inventory Staff': [
    'read:products', 'write:products', 'read:inventory', 'write:inventory',
    'purchases.attach_invoice', 'purchases.view_attachment',
    'auth.me',
    'products.manage', 'categories.manage', 'brands.manage',
    'colors.manage', 'designs.manage', 'batches.manage',
    'inventory.view', 'inventory.create_roll', 'inventory.adjust_stock', 'inventory.reconcile_roll',
    'barcode.lookup', 'barcode.generate',
    'wastage.view', 'wastage.create_manual',
    'remnants.view', 'remnants.manage',
  ],
  Accountant: [
    'read:sales', 'read:purchases', 'read:ledger', 'write:ledger',
    'purchases.view_attachment', 'purchases.download_attachment',
    'suppliers.view_statement',
    'auth.me',
    'purchases.view', 'purchases.pay',
    'sales.view_all',
    'ledger.view_customer', 'ledger.record_payment',
    'reports.view_sales', 'reports.view_financial',
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// 3. Currencies + self exchange rates
// ──────────────────────────────────────────────────────────────────────────────
const CURRENCIES: { code: string; name: string; symbol: string; decimalPlaces: number }[] = [
  { code: 'AED', name: 'United Arab Emirates Dirham', symbol: 'د.إ', decimalPlaces: 2 },
  { code: 'PKR', name: 'Pakistani Rupee',             symbol: '₨',   decimalPlaces: 2 },
  { code: 'USD', name: 'US Dollar',                   symbol: '$',   decimalPlaces: 2 },
  { code: 'GBP', name: 'British Pound',               symbol: '£',   decimalPlaces: 2 },
  { code: 'EUR', name: 'Euro',                        symbol: '€',   decimalPlaces: 2 },
  { code: 'SAR', name: 'Saudi Riyal',                 symbol: '﷼',  decimalPlaces: 2 },
  { code: 'INR', name: 'Indian Rupee',                symbol: '₹',   decimalPlaces: 2 },
  { code: 'CNY', name: 'Chinese Yuan',                symbol: '¥',   decimalPlaces: 2 },
  { code: 'TRY', name: 'Turkish Lira',                symbol: '₺',   decimalPlaces: 2 },
];

// ──────────────────────────────────────────────────────────────────────────────
// 4. Units
// ──────────────────────────────────────────────────────────────────────────────
const UNITS: { name: string; abbreviation: string }[] = [
  { name: 'Yard',  abbreviation: 'yd' },
  { name: 'Meter', abbreviation: 'm' },
  { name: 'Piece', abbreviation: 'pc' },
  { name: 'Pack',  abbreviation: 'pk' },
  { name: 'Roll',  abbreviation: 'rl' },
];

// ──────────────────────────────────────────────────────────────────────────────
// 5. Settings catalogues
// ──────────────────────────────────────────────────────────────────────────────
function companySettingsSeed(): { key: string; value: string; description: string }[] {
  return [
    { key: 'company_name',     value: envOr('SEED_COMPANY_NAME', 'Al Noor Textile Trading'),
      description: 'Official registered company / shop name' },
    { key: 'company_phone',    value: '+971-4-000-0000',
      description: 'Primary contact phone' },
    { key: 'company_email',    value: 'admin@alnoortextile.local',
      description: 'Primary contact email' },
    { key: 'company_address',  value: 'Textile Market, Dubai, UAE',
      description: 'Shop address' },
    { key: 'company_currency', value: envOr('SEED_BASE_CURRENCY', 'AED'),
      description: 'Base / global selling currency (3-letter ISO code)' },
    { key: 'company_timezone', value: 'Asia/Dubai',
      description: 'System base timezone' },
    { key: 'company_tax_rate', value: '0.00',
      description: 'Standard tax rate percentage (0 = tax disabled by default)' },
  ];
}

const APP_SETTINGS: { key: string; value: string; description: string }[] = [
  // Document / invoice numbering prefixes
  { key: 'numbering.retail_invoice_prefix',    value: 'INV',  description: 'Retail sale invoice number prefix' },
  { key: 'numbering.wholesale_invoice_prefix', value: 'WINV', description: 'Wholesale invoice number prefix' },
  { key: 'numbering.purchase_order_prefix',    value: 'PO',   description: 'Purchase order number prefix' },
  { key: 'numbering.supplier_payment_prefix',  value: 'SPAY', description: 'Supplier payment number prefix' },
  { key: 'numbering.customer_payment_prefix',  value: 'CPAY', description: 'Customer payment number prefix' },
  { key: 'numbering.sale_return_prefix',       value: 'SRET', description: 'Sale return number prefix' },
  { key: 'numbering.purchase_return_prefix',   value: 'PRET', description: 'Purchase return number prefix' },
  { key: 'numbering.roll_code_prefix',         value: 'ROLL', description: 'Roll code prefix' },
  { key: 'numbering.barcode_prefix',           value: 'TPOS', description: 'Generated barcode prefix' },

  // Tax defaults
  { key: 'tax.enabled',          value: 'false', description: 'Whether tax is applied on sales by default' },
  { key: 'tax.rate_percent',     value: '0',     description: 'Default tax rate percent' },
  { key: 'tax.label',            value: 'VAT',   description: 'Default tax label displayed on invoices' },

  // Barcode defaults
  { key: 'barcode.format',                 value: 'CODE128', description: 'Barcode symbology to use' },
  { key: 'barcode.roll_enabled',           value: 'true',    description: 'Generate roll-level barcodes' },
  { key: 'barcode.product_enabled',        value: 'true',    description: 'Generate product-level barcodes' },
  { key: 'barcode.print_labels_enabled',   value: 'true',    description: 'Allow printing of barcode labels' },

  // Measurement defaults
  { key: 'measurement.base_fabric_unit',         value: 'YARD', description: 'Base unit for fabric length (YARD or METER)' },
  { key: 'measurement.allow_meter_input',        value: 'true', description: 'Allow operators to enter lengths in meters' },
  { key: 'measurement.remnant_threshold_yards',  value: '2',    description: 'Roll remainder below this length is flagged as remnant' },
  { key: 'measurement.length_decimal_precision', value: '4',    description: 'Decimal places used for stored fabric lengths' },

  // Payment methods (JSON list — there is no PaymentMethod table in v1 schema)
  { key: 'payment_methods', value: JSON.stringify(['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT']),
    description: 'Allowed payment methods for sale and supplier payments' },
];

// ──────────────────────────────────────────────────────────────────────────────
// 6. Feature flags
// ──────────────────────────────────────────────────────────────────────────────
const FEATURE_FLAGS: { name: string; isEnabled: boolean; description: string }[] = [
  { name: 'wholesalePos',       isEnabled: true, description: 'Enable wholesale POS workflow' },
  { name: 'barcodeGeneration',  isEnabled: true, description: 'Enable barcode generation for products and rolls' },
  { name: 'wastageTracking',    isEnabled: true, description: 'Enable wastage entries and reports' },
  { name: 'remnantManagement',  isEnabled: true, description: 'Enable remnant inventory workflow' },
  { name: 'creditSales',        isEnabled: true, description: 'Allow credit / Udhaar sales to customers' },
];

// ──────────────────────────────────────────────────────────────────────────────
// Seeders
// ──────────────────────────────────────────────────────────────────────────────
async function seedPermissions(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const stats: Stats = { created: 0, skipped: 0 };
  for (const p of PERMISSIONS) {
    const existing = await prisma.permission.findUnique({ where: { name: p.name } });
    const perm = await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description },
      create: p,
    });
    map.set(perm.name, perm.id);
    bump(stats, !existing);
  }
  log('Permissions', stats);
  return map;
}

async function seedRoles(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const stats: Stats = { created: 0, skipped: 0 };
  for (const r of ROLES) {
    const existing = await prisma.role.findUnique({ where: { name: r.name } });
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    map.set(role.name, role.id);
    bump(stats, !existing);
  }
  log('Roles', stats);
  return map;
}

async function seedRolePermissions(
  roleMap: Map<string, string>,
  permissionMap: Map<string, string>,
) {
  const stats: Stats = { created: 0, skipped: 0 };
  const allPermNames = Array.from(permissionMap.keys());

  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap.get(roleName);
    if (!roleId) continue;
    const targets = perms === 'ALL' ? allPermNames : perms;
    for (const name of targets) {
      const permissionId = permissionMap.get(name);
      if (!permissionId) continue;
      const existing = await prisma.rolePermission.findUnique({
        where: { roleId_permissionId: { roleId, permissionId } },
      });
      if (!existing) {
        await prisma.rolePermission.create({ data: { roleId, permissionId } });
      }
      bump(stats, !existing);
    }
  }
  log('Role-permission mappings', stats);
}

async function seedCurrencies() {
  const baseCurrency = envOr('SEED_BASE_CURRENCY', 'AED').toUpperCase();
  if (!CURRENCIES.some((c) => c.code === baseCurrency)) {
    console.log(`   ⚠️  SEED_BASE_CURRENCY=${baseCurrency} is not in the standard list; ignoring.`);
  }

  const stats: Stats = { created: 0, skipped: 0 };
  for (const c of CURRENCIES) {
    const existing = await prisma.currency.findUnique({ where: { code: c.code } });
    await prisma.currency.upsert({
      where: { code: c.code },
      // never reset isBaseCurrency or symbol overrides — admin may have edited
      update: { name: c.name, decimalPlaces: c.decimalPlaces },
      create: { ...c, isBaseCurrency: c.code === baseCurrency },
    });
    bump(stats, !existing);
  }
  log('Currencies', stats);

  // Promote the requested base currency only if NO base currency is set yet
  const anyBase = await prisma.currency.findFirst({ where: { isBaseCurrency: true } });
  if (!anyBase) {
    const target = await prisma.currency.findUnique({ where: { code: baseCurrency } });
    if (target) {
      await prisma.currency.update({
        where: { code: baseCurrency },
        data: { isBaseCurrency: true },
      });
      console.log(`   Base currency set to ${baseCurrency}.`);
    }
  }

  // Self-rates (1:1) for each currency — never overwrite admin-entered rates
  const rateStats: Stats = { created: 0, skipped: 0 };
  for (const c of CURRENCIES) {
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
    }
    bump(rateStats, !existing);
  }
  log('Self exchange rates', rateStats);
}

async function seedUnits(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const stats: Stats = { created: 0, skipped: 0 };
  for (const u of UNITS) {
    const existing = await prisma.unit.findUnique({ where: { abbreviation: u.abbreviation } });
    const unit = await prisma.unit.upsert({
      where: { abbreviation: u.abbreviation },
      update: { name: u.name },
      create: u,
    });
    map.set(unit.abbreviation, unit.id);
    bump(stats, !existing);
  }
  log('Units', stats);
  return map;
}

async function seedUnitConversions(unitMap: Map<string, string>) {
  const yardId = unitMap.get('yd');
  const meterId = unitMap.get('m');
  if (!yardId || !meterId) return;

  const conversions = [
    { fromUnitId: meterId, toUnitId: yardId, factor: '1.09361' },
    { fromUnitId: yardId,  toUnitId: meterId, factor: '0.9144' },
  ];
  const stats: Stats = { created: 0, skipped: 0 };
  for (const conv of conversions) {
    const existing = await prisma.unitConversion.findUnique({
      where: { fromUnitId_toUnitId: { fromUnitId: conv.fromUnitId, toUnitId: conv.toUnitId } },
    });
    if (!existing) {
      await prisma.unitConversion.create({ data: conv });
    }
    bump(stats, !existing);
  }
  log('Unit conversions', stats);
}

async function seedCompanySettings() {
  const stats: Stats = { created: 0, skipped: 0 };
  for (const s of companySettingsSeed()) {
    const existing = await prisma.companySetting.findUnique({ where: { key: s.key } });
    await prisma.companySetting.upsert({
      where: { key: s.key },
      // only refresh description — never overwrite a value the admin may have set
      update: { description: s.description },
      create: s,
    });
    bump(stats, !existing);
  }
  log('Company settings', stats);
}

async function seedAppSettings() {
  const stats: Stats = { created: 0, skipped: 0 };
  for (const s of APP_SETTINGS) {
    const existing = await prisma.appSetting.findUnique({ where: { key: s.key } });
    await prisma.appSetting.upsert({
      where: { key: s.key },
      update: { description: s.description },
      create: s,
    });
    bump(stats, !existing);
  }
  log('App settings', stats);
}

async function seedFeatureFlags() {
  const stats: Stats = { created: 0, skipped: 0 };
  for (const f of FEATURE_FLAGS) {
    const existing = await prisma.featureFlag.findUnique({ where: { name: f.name } });
    await prisma.featureFlag.upsert({
      where: { name: f.name },
      // never override the admin's chosen state — only refresh description
      update: { description: f.description },
      create: f,
    });
    bump(stats, !existing);
  }
  log('Feature flags', stats);
}

async function seedAdminUser(adminRoleId: string | undefined) {
  if (!adminRoleId) {
    console.log('   ⚠️  Admin role missing — skipping admin user creation.');
    return;
  }

  const username = envOr('SEED_ADMIN_USERNAME', 'admin');
  const email    = envOr('SEED_ADMIN_EMAIL',    'admin@textilepos.local');
  const password = process.env.SEED_ADMIN_PASSWORD;
  const reset    = envBool('SEED_RESET_ADMIN_PASSWORD', false);

  const existingAdminMapping = await prisma.userRole.findFirst({
    where: { roleId: adminRoleId },
    include: { user: true },
  });

  if (existingAdminMapping) {
    console.log(`   Admin user already exists (username: ${existingAdminMapping.user.username}).`);
    if (reset) {
      if (!password || password.length < 8) {
        console.log('   ⚠️  --reset-admin-password requested but SEED_ADMIN_PASSWORD missing/too short (<8). Skipped.');
      } else {
        const hash = await argon2.hash(password);
        await prisma.user.update({
          where: { id: existingAdminMapping.userId },
          data: { passwordHash: hash, status: 'ACTIVE' },
        });
        console.log(`   ✅ Admin password reset for ${existingAdminMapping.user.username}.`);
      }
    }
    return;
  }

  if (!password || password.length < 8) {
    console.log('   ⚠️  No admin exists and SEED_ADMIN_PASSWORD is missing or shorter than 8 characters.');
    console.log('       Skipping admin creation. Re-run seed with SEED_ADMIN_PASSWORD set.');
    return;
  }

  const hash = await argon2.hash(password);
  const user = await prisma.user.upsert({
    where: { username },
    update: { email, passwordHash: hash, status: 'ACTIVE' },
    create: { username, email, passwordHash: hash, status: 'ACTIVE' },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: adminRoleId } },
    update: {},
    create: { userId: user.id, roleId: adminRoleId },
  });
  console.log(`   ✅ Created Admin user "${username}" (${email}).`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱  Seeding standard system data…');

  console.log('🔑  Permissions');
  const permissionMap = await seedPermissions();

  console.log('👥  Roles');
  const roleMap = await seedRoles();

  console.log('🔗  Role → Permission mappings');
  await seedRolePermissions(roleMap, permissionMap);

  console.log('💱  Currencies + self-rates');
  await seedCurrencies();

  console.log('📐  Units');
  const unitMap = await seedUnits();

  console.log('🔄  Unit conversions');
  await seedUnitConversions(unitMap);

  console.log('🏢  Company settings');
  await seedCompanySettings();

  console.log('⚙️   App settings (numbering / tax / barcode / measurement / payment methods)');
  await seedAppSettings();

  console.log('🚩  Feature flags');
  await seedFeatureFlags();

  console.log('👤  Admin user');
  await seedAdminUser(roleMap.get('Admin'));

  console.log('🎉  Standard seed complete.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌  Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
