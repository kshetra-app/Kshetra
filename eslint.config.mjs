// KSHETRA ESLint flat config — Gold Standard Ch. 2-3 complexity & size budgets.
// Rules start as warnings during the migration, then graduate to errors.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.expo/**',
      '**/android/**',
      '**/ios/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.mjs',
      'data/seed/**/*.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // ─── Size & complexity budgets (Gold Standard) ───
      'max-lines': ['warn', { max: 800, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 15],
      'max-depth': ['warn', 4],
      'max-params': ['warn', 5],

      // ─── Correctness / clarity ───
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-magic-numbers': 'off', // enabled per-package as the backlog clears
    },
  },
  {
    // Tests may exceed function-length budgets and use helpers freely.
    files: ['**/__tests__/**', '**/*.test.{ts,tsx}'],
    rules: {
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
