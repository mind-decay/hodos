import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Badge } from './Badge';

describe('Badge', () => {
  it('carries its tone into the markup', () => {
    expect(renderToStaticMarkup(<Badge tone="success">shipped</Badge>)).toBe(
      '<span class="badge badge--success" data-tone="success">shipped</span>',
    );
  });

  it('renders the text it was given', () => {
    expect(renderToStaticMarkup(<Badge tone="neutral">draft</Badge>)).toContain('draft');
  });
});
