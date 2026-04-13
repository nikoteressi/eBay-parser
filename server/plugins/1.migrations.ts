import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from '../database/index';
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export default defineNitroPlugin(async () => {
  console.log('[database] Running Drizzle migrations...');
  
  try {
    let migrationsFolder: string;
    const localDir = join(process.cwd(), 'server', 'database', 'migrations');
    
    // Use local folder in development or if it physically exists alongside the app
    if (existsSync(localDir)) {
      migrationsFolder = localDir;
    } else {
      // In bundled production mode, Drizzle requires a physical path,
      // but Nitro bundles assets into a virtual file system (unstorage).
      // We extract them to a physical folder on boot.
      migrationsFolder = join(process.cwd(), '.data', 'migrations');
      
      if (!existsSync(migrationsFolder)) {
        await mkdir(migrationsFolder, { recursive: true });
      }

      const storage = useStorage('assets:server');
      const keys = await storage.getKeys('migrations');
      
      for (const key of keys) {
        // getItemRaw retrieves the content without auto-parsing JSON
        const content = await storage.getItemRaw(key);
        if (!content) continue;
        
        // key format: 'migrations:meta:_journal.json' -> 'meta/_journal.json'
        const relativePath = key.replace('migrations:', '').replace(/:/g, '/');
        const outPath = join(migrationsFolder, relativePath);
        
        // Ensure parent directories exist
        const outDir = join(outPath, '..');
        if (!existsSync(outDir)) {
          await mkdir(outDir, { recursive: true });
        }
        
        // We ensure content is stringified (fallback if unstorage auto-parses despite getItemRaw)
        const fileContent = typeof content === 'object' 
          ? JSON.stringify(content, null, 2) 
          : String(content);

        await writeFile(outPath, fileContent, 'utf-8');
      }
    }

    migrate(db, { migrationsFolder });
    console.log('[database] Migrations applied successfully.');
  } catch (err) {
    console.error('[database] Migration error:', err);
  }
});
