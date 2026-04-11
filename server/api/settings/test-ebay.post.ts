import { getEbayClient, resetClient } from '../../modules/ebay-client/index';
import { db } from '../../database/index';
import { settings } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { decrypt, isEncrypted } from '../../utils/encryption';

function readSetting(key: string): string | undefined {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  if (!row) return undefined;
  if (row.isSecret && isEncrypted(row.value)) return decrypt(row.value);
  return row.value;
}

export default defineEventHandler(async () => {
  const appId = readSetting('ebay.app_id');
  const clientSecret = readSetting('ebay.client_secret');
  const marketplace = readSetting('ebay.marketplace') || 'EBAY_US';
  
  if (!appId || !clientSecret) {
    throw createError({ statusCode: 400, statusMessage: 'Incomplete eBay settings in DB' });
  }

  // Force reset first just in case
  resetClient();
  
  const client = getEbayClient({
    credentials: { clientId: appId, clientSecret: clientSecret },
    marketplace,
    environment: 'production'
  });

  try {
    await client.authenticate();
    return { success: true };
  } catch (err) {
    throw createError({ statusCode: 500, statusMessage: err instanceof Error ? err.message : 'eBay authentication failed' });
  }
});
