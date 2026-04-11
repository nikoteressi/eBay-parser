// ─────────────────────────────────────────────────────────────
// Scheduler Nitro Plugin
//
// Starts the global polling scheduler when the Nuxt server boots.
// Registers a shutdown hook to stop it gracefully.
//
// See ARCHITECTURE.md §6.2 — "Server Boot" flow.
// ─────────────────────────────────────────────────────────────

import { startScheduler, stopScheduler } from '../modules/scheduler/index';

export default defineNitroPlugin(async (nitroApp) => {
  console.log('[plugin:scheduler] Starting scheduler…');

  try {
    await startScheduler();
    console.log('[plugin:scheduler] Scheduler started successfully.');
  } catch (error) {
    // Don't crash the server if the scheduler fails to start
    // (e.g., no queries in DB yet, or DB not migrated).
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[plugin:scheduler] Failed to start scheduler: ${message}`);
  }

  // Graceful shutdown
  nitroApp.hooks.hook('close', () => {
    console.log('[plugin:scheduler] Stopping scheduler…');
    stopScheduler();
    console.log('[plugin:scheduler] Scheduler stopped.');
  });
});
