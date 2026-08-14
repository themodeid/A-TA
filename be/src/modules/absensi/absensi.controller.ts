import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/appError";
import * as absensiService from "./absensi.service";

export const getAllPeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await absensiService.getAllPeriodeTersedia();

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: `Berhasil mengambil ${result.length} daftar periode yang tersedia.`,
      data: result,
    });
  } catch (error: any) {
    return next(new AppError(error.message, 500));
  }
};

export const getAbsensiByPeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { idPeriode } = req.params;

    if (!idPeriode) {
      return next(
        new AppError("Parameter idPeriode tidak ditemukan di URL.", 400),
      );
    }

    const periodeExists = await absensiService.getPeriodeById(
      Number(idPeriode),
    );
    if (!periodeExists) {
      return next(
        new AppError(`Periode ID ${idPeriode} tidak ditemukan.`, 404),
      );
    }

    const result = await absensiService.getAbsensiByPeriode(Number(idPeriode));
    const bulanGaji = periodeExists.bulan_gaji;

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: `Berhasil memuat form absensi (${result.length} pegawai) untuk periode ${bulanGaji}.`,
      data: result,
    });
  } catch (error: any) {
    return next(new AppError(error.message, 500));
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
    const { idPeriode } = req.params;
    const { dataAbsenList } = req.body;

    if (!idPeriode || !Array.isArray(dataAbsenList)) {
      return next(
        new AppError(
          "Payload tidak valid. Butuh parameter idPeriode di URL dan dataAbsenList berupa array di body.",
          400,
        ),
      );
    }

    // 1. Jalankan proses bulk insert
    const result = await absensiService.createAbsensiBulk(
      Number(idPeriode),
      dataAbsenList,
    );

    // 2. Ambil properti yang BENAR-BENAR dikembalikan oleh query SQL (bulan_tahun / nama_periode)
    const sampleData = result[0];
    const namaPeriode = sampleData?.nama_periode || `Periode ID ${idPeriode}`;
    const bulanTahun = sampleData?.bulan_tahun || namaPeriode;

    return res.status(201).json({
      status: "success",
      statusCode: 201,
      message: `${result.length} data absensi berhasil diinisialisasi untuk ${namaPeriode}.`,
      periode: {
        id: Number(idPeriode),
        nama: namaPeriode,
        bulan_tahun: bulanTahun,
      },
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
export const deleteAbsensiByPeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { idPeriode } = req.params;

    if (!idPeriode || isNaN(Number(idPeriode))) {
      return next(
        new AppError("Parameter idPeriode tidak valid pada URL.", 400),
      );
    }

    const deletedRows = await absensiService.deleteAbsensiByPeriode(
      Number(idPeriode),
    );

    // Jika array kosong (length === 0), berarti memang tidak ada data di periode tersebut
    if (!deletedRows || deletedRows.length === 0) {
      return next(
        new AppError(
          `Data absensi untuk Periode ID ${idPeriode} tidak ditemukan atau sudah dihapus.`,
          404,
        ),
      );
    }

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: `Berhasil menghapus seluruh data absensi (${deletedRows.length} record) untuk Periode ID ${idPeriode}.`,
      total_deleted: deletedRows.length,
      data: deletedRows,
    });
  } catch (error: any) {
    return next(new AppError(error.message, 500));
  }
};
