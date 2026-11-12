module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Keep tests over geographic and census fixtures within predictable memory
  // limits; transpilation is isolated in this package's TypeScript config.
  maxWorkers: 2,
  workerIdleMemoryLimit: '512MB',
  moduleNameMapper: {
    '^@kshetra/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
};
