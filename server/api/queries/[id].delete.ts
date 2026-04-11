import { eq } from 'drizzle-orm';
import { db } from '../../database/index';
import { trackedQueries } from '../../database/schema';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' });
  }

  await db.delete(trackedQueries).where(eq(trackedQueries.id, id)).run();

  import('../../modules/scheduler/index').then(scheduler => {
    try {
      scheduler.unregisterQuery(id);
    } catch(err) {}
  });

  return { success: true };
});
