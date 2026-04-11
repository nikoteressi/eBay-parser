import { eq } from 'drizzle-orm';
import { db } from '../../database/index';
import { trackedQueries } from '../../database/schema';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' });
  }

  const updates = await readBody(event);
  
  // Transform frontend keys to DB columns
  const dbUpdates: any = {};
  if (updates.is_paused !== undefined) {
    dbUpdates.isPaused = updates.is_paused;
    dbUpdates.status = updates.is_paused ? 'paused' : 'active';
  }
  if (updates.polling_interval !== undefined) dbUpdates.pollingInterval = updates.polling_interval;
  if (updates.track_prices !== undefined) dbUpdates.trackPrices = updates.track_prices;
  
  if (Object.keys(dbUpdates).length > 0) {
    dbUpdates.updatedAt = new Date().toISOString();
    await db.update(trackedQueries).set(dbUpdates).where(eq(trackedQueries.id, id)).run();
  }

  import('../../modules/scheduler/index').then(scheduler => {
    try {
      if (updates.polling_interval !== undefined) {
        scheduler.updateQueryInterval(id, updates.polling_interval);
      }
      if (updates.is_paused === true) {
        scheduler.unregisterQuery(id);
      } else if (updates.is_paused === false) {
        const query = db.select().from(trackedQueries).where(eq(trackedQueries.id, id)).get();
        if (query) scheduler.registerQuery(id, query.pollingInterval);
      }
    } catch(err) {}
  });

  return { success: true };
});
