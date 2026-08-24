import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/database";
import { ENV } from "../../config/env";
import { AppError } from "../../utils/appError";
import { LoginInput, RegisterInput } from "./auth.validation";

export interface AuthUserResponse {
  id: number;
  username: string;
  role: string;
}

export interface AuthResult {
  user: AuthUserResponse;
  token: string;
}

export class AuthService {
  /**
   * Registrasi akun pengguna baru dengan password hashing Bcrypt & validasi keunikan username.
   */
  static async register(input: RegisterInput): Promise<AuthResult> {
    const cleanUsername = input.username.trim().toLowerCase();

    // 1. Cek apakah username sudah ada
    const existingUser = await pool.query(
      "SELECT id_pengguna, deleted_at FROM tb_pengguna WHERE LOWER(username) = $1",
      [cleanUsername],
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      if (!user.deleted_at) {
        throw new AppError("Username sudah terdaftar, silakan gunakan username lain.", 409);
      }
    }

    // 2. Hash password menggunakan salt rounds 10
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(input.password, saltRounds);

    // 3. Simpan ke database
    const insertResult = await pool.query(
      `INSERT INTO tb_pengguna (username, password, role)
       VALUES ($1, $2, $3)
       RETURNING id_pengguna, username, role`,
      [cleanUsername, hashedPassword, input.role],
    );

    const newUser = insertResult.rows[0];
    const userPayload: AuthUserResponse = {
      id: newUser.id_pengguna,
      username: newUser.username,
      role: newUser.role,
    };

    // 4. Generate JWT Token
    const token = jwt.sign(userPayload, ENV.JWT_SECRET, {
      expiresIn: "1d",
    });

    return {
      user: userPayload,
      token,
    };
  }

  /**
   * Login pengguna dengan verifikasi bcrypt dan pembuatan token JWT.
   */
  static async login(input: LoginInput): Promise<AuthResult> {
    const cleanUsername = input.username.trim().toLowerCase();

    // 1. Ambil data user dari database
    const userResult = await pool.query(
      `SELECT id_pengguna, username, password, role 
       FROM tb_pengguna 
       WHERE LOWER(username) = $1 AND deleted_at IS NULL`,
      [cleanUsername],
    );

    if (userResult.rows.length === 0) {
      // Gunakan pesan error seragam untuk menghindari user enumeration attack
      throw new AppError("Username atau password salah.", 401);
    }

    const user = userResult.rows[0];

    // 2. Verifikasi hash password
    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
      throw new AppError("Username atau password salah.", 401);
    }

    const userPayload: AuthUserResponse = {
      id: user.id_pengguna,
      username: user.username,
      role: user.role,
    };

    // 3. Generate JWT Token
    const token = jwt.sign(userPayload, ENV.JWT_SECRET, {
      expiresIn: "1d",
    });

    return {
      user: userPayload,
      token,
    };
  }

  /**
   * Mengambil data profil user saat ini berdasarkan ID yang tersimpan di JWT.
   */
  static async getMe(userId: number): Promise<AuthUserResponse> {
    const result = await pool.query(
      `SELECT id_pengguna, username, role 
       FROM tb_pengguna 
       WHERE id_pengguna = $1 AND deleted_at IS NULL`,
      [userId],
    );

    if (result.rows.length === 0) {
      throw new AppError("Pengguna tidak ditemukan atau akun telah dinonaktifkan.", 404);
    }

    const user = result.rows[0];
    return {
      id: user.id_pengguna,
      username: user.username,
      role: user.role,
    };
  }
}
