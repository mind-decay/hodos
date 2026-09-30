import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { HomePage } from './HomePage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );

describe('HomePage', () => {
  it('offers both sections from one navigation landmark', () => {
    renderPage();
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    expect(nav).toBeDefined();
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Orders', 'Handover']);
  });

  it('points each link at the path the router declares', () => {
    renderPage();
    expect(screen.getByRole('link', { name: 'Orders' }).getAttribute('href')).toBe('/orders');
    expect(screen.getByRole('link', { name: 'Handover' }).getAttribute('href')).toBe('/shift');
  });
});
