// Fixtures are literals in this file, never derived from `THRESHOLDS`: a mutant
// on any one threshold has to turn its own detector's case red, which a fixture
// computed from the constant it is meant to pin cannot do (BUILD-PLAN.md Stage
// 11d, criterion 1; decision 0109).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { THRESHOLDS, collect, collectorSource, decide } from './detectors.mjs';

const DETECTORS = fileURLToPath(new URL('./detectors.mjs', import.meta.url));

/** The computed values the collector reads for every element. */
const STYLE = {
  overflowX: 'visible',
  overflowY: 'visible',
  textOverflow: 'clip',
  lineClamp: 'none',
  outlineStyle: 'none',
  outlineWidth: '0px',
  boxShadow: 'none',
};

/** One collected element, in the shape the collector returns. */
function el(over = {}) {
  return {
    ref: 'div',
    interactive: false,
    text: 'text',
    scrollWidth: 100,
    clientWidth: 100,
    scrollHeight: 40,
    clientHeight: 40,
    rect: { x: 0, y: 0, width: 100, height: 40 },
    ...over,
    style: { ...STYLE, ...(over.style ?? {}) },
  };
}

/** One collected page, in the shape the collector returns. */
function page(over = {}) {
  return { route: '/orders', viewport: { width: 1280, height: 800 }, elements: [], omitted: 0, ...over };
}

/** An interactive element at a rect, with a focus ring that is visible. */
function control(ref, rect, over = {}) {
  return el({
    ref,
    interactive: true,
    rect,
    focus: { outlineStyle: 'solid', outlineWidth: '3px', boxShadow: 'none' },
    ...over,
  });
}

const kinds = (result) => result.hits.map((hit) => hit.detector);

test('the four thresholds are the numbers the fixtures below straddle', () => {
  assert.deepEqual(THRESHOLDS, { overflowPx: 1, clippedPx: 1, overlapPx: 1, focusOutlinePx: 2 });
});

test('decide echoes the route and the width it was collected at', () => {
  const result = decide(page());
  assert.equal(result.route, '/orders');
  assert.equal(result.width, 1280);
  assert.deepEqual(result.hits, []);
  assert.deepEqual(result.allowed, []);
});

// ── overflow ─────────────────────────────────────────────────────────────────

test('overflow fires when content escapes a box that cannot scroll', () => {
  const result = decide(page({ elements: [el({ ref: 'div.banner', scrollWidth: 1300, clientWidth: 1288 })] }));
  assert.deepEqual(result.hits, [
    {
      detector: 'overflow',
      route: '/orders',
      ref: 'div.banner',
      detail: 'content is 12px wider than the box (overflow-x: visible)',
    },
  ]);
});

test('overflow holds at the threshold and fires one pixel past it', () => {
  const at = decide(page({ elements: [el({ scrollWidth: 101, clientWidth: 100 })] }));
  assert.deepEqual(kinds(at), []);
  const past = decide(page({ elements: [el({ scrollWidth: 102, clientWidth: 100 })] }));
  assert.deepEqual(kinds(past), ['overflow']);
});

test('overflow fires on a clipped box and not on a declared scroll container', () => {
  const hidden = decide(page({ elements: [el({ scrollWidth: 200, clientWidth: 100, style: { overflowX: 'hidden' } })] }));
  assert.deepEqual(kinds(hidden), ['overflow']);
  for (const overflowX of ['auto', 'scroll']) {
    const scrolls = decide(page({ elements: [el({ scrollWidth: 200, clientWidth: 100, style: { overflowX } })] }));
    assert.deepEqual(kinds(scrolls), [], overflowX);
  }
});

test('overflow reads the document element like any other box', () => {
  const result = decide(page({ elements: [el({ ref: ':root', scrollWidth: 1400, clientWidth: 1280 })] }));
  assert.deepEqual(kinds(result), ['overflow']);
  assert.equal(result.hits[0].ref, ':root');
});

// ── clipped text ─────────────────────────────────────────────────────────────

test('clipped fires when text is cut with no affordance', () => {
  const result = decide(
    page({ elements: [el({ ref: 'p.summary', scrollHeight: 52, clientHeight: 40, style: { overflowY: 'hidden' } })] }),
  );
  assert.deepEqual(result.hits, [
    {
      detector: 'clipped',
      route: '/orders',
      ref: 'p.summary',
      detail: 'text is cut 12px short (overflow-y: hidden, no ellipsis)',
    },
  ]);
});

test('clipped holds at the threshold and fires one pixel past it', () => {
  const at = decide(page({ elements: [el({ scrollHeight: 41, clientHeight: 40, style: { overflowY: 'hidden' } })] }));
  assert.deepEqual(kinds(at), []);
  const past = decide(page({ elements: [el({ scrollHeight: 42, clientHeight: 40, style: { overflowY: 'hidden' } })] }));
  assert.deepEqual(kinds(past), ['clipped']);
});

test('clipped stays quiet where the truncation is declared', () => {
  const cut = { scrollHeight: 80, clientHeight: 40 };
  const cases = {
    ellipsis: { overflowY: 'hidden', textOverflow: 'ellipsis' },
    clamp: { overflowY: 'hidden', lineClamp: '2' },
    scrolls: { overflowY: 'auto' },
  };
  for (const [name, style] of Object.entries(cases)) {
    assert.deepEqual(kinds(decide(page({ elements: [el({ ...cut, style })] }))), [], name);
  }
});

test('clipped is about text, so a box with none is not a hit', () => {
  const result = decide(
    page({ elements: [el({ text: '', scrollHeight: 80, clientHeight: 40, style: { overflowY: 'hidden' } })] }),
  );
  assert.deepEqual(kinds(result), []);
});

// ── overlapping interactive elements ─────────────────────────────────────────

test('overlap fires on two interactive elements that cover each other', () => {
  const result = decide(
    page({
      elements: [
        control('button#save', { x: 0, y: 0, width: 100, height: 40 }),
        control('a#cancel', { x: 80, y: 20, width: 100, height: 40 }),
      ],
    }),
  );
  assert.deepEqual(result.hits, [
    {
      detector: 'overlap',
      route: '/orders',
      ref: 'button#save',
      detail: 'overlaps a#cancel by 20×20px',
    },
  ]);
});

test('overlap holds at the threshold, fires one pixel past it, and ignores a sub-pixel touch', () => {
  const pair = (inset) => [
    control('a', { x: 0, y: 0, width: 100, height: 100 }),
    control('b', { x: 100 - inset, y: 100 - inset, width: 100, height: 100 }),
  ];
  assert.deepEqual(kinds(decide(page({ elements: pair(1) }))), []);
  assert.deepEqual(kinds(decide(page({ elements: pair(2) }))), ['overlap']);
  // getBoundingClientRect is fractional, so an intersection can be one:
  // measured at 0.5px on the fixture page (bench/run/runs/2026-09-07-detector-thresholds).
  assert.deepEqual(kinds(decide(page({ elements: pair(0.5) }))), []);
});

test('overlap needs both elements to be controls and both boxes to be real', () => {
  const covering = { x: 0, y: 0, width: 100, height: 100 };
  const plain = decide(page({ elements: [control('a', covering), el({ ref: 'b', rect: covering })] }));
  assert.deepEqual(kinds(plain), []);
  const collapsed = decide(
    page({ elements: [control('a', covering), control('b', { x: 0, y: 0, width: 100, height: 0 })] }),
  );
  assert.deepEqual(kinds(collapsed), []);
});

test('overlap reports every pair, once each', () => {
  const box = (x) => ({ x, y: 0, width: 100, height: 100 });
  const result = decide(page({ elements: [control('a', box(0)), control('b', box(20)), control('c', box(40))] }));
  assert.deepEqual(
    result.hits.map((hit) => `${hit.ref}/${hit.detail.split(' ')[1]}`),
    ['a/b', 'a/c', 'b/c'],
  );
});

// ── focus not visible ────────────────────────────────────────────────────────

test('focus fires when focusing a control changes nothing visible', () => {
  const result = decide(
    page({
      elements: [
        control('button#save', { x: 0, y: 0, width: 80, height: 30 }, {
          focus: { outlineStyle: 'none', outlineWidth: '0px', boxShadow: 'none' },
        }),
      ],
    }),
  );
  assert.deepEqual(result.hits, [
    {
      detector: 'focus',
      route: '/orders',
      ref: 'button#save',
      detail: 'focus ring is 0px (outline-style: none, box-shadow unchanged)',
    },
  ]);
});

test('focus holds at the threshold and fires one pixel below it', () => {
  const ring = (outlineWidth) => [
    control('a', { x: 0, y: 0, width: 80, height: 30 }, {
      focus: { outlineStyle: 'solid', outlineWidth, boxShadow: 'none' },
    }),
  ];
  assert.deepEqual(kinds(decide(page({ elements: ring('2px') }))), []);
  assert.deepEqual(kinds(decide(page({ elements: ring('1px') }))), ['focus']);
});

test('focus accepts a ring drawn as a box shadow', () => {
  const result = decide(
    page({
      elements: [
        control('a', { x: 0, y: 0, width: 80, height: 30 }, {
          style: { boxShadow: 'none' },
          focus: { outlineStyle: 'none', outlineWidth: '0px', boxShadow: 'rgb(0, 90, 255) 0px 0px 0px 3px' },
        }),
      ],
    }),
  );
  assert.deepEqual(kinds(result), []);
});

test('focus is about controls, so an element with no focus read is not a hit', () => {
  const result = decide(page({ elements: [el({ ref: 'div' })] }));
  assert.deepEqual(kinds(result), []);
});

// ── the axe pass-through ─────────────────────────────────────────────────────

test('axe violations pass through carrying the impact the audit gave them', () => {
  const result = decide(
    page({
      axe: {
        violations: [
          { id: 'color-contrast', impact: 'serious', nodes: 3 },
          { id: 'label', impact: 'critical', nodes: 1 },
        ],
        incomplete: 2,
        manual: 10,
      },
    }),
  );
  assert.deepEqual(result.hits, [
    { detector: 'axe', route: '/orders', ref: 'color-contrast', detail: '3 nodes', impact: 'serious' },
    { detector: 'axe', route: '/orders', ref: 'label', detail: '1 node', impact: 'critical' },
  ]);
});

test('the axe counts a tool could not decide are not hits', () => {
  const result = decide(page({ axe: { violations: [], incomplete: 4, manual: 10 } }));
  assert.deepEqual(result.hits, []);
});

test('a page with no audit beside it produces no axe hits', () => {
  assert.deepEqual(decide(page()).hits, []);
});

// ── the allowlist (decision 0107) ────────────────────────────────────────────

/** A page on a marketing route with one overflow and one clipped hit. */
function marketing() {
  return page({
    route: '/marketing/home',
    elements: [
      el({ ref: 'div.banner', scrollWidth: 1400, clientWidth: 1280 }),
      el({ ref: 'p.blurb', scrollHeight: 80, clientHeight: 40, style: { overflowY: 'hidden' } }),
    ],
  });
}

test('an allowlisted detector is silenced on the routes it names and nowhere else', () => {
  const result = decide(marketing(), { allow: ['overflow:/marketing/*'] });
  assert.deepEqual(kinds(result), ['clipped']);
  assert.deepEqual(result.allowed.map((hit) => `${hit.detector} ${hit.ref}`), ['overflow div.banner']);
  const elsewhere = decide(
    page({ route: '/orders', elements: [el({ ref: 'div.banner', scrollWidth: 1400, clientWidth: 1280 })] }),
    { allow: ['overflow:/marketing/*'] },
  );
  assert.deepEqual(kinds(elsewhere), ['overflow']);
});

test('`*` as the detector id silences every detector on the route', () => {
  const result = decide(marketing(), { allow: ['*:/marketing/*'] });
  assert.deepEqual(kinds(result), []);
  assert.equal(result.allowed.length, 2);
});

test('a route glob crossing segments is written with `**`', () => {
  const deep = page({ route: '/marketing/eu/home', elements: [el({ scrollWidth: 1400, clientWidth: 1280 })] });
  assert.deepEqual(kinds(decide(deep, { allow: ['overflow:/marketing/*'] })), ['overflow']);
  assert.deepEqual(kinds(decide(deep, { allow: ['overflow:/marketing/**'] })), []);
});

test('an entry that names no detector silences nothing', () => {
  const result = decide(marketing(), { allow: ['/marketing/*'] });
  assert.deepEqual(kinds(result), ['overflow', 'clipped']);
});

test('an axe hit is allowlisted by its detector id, not by its rule', () => {
  const audited = page({ route: '/marketing/home', axe: { violations: [{ id: 'color-contrast', impact: 'serious', nodes: 1 }], incomplete: 0, manual: 10 } });
  assert.deepEqual(kinds(decide(audited, { allow: ['axe:/marketing/*'] })), []);
});

// ── the thresholds are the caller's to override ──────────────────────────────

test('a project-supplied threshold replaces the default for that detector only', () => {
  const wide = page({ elements: [el({ scrollWidth: 120, clientWidth: 100, scrollHeight: 60, clientHeight: 40, style: { overflowY: 'hidden' } })] });
  assert.deepEqual(kinds(decide(wide)), ['overflow', 'clipped']);
  assert.deepEqual(kinds(decide(wide, { thresholds: { overflowPx: 40 } })), ['clipped']);
});

// ── the hit order is fixed ───────────────────────────────────────────────────

test('hits come out detector by detector, in the element order they were collected', () => {
  const result = decide(
    page({
      elements: [
        el({ ref: 'div.a', scrollWidth: 200, clientWidth: 100 }),
        el({ ref: 'p.b', scrollHeight: 80, clientHeight: 40, style: { overflowY: 'hidden' } }),
        control('button#c', { x: 0, y: 0, width: 100, height: 40 }, {
          focus: { outlineStyle: 'none', outlineWidth: '0px', boxShadow: 'none' },
        }),
        control('button#d', { x: 10, y: 10, width: 100, height: 40 }, {
          focus: { outlineStyle: 'none', outlineWidth: '0px', boxShadow: 'none' },
        }),
        el({ ref: 'div.e', scrollWidth: 300, clientWidth: 100 }),
      ],
      axe: { violations: [{ id: 'label', impact: 'minor', nodes: 1 }], incomplete: 0, manual: 10 },
    }),
  );
  assert.deepEqual(kinds(result), ['overflow', 'overflow', 'clipped', 'overlap', 'focus', 'focus', 'axe']);
  assert.deepEqual(
    result.hits.filter((hit) => hit.detector === 'overflow').map((hit) => hit.ref),
    ['div.a', 'div.e'],
  );
});

// ── the CLI ──────────────────────────────────────────────────────────────────

test('decide reads a collected page on stdin and prints the hits as JSON', () => {
  const collected = JSON.stringify(page({ elements: [el({ ref: 'div.banner', scrollWidth: 1400, clientWidth: 1280 })] }));
  const run = spawnSync(process.execPath, [DETECTORS, 'decide'], { input: collected, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.deepEqual(result.hits.map((hit) => hit.detector), ['overflow']);
});

test('decide takes the allowlist from an argument, so the verifier passes the config through', () => {
  const collected = JSON.stringify(marketing());
  const run = spawnSync(process.execPath, [DETECTORS, 'decide', '--allow', 'overflow:/marketing/*'], {
    input: collected,
    encoding: 'utf8',
  });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout).hits.map((hit) => hit.detector), ['clipped']);
});

test('a bad invocation exits 2 and prints the usage', () => {
  const run = spawnSync(process.execPath, [DETECTORS, 'nope'], { encoding: 'utf8' });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /Usage: node scripts\/detectors\.mjs/);
});

test('--help exits 0', () => {
  const run = spawnSync(process.execPath, [DETECTORS, '--help'], { encoding: 'utf8' });
  assert.equal(run.status, 0);
  assert.match(run.stdout, /collector/);
});

// ── the collector, against a duck-typed `document` ───────────────────────────
//
// The stubs below throw on any property the collector was not declared to
// read, which is what makes "exactly the properties it reads" a check rather
// than a claim: a mutant that reads one property more goes red here, in this
// file, and not in a browser (decision 0096).

/** A DOM object that answers the declared properties and throws on the rest. */
function strict(name, properties, log) {
  return new Proxy(properties, {
    get(target, key) {
      if (typeof key === 'symbol') return Reflect.get(target, key);
      if (!(key in target)) {
        throw new Error(`${name} has no \`${key}\` — the collector read a property it was not declared to`);
      }
      log.push(`${name}.${key}`);
      return target[key];
    },
  });
}

const COMPUTED = {
  overflowX: 'visible',
  overflowY: 'visible',
  textOverflow: 'clip',
  webkitLineClamp: 'none',
  outlineStyle: 'none',
  outlineWidth: '0px',
  boxShadow: 'none',
};

/**
 * A page of duck-typed nodes. `getComputedStyle` answers the focused values
 * once a node's `focus()` has been called, which is the only way the collector
 * can read a focus ring at all.
 */
function scene({ route = '/orders', width = 1280, height = 800, nodes = [], active = null } = {}) {
  const log = [];
  const states = new Map();
  const elements = nodes.map((node, index) => {
    const state = {
      focused: false,
      base: { ...COMPUTED, ...(node.style ?? {}) },
      ring: node.ring ?? null,
    };
    const properties = {
      tagName: node.tag ?? 'DIV',
      id: node.id ?? '',
      className: node.className ?? '',
      textContent: node.text ?? 'text',
      matches: () => node.interactive === true,
      scrollWidth: node.scrollWidth ?? 100,
      clientWidth: node.clientWidth ?? 100,
      scrollHeight: node.scrollHeight ?? 40,
      clientHeight: node.clientHeight ?? 40,
      getBoundingClientRect: () => node.rect ?? { x: 0, y: 0, width: 100, height: 40 },
      focus: () => {
        for (const other of states.values()) other.focused = false;
        state.focused = true;
      },
    };
    const element = strict(`node${index}`, properties, log);
    states.set(element, state);
    return element;
  });
  const doc = strict(
    'document',
    {
      querySelectorAll: () => elements,
      activeElement: active === null ? null : elements[active],
    },
    log,
  );
  const win = strict(
    'window',
    {
      location: { pathname: route },
      innerWidth: width,
      innerHeight: height,
      getComputedStyle: (element) => {
        const state = states.get(element);
        const values = state.focused && state.ring ? { ...state.base, ...state.ring } : state.base;
        return strict('style', values, log);
      },
    },
    log,
  );
  return { doc, win, log, elements, states };
}

test('the collector returns the route, the viewport and one entry per node', () => {
  const { doc, win } = scene({
    nodes: [
      { tag: 'HTML', scrollWidth: 1400, clientWidth: 1280 },
      { tag: 'DIV', id: 'main', className: 'wrap grid', text: '  totals  ', rect: { x: 4, y: 8, width: 200, height: 60 } },
    ],
  });
  assert.deepEqual(collect(doc, win), {
    route: '/orders',
    viewport: { width: 1280, height: 800 },
    omitted: 0,
    elements: [
      {
        ref: ':root',
        interactive: false,
        text: 'text',
        scrollWidth: 1400,
        clientWidth: 1280,
        scrollHeight: 40,
        clientHeight: 40,
        rect: { x: 0, y: 0, width: 100, height: 40 },
        style: {
          overflowX: 'visible',
          overflowY: 'visible',
          textOverflow: 'clip',
          lineClamp: 'none',
          outlineStyle: 'none',
          outlineWidth: '0px',
          boxShadow: 'none',
        },
        focus: null,
      },
      {
        ref: 'div#main.wrap[1]',
        interactive: false,
        text: 'totals',
        scrollWidth: 100,
        clientWidth: 100,
        scrollHeight: 40,
        clientHeight: 40,
        rect: { x: 4, y: 8, width: 200, height: 60 },
        style: {
          overflowX: 'visible',
          overflowY: 'visible',
          textOverflow: 'clip',
          lineClamp: 'none',
          outlineStyle: 'none',
          outlineWidth: '0px',
          boxShadow: 'none',
        },
        focus: null,
      },
    ],
  });
});

test('the collector reads the computed values the decider decides on', () => {
  const { doc, win } = scene({
    nodes: [{ style: { overflowX: 'hidden', overflowY: 'auto', textOverflow: 'ellipsis', webkitLineClamp: '2', boxShadow: 'rgb(0, 0, 0) 0px 1px 2px' } }],
  });
  assert.deepEqual(collect(doc, win).elements[0].style, {
    overflowX: 'hidden',
    overflowY: 'auto',
    textOverflow: 'ellipsis',
    lineClamp: '2',
    outlineStyle: 'none',
    outlineWidth: '0px',
    boxShadow: 'rgb(0, 0, 0) 0px 1px 2px',
  });
});

test('the collector focuses a control and reads the ring it draws', () => {
  const { doc, win } = scene({
    nodes: [
      { interactive: true, ring: { outlineStyle: 'solid', outlineWidth: '3px' } },
      { interactive: false, ring: { outlineStyle: 'solid', outlineWidth: '3px' } },
    ],
  });
  const collected = collect(doc, win);
  assert.deepEqual(collected.elements[0].focus, { outlineStyle: 'solid', outlineWidth: '3px', boxShadow: 'none' });
  assert.equal(collected.elements[1].focus, null, 'nothing was focused that cannot be');
});

test('the collector puts the focus back where it found it', () => {
  const { doc, win, states, elements } = scene({
    nodes: [{ interactive: false }, { interactive: true }, { interactive: true }],
    active: 0,
  });
  collect(doc, win);
  assert.equal(states.get(elements[0]).focused, true, 'the element that had focus has it again');
  assert.equal(states.get(elements[2]).focused, false, 'the last control the collector focused kept it');
});

test('every measurement is taken before anything is focused', () => {
  const { doc, win, log } = scene({ nodes: [{ interactive: true }, { interactive: true }] });
  collect(doc, win);
  const lastRect = log.findLastIndex((read) => read.endsWith('.getBoundingClientRect'));
  const firstFocus = log.findIndex((read) => read.endsWith('.focus'));
  assert.ok(lastRect >= 0 && firstFocus >= 0, log.join(' '));
  assert.ok(lastRect < firstFocus, `focus at ${firstFocus} came before a rect at ${lastRect}`);
});

test('the collector bounds its own output and says how much it left out', () => {
  const { doc, win } = scene({ nodes: [{}, {}, {}, {}, {}] });
  const collected = collect(doc, win, { maxElements: 2 });
  assert.equal(collected.elements.length, 2);
  assert.equal(collected.omitted, 3);
});

test('the collector source carries no free variable, so `evaluate` can run it', () => {
  const { doc, win } = scene({ nodes: [{ interactive: true, ring: { outlineWidth: '3px' } }] });
  const inPage = new Function('document', 'window', `return ${collectorSource()};`);
  assert.deepEqual(inPage(doc, win), collect(...Object.values(scene({ nodes: [{ interactive: true, ring: { outlineWidth: '3px' } }] })).slice(0, 2)));
});

test('the collector source carries the bound it was asked for', () => {
  assert.match(collectorSource({ maxElements: 20 }), /\{"maxElements":20\}\)$/);
});

test('the collector feeds the decider without a step in between', () => {
  const { doc, win } = scene({
    nodes: [
      { tag: 'HTML', scrollWidth: 1400, clientWidth: 1280 },
      { interactive: true, ring: { outlineStyle: 'none', outlineWidth: '0px' } },
    ],
  });
  assert.deepEqual(decide(collect(doc, win)).hits.map((one) => one.detector), ['overflow', 'focus']);
});

test('source prints the collector for the adapter to evaluate', () => {
  const run = spawnSync(process.execPath, [DETECTORS, 'source'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /^\(function collect/);
  assert.match(run.stdout, /\(document, window, \{\}\)/);
});
