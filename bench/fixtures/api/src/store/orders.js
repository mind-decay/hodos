/** @typedef {{ id: string, customer: string, total: number, status: 'open' | 'paid' | 'cancelled' }} Order */

/** @type {Map<string, Order>} */
const orders = new Map();

/** @type {Order[]} */
const seed = [
  { id: 'o-1', customer: 'Ada', total: 12.5, status: 'open' },
  { id: 'o-2', customer: 'Grace', total: 99, status: 'paid' },
  { id: 'o-3', customer: 'Katherine', total: 4, status: 'cancelled' },
];

export function reset() {
  orders.clear();
  for (const order of seed) orders.set(order.id, { ...order });
}

reset();

/** @returns {Order[]} */
export function all() {
  return [...orders.values()];
}

/**
 * @param {string} id
 * @returns {Order | undefined}
 */
export function byId(id) {
  return orders.get(id);
}

/**
 * @param {Order} order
 * @returns {Order}
 */
export function put(order) {
  orders.set(order.id, order);
  return order;
}
