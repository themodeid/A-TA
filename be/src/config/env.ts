import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config();

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Environment variable ${name} is required. Copy .env.example to .env and set it.`,
    );
  }
  return value;
}

function requiredInt(name: string): number {
  const value = Number(required(name));
  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${name} must be a valid number.`);
  }
  return value;
}

export const env = {
  nodeEnv: required("NODE_ENV"),
  port: requiredInt("PORT"),
  publicHost: required("APP_PUBLIC_HOST"),
  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL"),
  corsOrigin: required("CORS_ORIGIN"),
  jsonBodyLimit: required("JSON_BODY_LIMIT"),
  startupRetries: requiredInt("STARTUP_RETRIES"),
  startupDelayMs: requiredInt("STARTUP_DELAY_MS"),
  rateLimitWindowMs: requiredInt("RATE_LIMIT_WINDOW_MS"),
  rateLimitMax: requiredInt("RATE_LIMIT_MAX"),
  dbWaitAttempts: requiredInt("DB_WAIT_ATTEMPTS"),
} as const;
