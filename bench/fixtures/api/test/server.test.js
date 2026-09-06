import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import { createApp } from '../src/server.js';
import { reset } from '../src/store/orders.js';

/** @type {import('node:http').Server} */
let server;
/** @type {string} */
let base;

before(async () => {
  server = createApp();
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(undefined));
  });
  const address = server.address();
  base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
});

after(
  () =>
    new Promise((resolve) => {
      server.close(() => resolve(undefined));
    }),
);

beforeEach(reset);

describe('the running service', () => {
  it('answers the list route with JSON', async () => {
    const response = await fetch(`${base}/orders`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/json');
    const orders = /** @type {unknown[]} */ (await response.json());
    assert.equal(orders.length, 3);
  });

  it('answers an unknown path with the error envelope', async () => {
    const response = await fetch(`${base}/invoices`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: { code: 'not_found', message: 'no route for GET /invoices' },
    });
  });

  it('creates an order and answers 201', async () => {
    const response = await fetch(`${base}/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customer: 'Barbara', total: 7 }),
    });
    assert.equal(response.status, 201);
    const created = /** @type {{ customer: string }} */ (await response.json());
    assert.equal(created.customer, 'Barbara');
  });

  it('reports an invalid body through the same envelope', async () => {
    const response = await fetch(`${base}/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    });
    assert.equal(response.status, 400);
    const body = /** @type {{ error: { code: string } }} */ (await response.json());
    assert.equal(body.error.code, 'invalid_json');
  });
});
