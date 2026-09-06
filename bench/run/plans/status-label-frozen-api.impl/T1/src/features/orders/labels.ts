/**
 * The word a reader sees for each status.
 *
 * The keys are spelled out here rather than taken from `OrderStatus`, which
 * lives in the module being split on refactor/orders-api-split.
 */
export type LabelKey = 'open' | 'paid' | 'cancelled';

export const statusLabels: Record<LabelKey, string> = {
  open: 'Awaiting payment',
  paid: 'Paid',
  cancelled: 'Cancelled',
};
