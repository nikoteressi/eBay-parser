// ─────────────────────────────────────────────────────────────
// OAuth Client Credentials Authentication
// Handles the POST to eBay's /identity/v1/oauth2/token endpoint.
// See ARCHITECTURE.md §5.5 for context.
// ─────────────────────────────────────────────────────────────

/** Scopes required for Browse API (search). */
const SCOPE = 'https://api.ebay.com/oauth/api_scope';

/** eBay OAuth token URLs per environment. */
const TOKEN_ENDPOINTS = {
  production: 'https://api.ebay.com/identity/v1/oauth2/token',
  sandbox: 'https://api.sandbox.ebay.com/identity/v1/oauth2/token',
} as const;

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Performs an OAuth `client_credentials` grant against the eBay Identity API.
 *
 * This is a low-level function. Callers should use `TokenCache.getToken()`
 * which wraps this with caching and proactive refresh.
 *
 * @throws {EbayAuthError} on non-200 responses or network failures.
 */
export async function fetchOAuthToken(
  credentials: OAuthCredentials,
  environment: 'production' | 'sandbox' = 'production',
): Promise<OAuthTokenResponse> {
  const endpoint = TOKEN_ENDPOINTS[environment];

  // eBay requires Basic auth: Base64(clientId:clientSecret)
  const basicAuth = Buffer.from(
    `${credentials.clientId}:${credentials.clientSecret}`,
  ).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: SCOPE,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new EbayAuthError(
      `OAuth token request failed (${response.status}): ${errorBody}`,
      response.status,
    );
  }

  const data = (await response.json()) as OAuthTokenResponse;

  if (!data.access_token || !data.expires_in) {
    throw new EbayAuthError(
      'OAuth response missing access_token or expires_in',
      response.status,
    );
  }

  return data;
}

// ─────────────────────────────────────────────────────────────
// Domain Error
// ─────────────────────────────────────────────────────────────

export class EbayAuthError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'EbayAuthError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
