import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from '../database/index';
import { join } from 'node:path';
import { createLogger } from '../utils/logger';

const log = createLogger('plugin:migrations');

export default defineNitroPlugin(() => {
  log.info('Running Drizzle migrations...');

  try {
    // process.cwd() is the project root in dev, and /app in Docker.
    // The Dockerfile has been updated to explicitly copy this directory.
    const migrationsFolder = join(process.cwd(), 'server', 'database', 'migrations');

    migrate(db, { migrationsFolder });
    log.info('Migrations applied successfully.');
  } catch (err) {
    log.error(`Migration error: ${err}`);
  }
});
