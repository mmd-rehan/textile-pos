import { execSync } from 'child_process';
import path from 'path';
import { resolveTestDatabaseUrl, TEST_ADMIN } from './test-env';

/** Recreates the test database from migrations and runs the standard (system) seed once per run. */
export default async function globalSetup() {
  const env = {
    ...process.env,
    DATABASE_URL: resolveTestDatabaseUrl(),
    NODE_ENV: 'test',
    SEED_DEV_DATA: 'false',
    SEED_ADMIN_USERNAME: TEST_ADMIN.username,
    SEED_ADMIN_EMAIL: TEST_ADMIN.email,
    SEED_ADMIN_PASSWORD: TEST_ADMIN.password,
  };
  const cwd = path.resolve(__dirname, '..');
  execSync('npx prisma migrate reset --force --skip-seed --skip-generate', { cwd, env, stdio: 'pipe' });
  execSync('npx ts-node prisma/seed.ts', { cwd, env, stdio: 'pipe' });
}
