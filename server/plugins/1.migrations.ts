import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from '../database/index';
import { join } from 'node:path';

export default defineNitroPlugin(() => {
  console.log('[database] Running Drizzle migrations...');
  
  try {
    // process.cwd() is the project root in dev, and /app in Docker.
    // The Dockerfile has been updated to explicitly copy this directory.
    const migrationsFolder = join(process.cwd(), 'server', 'database', 'migrations');
    
    migrate(db, { migrationsFolder });
    console.log('[database] Migrations applied successfully.');
  } catch (err) {
    console.error('[database] Migration error:', err);
  }
});
