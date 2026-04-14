import { eq } from 'drizzle-orm';
import { db } from '../../database/index';
import { trackedQueries } from '../../database/schema';
import { createLogger } from '../../utils/logger';
import { translateUrl } from '../../modules/url-translator/index';
import { VALID_INTERVALS } from '../../utils/constants';

const log = createLogger('api:queries');

interface QueryDbUpdates {
  isPaused?: boolean;
  status?: 'active' | 'paused' | 'error';
  pollingInterval?: '5m' | '15m' | '30m' | '1h' | '6h';
  trackPrices?: boolean;
  label?: string | null;
  rawUrl?: string;
  parsedParams?: string;
  updatedAt?: string;
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' });
  }

  const updates = await readBody(event);

  // Transform frontend keys to DB columns
  const dbUpdates: QueryDbUpdates = {};
  if (updates.is_paused !== undefined) {
    dbUpdates.isPaused = updates.is_paused;
    dbUpdates.status = updates.is_paused ? 'paused' : 'active';
  }
  if (updates.polling_interval !== undefined && VALID_INTERVALS.includes(updates.polling_interval)) {
    dbUpdates.pollingInterval = updates.polling_interval;
  }
  if (updates.track_prices !== undefined) dbUpdates.trackPrices = updates.track_prices;
  if (updates.label !== undefined) dbUpdates.label = updates.label || null;
  if (updates.raw_url !== undefined) {
    try {
      const translated = translateUrl(updates.raw_url);
      dbUpdates.rawUrl = updates.raw_url;
      dbUpdates.parsedParams = JSON.stringify(translated.apiParams);
    } catch (err) {
      throw createError({ statusCode: 400, statusMessage: `Invalid eBay URL: ${(err as Error).message}` });
    }
  }

  if (Object.keys(dbUpdates).length > 0) {
    dbUpdates.updatedAt = new Date().toISOString();
    db.update(trackedQueries).set(dbUpdates).where(eq(trackedQueries.id, id)).run();
  }

  // Fire-and-forget — avoids circular import at module load time
  import('../../modules/scheduler/index').then(scheduler => {
    if (updates.polling_interval !== undefined) {
      scheduler.updateQueryInterval(id, updates.polling_interval);
    }
    if (updates.is_paused === true) {
      scheduler.unregisterQuery(id);
    } else if (updates.is_paused === false) {
      const query = db.select().from(trackedQueries).where(eq(trackedQueries.id, id)).get();
      if (query) scheduler.registerQuery(id, query.pollingInterval);
    }
  }).catch(err => {
    log.error(`Failed to sync scheduler for query ${id}: ${err}`);
  });

  return { success: true };
});
