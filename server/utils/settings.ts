// ─────────────────────────────────────────────────────────────
// Settings Reader Utility
//
// Centralises the readSetting pattern used across API routes
// and server modules: read a key from the settings table and
// decrypt it transparently if it is a secret.
// ─────────────────────────────────────────────────────────────

import { eq } from 'drizzle-orm';
import { db } from '../database/index';
import { settings } from '../database/schema';
import { decrypt, isEncrypted } from './encryption';
import { createLogger } from './logger';

const log = createLogger('settings');

/**
 * Reads a setting value from the settings table.
 * Decrypts the value transparently when the row is marked as a secret.
 *
 * Returns `undefined` when the key does not exist or decryption fails.
 */
export function readSetting(key: string): string | undefined {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  if (!row) return undefined;

  if (row.isSecret && isEncrypted(row.value)) {
    try {
      return decrypt(row.value);
    } catch {
      log.error(`Failed to decrypt "${key}" — re-save this setting via the UI`);
      return undefined;
    }
  }

  return row.value;
}
