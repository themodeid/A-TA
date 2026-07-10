import { Request, Response, NextFunction } from "express";
import { RekapGajiCommandService } from "./services/gaji.service";
import { RekapGajiQueryService } from "./services/gaji-crud-services";

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

  /**
   * Handler untuk mengambil rekap gaji berdasarkan ID Periode
   * GET /api/rekap-gaji/periode/:idPeriode
   */
  getRekapByPeriode = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Menggunakan Type Casting 'as string' untuk menjamin tipenya bukan string[]
      const idPeriode = req.params.idPeriode as string;

      // 1. Validasi input
      if (!idPeriode) {
        res.status(400).json({
          status: "fail",
          message: "ID Periode wajib disertakan dalam parameter URL.",
        });
        return;
      }

      const parsedIdPeriode = parseInt(idPeriode, 10);
      if (isNaN(parsedIdPeriode)) {
        res.status(400).json({
          status: "fail",
          message: "ID Periode harus berupa angka yang valid.",
        });
        return;
      }

      // 2. Panggil data dari Query Service (Repository)
      const rekapData =
        await this.rekapGajiQueryService.getRekapByPeriode(parsedIdPeriode);

      // 3. Cek apakah data ditemukan
      if (rekapData.length === 0) {
        res.status(404).json({
          status: "success",
          message: `Data rekap gaji untuk periode ID ${parsedIdPeriode} tidak ditemukan atau masih kosong.`,
          data: [],
        });
        return;
      }

      // 4. Kirim response sukses jika data ada
      res.status(200).json({
        status: "success",
        message: "Berhasil mengambil data historical snapshot rekap gaji.",
        count: rekapData.length,
        data: rekapData,
      });
    } catch (error) {
      // Dilempar ke global error handler Express
      next(error);
    }
  };
}
