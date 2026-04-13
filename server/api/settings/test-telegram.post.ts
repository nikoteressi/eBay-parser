import { testTelegramConnection, sendTelegram } from '../../modules/notifier/index';
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

  const chatIds = chatId.split(',').map(id => id.trim()).filter(Boolean);
  
  if (chatIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No valid Chat IDs provided' });
  }

  for (const cid of chatIds) {
    const testResult = await testTelegramConnection({ botToken, chatId: cid });

    if (!testResult.success) {
      throw createError({ statusCode: 400, statusMessage: `Telegram connection failed for Chat ID ${cid}: ${testResult.error || 'Unknown error'}` });
    }
  }

  try {
    await sendTelegram(
      { botToken, chatId },
      {
        queryLabel: 'System Test',
        queryKeywords: 'test',
        newItems: [
          {
            id: 'test-1',
            ebayItemId: 'test-1',
            title: 'Test Notification Working',
            price: 99.99,
            shippingCost: 0,
            totalCost: 99.99,
            currency: 'USD',
            itemUrl: 'https://ebay.com',
            buyingOption: 'FIXED_PRICE',
            imageUrl: null,
            acceptsOffers: false
          }
        ],
        priceDrops: []
      }
    );
  } catch (error) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: `Failed to send Telegram message: ${error instanceof Error ? error.message : String(error)}` 
    });
  }

  return { success: true };
});
