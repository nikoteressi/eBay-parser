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

interface AnalyticsRate {
  limit?: number;
  remaining?: number;
  count?: number;
  timeWindow?: number;
}

interface AnalyticsResource {
  rates?: AnalyticsRate[];
}

interface AnalyticsRateLimitGroup {
  apiContext?: string;
  apiName?: string;
  resources?: AnalyticsResource[];
}

interface AnalyticsResponse {
  rateLimits?: AnalyticsRateLimitGroup[];
  resources?: AnalyticsResource[];
}

const DEFAULT_DAILY_LIMIT = 5000;

function extractResources(data: AnalyticsResponse | AnalyticsRateLimitGroup[]): AnalyticsResource[] {
  if (Array.isArray(data)) {
    const match = data.find(r => r.apiContext === 'buy' && r.apiName === 'browse');
    return match?.resources ?? [];
  }
  if (Array.isArray(data.rateLimits)) {
    const match = data.rateLimits.find(r => r.apiContext === 'buy' && r.apiName === 'browse');
    return match?.resources ?? [];
  }
  if (Array.isArray(data.resources)) {
    return data.resources;
  }
  return [];
}

function rateToStatus(rate: AnalyticsRate): RateLimitStatus {
  const limit = rate.limit ?? DEFAULT_DAILY_LIMIT;
  const remaining = rate.remaining ?? DEFAULT_DAILY_LIMIT;
  return {
    limit,
    remaining,
    count: rate.count ?? (limit - remaining),
  };
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

  const data = (await response.json()) as AnalyticsResponse | AnalyticsRateLimitGroup[];
  const resources = extractResources(data);

  if (resources.length === 0) {
    throw new EbayApiError('No rate limits returned for Browse API from Analytics API', 404);
  }

  for (const resource of resources) {
    const rates = resource.rates ?? [];
    const dailyRate = rates.find(r => r.timeWindow === 86400) ?? (rates.length === 1 ? rates[0] : undefined);
    if (dailyRate) return rateToStatus(dailyRate);
  }

  for (const resource of resources) {
    const first = resource.rates?.[0];
    if (first) return rateToStatus(first);
  }

  throw new EbayApiError('Malformed rates in Analytics API response', 500);
}
