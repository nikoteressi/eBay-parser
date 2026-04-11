// ─────────────────────────────────────────────────────────────
// DiffEngine — Public API facade
//
// Single entry point for the diffing subsystem.
// Re-exports types and wraps the core differ for external use.
//
// See ARCHITECTURE.md §6.1 for the full poll sequence.
// ─────────────────────────────────────────────────────────────

export { computeTotalCost } from './total-cost';
export { runDiff, type DiffResult, type NewItemRecord, type PriceDropRecord } from './differ';

import { runDiff, type DiffResult } from './differ';
import type { NormalizedEbayItem } from '../ebay-client/index';

/**
 * Public API: Computes the diff between eBay API results and
 * the existing tracked_items for a given query.
 *
 * This is the function that `poll-worker.ts` calls.
 *
 * @param queryId The tracked_queries.id to diff against.
 * @param apiItems Normalized items from `EbayClient.search()`.
 * @returns DiffResult containing new items, price drops, and transition counts.
 */
export function computeDiff(queryId: string, apiItems: NormalizedEbayItem[]): DiffResult {
  return runDiff(queryId, apiItems);
}
