import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Stack } from './Stack';

describe('Stack', () => {
  it('defaults to the tight gap', () => {
    expect(renderToStaticMarkup(<Stack>one</Stack>)).toContain('data-gap="tight"');
  });

  it('takes the gap it is given', () => {
    expect(renderToStaticMarkup(<Stack gap="loose">one</Stack>)).toContain('data-gap="loose"');
  });
});
