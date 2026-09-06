import { Link } from 'react-router-dom';

import type { Order } from '../api';

export interface OrderListProps {
  orders: Order[];
}

export function OrderList({ orders }: OrderListProps) {
  if (orders.length === 0) return <p>No orders match this filter.</p>;
  return (
    <ul aria-label="orders">
      {orders.map((order) => (
        <li key={order.id}>
          <Link to={`/orders/${order.id}`}>{order.customer}</Link>
          <span>{order.status}</span>
          <span>{order.total.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  );
}
