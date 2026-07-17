import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/appError";
import * as absensiService from "./absensi.service.crud";

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

// 1a. Controller untuk Bulk Create Absensi
export const createAbsensiBulk = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 1. Ambil idPeriode dari URL params, dataAbsenList dari body
    const { idPeriode } = req.params;
    const { dataAbsenList } = req.body;

    // 2. Validasi kelayakan data
    if (!idPeriode || !Array.isArray(dataAbsenList)) {
      return next(
        new AppError(
          "Payload tidak valid. Butuh parameter idPeriode di URL dan dataAbsenList berupa array di body.",
          400,
        ),
      );
    }

    // 3. Panggil service dengan idPeriode yang dikonversi ke Number
    const result = await absensiService.createAbsensiBulk(
      Number(idPeriode),
      dataAbsenList,
    );

    return res.status(201).json({
      status: "success",
      statusCode: 201,
      message: `${result.length} data absensi berhasil diinisialisasi untuk periode ini.`,
      data: result,
    });
  } catch (error: any) {
    return next(new AppError(error.message, 400));
  }
};

// 1b. Controller untuk Single Create Absensi
export const createAbsensiSingle = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await absensiService.createAbsensiSingle(req.body);

    if (!result) {
      return next(
        new AppError(
          "Gagal menambah absensi. Data mungkin sudah terdaftar (Conflict).",
          409,
        ),
      );
    }

    return res.status(201).json({
      status: "success",
      statusCode: 201,
      message: "Data absensi pegawai berhasil ditambahkan.",
      data: result,
    });
  } catch (error: any) {
    return next(new AppError(error.message, 400));
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
