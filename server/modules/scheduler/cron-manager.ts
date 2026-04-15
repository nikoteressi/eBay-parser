// ─────────────────────────────────────────────────────────────
// Cron Manager
//
// Manages per-query node-cron jobs. Each active query gets a
// cron job that enqueues into the Global Polling Queue.
//
// See ARCHITECTURE.md §6.2 for design.
// ─────────────────────────────────────────────────────────────

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cron = require('node-cron');
import type { ScheduledTask } from 'node-cron';
import { createLogger } from '../../utils/logger';

const log = createLogger('cron-manager');

// ─────────────────────────────────────────────────────────────
// Polling interval → cron expression mapping
// ─────────────────────────────────────────────────────────────

const INTERVAL_TO_CRON: Record<string, string> = {
  '5m': '*/5 * * * *',
  '15m': '*/15 * * * *',
  '30m': '*/30 * * * *',
  '1h': '0 * * * *',
  '6h': '0 */6 * * *',
};

// ─────────────────────────────────────────────────────────────
// CronManager class
// ─────────────────────────────────────────────────────────────

export class CronManager {
  /** Active cron jobs: queryId → ScheduledTask */
  private readonly jobs = new Map<string, ScheduledTask>();

  /** Callback invoked when a cron fires — enqueues into the poll queue */
  private readonly onTick: (queryId: string) => void;

  constructor(onTick: (queryId: string) => void) {
    this.onTick = onTick;
  }

  /**
   * Registers a cron job for a query.
   * If a job already exists for this queryId, it is destroyed and replaced.
   *
   * @param queryId Tracked query identifier.
   * @param interval Polling interval (e.g. '5m', '15m', '1h').
   */
  register(queryId: string, interval: string): void {
    // Destroy existing job if any
    this.unregister(queryId);

    const cronExpr = INTERVAL_TO_CRON[interval];
    if (!cronExpr) {
      log.error(`Unknown polling interval "${interval}" for query ${queryId}`);
      return;
    }

    const task = cron.schedule(cronExpr, () => {
      log.debug(`Cron triggered for query ${queryId} (interval: ${interval})`);
      this.onTick(queryId);
    });

    this.jobs.set(queryId, task);
    log.info(`Cron registered: query ${queryId} → ${cronExpr} (${interval})`);
  }

  /**
   * Unregisters and destroys the cron job for a query.
   * No-op if no job exists.
   */
  unregister(queryId: string): void {
    const existing = this.jobs.get(queryId);
    if (existing) {
      existing.stop();
      this.jobs.delete(queryId);
      log.info(`Cron unregistered: query ${queryId}`);
    }
  }

  /**
   * Updates the polling interval for an existing query.
   * Equivalent to unregister + register with the new interval.
   */
  updateInterval(queryId: string, newInterval: string): void {
    this.register(queryId, newInterval);
  }

  /**
   * Stops and destroys all cron jobs.
   */
  destroyAll(): void {
    const count = this.jobs.size;
    for (const [queryId, task] of this.jobs) {
      task.stop();
      log.debug(`Cron destroyed: query ${queryId}`);
    }
    this.jobs.clear();
    log.info(`All cron jobs destroyed (${count} total)`);
  }

  /**
   * Returns the number of active cron jobs.
   */
  get size(): number {
    return this.jobs.size;
  }

  /**
   * Checks if a cron job exists for a query.
   */
  has(queryId: string): boolean {
    return this.jobs.has(queryId);
  }
}
