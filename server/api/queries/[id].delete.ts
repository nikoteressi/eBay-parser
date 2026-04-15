import { eq } from 'drizzle-orm';
import { db } from '../../database/index';
import { trackedQueries } from '../../database/schema';
import { createLogger } from '../../utils/logger';
import { requireRouterParam } from '../../utils/router';

const log = createLogger('api:queries');

export default defineEventHandler(async (event) => {
  const id = requireRouterParam(event, 'id');

  db.delete(trackedQueries).where(eq(trackedQueries.id, id)).run();

  // Fire-and-forget — avoids circular import at module load time
  import('../../modules/scheduler/index').then(scheduler => {
    scheduler.unregisterQuery(id);
  }).catch(err => {
    log.error(`Failed to unregister query ${id} from scheduler: ${err}`);
  });

  return { success: true };
});
