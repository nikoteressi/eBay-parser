import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, sqliteDb } from '../database/index';
import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createLogger } from '../utils/logger';

const log = createLogger('plugin:migrations');

/**
 * Ensures every migration file in the folder has a corresponding row in
 * __drizzle_migrations. Drizzle skips a migration only when the latest
 * recorded created_at >= the migration's folderMillis — so any gap in the
 * tracking table (e.g., a migration applied via db:push) will cause Drizzle
 * to re-run earlier migrations and fail on already-existing columns.
 *
 * This reconciler inserts tracking rows for any migration whose SQL has
 * already been fully applied to the schema, based on a column-existence check.
 */
function reconcileMigrationTable(migrationsFolder: string): void {
  // Ensure the tracking table exists (Drizzle creates it on first run, but we
  // may need it before Drizzle's migrate() runs).
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric
    )
  `);

  // Read all migration files sorted by their numeric prefix.
  let files: string[];
  try {
    files = readdirSync(migrationsFolder)
      .filter(f => f.endsWith('.sql'))
      .sort();
  } catch {
    return; // folder missing — let Drizzle handle the error downstream
  }

  // Load the journal to get folderMillis per migration tag.
  let journal: { entries: Array<{ tag: string; when: number }> };
  try {
    journal = JSON.parse(
      readFileSync(join(migrationsFolder, 'meta', '_journal.json'), 'utf-8'),
    );
  } catch {
    return;
  }
  const whenByTag = new Map(journal.entries.map(e => [e.tag, e.when]));

  const existingHashes = new Set(
    sqliteDb
      .prepare('SELECT hash FROM "__drizzle_migrations"')
      .all()
      .map((r: any) => r.hash as string),
  );

  const insert = sqliteDb.prepare(
    'INSERT OR IGNORE INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)',
  );

  for (const file of files) {
    const tag = file.replace('.sql', '');
    const folderMillis = whenByTag.get(tag);
    if (!folderMillis) continue;

    const content = readFileSync(join(migrationsFolder, file), 'utf-8');
    const hash = createHash('sha256').update(content).digest('hex');

    if (!folderMillis || existingHashes.has(hash)) continue; // already tracked

    // Check whether every DDL statement in this migration has already been
    // applied by inspecting the live schema. We use a conservative heuristic:
    // try to run each statement in a savepoint and roll back on success.
    // If all statements would fail with "already exists / duplicate column",
    // we can safely mark this migration as applied without running it.
    const stmts = content
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(Boolean);

    let alreadyApplied = true;
    for (const stmt of stmts) {
      const upper = stmt.toUpperCase();
      // Only check ALTER TABLE ADD COLUMN statements.
      if (!upper.includes('ALTER TABLE') || !upper.includes('ADD ')) {
        // CREATE TABLE IF NOT EXISTS and similar are idempotent; skip check.
        if (!upper.includes('IF NOT EXISTS')) {
          alreadyApplied = false;
          break;
        }
        continue;
      }

      // Extract column name from: ALTER TABLE t ADD [COLUMN] col_name ...
      const match = stmt.match(/ADD\s+(?:COLUMN\s+)?`?(\w+)`?/i);
      if (!match) { alreadyApplied = false; break; }

      const colName = match[1];
      const tableMatch = stmt.match(/ALTER\s+TABLE\s+`?(\w+)`?/i);
      if (!tableMatch) { alreadyApplied = false; break; }

      const tableName = tableMatch[1];
      const cols = sqliteDb
        .prepare(`PRAGMA table_info("${tableName}")`)
        .all()
        .map((c: any) => c.name as string);

      if (!cols.includes(colName)) {
        alreadyApplied = false;
        break;
      }
    }

    if (alreadyApplied) {
      insert.run(hash, folderMillis);
      log.info(`Reconciled migration ${tag} (already applied via schema push).`);
    }
  }
}

export default defineNitroPlugin(() => {
  log.info('Running Drizzle migrations...');

  try {
    const migrationsFolder = join(process.cwd(), 'server', 'database', 'migrations');

    // Back-fill any migrations applied outside of Drizzle's tracker (e.g. via
    // db:push) so the migrator doesn't try to re-run them and hit conflicts.
    reconcileMigrationTable(migrationsFolder);

    migrate(db, { migrationsFolder });
    log.info('Migrations applied successfully.');
  } catch (err) {
    log.error(`Migration error: ${err}`);
  }
});
