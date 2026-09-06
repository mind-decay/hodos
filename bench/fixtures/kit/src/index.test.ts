import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import * as kit from './index';

const componentsDir = new URL('./components/', import.meta.url).pathname;
const componentFiles = readdirSync(componentsDir).filter(
  (file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx'),
);

describe('the public surface', () => {
  it('re-exports every component from the barrel (convention 1)', () => {
    for (const file of componentFiles) {
      const name = basename(file, '.tsx');
      expect(Object.keys(kit)).toContain(name);
    }
  });

  it('names each props type after its component (convention 2)', () => {
    for (const file of componentFiles) {
      const name = basename(file, '.tsx');
      const source = readFileSync(join(componentsDir, file), 'utf8');
      expect(source).toContain(`export interface ${name}Props`);
    }
  });
});
