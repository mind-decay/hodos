import { useQuery } from '@tanstack/react-query';

import { keys, listOrders } from '../api';
import { useOrdersFilter } from '../model';
import { OrderList } from './OrderList';

export function OrdersPage() {
  const status = useOrdersFilter((state) => state.status);
  const setStatus = useOrdersFilter((state) => state.setStatus);
  const orders = useQuery({ queryKey: keys.list(status), queryFn: () => listOrders(status) });

  return (
    <section>
      <h1>Orders</h1>
      <label>
        Status
        <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
          <option value="all">all</option>
          <option value="open">open</option>
          <option value="paid">paid</option>
          <option value="cancelled">cancelled</option>
        </select>
      </label>
      {orders.isPending && <p>Loading orders…</p>}
      {orders.isError && <p role="alert">{orders.error.message}</p>}
      {orders.data && <OrderList orders={orders.data} />}
    </section>
  );
}
