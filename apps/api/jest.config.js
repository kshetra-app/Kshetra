// Inject fallback test environment credentials for isolated unit tests so isSupabaseConfigured is initialized
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test-fixture.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.dummy_signature_for_test_environment_only';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  forceExit: true,
  // Recycle workers between suites when their heap grows, preventing long coverage runs
  // from accumulating memory across unrelated test files.
  workerIdleMemoryLimit: '2GB',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/__tests__/**', '!src/server.ts'],
  coverageThreshold: {
    // Honest regression floors below the measured API coverage baseline. Raise these
    // deliberately as the API suite gains coverage; do not represent them as a quality target.
    global: {
      branches: 39,
      functions: 49,
      lines: 52,
      statements: 51,
    },
  },
};
