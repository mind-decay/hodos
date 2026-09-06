import { request } from '../../lib/http';

export type OrderStatus = 'open' | 'paid' | 'cancelled';

export interface Order {
  id: string;
  customer: string;
  total: number;
  status: OrderStatus;
}

/**
 * Convention 4: every query key of this feature is built here. No component
 * writes a literal key array, so an invalidation cannot miss a cache entry.
 */
export const keys = {
  all: ['orders'] as const,
  list: (status: string) => [...keys.all, 'list', status] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
};

export const listOrders = (status: string) =>
  request<Order[]>(`/orders?status=${encodeURIComponent(status)}`);

export const getOrder = (id: string) => request<Order>(`/orders/${encodeURIComponent(id)}`);
