import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/appError";
import { processAbsensiUpload, createPeriodeOtomatis } from "./absensi.service";

export const uploadAbsensi = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 1. Validasi keberadaan file upload
    if (!req.file) {
      return next(
        new AppError("File tidak ditemukan, mohon unggah file Excel", 400),
      );
    }

    // 2. Ambil parameter bulan dan tahun dari body request
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

    // 3. Jalankan Langkah Otomatis Periode
    const periode = await createPeriodeOtomatis(parseBulan, parseTahun);

    // B bypass AUTH: Gunakan ID Pengguna default = 1 untuk testing awal
    const idPenggunaDefault = 1;

    // 4. Oper data ke service upload (Sekarang argumennya PAS: 4 parameter)
    const result = await processAbsensiUpload(
      req.file.buffer,
      req.file.originalname,
      periode.id_periode,
      idPenggunaDefault, // <-- Kirim ke sini
    );

    // 5. Kembalikan response sukses
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
