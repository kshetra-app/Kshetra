// Inject fallback test environment credentials for isolated unit tests so isSupabaseConfigured is initialized
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test-fixture.supabase.co';
process.env.SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.dummy_signature_for_test_environment_only';
process.env.AD_VIEW_TOKEN_SECRET =
  process.env.AD_VIEW_TOKEN_SECRET || 'isolated-test-view-token-secret-32-bytes-minimum';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  // Jest should transpile each loaded test/source module independently. The
  // API TypeScript project includes a 141 MB generated data source; compiling
  // the whole tsconfig program for a focused Jest run can exhaust CI memory.
  // Type safety remains enforced by the separate API TypeScript CI job.
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  testEnvironment: 'node',
  testTimeout: 30000,
  forceExit: true,
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@kshetra/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/__tests__/**', '!src/server.ts'],
  coverageThreshold: {
    // Thresholds set as regression floors just below current comprehensive actuals
    // across all 65 test suites and registered Fastify routes/services.
    global: {
      branches: 55,
      functions: 70,
      lines: 68,
      statements: 68,
    },
  },
};
