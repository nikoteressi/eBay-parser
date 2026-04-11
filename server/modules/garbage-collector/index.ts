// ─────────────────────────────────────────────────────────────
// Garbage Collector
//
// Two-pass cleanup for tracked_items:
// 1. Grace period expiry: out_of_view → ended_or_sold
// 2. Retention expiry: ended_or_sold → DELETE
//
// See ARCHITECTURE.md §5.1 (data lifecycle) and §6.1 (GC step).
// ─────────────────────────────────────────────────────────────

import { eq, and, lt, sql } from 'drizzle-orm';
import { db } from '../../database/index';
import { trackedItems, settings } from '../../database/schema';
import { createLogger } from '../../utils/logger';

const log = createLogger('garbage-collector');

// ─────────────────────────────────────────────────────────────
// Public Types
// ─────────────────────────────────────────────────────────────

export interface GCResult {
  /** Number of items promoted from out_of_view → ended_or_sold */
  promoted: number;
  /** Number of ended_or_sold items permanently deleted */
  deleted: number;
}

// ─────────────────────────────────────────────────────────────
// Defaults (can be overridden in settings table)
// ─────────────────────────────────────────────────────────────

const DEFAULT_GRACE_PERIOD_DAYS = 7;
const DEFAULT_RETENTION_DAYS = 30;

// ─────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Reads a numeric setting from the settings table.
 * Returns the default if the key is missing or the value is not a valid positive number.
 */
function readNumericSetting(key: string, defaultValue: number): number {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  if (!row) return defaultValue;

  const parsed = Number(row.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

/**
 * Returns an ISO 8601 timestamp representing `now - days`.
 */
function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Runs the garbage collector for a specific query.
 *
 * Pass 1 — Grace period expiry:
 *   Items that have been `out_of_view` for longer than `grace_period_days`
 *   are promoted to `ended_or_sold` with `ended_at = NOW`.
 *
 * Pass 2 — Retention expiry:
 *   Items that have been `ended_or_sold` for longer than `retention_days`
 *   are permanently deleted from the database.
 *
 * @param queryId The tracked_queries.id to run GC for.
 * @returns Counts of promoted and deleted items.
 */
export function runGC(queryId: string): GCResult {
  const gracePeriodDays = readNumericSetting('defaults.grace_period_days', DEFAULT_GRACE_PERIOD_DAYS);
  const retentionDays = readNumericSetting('defaults.retention_days', DEFAULT_RETENTION_DAYS);

  const now = new Date().toISOString();
  const graceCutoff = daysAgo(gracePeriodDays);
  const retentionCutoff = daysAgo(retentionDays);

  // ── Pass 1: out_of_view → ended_or_sold ──
  const promoteResult = db
    .update(trackedItems)
    .set({
      itemStatus: 'ended_or_sold',
      endedAt: now,
    })
    .where(
      and(
        eq(trackedItems.queryId, queryId),
        eq(trackedItems.itemStatus, 'out_of_view'),
        lt(trackedItems.outOfViewSince, graceCutoff),
      ),
    )
    .run();

  const promoted = promoteResult.changes;

  // ── Pass 2: ended_or_sold → DELETE ──
  const deleteResult = db
    .delete(trackedItems)
    .where(
      and(
        eq(trackedItems.queryId, queryId),
        eq(trackedItems.itemStatus, 'ended_or_sold'),
        lt(trackedItems.endedAt, retentionCutoff),
      ),
    )
    .run();

  const deleted = deleteResult.changes;

  if (promoted > 0 || deleted > 0) {
    log.info(
      `GC for query ${queryId}: ${promoted} promoted to ended_or_sold, ${deleted} deleted`,
      { gracePeriodDays, retentionDays },
    );
  } else {
    log.debug(`GC for query ${queryId}: nothing to clean up`);
  }

  return { promoted, deleted };
}
