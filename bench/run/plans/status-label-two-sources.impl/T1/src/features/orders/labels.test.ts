import { describe, expect, it } from 'vitest';

import { statusLabels } from './labels';

describe('statusLabels', () => {
  it('gives every status the word the reader sees', () => {
    expect(statusLabels.open).toBe('Awaiting payment');
    expect(statusLabels.paid).toBe('Paid');
    expect(statusLabels.cancelled).toBe('Cancelled');
  });

  it('covers the union and nothing else', () => {
    expect(Object.keys(statusLabels)).toEqual(['open', 'paid', 'cancelled']);
  });
});
