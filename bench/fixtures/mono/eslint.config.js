import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist', '**/coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    // Convention 1: web reaches svc by package name. A relative path across the
    // workspace boundary compiles today and breaks the day svc is published.
    files: ['web/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['../svc/*', '../../svc/*', '**/svc/src/*'], message: 'Import @mono/svc by its package name.' },
          ],
        },
      ],
    },
  },
);
