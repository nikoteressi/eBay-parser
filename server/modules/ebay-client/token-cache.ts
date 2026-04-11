// ─────────────────────────────────────────────────────────────
// TokenCache — In-memory OAuth token store with proactive refresh
// See ARCHITECTURE.md §5.5 for specification.
//
// NOT persisted to the database. On server restart, the first
// API call requests a fresh token. This is intentional — OAuth
// tokens are short-lived and not worth encrypted DB storage.
// ─────────────────────────────────────────────────────────────

/** Minimum remaining lifetime before proactive refresh (milliseconds). */
const REFRESH_WINDOW_MS = 5 * 60 * 1_000; // 5 minutes

/** Shape of a cached OAuth token entry. */
interface CachedToken {
  /** The raw access_token string. */
  accessToken: string;
  /** Unix timestamp (ms) when the token expires. */
  expiresAt: number;
  /** Marketplace the token was issued for (e.g. 'EBAY_US'). */
  marketplace: string;
}

/**
 * A function that performs the actual OAuth call and returns the raw token
 * data. Injected as a dependency so `TokenCache` stays unit-testable.
 */
export type TokenFetcher = () => Promise<{
  access_token: string;
  expires_in: number;
}>;

export class TokenCache {
  private cached: CachedToken | null = null;
  private pendingRefresh: Promise<string> | null = null;
  private readonly fetchToken: TokenFetcher;
  private readonly marketplace: string;

  constructor(fetchToken: TokenFetcher, marketplace: string) {
    this.fetchToken = fetchToken;
    this.marketplace = marketplace;
  }

  // ───────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────

  /**
   * Returns a valid access token. Uses the cache if the token has more
   * than 5 minutes of remaining lifetime; otherwise proactively refreshes.
   *
   * Concurrent callers during a refresh share the same in-flight promise
   * (deduplication) to avoid redundant OAuth calls.
   */
  async getToken(): Promise<string> {
    if (this.isValid()) {
      return this.cached!.accessToken;
    }

    // Deduplicate concurrent refresh attempts
    if (this.pendingRefresh) {
      return this.pendingRefresh;
    }

    this.pendingRefresh = this.refresh();

    try {
      const token = await this.pendingRefresh;
      return token;
    } finally {
      this.pendingRefresh = null;
    }
  }

  /**
   * Force-invalidates the cached token.
   *
   * Called when the eBay API returns HTTP 401 (token revoked server-side),
   * so the next `getToken()` call will fetch a fresh one.
   */
  invalidate(): void {
    this.cached = null;
  }

  /**
   * Returns `true` if a cached token exists and has more than
   * `REFRESH_WINDOW_MS` (5 minutes) of remaining lifetime.
   */
  isValid(): boolean {
    if (!this.cached) return false;
    if (this.cached.marketplace !== this.marketplace) return false;
    return Date.now() < this.cached.expiresAt - REFRESH_WINDOW_MS;
  }

  // ───────────────────────────────────────────────────────────
  // Internals
  // ───────────────────────────────────────────────────────────

  private async refresh(): Promise<string> {
    const data = await this.fetchToken();

    this.cached = {
      accessToken: data.access_token,
      // `expires_in` is in seconds → convert to absolute ms timestamp
      expiresAt: Date.now() + data.expires_in * 1_000,
      marketplace: this.marketplace,
    };

    return this.cached.accessToken;
  }
}
