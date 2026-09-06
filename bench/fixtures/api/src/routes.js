import { create, get, list } from './services/orders.js';

/**
 * @typedef {{ params: Record<string, string>, query: URLSearchParams, body: unknown }} RequestContext
 * @typedef {{ method: string, pattern: string, status: number, handler: (context: RequestContext) => unknown }} Route
 */

/**
 * Convention 1: every route of this service is in this table. A handler that is
 * not listed here is not reachable, so one file answers "what does this API do".
 * @type {Route[]}
 */
export const routes = [
  { method: 'GET', pattern: '/orders', status: 200, handler: (ctx) => list(ctx.query.get('status')) },
  { method: 'GET', pattern: '/orders/:id', status: 200, handler: (ctx) => get(ctx.params.id) },
  { method: 'POST', pattern: '/orders', status: 201, handler: (ctx) => create(ctx.body) },
];

/**
 * @param {string} method
 * @param {string} pathname
 * @returns {{ route: Route, params: Record<string, string> } | null}
 */
export function matchRoute(method, pathname) {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  for (const route of routes) {
    if (route.method !== method) continue;
    const patternParts = route.pattern.split('/').filter(Boolean);
    if (patternParts.length !== parts.length) continue;
    /** @type {Record<string, string>} */
    const params = {};
    const matched = patternParts.every((part, index) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = decodeURIComponent(parts[index]);
        return true;
      }
      return part === parts[index];
    });
    if (matched) return { route, params };
  }
  return null;
}
