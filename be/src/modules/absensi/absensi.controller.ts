import { Request, Response, NextFunction } from "express";
import { catchAsync, AppError } from "../../utils/appError";
import { processAbsensiUpload } from "./absensi.service";

export const uploadAbsensi = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      throw new AppError("File tidak ditemukan, mohon unggah file Excel", 400);
    }

    const idPeriodeRaw =
      req.body.id_periode || req.body.idPeriode || req.query.id_periode;
    if (!idPeriodeRaw) {
      throw new AppError("id_periode harus disertakan", 400);
    }

    const idPeriode = parseInt(String(idPeriodeRaw), 10);
    if (isNaN(idPeriode)) {
      throw new AppError("id_periode harus berupa angka yang valid", 400);
    }

    const result = await processAbsensiUpload(
      req.file.buffer,
      req.file.originalname,
      idPeriode,
    );

    // Kembalikan datanya ke user agar tahu berapa baris yang sukses/gagal
    res.status(200).json({
      status: "success",
      message: "Absensi berhasil diproses",
      data: result, // <--- Masukkan object result dari service ke sini
    });
  },
);
