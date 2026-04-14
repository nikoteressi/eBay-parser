// ─────────────────────────────────────────────────────────────
// Scheduler Nitro Plugin
//
// Starts the global polling scheduler when the Nuxt server boots.
// Registers a shutdown hook to stop it gracefully.
//
// See ARCHITECTURE.md §6.2 — "Server Boot" flow.
// ─────────────────────────────────────────────────────────────

import { startScheduler, stopScheduler } from '../modules/scheduler/index';
import { createLogger } from '../utils/logger';

const log = createLogger('plugin:scheduler');

export default defineNitroPlugin(async (nitroApp) => {
  log.info('Starting scheduler…');

  try {
    await startScheduler();
    log.info('Scheduler started successfully.');
  } catch (error) {
    // Don't crash the server if the scheduler fails to start
    // (e.g., no queries in DB yet, or DB not migrated).
    const message = error instanceof Error ? error.message : String(error);
    log.error(`Failed to start scheduler: ${message}`);
  }

  // Graceful shutdown
  nitroApp.hooks.hook('close', () => {
    log.info('Stopping scheduler…');
    stopScheduler();
    log.info('Scheduler stopped.');
  });
});
