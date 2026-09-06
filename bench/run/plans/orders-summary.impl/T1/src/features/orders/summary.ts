import type { Order, OrderStatus } from './api';

export interface OrderSummary {
  count: number;
  total: number;
  byStatus: Record<OrderStatus, number>;
}

/** Money is compared and displayed at cent precision; a float sum is not. */
const cents = (value: number) => Math.round(value * 100) / 100;

/**
 * The summary of the array the list is showing. Pure and total: an empty list
 * is a valid summary whose every number is 0, and `OrderStatus` is closed, so
 * an unknown status cannot reach `byStatus`.
 */
export function summarizeOrders(orders: Order[]): OrderSummary {
  const byStatus: Record<OrderStatus, number> = { open: 0, paid: 0, cancelled: 0 };
  let total = 0;
  for (const order of orders) {
    total += order.total;
    byStatus[order.status] += 1;
  }
  return { count: orders.length, total: cents(total), byStatus };
}
