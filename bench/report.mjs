#!/usr/bin/env node
// report.mjs — the JSON report every bench writes, and the label that makes a
// number readable.
//
// COMPONENTS.md §7: "Every bench metric is labeled gate or measurement. A gate
// carries a threshold and a failing run fails the stage; a measurement is
// recorded and read, never thresholded." The split exists so a number that
// looks good cannot stand in for a behavior that broke (decision 0019), which
// only holds while the two kinds cannot be confused — so a gate without a
// threshold and a measurement with one are both refused here rather than
// written into a report a reader would have to audit.

/**
 * A scored axis: it carries a threshold, and the run fails when it is under it.
 * @param {string} name
 * @param {{ value: number, threshold: number, [extra: string]: unknown }} fields
 */
export function gate(name, fields) {
  const { value, threshold, ...rest } = fields;
  if (typeof threshold !== 'number') {
    throw new Error(`gate "${name}": a gate needs a numeric threshold, or nothing gates`);
  }
  return { name, kind: 'gate', value, threshold, passed: value >= threshold, ...rest };
}

/**
 * A number that is recorded and read: cost, size, tool calls, turns.
 * @param {string} name
 * @param {{ value: number, unit?: string, [extra: string]: unknown }} fields
 */
export function measurement(name, fields) {
  if ('threshold' in fields) {
    throw new Error(`measurement "${name}": a threshold makes it a gate; label it one`);
  }
  return { name, kind: 'measurement', ...fields };
}

/**
 * @param {string} bench
 * @param {ReturnType<typeof gate | typeof measurement>[]} metrics
 * @param {Record<string, unknown>} [details] whatever the bench's own reader needs
 */
export function report(bench, metrics, details) {
  const gates = metrics.filter((m) => m.kind === 'gate');
  if (gates.length === 0) {
    throw new Error(`report "${bench}": no gate — a bench that gates nothing has nothing to report`);
  }
  const out = { bench, metrics, passed: gates.every((m) => m.passed) };
  if (details !== undefined) out.details = details;
  return out;
}

/**
 * The report of a hold-out set: measurements and nothing else (decision 0154).
 * A hold-out case exists to be read, never to fail a stage, so a gate here is
 * a case promoted to a threshold without a decision — refused, like the two
 * ways `gate` and `measurement` refuse a label that drifted.
 * @param {string} bench
 * @param {ReturnType<typeof measurement>[]} metrics
 * @param {Record<string, unknown>} [details]
 */
export function measurementReport(bench, metrics, details) {
  const gated = metrics.find((m) => m.kind !== 'measurement');
  if (gated) {
    throw new Error(`report "${bench}": gate "${gated.name}" in a measurement-only set — a threshold here needs a decision`);
  }
  if (metrics.length === 0) {
    throw new Error(`report "${bench}": no measurement — a set that measured nothing has nothing to report`);
  }
  const out = { bench, metrics };
  if (details !== undefined) out.details = details;
  return out;
}
