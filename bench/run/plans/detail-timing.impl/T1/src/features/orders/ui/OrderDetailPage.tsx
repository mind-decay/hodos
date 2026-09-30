import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { getOrder, keys } from '../api';

export function OrderDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const order = useQuery({ queryKey: keys.detail(id), queryFn: () => getOrder(id), enabled: id !== '' });

  // The id is the one thing known before the request answers, so the pending
  // state names it rather than saying only that something is loading.
  if (order.isPending) return id === '' ? <p role="alert">No order was named.</p> : <h1>Order {id}</h1>;
  if (order.isError) return <p role="alert">{order.error.message}</p>;

  return (
    <article>
      <h1>{order.data.customer}</h1>
      <dl>
        <dt>Status</dt>
        <dd>{order.data.status}</dd>
        <dt>Total</dt>
        <dd>{order.data.total.toFixed(2)}</dd>
      </dl>
    </article>
  );
}
