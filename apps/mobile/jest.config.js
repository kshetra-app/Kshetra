/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  // RTL v13 auto-registers its Jest matchers — no extend-expect needed.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Transform RN/Expo ESM packages that ship untranspiled code.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/flash-list|zustand))',
  ],
};
