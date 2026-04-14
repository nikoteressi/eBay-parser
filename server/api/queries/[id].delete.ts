import { eq } from 'drizzle-orm';
import { db } from '../../database/index';
import { trackedQueries } from '../../database/schema';
import { createLogger } from '../../utils/logger';

const log = createLogger('api:queries');

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' });
  }

  db.delete(trackedQueries).where(eq(trackedQueries.id, id)).run();

  // Fire-and-forget — avoids circular import at module load time
  import('../../modules/scheduler/index').then(scheduler => {
    scheduler.unregisterQuery(id);
  }).catch(err => {
    log.error(`Failed to unregister query ${id} from scheduler: ${err}`);
  });

  return { success: true };
});
