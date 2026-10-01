import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { auditSource, auditTree } from './assert-audit.mjs';
import { tempDir } from '../../scripts/temp-dir.mjs';

const dir = () => tempDir('hodos-assertaudit-');

test('a bare assert! is bare, and one with a message is not', () => {
  const r = auditSource('assert!(a);\nassert!(a, "why");\n');
  assert.equal(r.total, 2);
  assert.equal(r.bare, 1);
  assert.deepEqual(r.bareLines, [1]);
});

test('assert_eq! and assert_ne! count, and their third argument is the message', () => {
  const r = auditSource('assert_eq!(a, b);\nassert_ne!(a, b, "why");\nassert_eq!(a, b, "why {x}", x);\n');
  assert.equal(r.total, 3);
  assert.equal(r.bare, 1);
  assert.deepEqual(r.bareLines, [1]);
});

test('a call spanning several lines is one call, and its message is found on a later line', () => {
  const r = auditSource('assert_eq!(\n  left,\n  right,\n  "why"\n);\nassert_eq!(\n  left,\n  right\n);\n');
  assert.equal(r.total, 2);
  assert.equal(r.bare, 1);
  assert.deepEqual(r.bareLines, [6]);
});

test('a comma inside a string, a nested call or a char literal does not split arguments', () => {
  const r = auditSource('assert!(s == "a, b");\nassert_eq!(f(a, b), g(c, d));\nassert_eq!(c, \',\');\n');
  assert.equal(r.total, 3);
  assert.equal(r.bare, 3);
});

test('debug_assert! and assert_matches! are not counted, and neither is a comment or a string mentioning assert!', () => {
  const r = auditSource('// assert!(a);\nlet s = "assert!(a);";\ndebug_assert!(a);\nassert_matches!(a, B);\nmy_assert!(a);\n');
  assert.equal(r.total, 0);
  assert.equal(r.bare, 0);
});

test('an insta snapshot assertion is not an assert macro', () => {
  const r = auditSource('insta::assert_debug_snapshot!(x);\nassert_snapshot!(y);\n');
  assert.equal(r.total, 0);
});

test('auditTree reports one row per file, sorted by bare count descending', () => {
  const root = dir();
  mkdirSync(join(root, 'crates', 'a', 'tests'), { recursive: true });
  mkdirSync(join(root, 'crates', 'b', 'tests'), { recursive: true });
  writeFileSync(join(root, 'crates', 'a', 'tests', 'one.rs'), 'assert!(x);\nassert!(y);\n');
  writeFileSync(join(root, 'crates', 'b', 'tests', 'two.rs'), 'assert!(x, "m");\n');
  const rows = auditTree(root);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].file, 'crates/a/tests/one.rs');
  assert.equal(rows[0].bare, 2);
  assert.equal(rows[1].bare, 0);
});

test('a raw string is a string: its quotes and commas do not leak into the scan', () => {
  const r = auditSource('assert_eq!(s, r#"a " , b"#);\nassert!(t == r"x, y");\n');
  assert.equal(r.total, 2);
  assert.equal(r.bare, 2);
});

test('a raw string can hide what looks like a call, and a hash count is honoured', () => {
  const r = auditSource('let s = r##"assert!(a); "# still inside"##;\nassert!(b);\n');
  assert.equal(r.total, 1);
  assert.deepEqual(r.bareLines, [2]);
});

test('a byte string and a raw byte string are strings too', () => {
  const r = auditSource('assert_eq!(x, b"a, b");\nassert_eq!(y, br#"c " d"#);\n');
  assert.equal(r.total, 2);
  assert.equal(r.bare, 2);
});

test('a lifetime is not a char literal', () => {
  const r = auditSource("fn f<'a>(s: &'a str) { assert!(s.is_empty()); }\n");
  assert.equal(r.total, 1);
  assert.equal(r.bare, 1);
});

test('a char literal holding a quote does not swallow the calls after it', () => {
  const r = auditSource(`let q = '"';\nassert!(a);\nlet s = "x";\nassert!(b, "why");\n`);
  assert.equal(r.total, 2);
  assert.equal(r.bare, 1);
  assert.deepEqual(r.bareLines, [2]);
});

test('a byte char literal holding a quote does not swallow them either', () => {
  const r = auditSource(`let q = b'"';\nassert!(a);\nlet s = "x";\n`);
  assert.equal(r.total, 1);
  assert.deepEqual(r.bareLines, [2]);
});

test('a block comment hides a call, and block comments nest', () => {
  const flat = auditSource('/* assert!(a); */\nassert_eq!(x, y);\n');
  assert.equal(flat.total, 1);
  assert.deepEqual(flat.bareLines, [2]);
  const nested = auditSource('/* outer /* inner */ assert!(a); */\nassert!(b);\n');
  assert.equal(nested.total, 1);
  assert.deepEqual(nested.bareLines, [2]);
});

test('a comma inside a comment inside a call does not split arguments', () => {
  const r = auditSource('assert!(a /* , */);\nassert!(b // one, two\n);\nassert_eq!(c, d /* , */);\n');
  assert.equal(r.total, 3);
  assert.equal(r.bare, 3);
  assert.deepEqual(r.bareLines, [1, 2, 4]);
});

test('a turbofish comma does not split arguments, and a comparison does not open one', () => {
  const fish = auditSource('assert!(HashMap::<K, V>::new().is_empty());\nassert!(m.get::<HashMap<K, V>>().is_none());\n');
  assert.equal(fish.total, 2);
  assert.equal(fish.bare, 2);
  const nested = auditSource('assert!(x.collect::<Vec<(K, V)>>().len() > 0, "why");\n');
  assert.equal(nested.total, 1);
  assert.equal(nested.bare, 0);
  // `a < b` is a comparison, not a turbofish: the comma after it still splits,
  // so this call carries a message and is not bare.
  const cmp = auditSource('assert!(a < b, "why");\nassert_eq!(a < b, true);\n');
  assert.equal(cmp.total, 2);
  assert.deepEqual(cmp.bareLines, [2]);
});

test('a closing paren inside a string, a char literal or a comment does not end a call', () => {
  const r = auditSource(
    'assert!(f(")"), "why");\nassert!(s.ends_with(\')\'), "why");\nassert!(a /* ) */, "why");\nassert!(g(")"));\n',
  );
  assert.equal(r.total, 4);
  assert.equal(r.bare, 1);
  assert.deepEqual(r.bareLines, [4]);
});

test('auditTree reads only the files under a tests directory', () => {
  const root = dir();
  mkdirSync(join(root, 'crates', 'a', 'tests'), { recursive: true });
  mkdirSync(join(root, 'crates', 'a', 'src'), { recursive: true });
  writeFileSync(join(root, 'crates', 'a', 'tests', 'it.rs'), 'assert!(x);\n');
  writeFileSync(join(root, 'crates', 'a', 'src', 'lib.rs'), 'assert!(y);\nassert!(z);\n');
  const rows = auditTree(root);
  assert.deepEqual(rows.map((r) => r.file), ['crates/a/tests/it.rs']);
  assert.equal(rows[0].bare, 1);
});

test('a whole macro call is `assert` + `!` + `(`, and nothing else counts', () => {
  // `.assert()` is a method — `assert_cmd`'s, among others — and a word that
  // is not followed by `!` is not a call.
  const method = auditSource('cmd.assert().success();\nlet assert = 1;\nassert!(a);\n');
  assert.equal(method.total, 1);
  assert.deepEqual(method.bareLines, [3]);
  // The stated limit: only the `(` delimiter is read, so the two legal
  // alternatives are not counted rather than counted wrongly.
  const delimiters = auditSource('assert_eq![a, b];\nassert!{a}\n');
  assert.equal(delimiters.total, 0);
});
