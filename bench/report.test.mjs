import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { gate, measurement, report } from './report.mjs';

describe('a metric says which kind it is', () => {
  it('a gate carries its threshold and its verdict', () => {
    const m = gate('path', { value: 0.9, threshold: 0.85 });
    assert.equal(m.kind, 'gate');
    assert.equal(m.passed, true);
    assert.equal(m.threshold, 0.85);
  });

  it('a gate under its threshold has not passed', () => {
    assert.equal(gate('path', { value: 0.62, threshold: 0.85 }).passed, false);
  });

  it('a gate without a threshold is refused, because then nothing gates', () => {
    assert.throws(() => gate('path', { value: 0.9 }), /threshold/);
  });

  it('a measurement carries a value and no verdict', () => {
    const m = measurement('cost', { value: 15.41, unit: 'usd' });
    assert.equal(m.kind, 'measurement');
    assert.equal(m.unit, 'usd');
    assert.equal('passed' in m, false);
  });

  it('a measurement carrying a threshold is refused — that is a gate wearing the other label', () => {
    assert.throws(() => measurement('cost', { value: 15.41, threshold: 20 }), /threshold/);
  });
});

describe('the report', () => {
  it('labels every metric and fails when any gate fails', () => {
    const r = report('router', [
      gate('path', { value: 0.9, threshold: 0.85 }),
      gate('type', { value: 0.8, threshold: 0.9 }),
      measurement('cost', { value: 15.41, unit: 'usd' }),
    ]);
    assert.equal(r.bench, 'router');
    assert.equal(r.passed, false);
    assert.deepEqual(
      r.metrics.map((m) => m.kind),
      ['gate', 'gate', 'measurement'],
    );
  });

  it('passes when every gate passes, measurements notwithstanding', () => {
    const r = report('router', [
      gate('path', { value: 0.9, threshold: 0.85 }),
      measurement('cost', { value: 999, unit: 'usd' }),
    ]);
    assert.equal(r.passed, true);
  });

  it('a report with no gate is refused: a bench that gates nothing reports nothing', () => {
    assert.throws(() => report('router', [measurement('cost', { value: 1, unit: 'usd' })]), /gate/);
  });
});
