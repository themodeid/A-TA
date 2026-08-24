import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env";
import { pool } from "../config/database";
import { AppError } from "../utils/appError";

export interface AuthUserPayload {
  id: number;
  username: string;
  role: "Admin" | "Petugas Absensi" | "Approver" | "Staf Gaji";
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

/**
 * Middleware untuk memverifikasi JWT Bearer Token pada Authorization Header.
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Akses ditolak: Token otentikasi tidak ditemukan.", 401);
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new AppError("Akses ditolak: Format token tidak valid.", 401);
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, ENV.JWT_SECRET);
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        throw new AppError("Sesi login telah berakhir, silakan login kembali.", 401);
      }
      throw new AppError("Token tidak valid atau telah dimodifikasi.", 401);
    }

    // Verifikasi user di database untuk memastikan akun masih aktif & tidak dihapus (deleted_at IS NULL)
    const userResult = await pool.query(
      "SELECT id_pengguna, username, role FROM tb_pengguna WHERE id_pengguna = $1 AND deleted_at IS NULL",
      [decoded.id],
    );

    if (userResult.rows.length === 0) {
      throw new AppError("Pengguna tidak ditemukan atau akun telah dinonaktifkan.", 401);
    }

    const dbUser = userResult.rows[0];
    req.user = {
      id: dbUser.id_pengguna,
      username: dbUser.username,
      role: dbUser.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware Role-Based Access Control (RBAC) untuk membatasi endpoint berdasarkan role pengguna.
 */
export const authorizeRole = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError("Pengguna belum terotentikasi.", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Akses dilarang: Role '${req.user.role}' tidak memiliki izin untuk tindakan ini.`,
          403,
        ),
      );
    }

    next();
  };
};
