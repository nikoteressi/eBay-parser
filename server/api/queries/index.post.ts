import { ulid } from 'ulid';
import { db } from '../../database/index';
import { trackedQueries } from '../../database/schema';
import { translateUrl } from '../../modules/url-translator/index';
import { createLogger } from '../../utils/logger';
import { VALID_INTERVALS, type PollingInterval } from '../../utils/constants';

const log = createLogger('api:queries');

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body?.raw_url) {
    throw createError({ statusCode: 400, statusMessage: 'raw_url is required' });
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
  const rawInterval = body.polling_interval ?? '15m';
  const pollingInterval: PollingInterval = VALID_INTERVALS.includes(rawInterval)
    ? rawInterval
    : '15m';
  const trackPrices: boolean = body.track_prices ?? true;
  const label: string = body.label ?? '';

  // 3. Insert into DB
  const queryId = ulid();
  const newQuery = {
    id: queryId,
    label,
    rawUrl: body.raw_url as string,
    parsedParams: JSON.stringify(parsed.summary),
    pollingInterval,
    trackPrices,
    isPaused: false,
    status: 'active' as const,
  };

  db.insert(trackedQueries).values(newQuery).run();

  // 4. Register with Scheduler (fire-and-forget — avoids circular import at module load)
  import('../../modules/scheduler/index').then(scheduler => {
    scheduler.registerQuery(queryId, pollingInterval);
  }).catch(err => {
    log.error(`Failed to register query ${queryId} with scheduler: ${err}`);
  });

  return newQuery;
});
