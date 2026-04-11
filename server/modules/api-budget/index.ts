// ─────────────────────────────────────────────────────────────
// API Budget Counter — Circuit breaker for eBay API calls
//
// Tracks daily call usage and enforces soft/hard limits:
//   < 80%  → normal
//   80–95% → warning  (caller should double polling intervals)
//   > 95%  → throws ApiLimitExceededError (hard stop)
//
// See ARCHITECTURE.md §5.3 for full specification.
// ─────────────────────────────────────────────────────────────

import { eq, sql } from 'drizzle-orm';
import { db } from '../../database/index';
import { apiUsageLog } from '../../database/schema';
import { createLogger } from '../../utils/logger';

const log = createLogger('api-budget');

// ─────────────────────────────────────────────────────────────
// Public Types
// ─────────────────────────────────────────────────────────────

export type BudgetStatus = 'normal' | 'warning' | 'critical';

export interface BudgetCheck {
  /** Number of API calls made today */
  callsMade: number;
  /** Configured daily limit */
  dailyLimit: number;
  /** Percentage of daily limit used (0–100+) */
  percentUsed: number;
  /** Current budget status */
  status: BudgetStatus;
}

// ─────────────────────────────────────────────────────────────
// Domain Error
// ─────────────────────────────────────────────────────────────

export class ApiLimitExceededError extends Error {
  public readonly code = 'API_LIMIT_EXCEEDED' as const;
  public readonly callsMade: number;
  public readonly dailyLimit: number;

  constructor(callsMade: number, dailyLimit: number) {
    super(
      `eBay API daily limit exceeded: ${callsMade}/${dailyLimit} calls used (>${Math.round((callsMade / dailyLimit) * 100)}%). Polls paused until midnight UTC.`,
    );
    this.name = 'ApiLimitExceededError';
    this.callsMade = callsMade;
    this.dailyLimit = dailyLimit;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Returns today's date string in UTC: YYYY-MM-DD */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Default daily limit (eBay Basic developer account) */
const DEFAULT_DAILY_LIMIT = 5_000;

/** Thresholds as fractions */
const SOFT_LIMIT_THRESHOLD = 0.80;  // 80%
const HARD_LIMIT_THRESHOLD = 0.95;  // 95%

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Checks the current API budget status for today.
 * Does NOT throw — returns the status for the caller to decide behavior.
 */
export function getUsage(): BudgetCheck {
  const today = todayUTC();
  const row = db.select().from(apiUsageLog).where(eq(apiUsageLog.date, today)).get();

  const callsMade = row?.callsMade ?? 0;
  const dailyLimit = row?.dailyLimit ?? DEFAULT_DAILY_LIMIT;
  const percentUsed = dailyLimit > 0 ? (callsMade / dailyLimit) * 100 : 0;

  let status: BudgetStatus = 'normal';
  if (callsMade / dailyLimit >= HARD_LIMIT_THRESHOLD) {
    status = 'critical';
  } else if (callsMade / dailyLimit >= SOFT_LIMIT_THRESHOLD) {
    status = 'warning';
  }

  return { callsMade, dailyLimit, percentUsed, status };
}

/**
 * Checks budget and throws if over the hard limit (>95%).
 * Called BEFORE making an eBay API call.
 *
 * @throws {ApiLimitExceededError} if hard limit exceeded.
 */
export function checkBudget(): BudgetCheck {
  const usage = getUsage();

  if (usage.status === 'critical') {
    log.error('Hard API limit exceeded — blocking poll', {
      callsMade: usage.callsMade,
      dailyLimit: usage.dailyLimit,
    });
    throw new ApiLimitExceededError(usage.callsMade, usage.dailyLimit);
  }

  if (usage.status === 'warning') {
    log.warn('API budget in warning zone — caller should double polling intervals', {
      callsMade: usage.callsMade,
      dailyLimit: usage.dailyLimit,
      percentUsed: usage.percentUsed.toFixed(1),
    });
  }

  return usage;
}

/**
 * Records one or more API calls for today.
 * Uses INSERT … ON CONFLICT UPDATE for atomic upsert.
 *
 * @param count Number of calls to record (default: 1).
 */
export function recordCall(count: number = 1): void {
  const today = todayUTC();
  const now = new Date().toISOString();

  db.insert(apiUsageLog)
    .values({
      date: today,
      callsMade: count,
      dailyLimit: DEFAULT_DAILY_LIMIT,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: apiUsageLog.date,
      set: {
        callsMade: sql`${apiUsageLog.callsMade} + ${count}`,
        updatedAt: now,
      },
    })
    .run();

  log.debug(`Recorded ${count} API call(s) for ${today}`);
}
