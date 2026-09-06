import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Order } from '../api';
import { useOrdersFilter } from '../model';
import { OrdersPage } from './OrdersPage';

const orders: Order[] = [
  { id: 'o-1', customer: 'Ada', total: 10.1, status: 'open' },
  { id: 'o-2', customer: 'Grace', total: 20.2, status: 'paid' },
  { id: 'o-3', customer: 'Alan', total: 31.2, status: 'cancelled' },
];

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  useOrdersFilter.getState().reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OrdersPage summary line', () => {
  it('states the count and the total of the resolved list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(orders)));
    renderPage();
    expect(await screen.findByText('3 orders · 61.50')).toBeDefined();
  });

  it('states zeros when the filter matches nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([])));
    renderPage();
    expect(await screen.findByText('0 orders · 0.00')).toBeDefined();
  });

  it('renders no summary while the query is pending', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    renderPage();
    expect(screen.getByText('Loading orders…')).toBeDefined();
    expect(screen.queryByText(/^\d+ orders · /)).toBeNull();
  });
});
