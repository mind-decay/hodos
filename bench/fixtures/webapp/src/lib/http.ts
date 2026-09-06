import { ApiError } from './errors';

const BASE = '/api';

/**
 * Convention 1: the only place in the application that calls fetch. Callers get
 * parsed JSON or an ApiError; they never see a Response.
 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      headers: { accept: 'application/json' },
      ...init,
    });
  } catch (cause) {
    throw new ApiError('network', 0, 'the request did not reach the server', { cause });
  }
  if (!response.ok) throw await ApiError.fromResponse(response);
  return (await response.json()) as T;
}
