import { ulid } from 'ulid';
import { db } from '../../database/index';
import { trackedQueries } from '../../database/schema';
import { translateUrl } from '../../modules/url-translator/index';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  if (!body || !body.raw_url) {
    throw createError({
      statusCode: 400,
      statusMessage: 'raw_url is required',
    });
  }

  // 1. Validate & Translate URL
  let parsed: ReturnType<typeof translateUrl>;
  try {
    parsed = translateUrl(body.raw_url);
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'Invalid url',
    });
  }

  // 2. Prepare defaults
  const pollingInterval = body.polling_interval || '15m';
  const trackPrices = body.track_prices !== undefined ? body.track_prices : true;
  const label = body.label || '';
  
  // 3. Insert into DB
  const queryId = ulid();
  const newQuery = {
    id: queryId,
    label,
    rawUrl: body.raw_url,
    parsedParams: JSON.stringify(parsed.summary), 
    pollingInterval,
    trackPrices,
    isPaused: false,
    status: 'active' as const,
  };
  
  await db.insert(trackedQueries).values(newQuery).run();

  // 4. Register with Scheduler
  // Since we might be running in Nitro without top-level initialized scheduler, 
  // we'll try to get it, or assume it's running.
  // Actually, wait, let's just use registerQuery
  import('../../modules/scheduler/index').then(scheduler => {
    try {
      scheduler.registerQuery(queryId, pollingInterval);
    } catch(err) {
      console.error('Failed to register query on scheduler:', err);
    }
  });

  return newQuery;
});
