/**
 * Seed entry point.
 *
 * Default (npm run db:seed / npx prisma db seed):
 *   - Runs the STANDARD system seed only (app/system data). Safe for production
 *     and safe to re-run (idempotent; never overwrites admin-edited values).
 *
 * Opt-in dev/demo data (npm run db:seed:dev / SEED_DEV_DATA=true):
 *   - Runs the standard seed, then the dev seed (sample business records).
 */

import { PrismaClient } from '@prisma/client';
import { envBool } from './seeds/seed-utils';
import { runStandardSeed } from './seeds/standard.seed';
import { runDevSeed } from './seeds/dev.seed';

const prisma = new PrismaClient();

async function main() {
  await runStandardSeed(prisma);

  if (envBool('SEED_DEV_DATA')) {
    await runDevSeed(prisma);
  } else {
    console.log('ℹ️   Skipping dev/demo data (set SEED_DEV_DATA=true or run npm run db:seed:dev to include it).');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌  Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
