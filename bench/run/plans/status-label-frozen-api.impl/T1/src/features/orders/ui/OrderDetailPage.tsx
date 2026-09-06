import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { getOrder, keys } from '../api';
import { statusLabels } from '../labels';

export function OrderDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const order = useQuery({ queryKey: keys.detail(id), queryFn: () => getOrder(id), enabled: id !== '' });

  if (order.isPending) return <p>Loading order…</p>;
  if (order.isError) return <p role="alert">{order.error.message}</p>;

  return (
    <article>
      <h1>{order.data.customer}</h1>
      <dl>
        <dt>Status</dt>
        <dd>{statusLabels[order.data.status]}</dd>
        <dt>Total</dt>
        <dd>{order.data.total.toFixed(2)}</dd>
      </dl>
    </article>
  );
}
