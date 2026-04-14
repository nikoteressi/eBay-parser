// ─────────────────────────────────────────────────────────────
// Currency Utility
//
// Shared helpers for currency formatting.
// Used by email-sender and telegram-sender to render prices.
// ─────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  AUD: 'A$',
  CAD: 'C$',
};

/**
 * Returns the symbol for the given ISO 4217 currency code.
 * Falls back to the code itself (with a trailing space) for
 * unknown currencies (e.g. "JPY " for Japanese Yen).
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? `${currency} `;
}