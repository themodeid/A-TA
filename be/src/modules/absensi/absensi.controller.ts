import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/appError";
import { processAbsensiUpload } from "./absensi.service";

export const uploadAbsensi = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 1. Validasi keberadaan file
    if (!req.file) {
      return next(
        new AppError("File tidak ditemukan, mohon unggah file Excel", 400),
      );
    }

    // 2. Ambil id_periode dari berbagai kemungkinan input (body / query)
    const idPeriodeRaw =
      req.body.id_periode || req.body.idPeriode || req.query.id_periode;
    if (!idPeriodeRaw) {
      return next(new AppError("id_periode harus disertakan", 400));
    }

    // 3. Validasi angka id_periode
    const idPeriode = parseInt(String(idPeriodeRaw), 10);
    if (isNaN(idPeriode)) {
      return next(
        new AppError("id_periode harus berupa angka yang valid", 400),
      );
    }

    // 4. Oper data ke service untuk diproses ke database
    const result = await processAbsensiUpload(
      req.file.buffer,
      req.file.originalname,
      idPeriode,
    );

    // 5. Kembalikan response sukses beserta detail log sukses/gagal
    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Absensi berhasil diproses",
      data: result,
    });
  } catch (error) {
    // Menangkap error async (DB error, runtime error, dll)
    // dan meneruskannya ke global error handler Express
    return next(error);
  }
};
