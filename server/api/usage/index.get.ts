import { getUsage } from '../../modules/api-budget/index';
import { createLogger } from '../../utils/logger';

const log = createLogger('api:usage');

export default defineEventHandler(() => {
  try {
    return getUsage();
  } catch (err) {
    log.error(`Failed to read API usage: ${err}`);
    return {
      callsMade: 0,
      dailyLimit: 5000,
      percentUsed: 0,
      status: 'normal' as const,
    };
  }
});
