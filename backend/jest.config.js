/** @type {import('jest').Config} */
const tsJest = ['ts-jest', { tsconfig: 'tsconfig.spec.json' }];

module.exports = {
  testTimeout: 60000,
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      rootDir: '.',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      transform: { '^.+\\.ts$': tsJest },
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      rootDir: '.',
      testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
      transform: { '^.+\\.ts$': tsJest },
      globalSetup: '<rootDir>/test/global-setup.ts',
      setupFiles: ['<rootDir>/test/setup-env.ts'],
    },
  ],
};
