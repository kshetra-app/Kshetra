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
