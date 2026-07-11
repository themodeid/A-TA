import { Request, Response, NextFunction } from "express";
import { RekapGajiQueryService } from "./services/gaji-crud-services";
import { RekapGajiCommandService } from "./services/kalkulasi-gaji.service";

export class RekapGajiController {
  private rekapGajiQueryService: RekapGajiQueryService;
  private rekapGajiCommandService: RekapGajiCommandService;

  constructor() {
    this.rekapGajiQueryService = new RekapGajiQueryService();
    this.rekapGajiCommandService = new RekapGajiCommandService();
  }

  /**
   * HTTP Handler untuk memicu kalkulasi penggajian bulanan
   * POST /api/rekap-gaji/hitung
   */
  hitungGajiBulanan = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id_periode } = req.body;

      // 1. Validasi input parameter dari client
      if (!id_periode) {
        res.status(400).json({
          status: "fail",
          message:
            "Gagal memproses. Parameter id_periode wajib disertakan di dalam request body.",
        });
        return;
      }

      const parsedIdPeriode = Number(id_periode);
      if (isNaN(parsedIdPeriode)) {
        res.status(400).json({
          status: "fail",
          message:
            "Gagal memproses. Parameter id_periode harus berupa angka yang valid.",
        });
        return;
      }

      // 2. Jalankan proses kalkulasi rekap gaji
      await this.rekapGajiCommandService.kalkulasiPeriode(parsedIdPeriode);

      res.status(200).json({
        status: "success",
        message: `Kalkulasi rekap gaji untuk periode ID ${parsedIdPeriode} berhasil diproses dan diperbarui.`,
      });
    } catch (error) {
      // Lebih disarankan dilempar ke global error handler Express
      next(error);
    }
  };
}
