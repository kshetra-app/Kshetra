import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/.expo/**',
      '**/android/**',
      '**/ios/**',
      'data/**',
      'reports/**',
      'scratch/**',
      'scrapers/**',
      '*.config.js',
      '*.config.mjs'
    ],
  },
  {
    plugins: {
      'react-hooks': {
        rules: {
          'exhaustive-deps': { create: () => ({}) },
        },
      },
    },
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/prefer-as-const': 'warn',
      'react-hooks/exhaustive-deps': 'off',
      'no-console': 'off',
      'no-undef': 'off',
      'no-case-declarations': 'off',
      'no-empty': 'off',
      'no-useless-escape': 'warn',
      'prefer-const': 'warn',
    },
  }
);
