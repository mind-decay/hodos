import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BadgeCount } from './BadgeCount';

describe('BadgeCount', () => {
  it('carries the tone and the count into the markup', () => {
    expect(renderToStaticMarkup(<BadgeCount tone="success" count={3} />)).toBe(
      '<span class="badge badge--success badge--count" data-tone="success" data-count="3">3</span>',
    );
  });

  it('renders a zero rather than nothing', () => {
    expect(renderToStaticMarkup(<BadgeCount tone="neutral" count={0} />)).toContain('>0</span>');
  });
});
