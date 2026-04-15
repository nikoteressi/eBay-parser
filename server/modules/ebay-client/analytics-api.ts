// ─────────────────────────────────────────────────────────────
// Developer Analytics API
// Fetches real-time rate limit / budget data.
// ─────────────────────────────────────────────────────────────

import { EbayApiError } from './browse-api';

const ANALYTICS_API_ENDPOINTS = {
  production: 'https://api.ebay.com/developer/analytics/v1_beta/rate_limit/?api_context=buy&api_name=browse',
  sandbox: 'https://api.sandbox.ebay.com/developer/analytics/v1_beta/rate_limit/?api_context=buy&api_name=browse',
} as const;

export interface RateLimitStatus {
  limit: number;
  remaining: number;
  count: number;
}

export async function getAnalyticsRateLimits(
  accessToken: string,
  environment: 'production' | 'sandbox' = 'production'
): Promise<RateLimitStatus> {
  const url = ANALYTICS_API_ENDPOINTS[environment];

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new EbayApiError(
      `Analytics API rate limit request failed (${response.status}): ${errorBody}`,
      response.status
    );
  }

  const data = await response.json();

  let resources: any[] = [];
  if (data && Array.isArray(data.rateLimits)) {
    const match = data.rateLimits.find((r: any) => r.apiContext === 'buy' && r.apiName === 'browse');
    if (match && Array.isArray(match.resources)) {
      resources = match.resources;
    }
  } else if (data && Array.isArray(data.resources)) {
    resources = data.resources;
  } else if (Array.isArray(data)) {
    const match = data.find((r: any) => r.apiContext === 'buy' && r.apiName === 'browse');
    if (match && Array.isArray(match.resources)) {
      resources = match.resources;
    }
  }

  if (!resources || resources.length === 0) {
    throw new EbayApiError('No rate limits returned for Browse API from Analytics API', 404);
  }

  for (const resource of resources) {
    if (Array.isArray(resource.rates)) {
      for (const rate of resource.rates) {
        if (rate.timeWindow === 86400 || resource.rates.length === 1) {
          return {
            limit: rate.limit ?? 5000,
            remaining: rate.remaining ?? 5000,
            count: rate.count ?? ((rate.limit ?? 5000) - (rate.remaining ?? 5000)),
          };
        }
      }
    }
  }

  for (const resource of resources) {
    if (Array.isArray(resource.rates) && resource.rates.length > 0) {
      const rate = resource.rates[0];
      return {
        limit: rate.limit ?? 5000,
        remaining: rate.remaining ?? 5000,
        count: rate.count ?? ((rate.limit ?? 5000) - (rate.remaining ?? 5000)),
      };
    }
  }

  throw new EbayApiError('Malformed rates in Analytics API response', 500);
}
