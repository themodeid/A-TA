import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "./auth.controller";
import { validateBody } from "../../middlewares/validateBody";
import { registerSchema, loginSchema } from "./auth.validation";
import { authenticateToken } from "../../middlewares/auth";

const router = Router();

// Rate limiter ketat untuk endpoint autentikasi guna mencegah brute-force & credential stuffing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 30, // Maksimal 30 percobaan per IP dalam 15 menit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "Terlalu banyak percobaan autentikasi dari IP ini. Silakan tunggu 15 menit.",
    statusCode: 429,
  },
});

// Route Registrasi Akun Baru
router.post("/register", authLimiter, validateBody(registerSchema), AuthController.register);

// Route Login
router.post("/login", authLimiter, validateBody(loginSchema), AuthController.login);

// Route Profil Pengguna Saat Ini (Protected)
router.get("/me", authenticateToken, AuthController.getMe);

export default router;
