/**
 * The tax rules the whole monorepo shares. JavaScript with a hand-written
 * declaration file: web consumes it as a package, not as a folder.
 */

/** @type {Record<string, number>} */
const RATES = { standard: 0.2, reduced: 0.1, zero: 0 };

/**
 * @param {number} amount
 * @param {string} band
 * @returns {number}
 */
export function applyTax(amount, band) {
  const rate = RATES[band];
  if (rate === undefined) throw new Error(`no tax band ${band}`);
  return Math.round(amount * (1 + rate) * 100) / 100;
}

/** @returns {string[]} */
export function bands() {
  return Object.keys(RATES);
}

export function totalCents(lines) {
  return lines.reduce((total, line) => total + line.cents, 0);
}
