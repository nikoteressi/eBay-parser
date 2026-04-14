import { desc, eq, and, gte, lt, count } from 'drizzle-orm';
import { db } from '../../database/index';
import { trackedQueries, trackedItems } from '../../database/schema';

export default defineEventHandler(async () => {
  const queries = db.select().from(trackedQueries).orderBy(desc(trackedQueries.createdAt)).all();
  if (queries.length === 0) return [];

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Aggregate new-item counts in one query instead of N individual lookups
  const newCountRows = db
    .select({ queryId: trackedItems.queryId, cnt: count() })
    .from(trackedItems)
    .where(gte(trackedItems.firstSeenAt, oneDayAgo))
    .groupBy(trackedItems.queryId)
    .all();

  // Aggregate price-drop counts in one query
  const dropCountRows = db
    .select({ queryId: trackedItems.queryId, cnt: count() })
    .from(trackedItems)
    .where(and(
      eq(trackedItems.itemStatus, 'active'),
      lt(trackedItems.currentTotalCost, trackedItems.firstSeenTotalCost),
      gte(trackedItems.lastSeenAt, oneDayAgo)
    ))
    .groupBy(trackedItems.queryId)
    .all();

  const newCountMap = new Map(newCountRows.map(r => [r.queryId, r.cnt]));
  const dropCountMap = new Map(dropCountRows.map(r => [r.queryId, r.cnt]));

  return queries.map(q => ({
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
    new_items_count: newCountMap.get(q.id) ?? 0,
    price_drops_count: dropCountMap.get(q.id) ?? 0,
  }));
});
