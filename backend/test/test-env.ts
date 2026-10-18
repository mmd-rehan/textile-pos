/**
 * Integration tests run against a dedicated, disposable database. The URL comes
 * from TEST_DATABASE_URL and is never read from .env, so a missing variable can
 * not fall back to a shared or production database. The database name must end
 * in "_test" because global setup wipes it.
 */
export const TEST_ADMIN = {
  username: 'test-admin',
  email: 'test-admin@textilepos.test',
  password: 'test-admin-password',
};

export function resolveTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Point it at a disposable MySQL database whose name ends in "_test", ' +
        'e.g. mysql://root:password@127.0.0.1:3308/textile_pos_test',
    );
  }
  const dbName = new URL(url).pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(`Refusing to run integration tests against "${dbName}": the database name must end in "_test".`);
  }
  return url;
}
