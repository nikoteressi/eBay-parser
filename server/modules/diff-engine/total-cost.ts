// ─────────────────────────────────────────────────────────────
// Total Cost Calculation
// Pure utility — price + shipping with safe defaults.
// See ARCHITECTURE.md §5.2.
// ─────────────────────────────────────────────────────────────

/**
 * Computes the total cost of an item: price + shipping.
 *
 * If shipping is absent or negative, it defaults to 0.
 * If price is negative, it defaults to 0.
 * Result is rounded to 2 decimal places for currency precision.
 */
export function computeTotalCost(price: number, shipping: number): number {
  const safePrice = Math.max(0, price || 0);
  const safeShipping = Math.max(0, shipping || 0);
  return Math.round((safePrice + safeShipping) * 100) / 100;
}
