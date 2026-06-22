// ======================================================
// 🔥 SERVER.TS — CRUD + REDIS CACHE (CLEAN PRODUCTION)
// ======================================================

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { Pool } from "pg";
import { RedisClientType, createClient } from "redis";
import { Server } from "http";
import { env } from "./config/env";
import { GoogleGenAI, Type } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const crudTools = {
  functionDeclarations: [
    {
      name: "buatKontak Baru",
      description: "Membuat kontak baru ke dalam sistem.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          nama: { type: Type.STRING, description: "Nama lengkap kontak" },
          umur: { type: Type.NUMBER, description: "Umur dalam angka" },
          hobi: { type: Type.STRING, description: "Hobi kontak jika ada" },
        },
        required: ["nama"],
      },
    },
    {
      name: "bacaSemuaKontak",
      description: "Mengambil data seluruh kontak yang ada di database.",
      parameters: { type: Type.OBJECT, properties: {} },
    },
    {
      name: "analisisHobiKontak",
      description: "Menganalisis tren hobi atau pola dari seluruh data kontak.",
      parameters: { type: Type.OBJECT, properties: {} },
    },
  ],
};

const pool = new Pool({
  connectionString: env.databaseUrl,
});

// ================= REDIS =================
const redisClient: RedisClientType = createClient({
  url: env.redisUrl,
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});

async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("✅ Redis Connected");
  }
}

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
// 🧠 ERROR CLASS
// ======================================================
class AppError extends Error {
  statusCode: number;
  status: "fail" | "error";

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
    Error.captureStackTrace(this, this.constructor);
  }
}

// ======================================================
// 🧯 ERROR HANDLER
// ======================================================
const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (!(err instanceof AppError)) {
    console.error("💥 CRITICAL UNHANDLED ERROR:", err);
  }

  const error =
    err instanceof AppError ? err : new AppError("Internal Server Error", 500);

  res.status(error.statusCode).json({
    status: error.status,
    message: error.message,
  });
};

// ======================================================
// 🧰 UTILS
// ======================================================
type AsyncFn = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

const catchAsync =
  (fn: AsyncFn) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// ======================================================
// 🧪 ZOD SCHEMA
// ======================================================
const kontakCreateSchema = z.object({
  nama: z.string().min(1).max(100),
  umur: z.number().int().min(0).max(100).optional(),
  hobi: z.string().max(100).optional(),
});

const kontakUpdateSchema = z.object({
  nama: z.string().min(1).optional(),
  umur: z.number().int().min(0).optional(),
  hobi: z.string().max(100).optional(),
});

// ======================================================
// 🧩 VALIDATOR
// ======================================================
const validateBody =
  (schema: z.ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.issues[0].message, 400));
    }
    req.body = parsed.data;
    next();
  };

// ======================================================
// 🎯 ROUTES
// ======================================================

// HEALTH
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok template menyala" });
});

app.post(
  "/api/chat",
  catchAsync(async (req, res) => {
    const { message } = req.body; // Pesan dari user
    if (!message) throw new AppError("Pesan tidak boleh kosong", 400);

    // 1. Kirim pesan ke Gemini beserta definisi tools yang tersedia
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        tools: [crudTools],
      },
    });

    const functionCalls = response.functionCalls;

    // 2. Jika AI memutuskan untuk memanggil fungsi (Auto CRUD / Analisis)
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];

      // --- FITUR 1: AUTO CRUD (CREATE) ---
      if (call.name === "buatKontakBaru") {
        const { nama, umur, hobi } = call.args as any;

        // Eksekusi ke DB (Gunakan query yang sudah aman dari SQL Injection)
        const result = await pool.query(
          `INSERT INTO kontak (nama, umur, hobi) VALUES ($1, $2, $3) RETURNING *`,
          [nama, umur, hobi],
        );

        // Jangan lupa bersihkan cache Redis seperti di endpoint utama!
        const keys = await redisClient.keys("kontak:list:page:*");
        if (keys.length > 0) await redisClient.del(keys);

        return res.json({
          message: `Berhasil menjalankan perintah otomatis.`,
          aiResponse: `Aku sudah menambahkan kontak ${nama} ke database.`,
          data: result.rows[0],
        });
      }

      // --- FITUR 2: ANALISIS DATA ---
      if (call.name === "analisisHobiKontak") {
        // Ambil data asli dari DB untuk dianalisis oleh AI
        const dataKontak = await pool.query(
          `SELECT nama, umur, hobi FROM kontak WHERE status IS DISTINCT FROM 'deleted'`,
        );

        // Kirim balik datanya ke AI untuk meminta kesimpulan/analisis
        const analisaResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Berikut adalah data kontak: ${JSON.stringify(dataKontak.rows)}. Tolong berikan analisis singkat mengenai tren hobi atau pola umur mereka dengan gaya yang santai.`,
        });

        return res.json({
          message: "Analisis berhasil diselesaikan.",
          aiResponse: analisaResponse.text,
        });
      }
    }

    // 3. Jika user cuma sekadar menyapa ("Halo", "Siapa kamu?"), jawab normal
    res.json({
      message: "Chat biasa",
      aiResponse: response.text,
    });
  }),
);

// ================= CREATE =================
app.post(
  "/api/kontak",
  validateBody(kontakCreateSchema),
  catchAsync(async (req, res) => {
    const { nama, umur, hobi } = req.body;

    const result = await pool.query(
      `INSERT INTO kontak (nama, umur, hobi)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nama, umur, hobi],
    );

    const keys = await redisClient.keys("kontak:list:page:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    res.status(201).json({
      message: "kontak berhasil dibuat",
      data: result.rows[0],
    });
  }),
);

// ================= READ ALL (WITH PAGINATION) =================
app.get(
  "/api/kontak",
  catchAsync(async (req, res) => {
    // 1. Ambil query page, default ke halaman 1
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    // 2. Bedakan key cache per halaman! Ini krusial agar data tidak bercampur.
    const key = `kontak:list:page:${page}`;
    const cache = await redisClient.get(key);

    if (cache) {
      console.log(`⚡ Dari redis (Page ${page})`);
      const safeCache = typeof cache === "string" ? cache : cache.toString();
      return res.json({
        source: "redis",
        page,
        data: JSON.parse(safeCache),
      });
    }

    console.log(`🐘 Dari database (Page ${page})`);
    const result = await pool.query(
      `SELECT * FROM kontak 
       WHERE status IS DISTINCT FROM 'deleted' 
       ORDER BY id DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    await redisClient.set(key, JSON.stringify(result.rows), {
      EX: 60, // Cache bertahan 60 detik
    });

    res.json({
      source: "database",
      page,
      data: result.rows,
    });
  }),
);

// ================= READ ONE =================
app.get(
  "/api/kontak/:id",
  catchAsync(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError("ID tidak valid", 400);

    const key = `kontak:${id}`;
    const cache = await redisClient.get(key);

    if (cache) {
      const safeCache = typeof cache === "string" ? cache : cache.toString();
      console.log("⚡ dari redis detail");
      return res.json({
        data: JSON.parse(safeCache),
      });
    }

    console.log("🐘 dari database detail");
    const result = await pool.query(
      `SELECT * FROM kontak 
   WHERE id = $1 AND status IS DISTINCT FROM 'deleted'`,
      [id],
    );

    if (!result.rows[0]) {
      throw new AppError("Data tidak ditemukan atau sudah dinonaktifkan", 404);
    }

    await redisClient.set(key, JSON.stringify(result.rows[0]), {
      EX: 60,
    });

    res.json({ data: result.rows[0] });
  }),
);
// ================= UPDATE =================
app.put(
  "/api/kontak/:id",
  validateBody(kontakUpdateSchema),
  catchAsync(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError("ID tidak valid", 400);

    const fields = req.body;

    if (Object.keys(fields).length === 0) {
      throw new AppError("Tidak ada data yang dikirim untuk diupdate", 400);
    }

    const setFields = [];
    const queryValues = [];
    let placeholderIndex = 1;

    for (const [key, value] of Object.entries(fields)) {
      setFields.push(`${key} = $${placeholderIndex}`);
      queryValues.push(value ?? null);
      placeholderIndex++;
    }

    queryValues.push(id);
    const idPlaceholder = `$${placeholderIndex}`;

    const queryText = `
      UPDATE kontak
      SET ${setFields.join(", ")}
      WHERE id = ${idPlaceholder}
      RETURNING *
    `;

    const result = await pool.query(queryText, queryValues);

    if (!result.rows[0]) {
      throw new AppError("Data tidak ditemukan", 404);
    }

    const updateKeys = await redisClient.keys("kontak:list:page:*");
    if (updateKeys.length > 0) {
      await redisClient.del(updateKeys);
    }
    await redisClient.del(`kontak:${id}`);

    res.json({
      message: "kontak berhasil diupdate",
      data: result.rows[0],
    });
  }),
);

// ================= DELETE =================
app.delete(
  "/api/kontak/:id",
  catchAsync(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError("ID tidak valid", 400);

    // 1. Ubah DELETE menjadi UPDATE status menjadi 'deleted'
    const result = await pool.query(
      `UPDATE kontak 
       SET status = 'deleted' 
       WHERE id = $1 
       RETURNING *`, // RETURNING digunakan supaya kita bisa kirim balik data yang dihapus ke client
      [id],
    );

    // rowCount tetap berfungsi untuk mendeteksi apakah ada baris yang berhasil di-update
    if (result.rowCount === 0) {
      throw new AppError("Data tidak ditemukan", 404);
    }

    const deleteKeys = await redisClient.keys("kontak:list:page:*");
    if (deleteKeys.length > 0) await redisClient.del(deleteKeys);
    await redisClient.del(`kontak:${id}`);

    res.json({
      message: "kontak berhasil dinonaktifkan (soft-delete)",
      data: result.rows[0],
    });
  }),
);

// ======================================================
// 🧯 NOT FOUND + ERROR
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
      console.log(`⏳ ${label} not ready (${i}/${attempts})...`);
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
    console.log("✅ DB Connected");

    await waitUntilReady("Redis", async () => {
      await connectRedis();
    });

    server = app.listen(env.port, "0.0.0.0", () => {
      console.log(
        `🚀 Server running on http://${env.publicHost}:${env.port}/api`,
      );
    });
  } catch (err) {
    console.error("❌ Startup Error:", err);
    process.exit(1);
  }
}

// ======================================================
// 🛑 GRACEFUL SHUTDOWN HANDLER
// ======================================================
async function handleShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  const forceExitTimeout = setTimeout(() => {
    console.error(
      "💥 Forcefully shutting down because graceful exit timed out.",
    );
    process.exit(1);
  }, 10000);

  try {
    if (server) {
      console.log("⏳ Closing HTTP server...");
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      console.log("✅ HTTP server closed.");
    }

    if (redisClient.isOpen) {
      console.log("⏳ Closing Redis connection...");
      await redisClient.quit();
      console.log("✅ Redis connection closed.");
    }

    console.log("⏳ Closing Database pool...");
    await pool.end();
    console.log("✅ Database pool closed.");

    console.log("🎉 Graceful shutdown completed cleanly. Bye!");
    clearTimeout(forceExitTimeout);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during graceful shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

startServer();
