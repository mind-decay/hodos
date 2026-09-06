import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OrderDetailPage } from './OrderDetailPage';

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

const renderDetail = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/orders/o-1']}>
        <Routes>
          <Route path="/orders/:id" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OrderDetailPage', () => {
  it('shows the reader the status word the list shows, not the status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ id: 'o-1', customer: 'Ada', total: 12.5, status: 'open' })),
    );
    renderDetail();

    expect(await screen.findByText('Awaiting payment')).toBeDefined();
    expect(screen.queryByText('open')).toBeNull();
  });
});
