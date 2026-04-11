// ─────────────────────────────────────────────────────────────
// URL Param → Browse API Param Mapping Tables
// See ARCHITECTURE.md §5.4 for specification
// ─────────────────────────────────────────────────────────────

/**
 * eBay website `_sop` sort code → Browse API `sort` field.
 *
 * Only the codes listed in the architecture spec are mapped.
 * Unknown codes fall through to the default sort (`newlyListed`).
 */
export const SORT_MAP: ReadonlyMap<string, { apiSort: string; label: string }> = new Map([
  ['10', { apiSort: 'newlyListed', label: 'Newly Listed' }],
  ['15', { apiSort: 'price', label: 'Price + Shipping: lowest first' }],
  ['16', { apiSort: '-price', label: 'Price + Shipping: highest first' }],
]);

/** Default sort when the URL contains no `_sop` parameter. */
export const DEFAULT_SORT = { apiSort: 'newlyListed', label: 'Best Match' } as const;

/**
 * eBay domain suffix → Browse API marketplace ID.
 *
 * Used by the URL translator to auto-suggest the marketplace setting.
 * The user can always override this in the Settings page.
 */
export const DOMAIN_TO_MARKETPLACE: ReadonlyMap<string, string> = new Map([
  ['ebay.com', 'EBAY_US'],
  ['ebay.co.uk', 'EBAY_GB'],
  ['ebay.de', 'EBAY_DE'],
  ['ebay.com.au', 'EBAY_AU'],
  ['ebay.fr', 'EBAY_FR'],
  ['ebay.it', 'EBAY_IT'],
  ['ebay.es', 'EBAY_ES'],
  ['ebay.ca', 'EBAY_CA'],
]);

/**
 * eBay domains mapped to their default currency codes.
 * Used when building price filter strings for the Browse API.
 */
export const MARKETPLACE_CURRENCY: ReadonlyMap<string, string> = new Map([
  ['EBAY_US', 'USD'],
  ['EBAY_GB', 'GBP'],
  ['EBAY_DE', 'EUR'],
  ['EBAY_AU', 'AUD'],
  ['EBAY_FR', 'EUR'],
  ['EBAY_IT', 'EUR'],
  ['EBAY_ES', 'EUR'],
  ['EBAY_CA', 'CAD'],
]);

/**
 * eBay location filter `LH_PrefLoc` → Browse API `itemLocationCountry` field.
 *
 * LH_PrefLoc Codes:
 * 1: US Only
 * 2: Worldwide (ignored by filter, handled as summary label)
 * 3: North America
 */
export const LOCATION_MAP: ReadonlyMap<string, { apiFilter?: string; label: string }> = new Map([
  ['1', { apiFilter: 'itemLocationCountry:US', label: 'US Only' }],
  ['2', { label: 'Worldwide' }],
  ['3', { apiFilter: 'itemLocationCountry:US|CA|MX', label: 'North America' }],
]);

/** Default number of items per page when calling the Browse API. */
export const DEFAULT_LIMIT = 50;
