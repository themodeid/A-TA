// ======================================================
// 🧾 SERVER.TS — SISTEM PENGGAJIAN GURU & KARYAWAN PSKD
// ======================================================

import express from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { Server } from "http";
import { env } from "./config/env";
import { pool } from "./config/database";
import { AppError, globalErrorHandler } from "./utils/error";
import apiRouter from "./routes";

// ======================================================
// ⚙️ EXPRESS APP
// ======================================================
const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(morgan("dev"));
app.use(express.json({ limit: env.jsonBodyLimit }));

app.use(
  rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMax,
  }),
);

// ======================================================
// 🎯 ROUTES
// ======================================================

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok, server penggajian menyala" });
});

app.use("/api", apiRouter);

// ======================================================
// 🧯 NOT FOUND + ERROR HANDLER
// ======================================================
app.use((_req, _res, next) => {
  next(new AppError("Route tidak ditemukan", 404));
});

app.use(globalErrorHandler);

// ======================================================
// 🚀 START SERVER
// ======================================================
let server: Server;

async function waitUntilReady<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = env.startupRetries,
  delayMs = env.startupDelayMs,
): Promise<T> {
  let lastError: unknown;

  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.log(`⏳ ${label} belum siap (${i}/${attempts})...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

async function startServer() {
  try {
    await waitUntilReady("Database", async () => {
      await pool.query("SELECT 1");
    });
    console.log("✅ Database PostgreSQL terkoneksi");

    server = app.listen(env.port, "0.0.0.0", () => {
      console.log(
        `🚀 Server berjalan di http://${env.publicHost}:${env.port}/api`,
      );
    });
  } catch (err) {
    console.error("❌ Gagal memulai server:", err);
    process.exit(1);
  }
}

// ======================================================
// 🛑 GRACEFUL SHUTDOWN
// ======================================================
async function handleShutdown(signal: string) {
  console.log(`\n🛑 Menerima ${signal}. Memulai graceful shutdown...`);

  const forceExitTimeout = setTimeout(() => {
    console.error("💥 Dipaksa keluar karena graceful shutdown timeout.");
    process.exit(1);
  }, 10000);

  try {
    if (server) {
      console.log("⏳ Menutup HTTP server...");
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      console.log("✅ HTTP server ditutup.");
    }

    console.log("⏳ Menutup Database pool...");
    await pool.end();
    console.log("✅ Database pool ditutup.");

    console.log("🎉 Graceful shutdown selesai. Bye!");
    clearTimeout(forceExitTimeout);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error saat graceful shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

startServer();
