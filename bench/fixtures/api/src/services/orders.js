import { AppError } from '../errors.js';
import { all, byId, put } from '../store/orders.js';

/** @typedef {import('../store/orders.js').Order} Order */

const STATUSES = ['open', 'paid', 'cancelled'];

/**
 * @param {string | null} status
 * @returns {Order[]}
 */
export function list(status) {
  if (status === null || status === 'all') return all();
  if (!STATUSES.includes(status)) {
    throw new AppError('invalid_status', 400, `status must be one of ${STATUSES.join(', ')}`);
  }
  return all().filter((order) => order.status === status);
}

/**
 * @param {string} id
 * @returns {Order}
 */
export function get(id) {
  const order = byId(id);
  if (!order) throw new AppError('not_found', 404, `no order ${id}`);
  return order;
}

/**
 * @param {unknown} input
 * @returns {Order}
 */
export function create(input) {
  if (typeof input !== 'object' || input === null) {
    throw new AppError('invalid_body', 400, 'the body must be a JSON object');
  }
  const { customer, total } = /** @type {{ customer?: unknown, total?: unknown }} */ (input);
  if (typeof customer !== 'string' || customer.trim() === '') {
    throw new AppError('invalid_customer', 400, 'customer must be a non-empty string');
  }
  if (typeof total !== 'number' || !Number.isFinite(total) || total < 0) {
    throw new AppError('invalid_total', 400, 'total must be a number that is not negative');
  }
  return put({ id: `o-${all().length + 1}`, customer, total, status: 'open' });
}
