import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { Order } from '../api';
import { OrderList } from './OrderList';

const orders: Order[] = [
  { id: 'o-1', customer: 'Ada', total: 12.5, status: 'open' },
  { id: 'o-2', customer: 'Grace', total: 99, status: 'paid' },
];

const renderList = (given: Order[]) =>
  render(
    <MemoryRouter>
      <OrderList orders={given} />
    </MemoryRouter>,
  );

describe('OrderList', () => {
  it('lists one row per order, linking to its detail route', () => {
    renderList(orders);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Ada' }).getAttribute('href')).toBe('/orders/o-1');
  });

  it('says so when the filter matches nothing', () => {
    renderList([]);
    expect(screen.getByText('No orders match this filter.')).toBeDefined();
    expect(screen.queryByRole('list')).toBeNull();
  });
});
