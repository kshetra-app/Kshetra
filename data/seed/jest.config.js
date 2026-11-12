/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Seed datasets and cross-package adapters are large. Bound workers so Jest
  // does not build several memory-heavy TypeScript programs at once.
  maxWorkers: 2,
  workerIdleMemoryLimit: '512MB',
  moduleNameMapper: {
    '^@kshetra/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
};
