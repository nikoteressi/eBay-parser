import { desc } from 'drizzle-orm';
import { db } from '../../database/index';
import { trackedQueries } from '../../database/schema';

export default defineEventHandler(async () => {
  const queries = db.select().from(trackedQueries).orderBy(desc(trackedQueries.createdAt)).all();

  return queries.map(q => ({
    id: q.id,
    label: q.label,
    raw_url: q.rawUrl,
    parsed_params: JSON.parse(q.parsedParams), // parse for frontend
    polling_interval: q.pollingInterval,
    track_prices: q.trackPrices,
    notify_channel: q.notifyChannel,
    is_paused: q.isPaused,
    status: q.status,
    last_error: q.lastError,
    last_polled_at: q.lastPolledAt
  }));
});
