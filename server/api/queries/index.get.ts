import { desc, eq, and, gte, lt } from 'drizzle-orm';
import { db } from '../../database/index';
import { trackedQueries, trackedItems } from '../../database/schema';

export default defineEventHandler(async () => {
  const queries = db.select().from(trackedQueries).orderBy(desc(trackedQueries.createdAt)).all();
  
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Return queries with counts
  return queries.map(q => {
    // Count new items (< 24h)
    const newItemsCount = db.select()
      .from(trackedItems)
      .where(and(
        eq(trackedItems.queryId, q.id),
        gte(trackedItems.firstSeenAt, oneDayAgo)
      ))
      .all().length;

    // Count active price drops (current < first)
    // Note: Drizzle SQLite doesn't support complex comparisons directly in where as easily for all types 
    // but this works for basic numeric types in SQLite.
    // Count active price drops (current < first) within last 24h
    const priceDropsCount = db.select()
      .from(trackedItems)
      .where(and(
        eq(trackedItems.queryId, q.id),
        eq(trackedItems.itemStatus, 'active'),
        lt(trackedItems.currentTotalCost, trackedItems.firstSeenTotalCost),
        gte(trackedItems.lastSeenAt, oneDayAgo)
      ))
      .all().length;

    return {
      id: q.id,
      label: q.label,
      raw_url: q.rawUrl,
      parsed_params: JSON.parse(q.parsedParams),
      polling_interval: q.pollingInterval,
      track_prices: q.trackPrices,
      notify_channel: q.notifyChannel,
      is_paused: q.isPaused,
      status: q.status,
      last_error: q.lastError,
      last_polled_at: q.lastPolledAt,
      new_items_count: newItemsCount,
      price_drops_count: priceDropsCount
    };
  });
});
