// ─────────────────────────────────────────────────────────────
// Force Poll — Manually triggers a poll cycle for a single query.
//
// POST /api/queries/:id/poll
//
// Bypasses the scheduler and immediately runs the poll-worker
// for the specified query. Returns the poll result.
// ─────────────────────────────────────────────────────────────

import { runPoll } from '../../../modules/scheduler/poll-worker';
import { requireRouterParam } from '../../../utils/router';

export default defineEventHandler(async (event) => {
  const id = requireRouterParam(event, 'id');

  const result = await runPoll(id);

  return {
    success: result.status === 'success',
    status: result.status,
    error: result.error ?? null,
    apiCallsMade: result.apiCallsMade ?? 0,
    newItems: result.diff?.newItems.length ?? 0,
    priceDrops: result.diff?.priceDrops.length ?? 0,
  };
});
