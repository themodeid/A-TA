import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { AuthenticatedRequest } from "../../middlewares/auth";

export class AuthController {
  /**
   * Handler untuk registrasi pengguna baru.
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({
        status: "success",
        message: "Akun berhasil didaftarkan.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handler untuk login pengguna.
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);

      // Set secure HttpOnly cookie
      res.cookie("auth_token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        status: "success",
        message: "Login berhasil.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handler untuk logout pengguna.
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.clearCookie("auth_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
      });

      res.status(200).json({
        status: "success",
        message: "Logout berhasil.",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handler untuk memeriksa identitas user aktif saat ini (me).
   */
  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getMe(req.user!.id);
      res.status(200).json({
        status: "success",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}
