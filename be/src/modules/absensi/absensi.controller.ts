import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/appError";
import * as absensiService from "./absensi.service.crud";

// 1. Mengambil daftar periode berdasarkan parameter tahun di query (?tahun=2026)
export const getPeriodeByTahun = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { tahun } = req.query;
    if (!tahun) {
      return next(new AppError("Parameter tahun wajib disertakan", 400));
    }

    const result = await absensiService.getPeriodeByTahun(Number(tahun));
    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: `Daftar periode untuk tahun ${tahun} berhasil diambil`,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

// 2. Mengambil semua data absensi pegawai berdasarkan ID Periode spesifik
export const getAbsensiByPeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { idPeriode } = req.params;
    const result = await absensiService.getAbsensiByPeriode(Number(idPeriode));

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Data absensi berdasarkan periode berhasil diambil",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

// 3. Mengambil data detail rekap per baris id summary
export const getAbsensiById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await absensiService.getAbsensiById(Number(req.params.id));
    if (!result) {
      return next(new AppError("Data absensi tidak ditemukan", 404));
    }
    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Detail absensi berhasil diambil",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

// 4. Update data rekap (WFO, WFH, Sakit, Alpha, Izin) dengan auto-recalculate tunjangan harian
export const updateAbsensi = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await absensiService.updateAbsensi(
      Number(req.params.id),
      req.body,
    );
    if (!result) {
      return next(
        new AppError("Data absensi tidak ditemukan atau gagal diperbarui", 404),
      );
    }
    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message:
        "Absensi berhasil diupdate dan komponen tunjangan harian disinkronkan",
      data: result,
    });
  } catch (error: any) {
    return next(new AppError(error.message, 400));
  }
};

// 5. Hard delete rekap absensi per record
export const deleteAbsensi = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await absensiService.deleteAbsensi(Number(req.params.id));
    if (!result) {
      return next(
        new AppError(
          "Data absensi tidak ditemukan atau sudah dihapus sebelumnya",
          404,
        ),
      );
    }
    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Absensi berhasil dihapus",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
