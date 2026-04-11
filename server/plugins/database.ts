import { useGracefulShutdown } from '../database/index';

export default defineNitroPlugin((nitroApp) => {
  useGracefulShutdown(nitroApp);
  console.log('[plugin:database] Graceful shutdown hook registered.');
});
