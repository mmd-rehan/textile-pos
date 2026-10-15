import { resolveTestDatabaseUrl } from './test-env';

// Runs in every test worker before any module is loaded, so PrismaClient and
// ConfigModule see the test database instead of the values in .env.
process.env.DATABASE_URL = resolveTestDatabaseUrl();
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-secret';
