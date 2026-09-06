import { applyTax } from '@mono/svc';

export interface BasketLine {
  sku: string;
  price: number;
  quantity: number;
  band: string;
}

/** The price of a basket with tax applied line by line. */
export function basketTotal(lines: BasketLine[]): number {
  const total = lines.reduce((sum, line) => sum + applyTax(line.price, line.band) * line.quantity, 0);
  return Math.round(total * 100) / 100;
}

export function basketCount(items: { qty: number }[]): number {
  return items.reduce((total, item) => total + item.qty, 0);
}
