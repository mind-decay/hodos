import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applyTax, bands } from './index.js';

describe('applyTax', () => {
  it('adds the standard band', () => {
    assert.equal(applyTax(100, 'standard'), 120);
  });

  it('leaves a zero-rated amount alone', () => {
    assert.equal(applyTax(19.99, 'zero'), 19.99);
  });

  it('rounds to two decimals', () => {
    assert.equal(applyTax(0.015, 'reduced'), 0.02);
  });

  it('refuses a band it does not know', () => {
    assert.throws(() => applyTax(10, 'made-up'), /no tax band made-up/);
  });

  it('lists the bands it applies', () => {
    assert.deepEqual(bands(), ['standard', 'reduced', 'zero']);
  });
});
