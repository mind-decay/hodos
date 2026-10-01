// temp-dir.mjs — the one place a test file makes a temporary directory. Each
// directory is removed when the test file that made it ends, whether its tests
// passed or failed (decision 0186).
//
// The `after` below is registered at this module's top level, which attaches
// it to the importing test file and runs it after that file's last test, a
// failed one included (PLATFORM-NOTES.md fact 63).

import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { after } from 'node:test';

const made = [];

// `force`: a path already gone is no error, since a test may delete part of
// its own tree. A removal that throws does not stop the ones after it; the
// hook throws once every path was tried, so node:test fails the file's hook,
// which fails the run and names each path that stayed.
after(() => {
  const failed = [];
  for (const path of made.splice(0)) {
    try {
      rmSync(path, { recursive: true, force: true, maxRetries: 3 });
    } catch (err) {
      failed.push(err);
    }
  }
  if (failed.length === 1) throw failed[0];
  if (failed.length > 1) {
    throw new AggregateError(failed, `temp-dir: ${failed.length} directories stayed — ${failed.map((err) => err.path).join(', ')}`);
  }
});

/** A fresh directory `<realpath(tmpdir())>/<prefix>XXXXXX`, removed when this test file ends. */
export function tempDir(prefix) {
  return track(realpathSync(mkdtempSync(join(tmpdir(), prefix))));
}

/**
 * Remove `path` when this test file ends: a directory other code made for
 * this test. A relative path is refused, because it would resolve against
 * whatever cwd a test left behind.
 */
export function track(path) {
  if (!isAbsolute(path)) throw new TypeError(`track: ${path} is not an absolute path`);
  made.push(path);
  return path;
}
