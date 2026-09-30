# The detector thresholds, measured — 2026-09-07

Stage 11d-2, T11 (`BUILD-PLAN.md` Stage 11d: "The environment is verified, not tested, in the bench"), decision **0109**: the four numbers in `scripts/detectors.mjs` are read off a real DOM before they are written, and the JSON they were read off is kept here.

**No dispatch was bought for this.** The arm ran from the build session through the local Chrome the `chrome-devtools` MCP server drives — the same operations `adapters/browser/chrome-devtools.md` declares, `evaluate` for the collector and nothing else — so what it cost is the session's own context.

```
node bench/scripts/fixture-copy.mjs webapp            # → <copy>
cd <copy> && npm run dev                              # vite 8.2.2, ready in 173 ms, :5173
                                                      # (adapter) navigate http://localhost:5173/shift
node scripts/detectors.mjs source                     # the collector, one expression
                                                      # (adapter) evaluate that expression → shift-collected.json
node scripts/detectors.mjs decide < shift-collected.json > shift-decided.json
```

Chrome reported `devicePixelRatio: 2`; the viewport was **1200×762**. The page carries **12** elements and `omitted: 0`, so nothing was left out by the collector's bound.

## The three seeded defects, and nothing else

`shift-decided.json`, at the thresholds this run wrote:

```
overflow  div[6]     content is 352px wider than the box (overflow-x: visible)
clipped   div[8]     text is cut 34px short (overflow-y: hidden, no ellipsis)
overlap   button[10] overlaps button[11] by 20×20px
```

Three hits, `allowed: []`, and the `focus` detector silent — `index.html` gives every control a 3px outline, and the fourth detector staying quiet is half of what the criterion asks. `axe` produces nothing because no audit ran beside the collector.

The allowlist was exercised on the same JSON: `decide --allow "overflow:/shift"` returns `hits: clipped, overlap · allowed: overflow` (decision **0107**).

## What the page measured, per threshold

| Quantity | Non-defective | Seeded | Written |
|---|---|---|---|
| horizontal escape, boxes that cannot scroll | ten boxes at **exactly 0** | **352** | `overflowPx: 1` |
| vertical cut under `overflow-y: hidden` | no other element on the page has it | **34** | `clippedPx: 1` |
| intersection of two interactive boxes | no other pair | **20×20** | `overlapPx: 1` |
| focused ring width | — | 3px present · **0px** with the ring removed | `focusOutlinePx: 2` |

**Why 1 and not something larger.** The page does not pin a number by itself — the gap between 0 and the smallest seeded defect is 34px, so any threshold in 1…33 gives the same three hits. What it does pin is the floor: `scrollWidth` and `clientWidth` came back as **integers** on a device-pixel-ratio-2 display, so a sub-pixel escape is already rounded away and every non-defective box read exactly 0. `getBoundingClientRect` is **not** integral (`y: 241.703125`), and nudging the second button by 0.5px moved the measured intersection to **19.5×20**, so an intersection can be fractional. 1 is therefore the smallest value that excludes a sub-pixel artifact and a one-pixel rounding, and nothing above it is a fact about this page — it would be a judgement about how large a defect has to be to matter, taken by the session that wrote the script, which is what decision 0109 exists to prevent.

**Why `focusOutlinePx` is the one the page cannot pin.** A page with a correct focus ring bounds the minimum only from above. `shift-no-ring-collected.json` is the negative case, measured on the same DOM with `button:focus { outline: none !important }` injected: both controls read `outlineStyle: none, outlineWidth: 3px, boxShadow: none` and `decide` produced **two `focus` hits**, `focus ring is 0px`. So the page separates 0 from 3, and 2 sits inside that interval; the number itself is WCAG 2.2 SC 2.4.13's minimum thickness for a focus indicator, not this page's.

**One measured fact the decider rests on.** With `outline: none` applied, Chrome still reports `outlineWidth: 3px` and changes only `outlineStyle`. The width alone cannot tell a ring from no ring, which is why the decider reads the style first and the width second — `ring = focus.outlineStyle === 'none' ? 0 : px(focus.outlineWidth)`.

## Files

| File | What |
|---|---|
| `shift-collected.json` | what the collector returned through `evaluate`, 12 elements, unedited |
| `shift-decided.json` | `decide` over it at the written thresholds |
| `shift-no-ring-collected.json` | the negative focus case: the same page with the outline rule suppressed, plus the fractional-overlap probe and its two rects |

## What this run is not

It is not where the detector logic is tested. `scripts/detectors.test.mjs` is — the decider on JSON fixtures with literal straddling values, the collector against a duck-typed `document` that throws on any property it was not declared to read. jsdom reports `scrollWidth` and `getBoundingClientRect` as zero with no layout engine, so a unit test of this page would pass whatever the CSS said. This run verifies the environment, and the temptation it exists to refuse is letting the page stand in for the tests.
