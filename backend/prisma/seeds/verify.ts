/**
 * Seed verification script (no test framework required).
 *
 *   npm run db:seed:verify
 *
 * Asserts the invariants the split seed is supposed to guarantee:
 *   - exactly the five canonical feature flags exist (no legacy/duplicate rows)
 *   - currencies are not duplicated
 *   - self exchange rates are not duplicated
 *   - the Admin role maps to at most one user (admin not duplicated)
 *
 * Read-only: it never writes. Exits non-zero if any check fails.
 */

import { PrismaClient } from '@prisma/client';
import { CANONICAL_FLAG_KEYS } from './feature-flags.constants';

const prisma = new PrismaClient();

type Check = { name: string; ok: boolean; detail: string };

async function run(): Promise<Check[]> {
  const checks: Check[] = [];

  // 1 + 2. Feature flags: exactly the canonical five, nothing extra.
  const flags = await prisma.featureFlag.findMany();
  const flagNames = flags.map((f) => f.name).sort();
  const expected = [...CANONICAL_FLAG_KEYS].sort();
  const extra = flagNames.filter((n) => !CANONICAL_FLAG_KEYS.includes(n));
  checks.push({
    name: 'Feature flags = exactly five canonical keys',
    ok: JSON.stringify(flagNames) === JSON.stringify(expected),
    detail: `found [${flagNames.join(', ')}]`,
  });
  checks.push({
    name: 'No extra/unknown feature flag rows',
    ok: extra.length === 0,
    detail: extra.length ? `extra=[${extra.join(', ')}]` : 'none',
  });

  // 3. Currencies not duplicated (code is unique, but verify counts match).
  const currencies = await prisma.currency.findMany();
  const currencyCodes = new Set(currencies.map((c) => c.code));
  checks.push({
    name: 'Currencies not duplicated',
    ok: currencyCodes.size === currencies.length,
    detail: `${currencies.length} rows, ${currencyCodes.size} distinct codes`,
  });

  // 4. Self exchange rates not duplicated.
  const rates = await prisma.currencyExchangeRate.findMany();
  const selfRates = rates.filter((r) => r.fromCurrencyCode === r.toCurrencyCode);
  const selfKeys = new Set(selfRates.map((r) => `${r.fromCurrencyCode}->${r.toCurrencyCode}`));
  checks.push({
    name: 'Self exchange rates not duplicated',
    ok: selfKeys.size === selfRates.length,
    detail: `${selfRates.length} self-rates, ${selfKeys.size} distinct`,
  });

  // 5. Admin user not duplicated.
  const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });
  let adminUserCount = 0;
  if (adminRole) {
    adminUserCount = await prisma.userRole.count({ where: { roleId: adminRole.id } });
  }
  checks.push({
    name: 'Admin user not duplicated (<= 1 admin mapping)',
    ok: adminUserCount <= 1,
    detail: `${adminUserCount} admin user mapping(s)`,
  });

  return checks;
}

run()
  .then(async (checks) => {
    let failed = 0;
    for (const c of checks) {
      const mark = c.ok ? '✅' : '❌';
      if (!c.ok) failed++;
      console.log(`${mark}  ${c.name} — ${c.detail}`);
    }
    await prisma.$disconnect();
    if (failed > 0) {
      console.error(`\n${failed} check(s) failed.`);
      process.exit(1);
    }
    console.log('\nAll seed checks passed.');
  })
  .catch(async (e) => {
    console.error('Verification crashed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
