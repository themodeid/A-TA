import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/appError";
import * as pegawaiService from "./pegawai.service";

export const uploadMasterPegawai = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.file) {
    return next(new AppError("Silakan unggah file Excel terlebih dahulu", 400));
  }

  try {
    // Controller tinggal panggil service, gak mau tahu urusan query SQL di dalam
    const totalData = await pegawaiService.processMasterPegawaiSync(
      req.file.buffer,
    );

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: `Berhasil sinkronisasi ${totalData} data master pegawai`,
    });
  } catch (error: any) {
    return next(
      new AppError(`Gagal memproses data pegawai: ${error.message}`, 500),
    );
  }
};
