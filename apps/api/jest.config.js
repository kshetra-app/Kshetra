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
  // V8 coverage avoids the high memory cost of Babel/Istanbul instrumentation
  // on the API's large route and data modules while retaining the same gates.
  coverageProvider: 'v8',
  testEnvironment: 'node',
  testTimeout: 30000,
  forceExit: true,
  // Keep GitHub Actions inside the hosted runner's memory budget; the API test
  // graph (including the server's full route registration) is large per worker.
  ...(process.env.CI ? { maxWorkers: 2 } : {}),
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@kshetra/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/__tests__/**', '!src/server.ts'],
  coverageThreshold: {
    // Measured by the 76 passing API suites on 2026-11-11. These floors prevent
    // regressions; they are not a coverage target and should rise as tests grow.
    global: {
      branches: 41,
      functions: 54,
      lines: 54,
      statements: 53,
    },
  },
};
