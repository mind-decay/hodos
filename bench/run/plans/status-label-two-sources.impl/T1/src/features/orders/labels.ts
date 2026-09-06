import type { OrderStatus } from './api';

/**
 * The word a reader sees for each status. A `Record` over the closed union, so
 * a status added without a label is a compile error rather than a blank cell.
 */
export const statusLabels: Record<OrderStatus, string> = {
  open: 'Awaiting payment',
  paid: 'Paid',
  cancelled: 'Cancelled',
};
