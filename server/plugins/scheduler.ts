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
import { syncBudgetWithEbay } from '../modules/api-budget/index';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const cron = require('node-cron');

const log = createLogger('plugin:scheduler');

export default defineNitroPlugin(async (nitroApp) => {
  if (process.env.DISABLE_SCHEDULER === '1') {
    log.info('DISABLE_SCHEDULER=1 — skipping scheduler and budget-sync cron.');
    return;
  }

  log.info('Starting scheduler…');

  // Trigger an initial boot-time sync (non-blocking)
  setTimeout(() => {
    log.info('Running initial boot-time API budget sync...');
    syncBudgetWithEbay().catch(err => {
      log.error(`Boot-time budget sync failed: ${err.message || err}`);
    });
  }, 5000);

  // Register the 1-hour recurring cron
  const budgetSyncCron = cron.schedule('0 * * * *', () => {
    log.info('Running scheduled API budget sync...');
    syncBudgetWithEbay().catch(err => {
      log.error(`Scheduled budget sync failed: ${err.message || err}`);
    });
  });

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
    budgetSyncCron.stop();
    stopScheduler();
    log.info('Scheduler stopped.');
  });
});
