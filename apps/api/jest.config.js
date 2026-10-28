// Inject fallback test environment credentials for isolated unit tests so isSupabaseConfigured is initialized
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test-fixture.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.dummy_signature_for_test_environment_only';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  forceExit: true,
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
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
