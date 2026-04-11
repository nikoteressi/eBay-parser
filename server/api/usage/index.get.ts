import { getUsage } from '../../modules/api-budget/index';

export default defineEventHandler(() => {
  try {
    const status = getUsage();
    return status;
  } catch (err) {
    return {
      callsMade: 0,
      dailyLimit: 5000,
      percentUsed: 0,
      status: 'good'
    };
  }
});
