import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { siteName } from '../../../site';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('heads the page with the site name and nothing else at that level', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([siteName]);
  });
});
