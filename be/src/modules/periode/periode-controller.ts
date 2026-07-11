import { Request, Response, NextFunction } from "express";
import * as PeriodeService from "../periode/periode-services"; // Jalur impor disesuaikan ke file service Anda

/**
 * POST /api/periode
 * Membuka periode baru
 */
export const createPeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { bulan_gaji, tanggal_awal, tanggal_akhir } = req.body;

    // Validasi input dasar
    if (!bulan_gaji || !tanggal_awal || !tanggal_akhir) {
      res.status(400).json({
        status: "fail",
        message:
          "Data bulan_gaji, tanggal_awal, dan tanggal_akhir wajib diisi.",
      });
      return;
    }

    const newPeriode = await PeriodeService.createPeriode({
      bulan_gaji,
      tanggal_awal,
      tanggal_akhir,
    });

    res.status(201).json({
      status: "success",
      message: "Berhasil membuka periode baru.",
      data: newPeriode,
    });
  } catch (error) {
    next(error);
  }
};

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
    const periodeData = await PeriodeService.getAllPeriode();

    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil data semua periode rekap gaji.",
      count: periodeData.length,
      data: periodeData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/periode/:idPeriode
 * Mengambil detail satu periode berdasarkan ID
 */
export const getPeriodeById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const idPeriode = req.params.idPeriode as string;
    const parsedId = parseInt(idPeriode, 10);

    if (isNaN(parsedId)) {
      res.status(400).json({
        status: "fail",
        message: "ID Periode harus berupa angka yang valid.",
      });
      return;
    }

    const data = await PeriodeService.getPeriodeById(parsedId);

    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil detail periode.",
      data,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("tidak ditemukan")) {
      res.status(404).json({ status: "fail", message: error.message });
      return;
    }
    next(error);
  }
};

/**
 * PUT /api/periode/:idPeriode
 * Mengubah data dasar periode dinamis
 */
export const updatePeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const idPeriode = req.params.idPeriode as string;
    const parsedId = parseInt(idPeriode, 10);

    if (isNaN(parsedId)) {
      res.status(400).json({
        status: "fail",
        message: "ID Periode harus berupa angka yang valid.",
      });
      return;
    }

    const { bulan_gaji, tanggal_awal, tanggal_akhir, status } = req.body;

    const updatedPeriode = await PeriodeService.updatePeriode(parsedId, {
      bulan_gaji,
      tanggal_awal,
      tanggal_akhir,
      status,
    });

    res.status(200).json({
      status: "success",
      message: "Berhasil memperbarui data periode.",
      data: updatedPeriode,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("tidak ditemukan")) {
      res.status(404).json({ status: "fail", message: error.message });
      return;
    }
    if (
      error instanceof Error &&
      error.message.includes("Tidak ada data baru")
    ) {
      res.status(400).json({ status: "fail", message: error.message });
      return;
    }
    next(error);
  }
};

/**
 * DELETE /api/periode/:idPeriode
 * Menghapus periode menggunakan Soft-Delete
 */
export const deletePeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const idPeriode = req.params.idPeriode as string;
    const parsedId = parseInt(idPeriode, 10);

    if (isNaN(parsedId)) {
      res.status(400).json({
        status: "fail",
        message: "ID Periode harus berupa angka yang valid.",
      });
      return;
    }

    const deletedData = await PeriodeService.deletePeriode(parsedId);

    res.status(200).json({
      status: "success",
      message: "Berhasil menghapus (soft-delete) periode.",
      data: deletedData,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("tidak ditemukan")) {
      res.status(404).json({ status: "fail", message: error.message });
      return;
    }
    next(error);
  }
};

/**
 * GET /api/periode/:idPeriode/rekap
 * Handler untuk mengambil rekap gaji berdasarkan ID Periode
 */
export const getRekapByPeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const idPeriode = req.params.idPeriode as string;
    const parsedIdPeriode = parseInt(idPeriode, 10);

    if (isNaN(parsedIdPeriode)) {
      res.status(400).json({
        status: "fail",
        message: "ID Periode harus berupa angka yang valid.",
      });
      return;
    }

    const rekapData = await PeriodeService.getPeriodeById(parsedIdPeriode);

    if (!rekapData) {
      res.status(404).json({
        status: "success",
        message: `Data rekap gaji untuk periode ID ${parsedIdPeriode} tidak ditemukan atau masih kosong.`,
        data: [],
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil data historical snapshot rekap gaji.",
      data: rekapData,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("tidak ditemukan")) {
      res
        .status(404)
        .json({ status: "success", message: error.message, data: [] });
      return;
    }
    next(error);
  }
};
