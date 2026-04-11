import { eq } from 'drizzle-orm';
import { db } from '../../database/index';
import { settings as settingsTable } from '../../database/schema';
import { encrypt } from '../../utils/encryption';

const SECRET_KEYS = new Set([
  'ebay.client_secret',
  'smtp.password',
  'telegram.bot_token'
]);

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, string>>(event);
  
  for (const [key, rawValue] of Object.entries(body)) {
    // If the frontend sends a masked value like "••••••••XXXX" or "••••••••", ignore it completely.
    if (rawValue.includes('••••••••')) {
      continue;
    }

    const isSecret = SECRET_KEYS.has(key);
    let valueToStore = rawValue;

    if (isSecret && rawValue.trim().length > 0) {
      valueToStore = encrypt(rawValue);
    }

    // Upsert
    const existing = db.select().from(settingsTable).where(eq(settingsTable.key, key)).get();
    
    if (existing) {
      db.update(settingsTable)
        .set({ value: valueToStore, isSecret, updatedAt: new Date().toISOString() })
        .where(eq(settingsTable.key, key))
        .run();
    } else {
      db.insert(settingsTable)
        .values({ key, value: valueToStore, isSecret })
        .run();
    }
  }

  // Reset the singleton ebay client just in case credentials changed
  import('../../modules/ebay-client/index').then(client => client.resetClient()).catch(() => {});

  return { success: true };
});
