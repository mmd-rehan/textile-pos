import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

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
    { name: 'write:settings', description: 'Modify application and company settings' }
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
    { name: 'Inventory Staff', description: 'Warehouse and stock operator. Manages product, batch, roll, and inventory movements.' },
    { name: 'Accountant', description: 'Financial accountant. Manages financial ledgers, customer ledger, supplier ledger, and views reports.' }
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
    'Admin': allPermissionNames,
    'Manager': [
      'read:products', 'write:products',
      'read:sales', 'write:sales',
      'read:purchases', 'write:purchases',
      'read:inventory', 'write:inventory',
      'read:ledger', 'write:ledger',
      'read:settings'
    ],
    'Cashier': [
      'read:products',
      'read:sales', 'write:sales'
    ],
    'Inventory Staff': [
      'read:products', 'write:products',
      'read:inventory', 'write:inventory'
    ],
    'Accountant': [
      'read:sales',
      'read:purchases',
      'read:ledger', 'write:ledger'
    ]
  };

  let rolePermissionCount = 0;
  for (const [roleName, permNames] of Object.entries(rolePermissionMap)) {
    const roleId = roleMap.get(roleName);
    if (!roleId) continue;

    for (const name of permNames) {
      const permissionId = permissionMap.get(name);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId, permissionId }
        },
        update: {},
        create: { roleId, permissionId }
      });
      rolePermissionCount++;
    }
  }
  console.log(`✅ Seeded ${rolePermissionCount} role-permission mappings.`);

  // ==========================================
  // 4. SEED MEASUREMENT UNITS
  // ==========================================
  console.log('📐 Seeding units...');
  const units = [
    { name: 'Yard', abbreviation: 'yd' },
    { name: 'Meter', abbreviation: 'm' },
    { name: 'Piece', abbreviation: 'pc' }
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
  // 5. SEED UNIT CONVERSIONS
  // ==========================================
  console.log('🔄 Seeding unit conversions...');
  const yardId = unitMap.get('yd');
  const meterId = unitMap.get('m');

  if (yardId && meterId) {
    const conversions = [
      { fromUnitId: yardId, toUnitId: meterId, factor: 0.9144 },
      { fromUnitId: meterId, toUnitId: yardId, factor: 1.093613 }
    ];

    for (const conv of conversions) {
      const existing = await prisma.unitConversion.findFirst({
        where: { fromUnitId: conv.fromUnitId, toUnitId: conv.toUnitId }
      });

      if (existing) {
        await prisma.unitConversion.update({
          where: { id: existing.id },
          data: { factor: conv.factor }
        });
      } else {
        await prisma.unitConversion.create({
          data: conv
        });
      }
    }
    console.log('✅ Seeded conversions (Yard to Meter and Meter to Yard).');
  }

  // ==========================================
  // 6. SEED DEFAULT COMPANY SETTINGS
  // ==========================================
  console.log('🏢 Seeding company settings...');
  const companySettings = [
    { key: 'company_name', value: 'Textile POS & ERP Ltd.', description: 'Official registered company name' },
    { key: 'company_currency', value: 'AED', description: 'Primary trading currency' },
    { key: 'company_timezone', value: 'Asia/Dubai', description: 'System base timezone for operations' },
    { key: 'company_tax_rate', value: '5.00', description: 'Standard VAT tax rate percentage' }
  ];

  for (const s of companySettings) {
    await prisma.companySetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s
    });
  }
  console.log(`✅ Seeded ${companySettings.length} company settings.`);

  // ==========================================
  // 7. SEED DEFAULT ADMIN USER
  // ==========================================
  console.log('👤 Seeding default admin user...');
  const passwordRaw = 'Admin@123';
  // Standard SHA-256 password hash for the initial admin account
  const passwordHash = crypto.createHash('sha256').update(passwordRaw).digest('hex');

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      email: 'admin@textilepos.com',
      status: 'ACTIVE'
    },
    create: {
      username: 'admin',
      email: 'admin@textilepos.com',
      passwordHash: passwordHash,
      status: 'ACTIVE'
    }
  });

  const adminRoleId = roleMap.get('Admin');
  if (adminRoleId) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: adminUser.id, roleId: adminRoleId }
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRoleId
      }
    });
    console.log('✅ Seeded default admin user and linked to Admin role.');
  }

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
