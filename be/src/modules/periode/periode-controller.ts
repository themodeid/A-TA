import { Request, Response, NextFunction } from "express";
import * as PeriodeService from "../periode/periode-services";
// Asumsi service rekap gaji juga menggunakan gaya functional fungsional yang sama
// import { getRekapByPeriodeService } from "../rekap-gaji/rekap-gaji-services";

/**
 * GET /api/periode
 * Mengambil semua periode rekap gaji yang aktif (belum soft delete)
 */
export const getAllPeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // 1. Panggil data langsung dari fungsi service yang sudah di-import
    const periodeData = await PeriodeService.getAllPeriode();

    // 2. Kirim response sukses jika data ada
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil data semua periode rekap gaji.",
      count: periodeData.length,
      data: periodeData,
    });
  } catch (error) {
    // Dilempar ke global error handler Express
    next(error);
  }
};

/**
 * GET /api/rekap-gaji/periode/:idPeriode
 * Handler untuk mengambil rekap gaji berdasarkan ID Periode
 */
export const getRekapByPeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const idPeriode = req.params.idPeriode as string;

    // 1. Validasi input parameter
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

    // 2. Panggil data dari Query Service Rekap Gaji
    // Sesuaikan variabel/fungsi panggilannya dengan service rekap gaji milikmu
    // Contoh jika menggunakan instance/object:
    // const rekapData = await rekapGajiQueryService.getRekapByPeriode(parsedIdPeriode);
    const rekapData = await PeriodeService.getPeriodeById(parsedIdPeriode);

    // 3. Cek apakah data ditemukan
    // Note: Sesuaikan pengecekan jika rekapData mengembalikan Array atau Object tunggal
    if (!rekapData || (Array.isArray(rekapData) && rekapData.length === 0)) {
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
      data: rekapData,
    });
  } catch (error) {
    next(error);
  }
};
