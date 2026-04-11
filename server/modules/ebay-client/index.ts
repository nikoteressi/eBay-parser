// ─────────────────────────────────────────────────────────────
// EbayClient — Public API facade
//
// Orchestrates token lifecycle (authenticate, cache, refresh)
// and Browse API search calls. This is the single entry point
// that other modules (Scheduler, API routes) import.
//
// See ARCHITECTURE.md §5.5 (token lifecycle) and §6.1 (search flow).
// ─────────────────────────────────────────────────────────────

import { TokenCache } from './token-cache';
import { fetchOAuthToken, EbayAuthError, type OAuthCredentials } from './auth';
import {
  searchBrowseApi,
  EbayApiError,
  type NormalizedEbayItem,
  type SearchOptions,
} from './browse-api';
import type { BrowseApiParams } from '../url-translator/index';

// ─────────────────────────────────────────────────────────────
// Re-exports — consumers import everything from this index
// ─────────────────────────────────────────────────────────────

export { EbayAuthError } from './auth';
export { EbayApiError, type NormalizedEbayItem } from './browse-api';
export { TokenCache } from './token-cache';

// ─────────────────────────────────────────────────────────────
// Public Types
// ─────────────────────────────────────────────────────────────

export interface EbayClientConfig {
  /** eBay OAuth credentials */
  credentials: OAuthCredentials;
  /** Marketplace ID (e.g. 'EBAY_US') — read from settings */
  marketplace: string;
  /** 'production' or 'sandbox' — defaults to 'production' */
  environment?: 'production' | 'sandbox';
}

export interface SearchResult {
  /** Flat array of normalized items (across all pages) */
  items: NormalizedEbayItem[];
  /** Total matching results reported by the API */
  totalResults: number;
  /** Number of API calls made (one per page) */
  apiCallsMade: number;
}

// ─────────────────────────────────────────────────────────────
// EbayClient class
// ─────────────────────────────────────────────────────────────

export class EbayClient {
  private readonly tokenCache: TokenCache;
  private readonly marketplace: string;
  private readonly environment: 'production' | 'sandbox';

  constructor(config: EbayClientConfig) {
    this.marketplace = config.marketplace;
    this.environment = config.environment ?? 'production';

    // Inject the token fetcher as a closure over the credentials
    this.tokenCache = new TokenCache(
      () => fetchOAuthToken(config.credentials, this.environment),
      this.marketplace,
    );
  }

  // ───────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────

  /**
   * Proactively authenticates — fetches a token if not already cached.
   * Useful for the "Test eBay Connection" settings button.
   *
   * @throws {EbayAuthError} if credentials are invalid.
   */
  async authenticate(): Promise<void> {
    await this.tokenCache.getToken();
  }

  /**
   * Searches the eBay Browse API with automatic token management.
   *
   * 1. Obtains a valid access token (cached or refreshed).
   * 2. Calls the Browse API for up to `maxPages` pages.
   * 3. On HTTP 401: invalidates the token, retries once with a fresh token.
   *
   * @param params  — Browse API parameters from the URL Translator.
   * @param maxPages — Number of result pages to fetch (default: 2).
   * @returns Merged items, total result count, and API call count.
   * @throws {EbayApiError} on non-recoverable API errors.
   * @throws {EbayAuthError} if re-authentication also fails.
   */
  async search(params: BrowseApiParams, maxPages: number = 2): Promise<SearchResult> {
    const accessToken = await this.tokenCache.getToken();

    try {
      const result = await searchBrowseApi({
        params,
        accessToken,
        marketplace: this.marketplace,
        maxPages,
        environment: this.environment,
      });

      return {
        items: result.items,
        totalResults: result.totalResults,
        apiCallsMade: Math.min(maxPages, Math.ceil(result.totalResults / params.limit) || 1),
      };
    } catch (error) {
      // ── Retry on 401 (token revoked server-side) ──
      if (error instanceof EbayApiError && error.statusCode === 401) {
        this.tokenCache.invalidate();

        const freshToken = await this.tokenCache.getToken();

        const retryResult = await searchBrowseApi({
          params,
          accessToken: freshToken,
          marketplace: this.marketplace,
          maxPages,
          environment: this.environment,
        });

        return {
          items: retryResult.items,
          totalResults: retryResult.totalResults,
          apiCallsMade: Math.min(maxPages, Math.ceil(retryResult.totalResults / params.limit) || 1),
        };
      }

      throw error;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton factory (lazy initialization)
//
// The client is created on first use because it depends on
// credentials from the settings table, which may not be
// available at module import time.
// ─────────────────────────────────────────────────────────────

let clientInstance: EbayClient | null = null;

/**
 * Creates or returns the singleton EbayClient instance.
 *
 * Call `resetClient()` when the user updates eBay credentials
 * or marketplace setting so the next call creates a fresh instance.
 */
export function getEbayClient(config: EbayClientConfig): EbayClient {
  if (!clientInstance) {
    clientInstance = new EbayClient(config);
  }
  return clientInstance;
}

/**
 * Resets the singleton so it will be re-created with fresh config
 * on the next `getEbayClient()` call.
 */
export function resetClient(): void {
  clientInstance = null;
}
