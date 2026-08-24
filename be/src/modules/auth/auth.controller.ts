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
