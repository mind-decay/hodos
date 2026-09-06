import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    // Convention 1: the network is reached through request() in src/lib/http.ts.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Call the network through request() in src/lib/http.ts.' },
      ],
    },
  },
);
