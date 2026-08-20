import dotenv from 'dotenv';
dotenv.config();

function num(value: string | undefined, fallback: number): number {
  const n = value === undefined ? NaN : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

function stripTrailingSlash(url: string): string {
  return url.charAt(url.length - 1) === '/' ? url.slice(0, -1) : url;
}

export const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: num(process.env.PORT, 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'medassist-insecure-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  bcryptRounds: num(process.env.BCRYPT_ROUNDS, 10),
  mongodbUri: (process.env.MONGODB_URI ?? '').trim(),
  dbName: process.env.DB_NAME ?? 'medassist',
  aiServiceUrl: stripTrailingSlash(process.env.AI_SERVICE_URL ?? 'http://127.0.0.1:5001'),
  aiServiceTimeoutMs: num(process.env.AI_SERVICE_TIMEOUT_MS, 8000),
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN ?? '',
  rateLimitWindowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 60000),
  rateLimitMax: num(process.env.RATE_LIMIT_MAX, 100),
  corsOrigins: (process.env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim()),
} as const;