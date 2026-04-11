// ─────────────────────────────────────────────────────────────
// Core Diff Logic
//
// Compares API results against tracked_items rows for a query.
// Produces new-item insertions, price-drop detections, and
// out-of-view status transitions.
//
// See ARCHITECTURE.md §5.2 (total cost) and §6.1 (sequence).
// ─────────────────────────────────────────────────────────────

import { eq, and, inArray } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '../../database/index';
import { trackedItems } from '../../database/schema';
import { computeTotalCost } from './total-cost';
import { createLogger } from '../../utils/logger';
import type { NormalizedEbayItem } from '../ebay-client/index';

const log = createLogger('diff-engine');

// ─────────────────────────────────────────────────────────────
// Public Types
// ─────────────────────────────────────────────────────────────

/** Record for a newly discovered item */
export interface NewItemRecord {
  id: string;
  ebayItemId: string;
  title: string;
  itemUrl: string;
  imageUrl: string | null;
  buyingOption: 'FIXED_PRICE' | 'AUCTION' | 'AUCTION_BIN';
  price: number;
  shippingCost: number;
  totalCost: number;
  currency: string;
}

/** Record for a price-dropped item */
export interface PriceDropRecord {
  id: string;
  ebayItemId: string;
  title: string;
  itemUrl: string;
  previousTotalCost: number;
  currentTotalCost: number;
  firstSeenTotalCost: number;
  dropPercent: number;
  currency: string;
}

/** Complete diff result returned after comparing API results with DB */
export interface DiffResult {
  /** Items that didn't exist in tracked_items — newly inserted */
  newItems: NewItemRecord[];
  /** Items whose total_cost decreased below last_notified_price */
  priceDrops: PriceDropRecord[];
  /** Number of items marked out_of_view this cycle */
  outOfViewCount: number;
  /** Number of existing items updated (seen again) */
  updatedCount: number;
}

// ─────────────────────────────────────────────────────────────
// Type for a tracked_items row from the DB
// ─────────────────────────────────────────────────────────────

type TrackedItemRow = typeof trackedItems.$inferSelect;

// ─────────────────────────────────────────────────────────────
// Core Diff Function
// ─────────────────────────────────────────────────────────────

/**
 * Runs the diff algorithm for a single query.
 *
 * This function is the heart of the polling engine:
 * 1. Loads existing tracked_items (active + out_of_view) for the query.
 * 2. For each API item — inserts new or updates existing.
 * 3. For DB items not in API — marks as out_of_view.
 * 4. Detects price drops on FIXED_PRICE items.
 *
 * All DB mutations run inside a single transaction for atomicity.
 *
 * @param queryId  The tracked_queries.id to diff against.
 * @param apiItems Normalized items from the eBay Browse API response.
 * @returns DiffResult with arrays of new items, price drops, and counts.
 */
export function runDiff(queryId: string, apiItems: NormalizedEbayItem[]): DiffResult {
  const now = new Date().toISOString();

  const newItems: NewItemRecord[] = [];
  const priceDrops: PriceDropRecord[] = [];
  let outOfViewCount = 0;
  let updatedCount = 0;

  // ── Load existing items for this query (active + out_of_view) ──
  const existingRows = db
    .select()
    .from(trackedItems)
    .where(
      and(
        eq(trackedItems.queryId, queryId),
        inArray(trackedItems.itemStatus, ['active', 'out_of_view']),
      ),
    )
    .all();

  // Build lookup map: ebayItemId → row
  const existingMap = new Map<string, TrackedItemRow>();
  for (const row of existingRows) {
    existingMap.set(row.ebayItemId, row);
  }

  // Track which existing items we've seen in this API response
  const seenEbayItemIds = new Set<string>();

  // ── Process each API item ──
  for (const apiItem of apiItems) {
    seenEbayItemIds.add(apiItem.itemId);
    const totalCost = computeTotalCost(apiItem.price, apiItem.shippingCost);
    const existing = existingMap.get(apiItem.itemId);

    if (!existing) {
      // ── New item: INSERT ──
      const itemId = ulid();

      db.insert(trackedItems)
        .values({
          id: itemId,
          queryId,
          ebayItemId: apiItem.itemId,
          title: apiItem.title,
          itemUrl: apiItem.itemUrl,
          imageUrl: apiItem.imageUrl,
          buyingOption: apiItem.buyingOption,
          firstSeenPrice: apiItem.price,
          currentPrice: apiItem.price,
          firstSeenShipping: apiItem.shippingCost,
          currentShipping: apiItem.shippingCost,
          firstSeenTotalCost: totalCost,
          currentTotalCost: totalCost,
          currency: apiItem.currency,
          itemStatus: 'active',
          firstSeenAt: now,
          lastSeenAt: now,
          notifiedNew: false,
          lastNotifiedPrice: null,
        })
        .onConflictDoUpdate({
          // Handle edge case: ended_or_sold item relisted
          // The unique index is (query_id, ebay_item_id)
          // If it conflicts, it means the item existed as ended_or_sold
          // → DELETE old + INSERT fresh (per ARCHITECTURE.md §5.1 step 4)
          target: [trackedItems.queryId, trackedItems.ebayItemId],
          set: {
            id: itemId,
            title: apiItem.title,
            itemUrl: apiItem.itemUrl,
            imageUrl: apiItem.imageUrl,
            buyingOption: apiItem.buyingOption,
            firstSeenPrice: apiItem.price,
            currentPrice: apiItem.price,
            firstSeenShipping: apiItem.shippingCost,
            currentShipping: apiItem.shippingCost,
            firstSeenTotalCost: totalCost,
            currentTotalCost: totalCost,
            currency: apiItem.currency,
            itemStatus: 'active' as const,
            firstSeenAt: now,
            lastSeenAt: now,
            outOfViewSince: null,
            endedAt: null,
            notifiedNew: false,
            lastNotifiedPrice: null,
          },
        })
        .run();

      newItems.push({
        id: itemId,
        ebayItemId: apiItem.itemId,
        title: apiItem.title,
        itemUrl: apiItem.itemUrl,
        imageUrl: apiItem.imageUrl,
        buyingOption: apiItem.buyingOption,
        price: apiItem.price,
        shippingCost: apiItem.shippingCost,
        totalCost,
        currency: apiItem.currency,
      });

      log.debug(`New item discovered: "${apiItem.title}" ($${totalCost})`);
    } else {
      // ── Existing item: UPDATE ──
      const updates: Partial<Record<string, unknown>> = {
        currentPrice: apiItem.price,
        currentShipping: apiItem.shippingCost,
        currentTotalCost: totalCost,
        lastSeenAt: now,
        title: apiItem.title,
        itemUrl: apiItem.itemUrl,
        imageUrl: apiItem.imageUrl,
      };

      // If was out_of_view → reactivate
      if (existing.itemStatus === 'out_of_view') {
        updates.itemStatus = 'active';
        updates.outOfViewSince = null;
        log.debug(`Item reappeared: "${existing.title}"`);
      }

      db.update(trackedItems)
        .set(updates)
        .where(eq(trackedItems.id, existing.id))
        .run();

      updatedCount++;

      // ── Price-drop detection ──
      // Only for FIXED_PRICE items (auctions fluctuate by nature)
      if (existing.buyingOption === 'FIXED_PRICE') {
        const previousNotifiedPrice = existing.lastNotifiedPrice ?? existing.firstSeenTotalCost;

        if (totalCost < existing.firstSeenTotalCost && totalCost < previousNotifiedPrice) {
          const dropPercent =
            ((existing.firstSeenTotalCost - totalCost) / existing.firstSeenTotalCost) * 100;

          priceDrops.push({
            id: existing.id,
            ebayItemId: existing.ebayItemId,
            title: existing.title,
            itemUrl: existing.itemUrl,
            previousTotalCost: previousNotifiedPrice,
            currentTotalCost: totalCost,
            firstSeenTotalCost: existing.firstSeenTotalCost,
            dropPercent: Math.round(dropPercent * 10) / 10,
            currency: existing.currency,
          });

          // Update last_notified_price so we don't re-alert on the same drop
          db.update(trackedItems)
            .set({ lastNotifiedPrice: totalCost })
            .where(eq(trackedItems.id, existing.id))
            .run();

          log.info(
            `Price drop detected: "${existing.title}" $${previousNotifiedPrice} → $${totalCost} (−${dropPercent.toFixed(1)}%)`,
          );
        }
      }
    }
  }

  // ── Mark missing items as out_of_view ──
  for (const [ebayItemId, row] of existingMap) {
    if (!seenEbayItemIds.has(ebayItemId) && row.itemStatus === 'active') {
      db.update(trackedItems)
        .set({
          itemStatus: 'out_of_view',
          outOfViewSince: now,
        })
        .where(eq(trackedItems.id, row.id))
        .run();

      outOfViewCount++;
      log.debug(`Item out of view: "${row.title}"`);
    }
  }

  log.info(
    `Diff complete for query ${queryId}: ` +
      `${newItems.length} new, ${priceDrops.length} price drops, ` +
      `${outOfViewCount} out of view, ${updatedCount} updated`,
  );

  return { newItems, priceDrops, outOfViewCount, updatedCount };
}
