import { describe, expect, it } from 'vitest';

import { siteName } from './site';

describe('siteName', () => {
  it('is the warehouse the fixture is about', () => {
    expect(siteName).toBe('Warehouse');
  });
});
