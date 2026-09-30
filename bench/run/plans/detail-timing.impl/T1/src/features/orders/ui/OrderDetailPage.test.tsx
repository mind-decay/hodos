import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { OrderDetailPage } from './OrderDetailPage';

const renderAt = (path: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/orders" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('OrderDetailPage', () => {
  it('names the order it is loading while the request is pending', () => {
    renderAt('/orders/o-1');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Order o-1');
  });

  it('renders no heading when no order was named', () => {
    renderAt('/orders');
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('alert').textContent).toBe('No order was named.');
  });
});
