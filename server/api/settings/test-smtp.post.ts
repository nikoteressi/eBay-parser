import { testSmtpConnection, sendEmail } from '../../modules/notifier/index';
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
  const host = readSetting('smtp.host');
  const port = readSetting('smtp.port');
  const username = readSetting('smtp.username');
  const password = readSetting('smtp.password');
  const useTls = readSetting('smtp.use_tls');
  const from = readSetting('smtp.from') || 'system@ebay-tracker.local';
  const to = readSetting('smtp.to') || 'admin@example.com';
  
  if (!host || !port || !username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Incomplete SMTP settings in DB' });
  }

  const smtpConfig = {
    host,
    port: parseInt(port, 10) || 587,
    username,
    password,
    useTls: useTls === 'true',
    from,
    to
  };

  const testResult = await testSmtpConnection(smtpConfig);

  if (!testResult.success) {
    throw createError({ statusCode: 500, statusMessage: `SMTP connection failed: ${testResult.error}` });
  }

  // Actually send a real test email
  await sendEmail(smtpConfig, {
    queryLabel: 'System Test',
    queryKeywords: 'test',
    newItems: [
      {
        id: 'test-1',
        ebayItemId: 'test-ebay-1',
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
  });

  return { success: true };
});
