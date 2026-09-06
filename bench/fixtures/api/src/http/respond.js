import { AppError } from '../errors.js';

/**
 * The only writer of a response body in this service (convention 2).
 * @param {import('node:http').ServerResponse} res
 * @param {unknown} data
 * @param {number} [status]
 */
export function ok(res, data, status = 200) {
  const body = JSON.stringify(data ?? null);
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(body);
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {unknown} error
 */
export function fail(res, error) {
  const known =
    error instanceof AppError ? error : new AppError('internal', 500, 'the request could not be handled');
  const body = JSON.stringify({ error: { code: known.code, message: known.message } });
  res.writeHead(known.status, { 'content-type': 'application/json' });
  res.end(body);
}
