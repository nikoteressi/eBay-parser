// ─────────────────────────────────────────────────────────────
// Browse API Search Wrapper
// Calls the eBay Browse API /buy/browse/v1/item_summary/search
// and returns typed results. See ARCHITECTURE.md §6.1.
// ─────────────────────────────────────────────────────────────

import type { BrowseApiParams } from '../url-translator/index';

// ─────────────────────────────────────────────────────────────
// Browse API URLs
// ─────────────────────────────────────────────────────────────

const BROWSE_API_ENDPOINTS = {
  production: 'https://api.ebay.com/buy/browse/v1/item_summary/search',
  sandbox: 'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search',
} as const;

// ─────────────────────────────────────────────────────────────
// Response Types — typed subset of Browse API response
// ─────────────────────────────────────────────────────────────

export interface BrowseApiItemSummary {
  itemId: string;
  title: string;
  itemWebUrl: string;
  image?: { imageUrl: string };
  price: { value: string; currency: string };
  shippingOptions?: Array<{
    shippingCostType: string;
    shippingCost?: { value: string; currency: string };
  }>;
  buyingOptions: string[];     // e.g. ['FIXED_PRICE'] or ['AUCTION']
  itemLocation?: { country: string };
}

export interface BrowseApiSearchResponse {
  href: string;
  total: number;
  next?: string;
  offset: number;
  limit: number;
  itemSummaries?: BrowseApiItemSummary[];
}

/** Normalized item returned to callers of `searchBrowseApi`. */
export interface NormalizedEbayItem {
  itemId: string;
  title: string;
  itemUrl: string;
  imageUrl: string | null;
  price: number;
  shippingCost: number;
  currency: string;
  buyingOption: 'FIXED_PRICE' | 'AUCTION' | 'AUCTION_BIN';
}

// ─────────────────────────────────────────────────────────────
// Search Function
// ─────────────────────────────────────────────────────────────

export interface SearchOptions {
  /** Browse API parameters from the URL translator */
  params: BrowseApiParams;
  /** Bearer token from TokenCache */
  accessToken: string;
  /** Target marketplace (e.g. 'EBAY_US'). Sets the X-EBAY-C-MARKETPLACE-ID header. */
  marketplace: string;
  /** Number of pages to fetch (default: 1) */
  maxPages?: number;
  /** production or sandbox */
  environment?: 'production' | 'sandbox';
}

/**
 * Calls the eBay Browse API search endpoint, fetching up to `maxPages`
 * pages and returning a flat array of normalized items.
 *
 * @returns Object with the merged `items` array and the `totalResults` count.
 * @throws {EbayApiError} on non-200 responses.
 */
export async function searchBrowseApi(
  options: SearchOptions,
): Promise<{ items: NormalizedEbayItem[]; totalResults: number }> {
  const {
    params,
    accessToken,
    marketplace,
    maxPages = 1,
    environment = 'production',
  } = options;

  const baseUrl = BROWSE_API_ENDPOINTS[environment];
  const allItems: NormalizedEbayItem[] = [];
  let totalResults = 0;

  for (let page = 0; page < maxPages; page++) {
    const url = buildSearchUrl(baseUrl, params, page);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': marketplace,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new EbayApiError(
        `Browse API search failed (${response.status}): ${errorBody}`,
        response.status,
      );
    }

    const data = (await response.json()) as BrowseApiSearchResponse;
    totalResults = data.total;

    if (!data.itemSummaries || data.itemSummaries.length === 0) {
      break; // No more results
    }

    for (const item of data.itemSummaries) {
      allItems.push(normalizeItem(item));
    }

    // No next page available
    if (!data.next) {
      break;
    }
  }

  return { items: allItems, totalResults };
}

// ─────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────

function buildSearchUrl(
  baseUrl: string,
  params: BrowseApiParams,
  page: number,
): URL {
  const url = new URL(baseUrl);

  url.searchParams.set('q', params.q);
  url.searchParams.set('limit', String(params.limit));
  url.searchParams.set('offset', String(page * params.limit));

  if (params.sort) {
    url.searchParams.set('sort', params.sort);
  }

  // Browse API accepts multiple `filter` params
  const filters = params.filter || [];
  for (const f of filters) {
    url.searchParams.append('filter', f);
  }

  return url;
}

function normalizeItem(raw: BrowseApiItemSummary): NormalizedEbayItem {
  const price = parseFloat(raw.price.value) || 0;
  const currency = raw.price.currency;

  // Extract shipping cost — prefer the first non-calculated option
  let shippingCost = 0;
  if (raw.shippingOptions && raw.shippingOptions.length > 0) {
    const shipping = raw.shippingOptions[0];
    if (shipping?.shippingCost) {
      shippingCost = parseFloat(shipping.shippingCost.value) || 0;
    }
    // If shippingCostType is 'CALCULATED', cost may not be available
    // — treat as 0 (documented in ARCHITECTURE.md §5.2)
  }

  // Determine buying option
  let buyingOption: NormalizedEbayItem['buyingOption'] = 'FIXED_PRICE';
  const options = raw.buyingOptions ?? [];
  const hasAuction = options.includes('AUCTION');
  const hasFixedPrice = options.includes('FIXED_PRICE');

  if (hasAuction && hasFixedPrice) {
    buyingOption = 'AUCTION_BIN';
  } else if (hasAuction) {
    buyingOption = 'AUCTION';
  }

  // Clean up URL: remove query parameters and hash fragments
  let itemUrl = raw.itemWebUrl;
  try {
    const url = new URL(itemUrl);
    url.search = '';
    url.hash = '';
    itemUrl = url.toString();
  } catch {
    // Fallback to original if URL parsing fails
  }

  return {
    itemId: raw.itemId,
    title: raw.title,
    itemUrl,
    imageUrl: raw.image?.imageUrl ?? null,
    price,
    shippingCost,
    currency,
    buyingOption,
  };
}

// ─────────────────────────────────────────────────────────────
// Domain Error
// ─────────────────────────────────────────────────────────────

export class EbayApiError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'EbayApiError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
