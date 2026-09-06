import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './errors';
import { request } from './http';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('request', () => {
  it('returns the parsed body of a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([{ id: 'o-1' }])));
    await expect(request<{ id: string }[]>('/orders')).resolves.toEqual([{ id: 'o-1' }]);
  });

  it('turns the error envelope into an ApiError carrying its code and status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: { code: 'not_found', message: 'no such order' } }, 404)),
    );
    await expect(request('/orders/o-9')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'not_found',
      status: 404,
      message: 'no such order',
    });
  });

  it('reports a request that never reached the server as a network ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed to fetch')));
    const error = await request('/orders').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'network', status: 0 });
  });
});
