// ─────────────────────────────────────────────────────────────
// Scheduler — Global Polling Queue
//
// Orchestrates all poll cycles with bounded concurrency (max 2).
// Uses a FIFO in-memory queue with per-query deduplication.
//
// Public API:
//   startScheduler()  — init queue, load queries, register crons
//   stopScheduler()   — destroy crons, drain queue
//   registerQuery()   — add a new cron job
//   unregisterQuery() — remove cron + dequeue
//   updateQueryInterval() — reschedule with new interval
//   forcePoll()       — bypass cron, enqueue immediately
//
// See ARCHITECTURE.md §6.2 for full design.
// ─────────────────────────────────────────────────────────────

import { eq } from 'drizzle-orm';
import { db } from '../../database/index';
import { trackedQueries } from '../../database/schema';
import { CronManager } from './cron-manager';
import { runPoll, type PollResult } from './poll-worker';
import { createLogger } from '../../utils/logger';

const log = createLogger('scheduler');

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

/** Maximum concurrent poll jobs */
const MAX_CONCURRENCY = 2;

/** Delay between initial enqueues on boot (ms) — prevents thundering herd */
const BOOT_STAGGER_MS = 2_000;

// ─────────────────────────────────────────────────────────────
// Global Polling Queue State
// ─────────────────────────────────────────────────────────────

/** Per-query state for deduplication */
type QueryQueueState = 'queued' | 'running';

/** The FIFO queue of query IDs waiting to be polled */
let pollQueue: string[] = [];

/** Tracks which queries are currently queued or running */
const queryStates = new Map<string, QueryQueueState>();

/** Number of concurrently running poll jobs */
let runningCount = 0;

/** The CronManager instance (created on startScheduler) */
let cronManager: CronManager | null = null;

/** Whether the scheduler is currently active */
let isRunning = false;

// ─────────────────────────────────────────────────────────────
// Queue Processing
// ─────────────────────────────────────────────────────────────

/**
 * Enqueues a query for polling. If the query is already queued
 * or running, the request is silently deduplicated.
 */
function enqueue(queryId: string): void {
  if (!isRunning) {
    log.debug(`Scheduler not running — ignoring enqueue for ${queryId}`);
    return;
  }

  const currentState = queryStates.get(queryId);
  if (currentState) {
    log.debug(
      `Query ${queryId} already ${currentState} — deduplicating`,
    );
    return;
  }

  queryStates.set(queryId, 'queued');
  pollQueue.push(queryId);
  log.debug(`Enqueued query ${queryId} (queue size: ${pollQueue.length})`);

  // Trigger processing (non-blocking)
  processQueue();
}

/**
 * Processes the queue: dequeues jobs up to MAX_CONCURRENCY
 * and executes them. Recursively drains the queue.
 */
function processQueue(): void {
  while (runningCount < MAX_CONCURRENCY && pollQueue.length > 0) {
    const queryId = pollQueue.shift()!;

    // Safety: verify it's still in queued state (may have been removed)
    if (queryStates.get(queryId) !== 'queued') {
      continue;
    }

    queryStates.set(queryId, 'running');
    runningCount++;

    log.debug(
      `Starting poll for ${queryId} (running: ${runningCount}/${MAX_CONCURRENCY}, queued: ${pollQueue.length})`,
    );

    // Execute poll (async — don't await, let the queue keep draining)
    executePoll(queryId);
  }
}

/**
 * Executes a poll and handles cleanup when it completes.
 */
async function executePoll(queryId: string): Promise<void> {
  try {
    const result: PollResult = await runPoll(queryId);

    if (result.status === 'error') {
      log.warn(`Poll for ${queryId} completed with error: ${result.error}`);
    }
  } catch (error) {
    // runPoll should catch its own errors, but this is a safety net
    const message = error instanceof Error ? error.message : String(error);
    log.error(`Unexpected error polling ${queryId}: ${message}`);
  } finally {
    // Release slot
    queryStates.delete(queryId);
    runningCount--;

    log.debug(
      `Poll slot released for ${queryId} (running: ${runningCount}/${MAX_CONCURRENCY}, queued: ${pollQueue.length})`,
    );

    // Process next job in queue
    processQueue();
  }
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Initializes and starts the scheduler.
 *
 * 1. Creates the CronManager.
 * 2. Loads all active (non-paused) queries from the database.
 * 3. Registers a cron job for each.
 * 4. Staggers initial enqueues by BOOT_STAGGER_MS to prevent thundering herd.
 */
export async function startScheduler(): Promise<void> {
  if (isRunning) {
    log.warn('Scheduler already running — ignoring startScheduler()');
    return;
  }

  log.info('Starting scheduler…');

  // Initialize queue state
  pollQueue = [];
  queryStates.clear();
  runningCount = 0;
  isRunning = true;

  // Create the cron manager — its onTick callback enqueues into our queue
  cronManager = new CronManager((queryId) => enqueue(queryId));

  // Load all active queries
  const activeQueries = db
    .select({
      id: trackedQueries.id,
      pollingInterval: trackedQueries.pollingInterval,
    })
    .from(trackedQueries)
    .where(eq(trackedQueries.isPaused, false))
    .all();

  log.info(`Found ${activeQueries.length} active queries to schedule`);

  // Register cron jobs and stagger initial polls
  for (let i = 0; i < activeQueries.length; i++) {
    const query = activeQueries[i]!;
    cronManager.register(query.id, query.pollingInterval);

    // Stagger initial poll enqueues
    if (i > 0) {
      await sleep(BOOT_STAGGER_MS);
    }
    enqueue(query.id);
  }

  log.info(
    `Scheduler started: ${cronManager.size} cron jobs registered, ` +
      `${pollQueue.length} queries in initial queue`,
  );
}

/**
 * Stops the scheduler gracefully.
 * Destroys all cron jobs and clears the queue.
 * Currently running polls will complete but no new ones will start.
 */
export function stopScheduler(): void {
  if (!isRunning) {
    log.warn('Scheduler not running — ignoring stopScheduler()');
    return;
  }

  log.info('Stopping scheduler…');

  isRunning = false;

  // Destroy all cron jobs
  cronManager?.destroyAll();
  cronManager = null;

  // Clear the queue (running jobs will finish naturally)
  const drainedCount = pollQueue.length;
  pollQueue = [];
  queryStates.clear();

  log.info(
    `Scheduler stopped: drained ${drainedCount} queued jobs, ` +
      `${runningCount} jobs still running (will complete)`,
  );
}

/**
 * Registers a new query with the scheduler.
 * Called when a user creates a new tracked query.
 */
export function registerQuery(queryId: string, interval: string): void {
  if (!cronManager) {
    if (process.env.DISABLE_SCHEDULER !== '1') {
      log.warn('Scheduler not initialized — cannot register query');
    }
    return;
  }

  cronManager.register(queryId, interval);

  // Immediately enqueue the first poll
  enqueue(queryId);
}

/**
 * Unregisters a query from the scheduler.
 * Called when a user deletes or pauses a query.
 * Also removes the query from the pending queue if queued.
 */
export function unregisterQuery(queryId: string): void {
  if (!cronManager) return;

  cronManager.unregister(queryId);

  // Remove from queue if present
  const queueIdx = pollQueue.indexOf(queryId);
  if (queueIdx !== -1) {
    pollQueue.splice(queueIdx, 1);
  }
  queryStates.delete(queryId);

  log.info(`Query ${queryId} fully unregistered from scheduler`);
}

/**
 * Updates the polling interval for a query.
 * Called when a user changes the interval setting.
 */
export function updateQueryInterval(queryId: string, newInterval: string): void {
  if (!cronManager) return;

  cronManager.updateInterval(queryId, newInterval);
  log.info(`Updated interval for query ${queryId} → ${newInterval}`);
}

/**
 * Forces an immediate poll for a query, bypassing the cron schedule.
 * Called from the "Force Poll" UI button.
 */
export function forcePoll(queryId: string): void {
  if (!isRunning) {
    log.warn('Scheduler not running — cannot force poll');
    return;
  }

  log.info(`Force poll requested for query ${queryId}`);
  enqueue(queryId);
}

/**
 * Returns the current scheduler status for diagnostics.
 */
export function getSchedulerStatus(): {
  isRunning: boolean;
  queueLength: number;
  runningJobs: number;
  maxConcurrency: number;
  registeredCrons: number;
} {
  return {
    isRunning,
    queueLength: pollQueue.length,
    runningJobs: runningCount,
    maxConcurrency: MAX_CONCURRENCY,
    registeredCrons: cronManager?.size ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
