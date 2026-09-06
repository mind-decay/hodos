import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { matchRoute, routes } from '../src/routes.js';

describe('matchRoute', () => {
  it('matches a static route', () => {
    const match = matchRoute('GET', '/orders');
    assert.equal(match?.route.pattern, '/orders');
    assert.deepEqual(match?.params, {});
  });

  it('binds a path parameter and decodes it', () => {
    const match = matchRoute('GET', '/orders/o%2D1');
    assert.equal(match?.route.pattern, '/orders/:id');
    assert.deepEqual(match?.params, { id: 'o-1' });
  });

  it('does not match another method on the same path', () => {
    assert.equal(matchRoute('DELETE', '/orders'), null);
  });

  it('does not match a path the table does not carry', () => {
    assert.equal(matchRoute('GET', '/invoices'), null);
  });

  it('keeps every route reachable from the one table', () => {
    for (const route of routes) {
      const concrete = route.pattern.replaceAll(/:\w+/g, 'o-1');
      assert.ok(matchRoute(route.method, concrete), `${route.method} ${route.pattern} is unreachable`);
    }
  });
});
