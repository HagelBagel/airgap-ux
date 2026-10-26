import js from '@eslint/js'
import typescriptParser from '@typescript-eslint/parser'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,js}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        crypto: 'readonly',
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        DOMException: 'readonly',
        FileSystemFileHandle: 'readonly',
        Worker: 'readonly',
        MessageEvent: 'readonly',
        File: 'readonly',
        ErrorEvent: 'readonly',
        self: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off', // Allow console statements
      'prefer-const': 'error',
      'no-undef': 'off', // Turn off since we define globals above
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/**',
      'test_media/**',
      '*.config.js',
      '*.config.ts',
      '**/*.vue', // Skip Vue files for now to avoid parser issues
    ],
  },
]
