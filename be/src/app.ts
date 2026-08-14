import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { pool } from "./config/database";
import { runMigrations } from "./database/migrationRunner";
import routes from "./routes/index";
import { errorHandler } from "./middlewares/errorHandler";
import { ENV } from "./config/env";

export const app = express();

// ======================================================
// 🛠️ MIDDLEWARES
// ======================================================

// 1. CORS Configuration (Diperbaiki agar dynamic origin & preflight lulus)
const allowedOrigins = ENV.CORS_ORIGIN
  ? ENV.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:3041"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (seperti Postman/Mobile App) atau jika origin terdaftar
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Blocked by CORS: ${origin} is not allowed`));
      }
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

// Healthcheck
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is healthy 1",
    timestamp: new Date().toISOString(),
  });
});

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
    app.listen(ENV.PORT, () => {
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
