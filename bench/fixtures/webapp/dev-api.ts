/**
 * The dev server's own API (decision 0123). Vite alone serves no `/api`, so
 * every data route rendered its error state and every route earned an ambient
 * network-source row in `verify.md`. This half is a pure function from a URL to
 * a status and a body, so it is tested; `vite.config.ts` holds the thin hook
 * that writes what this returns.
 */
export type OrderStatus = 'open' | 'paid' | 'cancelled';

export interface Order {
  id: string;
  customer: string;
  total: number;
  status: OrderStatus;
}

/**
 * Three orders, one per status, adding to 61.50 — what `orders-summary` calls
 * the fixture's own data, and the numbers its T1 acceptance names.
 */
export const ORDERS: Order[] = [
  { id: 'o-1', customer: 'Ada', total: 10.1, status: 'open' },
  { id: 'o-2', customer: 'Grace', total: 20.2, status: 'paid' },
  { id: 'o-3', customer: 'Alan', total: 31.2, status: 'cancelled' },
];

export interface Answer {
  status: number;
  body: unknown;
}

const STATUSES: readonly string[] = ['open', 'paid', 'cancelled'];

/** The one envelope the client parses: `ApiError.fromResponse` reads `error.code` and `error.message`. */
const fail = (status: number, code: string, message: string): Answer => ({
  status,
  body: { error: { code, message } },
});

/** `null` means the path is not this module's, and the dev server serves the application. */
export function answer(url: string): Answer | null {
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  if (!pathname.startsWith('/api/')) return null;

  if (pathname === '/api/orders') {
    const status = searchParams.get('status') ?? 'all';
    if (status === 'all') return { status: 200, body: ORDERS };
    if (!STATUSES.includes(status)) return fail(400, 'bad_status', `${status} is not a status`);
    return { status: 200, body: ORDERS.filter((order) => order.status === status) };
  }

  const detail = /^\/api\/orders\/([^/]+)$/.exec(pathname);
  if (detail) {
    const id = decodeURIComponent(detail[1]);
    const order = ORDERS.find((one) => one.id === id);
    return order ? { status: 200, body: order } : fail(404, 'not_found', `no order ${id}`);
  }

  return fail(404, 'no_route', `no endpoint answers ${pathname}`);
}
