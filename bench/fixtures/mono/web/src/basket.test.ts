import { describe, expect, it } from 'vitest';

import { basketTotal, type BasketLine } from './basket';

const lines: BasketLine[] = [
  { sku: 'a', price: 100, quantity: 2, band: 'standard' },
  { sku: 'b', price: 50, quantity: 1, band: 'zero' },
];

describe('basketTotal', () => {
  it('taxes every line before summing', () => {
    expect(basketTotal(lines)).toBe(290);
  });

  it('is zero for an empty basket', () => {
    expect(basketTotal([])).toBe(0);
  });

  it('fails loudly on a band svc does not know', () => {
    expect(() => basketTotal([{ sku: 'c', price: 1, quantity: 1, band: 'nope' }])).toThrow('no tax band nope');
  });
});
