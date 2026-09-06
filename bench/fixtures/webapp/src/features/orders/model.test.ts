import { beforeEach, describe, expect, it } from 'vitest';

import { useOrdersFilter } from './model';

beforeEach(() => {
  useOrdersFilter.getState().reset();
});

describe('the orders filter store', () => {
  it('starts on every order', () => {
    expect(useOrdersFilter.getState().status).toBe('all');
  });

  it('keeps the status it was set to', () => {
    useOrdersFilter.getState().setStatus('paid');
    expect(useOrdersFilter.getState().status).toBe('paid');
  });

  it('returns to every order on reset', () => {
    useOrdersFilter.getState().setStatus('cancelled');
    useOrdersFilter.getState().reset();
    expect(useOrdersFilter.getState().status).toBe('all');
  });
});
