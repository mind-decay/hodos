import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, describe } from 'node:test';

import {
  classifyToolUses,
  commandFor,
  parseChecklist,
  parseVerdict,
  rowsFile,
  seedConfig,
  summarize,
} from './invoke.mjs';

const PLUGIN_ROOT = '/repo/hodos';

const VERDICT_TEXT = `
## Checklist

| Row | Evidence | Value |
|---|---|---|
| files touched (estimate) | src/features/orders/ui/OrdersPage.tsx, its test | 2 |
| new module | src/features/orders owns the filter | no |
| contract / schema / route change | listOrders unchanged | no |
| new dependency | package.json untouched | no |
| data migration | no migrations directory | no |
| needs more than one mergeable unit | one branch, one review | no |
| fog | done is stateable | no |
| more than one developer | description says nothing | no |
| external wait | nothing pending | no |

\`\`\`
Path: quick — rows 1-5 inside the quick limits
Type: feature
Campaign: no — rows 6-9
\`\`\`
`;

describe('parseVerdict', () => {
  test('reads the three lines out of the printed block', () => {
    assert.deepEqual(parseVerdict(VERDICT_TEXT), { path: 'quick', type: 'feature', campaign: false });
  });

  test('a campaign verdict sets the flag', () => {
    const text = 'Path: campaign — row 6 is yes\nType: refactor\nCampaign: yes — row 6\n';
    assert.deepEqual(parseVerdict(text), { path: 'campaign', type: 'refactor', campaign: true });
  });

  test('the last printed verdict wins', () => {
    const text = 'Path: quick\nType: feature\nCampaign: no\n\nCorrected:\nPath: deep\nType: feature\nCampaign: no\n';
    assert.equal(parseVerdict(text).path, 'deep');
  });

  test('a run that printed no verdict yields nulls, never a guess', () => {
    assert.deepEqual(parseVerdict('I could not read the reference. Stopping.'), {
      path: null,
      type: null,
      campaign: null,
    });
  });

  test('a value outside the four is not accepted', () => {
    assert.equal(parseVerdict('Path: medium\nType: feature\nCampaign: no\n').path, null);
  });
});

describe('parseChecklist', () => {
  test('finds all nine rows with their evidence', () => {
    const rows = parseChecklist(VERDICT_TEXT);
    assert.equal(rows.length, 9);
    assert.equal(rows.every((r) => r.hasEvidence), true);
    assert.equal(rows[0].value, '2');
  });

  test('an empty or dashed evidence cell is not evidence', () => {
    const text = `| files touched (estimate) |  | 2 |
| new module | — | no |`;
    const rows = parseChecklist(text);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].hasEvidence, false);
    assert.equal(rows[1].hasEvidence, false);
  });

  test('"none" is what the specification\'s own example writes for an absent risk', () => {
    const rows = parseChecklist('| data migration | none | no |\n| external wait | none | no |');
    assert.equal(rows.length, 2);
    assert.equal(rows.every((r) => r.hasEvidence), true);
  });

  test('a row the run never printed is simply absent', () => {
    assert.equal(parseChecklist('| fog | none | no |').length, 1);
  });

  test('an escaped pipe inside a cell does not split it', () => {
    const rows = parseChecklist(
      "| contract / schema / route change | OrderStatus = 'open' \\| 'paid' unchanged | no |",
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].value, 'no');
    assert.equal(rows[0].evidence.includes('paid'), true);
  });
});

describe('classifyToolUses', () => {
  const uses = [
    { name: 'Bash', input: { command: `node ${PLUGIN_ROOT}/scripts/config.mjs find` } },
    { name: 'Bash', input: { command: `cat ${PLUGIN_ROOT}/skills/task/references/route.md` } },
    { name: 'Read', input: { file_path: `${PLUGIN_ROOT}/skills/task/references/route.md` } },
    { name: 'Bash', input: { command: 'find src -type f' } },
    { name: 'Grep', input: { pattern: 'status' } },
    { name: 'ToolSearch', input: { query: 'select:AskUserQuestion' } },
  ];

  test('the config call and the reference read are procedure, not evidence', () => {
    const counts = classifyToolUses(uses, { pluginRoot: PLUGIN_ROOT });
    assert.equal(counts.procedure, 3);
    assert.equal(counts.evidence, 2);
    assert.equal(counts.discovery, 1);
    assert.equal(counts.total, 6);
  });

  test('a project file that merely mentions the plugin root is evidence', () => {
    const counts = classifyToolUses([{ name: 'Grep', input: { pattern: PLUGIN_ROOT } }], {
      pluginRoot: PLUGIN_ROOT,
    });
    assert.equal(counts.evidence, 1);
    assert.equal(counts.procedure, 0);
  });
});

describe('commandFor', () => {
  test('carries the plugin dir, the permission mode and the stream format', () => {
    const { file, args } = commandFor(
      { description: 'Add a thing' },
      { pluginRoot: PLUGIN_ROOT },
    );
    assert.equal(file, 'claude');
    assert.equal(args[0], '-p');
    assert.equal(args[1], '/hodos:task Add a thing');
    assert.equal(args.includes('--plugin-dir') && args.includes(PLUGIN_ROOT), true);
    assert.equal(args.includes('--permission-mode') && args.includes('bypassPermissions'), true);
    assert.equal(args.includes('--output-format') && args.includes('stream-json'), true);
    assert.equal(args.includes('--verbose'), true);
    assert.equal(args.includes('--strict-mcp-config'), true);
  });
});

describe('summarize', () => {
  const events = [
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'find src' } }] } },
    { type: 'assistant', message: { content: [{ type: 'text', text: VERDICT_TEXT }] } },
    { type: 'result', subtype: 'success', num_turns: 6, total_cost_usd: 0.42 },
  ];

  test('one pass over the stream gives the verdict, the rows and the counts', () => {
    const out = summarize(events, { pluginRoot: PLUGIN_ROOT });
    assert.deepEqual(out.verdict, { path: 'quick', type: 'feature', campaign: false });
    assert.equal(out.rowsWithEvidence, 9);
    assert.equal(out.tools.evidence, 1);
    assert.equal(out.turns, 6);
    assert.equal(out.cost, 0.42);
    assert.equal(out.subtype, 'success');
  });

  test('a stream with no result line still summarizes what it saw', () => {
    const out = summarize(events.slice(0, 2), { pluginRoot: PLUGIN_ROOT });
    assert.equal(out.subtype, null);
    assert.equal(out.verdict.path, 'quick');
  });
});

describe('seedConfig', () => {
  const copy = () => {
    const dir = mkdtempSync(join(tmpdir(), 'hodos-invoke-'));
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'x', scripts: { test: 'node --test', lint: 'eslint .' } }),
    );
    return dir;
  };

  test('writes a config a kernel can read when the copy has none', () => {
    const dir = copy();
    assert.equal(seedConfig(dir), true);
    const written = JSON.parse(readFileSync(join(dir, '.claude/hodos/config.json'), 'utf8'));
    assert.equal(written.version, 1);
    assert.equal(written.commands.test, 'npm test');
    assert.equal(written.commands.lint, 'npm run lint');
    assert.equal(written.commands.typecheck, null);
    assert.equal(written.conventions.branch, 'feature/{slug}');
  });

  test('a copy that already has one is left exactly as it is', () => {
    const dir = copy();
    mkdirSync(join(dir, '.claude/hodos'), { recursive: true });
    writeFileSync(join(dir, '.claude/hodos/config.json'), '{"version":1,"mine":true}');
    assert.equal(seedConfig(dir), false);
    assert.equal(JSON.parse(readFileSync(join(dir, '.claude/hodos/config.json'), 'utf8')).mine, true);
  });

  test('a copy with no package.json gets null commands rather than invented ones', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hodos-invoke-'));
    assert.equal(seedConfig(dir), true);
    const written = JSON.parse(readFileSync(join(dir, '.claude/hodos/config.json'), 'utf8'));
    assert.equal(written.commands.test, null);
    assert.equal(existsSync(join(dir, '.claude/hodos/config.json')), true);
  });
});

describe('rowsFile', () => {
  test('keeps the nine printed rows beside the verdict, evidence included', () => {
    const results = [
      { one: { id: 'q01' }, summary: { rows: [{ key: 'files', row: 'files touched (estimate)', evidence: 'src/a.ts', value: '2', hasEvidence: true }] } },
      { one: { id: 'q02' }, summary: { rows: [] } },
    ];
    assert.deepEqual(rowsFile(results), [
      { id: 'q01', rows: [{ key: 'files', row: 'files touched (estimate)', evidence: 'src/a.ts', value: '2', hasEvidence: true }] },
      { id: 'q02', rows: [] },
    ]);
  });
});
