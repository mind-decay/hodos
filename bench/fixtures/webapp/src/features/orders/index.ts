/**
 * Convention 3: the barrel is this feature's only public surface. Another
 * feature imports from `features/orders`, never from a file inside it.
 */
export type { Order, OrderStatus } from './api';
export { keys as orderKeys } from './api';
export { useOrdersFilter } from './model';
export { OrderDetailPage } from './ui/OrderDetailPage';
export { OrdersPage } from './ui/OrdersPage';
