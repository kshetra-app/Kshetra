// Inject fallback test environment credentials for isolated unit tests so isSupabaseConfigured is initialized
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test-fixture.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.dummy_signature_for_test_environment_only';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/__tests__/**', '!src/server.ts'],
  coverageThreshold: {
    // Gold Standard target met. The OpenAI live-integration path in
    // services/ai.ts is now exercised via a mocked client (ai-openai.test.ts),
    // lifting branch coverage to ~85%. Thresholds are set as regression floors
    // just below current actuals (95% stmts/funcs/lines, 85% branches).
    global: {
      branches: 82,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
