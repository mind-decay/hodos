#!/usr/bin/env node
// detectors.mjs — presentation defects, in two halves (decision 0096).
//
// A presentation defect is the one class of Whittaker's tours that no command
// answers for: text cut off, a box that escapes its column, two controls on
// top of each other, a focus ring nobody can see. What makes it mechanical
// rather than a judgement is the split this file is built on:
//
//   the **collector** reads properties off a real DOM and returns JSON. It
//   compares nothing, so there is nothing in it to get wrong about a defect,
//   and it is the only half that needs a browser.
//
//   the **decider** is a pure function from that JSON to hits. Every threshold
//   lives here, which is why it can be tested on fixtures and mutated one
//   number at a time (decision 0109).
//
// The verifier runs the collector through the browser adapter's `evaluate`,
// pipes what it returns into `decide`, and writes one row per hit. A hit the
// project has declared intentional is silenced by `verify.detectors.allow`,
// whose entries name a detector and a route glob (decision 0107).
//
// The thresholds below are read again at the pilot (docs/BACKLOG.md): four
// numbers measured on one page are four numbers measured on one page.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { matchesGlob } from './review-package.mjs';

const USAGE = `Usage: node scripts/detectors.mjs <source | decide [--allow <entry>]...>

Presentation defects, in two halves (decision 0096).

  source         print the collector as one expression, for the browser
                 adapter's \`evaluate\` to run in the page. It reads
                 properties and returns JSON; it decides nothing.
  decide         read one collected page as JSON on stdin and print the hits.
                 --allow takes a \`<detector>:<route glob>\` entry of
                 \`verify.detectors.allow\`, repeatable and comma-separable;
                 a silenced hit is reported under \`allowed\` rather than lost.
  --help         print this and exit 0.

Output is JSON on stdout: the caller is the verifier reading a result.

Exit codes: 0 — the page was decided; 2 — bad invocation or unreadable JSON.`;

/**
 * The four numbers, measured on `bench/fixtures/webapp`'s `/shift` page through
 * the browser adapter on 2026-09-07 (decision 0109). The JSON they were read
 * off is `bench/run/runs/2026-09-07-detector-thresholds/`, and `DESIGN.md §7.4`
 * carries the table with what each number separates.
 *
 * The three geometric ones are **1** for one reason: on that page every box
 * that was not seeded reported an escape of exactly 0, because `scrollWidth`
 * and `clientWidth` are integers in Chrome even at a device pixel ratio of 2,
 * while `getBoundingClientRect` is fractional — a 0.5px nudge moved a measured
 * intersection to 19.5px. So 1 is the smallest value that excludes a sub-pixel
 * artifact and a one-pixel rounding, and the seeded defects cleared it by 34×
 * to 352×. `focusOutlinePx` is the ring width a control has to **reach**, so it
 * is read as a floor; the page separates 0px (the ring removed) from 3px (the
 * ring present) and 2 sits inside that interval, which is also WCAG 2.2 SC
 * 2.4.13's minimum thickness for a focus indicator.
 */
export const THRESHOLDS = {
  overflowPx: 1,
  clippedPx: 1,
  overlapPx: 1,
  focusOutlinePx: 2,
};

/** The order hits come out in, so a table of them is stable between runs. */
export const DETECTORS = ['overflow', 'clipped', 'overlap', 'focus', 'axe'];

const px = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const hit = (detector, page, ref, detail) => ({ detector, route: page.route, ref, detail });

/** Content escaping a box that offers no way to scroll to it. Horizontal only. */
function overflow(page, thresholds) {
  const hits = [];
  for (const element of page.elements ?? []) {
    if (element.style.overflowX === 'auto' || element.style.overflowX === 'scroll') continue;
    const escaped = element.scrollWidth - element.clientWidth;
    if (escaped > thresholds.overflowPx) {
      hits.push(hit('overflow', page, element.ref, `content is ${escaped}px wider than the box (overflow-x: ${element.style.overflowX})`));
    }
  }
  return hits;
}

/**
 * Text cut off with nothing saying so. Vertical only, which is what keeps it
 * disjoint from `overflow`: an ellipsis or a line clamp is truncation the page
 * declared, and a box that scrolls is text the reader can still reach.
 */
function clipped(page, thresholds) {
  const hits = [];
  for (const element of page.elements ?? []) {
    if (element.style.overflowY !== 'hidden') continue;
    if (element.style.textOverflow === 'ellipsis' || element.style.lineClamp !== 'none') continue;
    if (!(element.text ?? '').trim()) continue;
    const cut = element.scrollHeight - element.clientHeight;
    if (cut > thresholds.clippedPx) {
      hits.push(hit('clipped', page, element.ref, `text is cut ${cut}px short (overflow-y: hidden, no ellipsis)`));
    }
  }
  return hits;
}

/**
 * Two controls covering each other, which removes one of them from the route.
 * A box with no area is not on the page, so it overlaps nothing.
 */
function overlap(page, thresholds) {
  const controls = (page.elements ?? []).filter(
    (element) => element.interactive && element.rect.width > 0 && element.rect.height > 0,
  );
  const hits = [];
  for (let i = 0; i < controls.length; i += 1) {
    for (let j = i + 1; j < controls.length; j += 1) {
      const a = controls[i].rect;
      const b = controls[j].rect;
      const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (width > thresholds.overlapPx && height > thresholds.overlapPx) {
        hits.push(hit('overlap', page, controls[i].ref, `overlaps ${controls[j].ref} by ${width}×${height}px`));
      }
    }
  }
  return hits;
}

/**
 * A control that looks the same focused as unfocused. The collector focused it
 * and read the two states; the ring is an outline of some width, or a box
 * shadow that appeared. Either counts, because either is visible.
 */
function focus(page, thresholds) {
  const hits = [];
  for (const element of page.elements ?? []) {
    if (!element.interactive || !element.focus) continue;
    const ring = element.focus.outlineStyle === 'none' ? 0 : px(element.focus.outlineWidth);
    const shadowed = element.focus.boxShadow !== element.style.boxShadow;
    if (ring < thresholds.focusOutlinePx && !shadowed) {
      hits.push(hit('focus', page, element.ref, `focus ring is ${ring}px (outline-style: ${element.focus.outlineStyle}, box-shadow unchanged)`));
    }
  }
  return hits;
}

/**
 * The audit's own findings, passed through. `lighthouse_audit`'s accessibility
 * category is axe underneath, so the vocabulary is axe's `impact` and this
 * detector has no threshold of its own to get wrong. What the tool could not
 * decide — `incomplete`, `manual` — is work for a person and is not a hit.
 */
function axe(page) {
  return (page.axe?.violations ?? []).map((violation) => ({
    ...hit('axe', page, violation.id, `${violation.nodes} ${violation.nodes === 1 ? 'node' : 'nodes'}`),
    impact: violation.impact,
  }));
}

const RULES = { overflow, clipped, overlap, focus, axe };

/**
 * The environment-bound half: read a real DOM, return JSON, compare nothing.
 *
 * It is one self-contained function on purpose — `collectorSource` serializes
 * it into the page through the adapter's `evaluate`, and a reference to
 * anything outside it would arrive as an undefined variable in a browser
 * rather than as a failing test here.
 *
 * Two passes, and the order matters: every measurement is taken first, then
 * the controls are focused. Focusing scrolls, and a rect read after a scroll
 * is a rect of a page in a state no reader ever sees.
 *
 * `maxElements` bounds the JSON that comes back through `evaluate`; it is a
 * size bound like `review.maxBytes` and not a detector threshold, and what it
 * left out is reported as `omitted` for the report's `## Not covered` block.
 */
export function collect(doc, win, options = {}) {
  const INTERACTIVE =
    'a[href], button, input, select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [tabindex]:not([tabindex="-1"])';
  const MEASURED = 'html, body, body *:not(script):not(style)';
  const max = options.maxElements ?? 1500;
  const found = Array.from(doc.querySelectorAll(MEASURED));
  const kept = found.slice(0, max);
  const refOf = (element, index) => {
    const tag = String(element.tagName).toLowerCase();
    if (tag === 'html') return ':root';
    const id = element.id ? `#${element.id}` : '';
    const className = typeof element.className === 'string' ? element.className.trim() : '';
    const first = className ? `.${className.split(/\s+/)[0]}` : '';
    return `${tag}${id}${first}[${index}]`;
  };
  const entries = kept.map((element, index) => {
    const style = win.getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return {
      ref: refOf(element, index),
      interactive: typeof element.matches === 'function' && element.matches(INTERACTIVE) === true,
      text: String(element.textContent ?? '').trim().slice(0, 80),
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      rect: { x: box.x, y: box.y, width: box.width, height: box.height },
      style: {
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        textOverflow: style.textOverflow,
        lineClamp: style.webkitLineClamp ?? 'none',
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow,
      },
      focus: null,
    };
  });
  const wasFocused = doc.activeElement;
  kept.forEach((element, index) => {
    if (!entries[index].interactive || typeof element.focus !== 'function') return;
    element.focus();
    const style = win.getComputedStyle(element);
    entries[index].focus = {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });
  if (wasFocused && typeof wasFocused.focus === 'function') wasFocused.focus();
  return {
    route: win.location.pathname,
    viewport: { width: win.innerWidth, height: win.innerHeight },
    elements: entries,
    omitted: found.length - kept.length,
  };
}

/** The collector as one expression, for the adapter's `evaluate` to run. */
export const collectorSource = (options = {}) =>
  `(${collect.toString()})(document, window, ${JSON.stringify(options)})`;

/** True when `verify.detectors.allow` declares this hit intentional (0107). */
function isAllowed(one, allow) {
  return allow.some((entry) => {
    const colon = entry.indexOf(':');
    if (colon < 0) return false;
    const detector = entry.slice(0, colon);
    const route = entry.slice(colon + 1);
    return (detector === '*' || detector === one.detector) && matchesGlob(one.route, route);
  });
}

/**
 * One collected page in, its hits out. Pure: the same JSON decides the same
 * way on every machine, which is what lets the numbers be mutated in a test.
 */
export function decide(page, { allow = [], thresholds = {} } = {}) {
  const bars = { ...THRESHOLDS, ...thresholds };
  const found = DETECTORS.flatMap((detector) => RULES[detector](page, bars));
  return {
    route: page.route,
    width: page.viewport?.width ?? null,
    omitted: page.omitted ?? 0,
    hits: found.filter((one) => !isAllowed(one, allow)),
    allowed: found.filter((one) => isAllowed(one, allow)),
  };
}

function main(argv) {
  if (argv.includes('--help')) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (argv[0] === 'source') {
    process.stdout.write(`${collectorSource()}\n`);
    return 0;
  }
  if (argv[0] !== 'decide') {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  const allow = [];
  for (let i = 1; i < argv.length; i += 1) {
    if (argv[i] !== '--allow') {
      process.stderr.write(`${USAGE}\n`);
      return 2;
    }
    allow.push(...(argv[i + 1] ?? '').split(',').filter(Boolean));
    i += 1;
  }
  let page;
  try {
    page = JSON.parse(readFileSync(0, 'utf8'));
  } catch (error) {
    process.stderr.write(`detectors: stdin is not one collected page as JSON — ${error.message}\n`);
    return 2;
  }
  process.stdout.write(`${JSON.stringify(decide(page, { allow }), null, 2)}\n`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
