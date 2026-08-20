import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let memoryServer: MongoMemoryServer | null = null;

export interface DbConnectionInfo {
  uri: string;
  instanceName: string;
}

/**
 * Connects to MongoDB Atlas when MONGODB_URI is configured.
 * Otherwise starts an in-memory MongoDB for development/testing.
 */
export async function connectDatabase(): Promise<DbConnectionInfo> {
  let uri = env.mongodbUri;
  let instanceName = 'mongodb-atlas';

  if (!uri) {
    logger.info('MONGODB_URI not set - starting in-memory MongoDB (development/testing)');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri(env.dbName);
    instanceName = 'in-memory-mongodb';
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { dbName: env.dbName, serverSelectionTimeoutMS: 15000 });
  logger.info('MongoDB connected (' + instanceName + ')');
  return { uri, instanceName };
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}