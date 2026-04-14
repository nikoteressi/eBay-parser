// ─────────────────────────────────────────────────────────────
// Poll Worker — Single Poll Cycle Orchestration
//
// Executes one complete poll for a single tracked query:
//   1. Load query (validate state)
//   2. Check API budget
//   3. Search eBay Browse API
//   4. Record API calls
//   5. Compute diff (new items, price drops, out-of-view)
//   6. Dispatch notifications via Notifier
//   7. Run garbage collector
//   8. Update query metadata (last_polled_at, status)
//
// See ARCHITECTURE.md §6.1 sequence diagram.
// ─────────────────────────────────────────────────────────────

import { eq } from 'drizzle-orm';
import { db } from '../../database/index';
import { trackedQueries } from '../../database/schema';
import { checkBudget, recordCall } from '../api-budget/index';
import { computeDiff, type DiffResult } from '../diff-engine/index';
import { runGC } from '../garbage-collector/index';
import { getEbayClient, type EbayClientConfig, type EbayClient } from '../ebay-client/index';
import { dispatch } from '../notifier/index';
import { ApiLimitExceededError } from '../api-budget/index';
import { translateUrl } from '../url-translator/index';
import { createLogger } from '../../utils/logger';
import { readSetting } from '../../utils/settings';

const log = createLogger('poll-worker');

// ─────────────────────────────────────────────────────────────
// Public Types
// ─────────────────────────────────────────────────────────────

export interface PollResult {
  queryId: string;
  status: 'success' | 'skipped' | 'error';
  diff?: DiffResult;
  apiCallsMade?: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Reads the default max pages from settings (default: 2).
 */
function getMaxPages(): number {
  const val = readSetting('defaults.max_pages');
  if (!val) return 2;
  const parsed = Number(val);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
}

/**
 * Returns the singleton EbayClient using current settings.
 * Returns null if credentials are not configured.
 */
function createEbayClientFromSettings(): EbayClient | null {
  const appId = readSetting('ebay.app_id');
  const clientSecret = readSetting('ebay.client_secret');
  const marketplace = readSetting('ebay.marketplace') || 'EBAY_US';

  if (!appId || !clientSecret) {
    log.error('eBay credentials not configured — cannot poll');
    return null;
  }

  const config: EbayClientConfig = {
    credentials: { clientId: appId, clientSecret },
    marketplace,
  };

  return getEbayClient(config);
}

// ─────────────────────────────────────────────────────────────
// Poll Execution
// ─────────────────────────────────────────────────────────────

/**
 * Executes a single complete poll cycle for one query.
 *
 * This is called by the Global Polling Queue when a concurrency
 * slot becomes available.
 */
export async function runPoll(queryId: string): Promise<PollResult> {
  const now = new Date().toISOString();

  try {
    // ── Step 1: Load query and validate state ──
    const query = db
      .select()
      .from(trackedQueries)
      .where(eq(trackedQueries.id, queryId))
      .get();

    if (!query) {
      log.warn(`Query ${queryId} not found — skipping poll`);
      return { queryId, status: 'skipped', error: 'Query not found' };
    }

    if (query.isPaused || query.status === 'paused') {
      log.debug(`Query ${queryId} is paused — skipping poll`);
      return { queryId, status: 'skipped', error: 'Query is paused' };
    }

    // ── Step 2: Check API budget ──
    try {
      checkBudget();
    } catch (error) {
      if (error instanceof ApiLimitExceededError) {
        db.update(trackedQueries)
          .set({ lastError: error.message, updatedAt: now })
          .where(eq(trackedQueries.id, queryId))
          .run();

        return { queryId, status: 'skipped', error: error.message };
      }
      throw error;
    }

    // ── Step 3: Create eBay client ──
    const ebayClient = createEbayClientFromSettings();
    if (!ebayClient) {
      const errorMsg = 'eBay API credentials not configured';
      db.update(trackedQueries)
        .set({ status: 'error', lastError: errorMsg, updatedAt: now })
        .where(eq(trackedQueries.id, queryId))
        .run();

      return { queryId, status: 'error', error: errorMsg };
    }

    // ── Step 4: Search eBay ──
    // We re-translate the rawUrl instead of relying on parsedParams to ensure 
    // we always have correct and fresh apiParams.
    const { apiParams } = translateUrl(query.rawUrl);
    const maxPages = getMaxPages();

    log.info(`Polling query ${queryId}: "${apiParams.q}" (${maxPages} pages)`);

    const searchResult = await ebayClient.search(apiParams, maxPages);

    // ── Step 5: Record API calls ──
    recordCall(searchResult.apiCallsMade);

    // ── Step 6: Compute diff ──
    const diffResult = computeDiff(queryId, searchResult.items);

    // ── Step 7: Dispatch notifications ──
    if (diffResult.newItems.length > 0 || diffResult.priceDrops.length > 0) {
      const { apiParams: searchSummary } = translateUrl(query.rawUrl);
      try {
        const dispatchResult = await dispatch(
          {
            id: query.id,
            label: query.label,
            keywords: searchSummary.q,
            notifyChannel: query.notifyChannel,
          },
          diffResult,
        );

        log.info(
          `Notifications dispatched for query ${queryId}: ` +
            `email=${dispatchResult.emailSent}, telegram=${dispatchResult.telegramSent}`,
        );
      } catch (notifError) {
        // Notification failures should not fail the poll cycle
        const msg = notifError instanceof Error ? notifError.message : String(notifError);
        log.error(`Notification dispatch error for query ${queryId}: ${msg}`);
      }
    }

    // ── Step 8: Run garbage collector ──
    const gcResult = runGC(queryId);

    // ── Step 9: Update query metadata ──
    db.update(trackedQueries)
      .set({
        lastPolledAt: now,
        status: 'active',
        lastError: null,
        updatedAt: now,
      })
      .where(eq(trackedQueries.id, queryId))
      .run();

    log.info(
      `Poll complete for query ${queryId}: ` +
        `${searchResult.items.length} items from API, ` +
        `${diffResult.newItems.length} new, ${diffResult.priceDrops.length} drops, ` +
        `GC: ${gcResult.promoted} promoted, ${gcResult.deleted} deleted`,
    );

    return {
      queryId,
      status: 'success',
      diff: diffResult,
      apiCallsMade: searchResult.apiCallsMade,
    };
  } catch (error) {
    // ── Error handling: update query status ──
    const errorMessage = error instanceof Error ? error.message : String(error);

    log.error(`Poll failed for query ${queryId}: ${errorMessage}`);

    try {
      db.update(trackedQueries)
        .set({
          status: 'error',
          lastError: errorMessage,
          updatedAt: now,
        })
        .where(eq(trackedQueries.id, queryId))
        .run();
    } catch (dbError) {
      log.error(`Failed to update query error status: ${dbError}`);
    }

    return { queryId, status: 'error', error: errorMessage };
  }
}
