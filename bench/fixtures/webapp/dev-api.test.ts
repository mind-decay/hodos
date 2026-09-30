import { describe, expect, it } from 'vitest';

import { ORDERS, answer } from './dev-api.ts';

describe('the dev API', () => {
  it('answers the list with every order', () => {
    expect(answer('/api/orders')).toEqual({ status: 200, body: ORDERS });
  });

  it('treats the page default, status=all, as no filter', () => {
    expect(answer('/api/orders?status=all')).toEqual({ status: 200, body: ORDERS });
  });

  it('filters by status', () => {
    const paid = answer('/api/orders?status=paid');

    expect(paid?.status).toBe(200);
    expect(paid?.body).toEqual([ORDERS.find((order) => order.status === 'paid')]);
  });

  it('rejects a status outside the union in the envelope the client parses', () => {
    expect(answer('/api/orders?status=archived')).toEqual({
      status: 400,
      body: { error: { code: 'bad_status', message: 'archived is not a status' } },
    });
  });

  it('answers one order by id', () => {
    expect(answer('/api/orders/o-2')).toEqual({ status: 200, body: ORDERS[1] });
  });

  it('answers 404 in the same envelope for an order that is not there', () => {
    expect(answer('/api/orders/o-9')).toEqual({
      status: 404,
      body: { error: { code: 'not_found', message: 'no order o-9' } },
    });
  });

  it('leaves a path outside /api to the dev server, which serves the application', () => {
    expect(answer('/orders')).toBeNull();
    expect(answer('/')).toBeNull();
  });

  it('answers a path under /api that no endpoint claims', () => {
    expect(answer('/api/shifts')?.status).toBe(404);
  });

  it('holds the three orders the summary plan calls the fixture own data', () => {
    expect(ORDERS).toHaveLength(3);
    expect(ORDERS.map((order) => order.status)).toEqual(['open', 'paid', 'cancelled']);
    expect(ORDERS.reduce((sum, order) => sum + order.total, 0).toFixed(2)).toBe('61.50');
  });
});
