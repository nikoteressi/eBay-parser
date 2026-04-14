import { useGracefulShutdown } from '../database/index';
import { createLogger } from '../utils/logger';

const log = createLogger('plugin:database');

export default defineNitroPlugin((nitroApp) => {
  useGracefulShutdown(nitroApp);
  log.info('Graceful shutdown hook registered.');
});
