import { describe, expect, it } from 'vitest';

import type { Order } from './api';
import { summarizeOrders } from './summary';

const orders: Order[] = [
  { id: 'o-1', customer: 'Ada', total: 10.1, status: 'open' },
  { id: 'o-2', customer: 'Grace', total: 20.2, status: 'paid' },
  { id: 'o-3', customer: 'Alan', total: 31.2, status: 'cancelled' },
];

describe('summarizeOrders', () => {
  it('counts the orders, adds the totals, and counts each status', () => {
    expect(summarizeOrders(orders)).toEqual({
      count: 3,
      total: 61.5,
      byStatus: { open: 1, paid: 1, cancelled: 1 },
    });
  });

  it('summarizes an empty list as zeros rather than as nothing', () => {
    expect(summarizeOrders([])).toEqual({
      count: 0,
      total: 0,
      byStatus: { open: 0, paid: 0, cancelled: 0 },
    });
  });

  it('adds 0.1 and 0.2 to 0.3 at cent precision', () => {
    const pennies: Order[] = [
      { id: 'p-1', customer: 'Ada', total: 0.1, status: 'open' },
      { id: 'p-2', customer: 'Ada', total: 0.2, status: 'open' },
    ];
    expect(summarizeOrders(pennies).total).toBe(0.3);
  });
});
