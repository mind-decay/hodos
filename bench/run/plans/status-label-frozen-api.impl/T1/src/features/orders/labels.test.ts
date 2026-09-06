import { describe, expect, it } from 'vitest';

import { statusLabels } from './labels';

describe('statusLabels', () => {
  it('gives every status the word the reader sees', () => {
    expect(statusLabels.open).toBe('Awaiting payment');
    expect(statusLabels.paid).toBe('Paid');
    expect(statusLabels.cancelled).toBe('Cancelled');
  });

  it('has a word for every status the list can render', () => {
    for (const status of ['open', 'paid', 'cancelled'] as const) {
      expect(statusLabels[status]).not.toBe('');
    }
  });
});
