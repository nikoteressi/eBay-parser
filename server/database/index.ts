import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { join } from 'node:path';
import * as schema from './schema';

// ─────────────────────────────────────────────────────────────
// Database path — defaults to data/ebay-tracker.db at project root
// ─────────────────────────────────────────────────────────────
const DB_PATH = process.env.DATABASE_PATH
  ?? join(process.cwd(), 'data', 'ebay-tracker.db');

// Ensure the data directory exists
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
mkdirSync(dirname(DB_PATH), { recursive: true });

// ─────────────────────────────────────────────────────────────
// Create the raw better-sqlite3 connection
// ─────────────────────────────────────────────────────────────
const sqlite = new Database(DB_PATH);

// ─────────────────────────────────────────────────────────────
// Critical PRAGMAs — MUST be set immediately after opening
// See ARCHITECTURE.md §4.1 for rationale
// ─────────────────────────────────────────────────────────────
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('foreign_keys = ON');

// ─────────────────────────────────────────────────────────────
// Drizzle ORM instance — typed with the full schema
// ─────────────────────────────────────────────────────────────
export const db = drizzle(sqlite, { schema });

// Export the raw sqlite instance for edge cases (e.g., graceful shutdown)
export const sqliteDb = sqlite;

// ─────────────────────────────────────────────────────────────
// Graceful shutdown hook
// Closes the SQLite connection when the Nuxt/Nitro server stops.
// This prevents file locks from lingering during HMR in development
// and ensures WAL checkpointing on production shutdown.
// ─────────────────────────────────────────────────────────────
import type { NitroApp } from 'nitropack';
import { createLogger } from '../utils/logger';

const log = createLogger('database');

export function useGracefulShutdown(nitroApp: NitroApp) {
  nitroApp.hooks.hook('close', () => {
    log.info('Closing SQLite connection…');
    sqlite.close();
    log.info('SQLite connection closed.');
  });
}
