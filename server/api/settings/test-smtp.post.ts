import { testSmtpConnection, sendEmail } from '../../modules/notifier/index';
import { readSetting } from '../../utils/settings';

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null);

  const host = body?.host || readSetting('smtp.host');
  const port = body?.port || readSetting('smtp.port');
  const username = body?.username || readSetting('smtp.username');
  const password = body?.password || readSetting('smtp.password');
  let useTls = body?.use_tls;
  if (useTls === undefined) useTls = readSetting('smtp.use_tls') === 'true';
  const from = body?.from || readSetting('smtp.from') || 'system@ebay-tracker.local';
  const to = body?.to || readSetting('smtp.to') || 'admin@example.com';

  if (!host || !port || !username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Incomplete SMTP settings in DB' });
  }

  const smtpConfig = {
    host,
    port: parseInt(String(port), 10) || 587,
    username,
    password,
    useTls: typeof useTls === 'boolean' ? useTls : String(useTls) === 'true',
    from,
    to
  };

  const testResult = await testSmtpConnection(smtpConfig);

  if (!testResult.success) {
    throw createError({ statusCode: 500, statusMessage: `SMTP connection failed: ${testResult.error}` });
  }

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
