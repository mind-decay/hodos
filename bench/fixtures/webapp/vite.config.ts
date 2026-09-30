import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

import { answer } from './dev-api.ts';

/**
 * Decision 0123: the fixture serves its own API in development, so a data route
 * renders data instead of its error state. The decision of what to answer is
 * `dev-api.ts`, which is tested; this is the hook that writes it.
 */
const devApi: Plugin = {
  name: 'fixture-dev-api',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // The request's own url, read off it without naming a Node type: the
      // fixture's tsconfig loads no @types/node, by decision of its own `types` list.
      const given = answer((req as { url?: string }).url ?? '/');
      if (!given) {
        next();
        return;
      }
      res.statusCode = given.status;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(given.body));
    });
  },
};

export default defineConfig({
  plugins: [react(), devApi],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
});
