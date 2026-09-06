import { createServer } from 'node:http';

import { AppError } from './errors.js';
import { fail, ok } from './http/respond.js';
import { matchRoute } from './routes.js';

const MAX_BODY = 64 * 1024;

/**
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<unknown>}
 */
async function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return null;
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) throw new AppError('body_too_large', 413, 'the body is larger than 64 KiB');
  }
  if (raw.trim() === '') return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError('invalid_json', 400, 'the body is not valid JSON');
  }
}

export function createApp() {
  return createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const match = matchRoute(req.method ?? 'GET', url.pathname);
    Promise.resolve()
      .then(async () => {
        if (!match) {
          throw new AppError('not_found', 404, `no route for ${req.method} ${url.pathname}`);
        }
        const body = await readBody(req);
        const data = await match.route.handler({ params: match.params, query: url.searchParams, body });
        ok(res, data, match.route.status);
      })
      .catch((error) => fail(res, error));
  });
}
