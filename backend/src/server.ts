import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { startScheduler, stopScheduler } from './services/schedulerService.js';
import { autoSeed } from './seed/autoSeed.js';
import { initRealtime } from './services/realtimeService.js';

async function main() {
  try {
    // Connect DB
    const dbInfo = await connectDatabase();

    // Auto-seed for in-memory DB
    if (dbInfo.instanceName === 'in-memory-mongodb') {
      await autoSeed();
    }

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(env.port, () => {
      logger.info(
        `MedAssist+ API listening on port ${env.port} (${env.nodeEnv})`
      );
    });

    // Init realtime (socket)
    initRealtime(server);

    // Start scheduler
    startScheduler(30);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal} - shutting down gracefully`);

      stopScheduler();

      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });

      setTimeout(() => process.exit(1), 8000).unref();
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));

  } catch (err) {
    logger.error('Fatal startup error', err);
    process.exit(1);
  }
}

main();