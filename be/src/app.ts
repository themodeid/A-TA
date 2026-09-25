import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from "path";
import { pool } from "./config/database";
import { runMigrations } from "./database/migrationRunner";
import routes from "./routes/index";
import { errorHandler } from "./middlewares/errorHandler";
import { ENV } from "./config/env";

export const app = express();

// ======================================================
// 🛠️ MIDDLEWARES KEAMANAN & UTILITAS
// ======================================================

// 0. Disable X-Powered-By header & Gunakan Helmet untuk HTTP Security Headers
app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// 1. Cookie Parser
app.use(cookieParser());

// 2. Healthcheck (Ditempatkan sebelum rate limiter agar docker healthcheck tidak memakan kuota)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

// 3. Global Rate Limiter untuk mencegah DoS / Spam request
const globalApiLimiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  max: ENV.NODE_ENV === "development" ? 10000 : (ENV.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health" || req.path === "/health",
  message: {
    status: "fail",
    message:
      "Terlalu banyak permintaan ke server dari IP ini, silakan coba beberapa saat lagi.",
    statusCode: 429,
  },
});
app.use("/api", globalApiLimiter);


// 3. CORS Configuration (Diperbaiki agar dynamic origin & preflight lulus)
const allowedOrigins = ENV.CORS_ORIGIN
  ? ENV.CORS_ORIGIN.split(",").map((o) => o.trim())
  : [
      "http://localhost:3000",
      "http://localhost:3041",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3041",
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (seperti SSR/Postman/Mobile)
      if (!origin) return callback(null, true);

      // Izinkan jika terdaftar
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Izinkan localhost dan 127.0.0.1 pada mode development
      if (
        ENV.NODE_ENV === "development" &&
        (origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:"))
      ) {
        return callback(null, true);
      }

      callback(new Error(`Blocked by CORS: ${origin} is not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

app.use(morgan("dev"));

app.use(
  express.urlencoded({ extended: true, limit: ENV.JSON_BODY_LIMIT || "5mb" }),
);
app.use(express.json({ limit: ENV.JSON_BODY_LIMIT || "5mb" }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Syntax Error Handler (JSON Invalid)
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({
        status: "error",
        message: "Invalid JSON format",
        statusCode: 400,
      });
    }
    next(err);
  },
);

// ======================================================
// 🛣️ ROUTES & HANDLERS

// ======================================================

app.use("/api", routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: `Route ${req.method} ${req.path} tidak ditemukan`,
    statusCode: 404,
  });
});

// Centralized error handler (Must be last)
app.use(errorHandler);

// ======================================================
// 🚀 SERVER STARTUP LOGIC
// ======================================================
async function startServer(): Promise<void> {
  console.log("===================================");
  console.log("🔄 Starting server...");

  try {
    // TEST DB CONNECTION
    await pool.query("SELECT 1");
    console.log("✅ Database connected successfully");

    // RUN MIGRATIONS
    console.log("🔄 Running database migrations...");
    await runMigrations();
    console.log("✅ Migrations completed successfully");

    // START HTTP SERVER
    app.listen(ENV.PORT, "0.0.0.0", () => {
      console.log("===================================");
      console.log("🚀 Server is up and running");
      console.log(`🌐 Base URL : http://localhost:${ENV.PORT}/api`);
      console.log(`🕒 Time     : ${new Date().toLocaleString()}`);
      console.log("===================================");
    });
  } catch (error) {
    console.error("===================================");
    console.error("❌ Server failed to start");
    console.error("📛 Reason:", error);
    console.error("===================================");

    process.exit(1);
  }
}

startServer();
