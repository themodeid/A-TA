import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/appError";
import {
  processAbsensiUpload,
  createPeriodeOtomatis,
} from "./service/absensi.service.uplod";
import * as absensiService from "./service/absensi.service.crud";

export const uploadAbsensi = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.file) {
      return next(
        new AppError("File tidak ditemukan, mohon unggah file Excel", 400),
      );
    }

    const { bulan, tahun } = req.body;
    if (!bulan || !tahun) {
      return next(new AppError("Bulan dan tahun wajib disertakan", 400));
    }

    const parseBulan = parseInt(String(bulan), 10);
    const parseTahun = parseInt(String(tahun), 10);

    if (
      isNaN(parseBulan) ||
      parseBulan < 1 ||
      parseBulan > 12 ||
      isNaN(parseTahun)
    ) {
      return next(
        new AppError("Format bulan (1-12) atau tahun tidak valid", 400),
      );
    }

    const periode = await createPeriodeOtomatis(parseBulan, parseTahun);
    const idPenggunaDefault = 1; // Bypass AUTH untuk testing awal

    const result = await processAbsensiUpload(
      req.file.buffer,
      req.file.originalname,
      periode.id_periode,
      idPenggunaDefault,
    );

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: `Absensi untuk periode ${periode.bulan_gaji} (Cut-off ${periode.tanggal_awal} s/d ${periode.tanggal_akhir}) berhasil diproses.`,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

// CRUD ABSENSI CONTROLLER

export const getAllAbsensi = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await absensiService.getAllAbsensi();
    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Absensi berhasil diambil",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

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
      message: "Absensi berhasil diambil",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

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
        new AppError("Data absensi tidak ditemukan atau telah dihapus", 404),
      );
    }
    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Absensi berhasil diupdate",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

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
