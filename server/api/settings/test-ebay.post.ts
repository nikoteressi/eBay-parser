import { getEbayClient, resetClient } from '../../modules/ebay-client/index';
import { readSetting } from '../../utils/settings';

export default defineEventHandler(async () => {
  const appId = readSetting('ebay.app_id');
  const clientSecret = readSetting('ebay.client_secret');
  const marketplace = readSetting('ebay.marketplace') ?? 'EBAY_US';

  if (!appId || !clientSecret) {
    throw createError({ statusCode: 400, statusMessage: 'Incomplete eBay settings in DB' });
  }

  resetClient();

  const client = getEbayClient({
    credentials: { clientId: appId, clientSecret },
    marketplace,
    environment: 'production'
  });

  try {
    await client.authenticate();
    return { success: true };
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: 'eBay authentication failed. Please check your Client ID and Secret.',
    });
  }
});
