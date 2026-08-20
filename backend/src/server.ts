import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { startScheduler, stopScheduler } from './services/schedulerService.js';
import { autoSeed } from './seed/autoSeed.js';
import { initRealtime } from './services/realtimeService.js';

async function main() {
  const dbInfo = await connectDatabase();
  // Auto-seed when using in-memory MongoDB so doctors & demo accounts exist
  if (dbInfo.instanceName === 'in-memory-mongodb') {
    await autoSeed();
  }
  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info('MedAssist+ API listening on port ' + env.port + ' (' + env.nodeEnv + ')');
  });
  initRealtime(server);
  startScheduler(30);

  const shutdown = async (signal: string) => {
    logger.info('Received ' + signal + ' - shutting down gracefully');
    stopScheduler();
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 8000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Fatal startup error', err);
  process.exit(1);
});
