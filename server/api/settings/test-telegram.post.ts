import { testTelegramConnection } from '../../modules/notifier/index';
import { db } from '../../database/index';
import { settings } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { decrypt, isEncrypted } from '../../utils/encryption';

function readSetting(key: string): string | undefined {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  if (!row) return undefined;
  if (row.isSecret && isEncrypted(row.value)) {
    try {
      return decrypt(row.value);
    } catch {
      console.error(`[readSetting] Failed to decrypt "${key}" — re-save this setting`);
      return undefined;
    }
  }
  return row.value;
}

export default defineEventHandler(async () => {
  const botToken = readSetting('telegram.bot_token');
  const chatId = readSetting('telegram.chat_id');
  
  if (!botToken || !chatId) {
    throw createError({ statusCode: 400, statusMessage: 'Incomplete Telegram settings in DB' });
  }

  const success = await testTelegramConnection({ botToken, chatId });

  if (!success) {
    throw createError({ statusCode: 500, statusMessage: 'Telegram connection failed' });
  }

  return { success: true };
});
