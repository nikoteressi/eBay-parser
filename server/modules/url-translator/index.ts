// ─────────────────────────────────────────────────────────────
// URL Translator Service
// Pure function module — no side effects, no DB access, no state.
// See ARCHITECTURE.md §5.4 for specification.
// ─────────────────────────────────────────────────────────────

import {
  SORT_MAP,
  DEFAULT_SORT,
  DOMAIN_TO_MARKETPLACE,
  MARKETPLACE_CURRENCY,
  DEFAULT_LIMIT,
  LOCATION_MAP,
} from './param-map';

// ─────────────────────────────────────────────────────────────
// Public Types
// ─────────────────────────────────────────────────────────────

export interface BrowseApiParams {
  /** Search keywords */
  q: string;
  /** Browse API filter strings (price, buyingOptions, etc.) */
  filter: string[];
  /** Browse API sort field */
  sort: string;
  /** Items per page */
  limit: number;
}

export interface TranslateSummary {
  /** Extracted search keywords */
  keywords: string;
  /** Minimum price filter, if present */
  minPrice?: number;
  /** Maximum price filter, if present */
  maxPrice?: number;
  /** Whether the filter restricts to Buy It Now */
  buyItNowOnly: boolean;
  /** Human-readable sort description */
  sortLabel: string;
  /** Auto-detected marketplace from domain */
  detectedMarketplace?: string;
  /** Human-readable location description (US Only, North America, etc.) */
  locationLabel?: string;
}

export interface TranslateResult {
  /** Params ready for Browse API search call */
  apiParams: BrowseApiParams;
  /** Human-readable summary for dashboard display */
  summary: TranslateSummary;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ─────────────────────────────────────────────────────────────
// URL pattern for eBay search pages
// Matches: https://www.ebay.com/sch/i.html?...
//          https://www.ebay.co.uk/sch/...
//          https://ebay.de/sch/...
// ─────────────────────────────────────────────────────────────
const EBAY_SEARCH_PATTERN = /^https?:\/\/(?:www\.)?ebay\.(com|co\.uk|de|com\.au|fr|it|es|ca)\/sch\//i;

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Validates that the raw URL is a recognizable eBay search URL.
 *
 * Checks:
 * 1. URL matches the `ebay.{tld}/sch/` pattern.
 * 2. At least `_nkw` (keywords) is present, OR the path contains a category.
 */
export function validateUrl(rawUrl: string): ValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL is required.' };
  }

  const trimmed = rawUrl.trim();

  if (!EBAY_SEARCH_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: 'URL must be an eBay search page (e.g. ebay.com/sch/...).',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }

  const hasKeywords = parsed.searchParams.has('_nkw');
  // Category pages like /sch/Cameras/625/i.html have a numeric segment
  const hasCategoryPath = /\/sch\/[^/]+\/\d+\//.test(parsed.pathname);

  if (!hasKeywords && !hasCategoryPath) {
    return {
      valid: false,
      error: 'URL must contain search keywords (_nkw) or a category path.',
    };
  }

  return { valid: true };
}

/**
 * Translates a raw eBay browser URL into Browse API parameters
 * and a human-readable summary for the frontend preview.
 *
 * This is a **pure function** — no side effects, no DB access.
 * Unknown URL parameters are silently ignored.
 *
 * @throws {Error} if the URL fails validation.
 */
export function translateUrl(rawUrl: string): TranslateResult {
  const validation = validateUrl(rawUrl);
  if (!validation.valid) {
    throw new Error(`Invalid eBay URL: ${validation.error}`);
  }

  const parsed = new URL(rawUrl.trim());
  const params = parsed.searchParams;

  // ── Detect marketplace from domain ──
  const domainMatch = parsed.hostname.match(/ebay\.(.+)$/i);
  const domainSuffix = domainMatch ? `ebay.${domainMatch[1]}` : 'ebay.com';
  const detectedMarketplace = DOMAIN_TO_MARKETPLACE.get(domainSuffix) ?? 'EBAY_US';
  const currency = MARKETPLACE_CURRENCY.get(detectedMarketplace) ?? 'USD';

  // ── Keywords ──
  const keywords = decodeKeywords(params.get('_nkw') ?? '');

  // ── Filters ──
  const filters: string[] = [];

  // Price range
  const minPrice = parsePrice(params.get('_udlo'));
  const maxPrice = parsePrice(params.get('_udhi'));

  if (minPrice !== undefined || maxPrice !== undefined) {
    const lower = minPrice !== undefined ? String(minPrice) : '';
    const upper = maxPrice !== undefined ? String(maxPrice) : '';
    filters.push(`price:[${lower}..${upper}],priceCurrency:${currency}`);
  }

  // Buy It Now
  const buyItNowOnly = params.get('LH_BIN') === '1';
  if (buyItNowOnly) {
    filters.push('buyingOptions:{FIXED_PRICE}');
  }

  // Location (LH_PrefLoc)
  const prefLoc = params.get('LH_PrefLoc');
  const locationMapping = prefLoc ? LOCATION_MAP.get(prefLoc) : undefined;
  if (locationMapping) {
    if (locationMapping.apiFilter) {
      filters.push(locationMapping.apiFilter);
    }
  }

  // ── Sort ──
  const sopCode = params.get('_sop');
  const sortMapping = sopCode ? SORT_MAP.get(sopCode) : undefined;
  const sort = sortMapping?.apiSort ?? DEFAULT_SORT.apiSort;
  const sortLabel = sortMapping?.label ?? DEFAULT_SORT.label;

  // ── Build result ──
  const apiParams: BrowseApiParams = {
    q: keywords,
    filter: filters,
    sort,
    limit: DEFAULT_LIMIT,
  };

  const summary: TranslateSummary = {
    keywords,
    buyItNowOnly,
    sortLabel,
    detectedMarketplace,
    ...(minPrice !== undefined && { minPrice }),
    ...(maxPrice !== undefined && { maxPrice }),
    ...(locationMapping?.label && { locationLabel: locationMapping.label }),
  };

  return { apiParams, summary };
}

// ─────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Decodes the `_nkw` value: eBay encodes spaces as `+`.
 * `URL.searchParams` already handles `%20`, but `+` needs explicit handling.
 */
function decodeKeywords(raw: string): string {
  return raw.replace(/\+/g, ' ').trim();
}

/**
 * Safely parses a price string to a number.
 * Returns `undefined` if the input is absent, empty, or not a valid number.
 */
function parsePrice(value: string | null): number | undefined {
  if (value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
