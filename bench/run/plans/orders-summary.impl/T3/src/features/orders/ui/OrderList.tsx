import { Link } from 'react-router-dom';

import type { Order, OrderStatus } from '../api';

/**
 * D2: three statuses and one call site, so the map is inline here rather than a
 * stylesheet the fixture has no pipeline for.
 */
const statusColour: Record<OrderStatus, string> = {
  open: '#1a7f37',
  paid: '#0969da',
  cancelled: '#cf222e',
};

export interface OrderListProps {
  orders: Order[];
}

export function OrderList({ orders }: OrderListProps) {
  if (orders.length === 0) return <p>No orders match this filter.</p>;
  return (
    <ul aria-label="orders">
      {orders.map((order) => (
        <li key={order.id} data-status={order.status}>
          <Link to={`/orders/${order.id}`}>{order.customer}</Link>
          <span style={{ color: statusColour[order.status] }}>{order.status}</span>
          <span>{order.total.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  );
}
