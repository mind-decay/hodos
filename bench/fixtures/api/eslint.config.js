import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['coverage'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: globals.node },
  },
  {
    // Convention 2: a handler returns data and throws AppError. Writing to the
    // response is respond.js's job, and only its.
    files: ['src/routes.js', 'src/services/**/*.js', 'src/store/**/*.js'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'res', property: 'end', message: 'Return data and let respond() write it (src/http/respond.js).' },
        { object: 'res', property: 'write', message: 'Return data and let respond() write it (src/http/respond.js).' },
        { object: 'res', property: 'writeHead', message: 'Return data and let respond() write it (src/http/respond.js).' },
      ],
    },
  },
  {
    // Convention 4: routes → services → store, one way. A layer never imports
    // the one above it.
    files: ['src/services/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['**/routes.js', '**/http/*'], },
      ],
    },
  },
  {
    files: ['src/store/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['**/routes.js', '**/services/*', '**/http/*'] },
      ],
    },
  },
];
