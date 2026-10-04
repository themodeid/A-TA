import dotenv from "dotenv";
import path from "path";

// Memastikan file .env dibaca dengan aman dari root project
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config();

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `❌ Environment variable ${name} is required. Copy .env.example to .env and set it.`,
    );
  }
  return value;
}

function requiredInt(name: string): number {
  const value = Number(required(name));
  if (!Number.isFinite(value)) {
    throw new Error(`❌ Environment variable ${name} must be a valid number.`);
  }
  return value;
}

function requiredOptionalInt(name: string, defaultValue: number): number {
  const value = process.env[name]?.trim();
  if (!value) {
    return defaultValue;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`❌ Environment variable ${name} must be a valid number.`);
  }
  return num;
}

function requiredSecret(name: string, minLength: number = 32): string {
  const value = required(name);
  if (value.length < minLength) {
    throw new Error(
      `❌ Environment variable ${name} must be at least ${minLength} characters long for production security. Current length: ${value.length}.`,
    );
  }
  return value;
}

// Diekspor dengan nama ENV (Kapital) agar konsisten
export const ENV = {
  NODE_ENV: required("NODE_ENV"),
  PORT: requiredInt("PORT"),
  APP_PUBLIC_HOST: required("APP_PUBLIC_HOST"),
  DATABASE_URL: required("DATABASE_URL"),
  CORS_ORIGIN: required("CORS_ORIGIN"),
  JSON_BODY_LIMIT: required("JSON_BODY_LIMIT"),
  STARTUP_RETRIES: requiredInt("STARTUP_RETRIES"),
  STARTUP_DELAY_MS: requiredInt("STARTUP_DELAY_MS"),
  RATE_LIMIT_WINDOW_MS: requiredOptionalInt(
    "RATE_LIMIT_WINDOW_MS",
    15 * 60 * 1000,
  ),
  RATE_LIMIT_MAX: requiredOptionalInt("RATE_LIMIT_MAX", 100),
  DB_WAIT_ATTEMPTS: requiredInt("DB_WAIT_ATTEMPTS"),
  JWT_SECRET: requiredSecret("JWT_SECRET", 32),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN?.trim() || "1d",
} as const;
