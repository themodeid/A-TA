import { Request, Response, NextFunction } from "express";
import * as queryService from "./services/gaji-crud-services";
// Import fungsi langsung tanpa import class
import { kalkulasiGajiAkhir } from "./services/kalkulasi-gaji.service";
import { AppError } from "../../utils/appError";

export const hitungGajiBulanan = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id_periode } = req.body;

    if (!id_periode) {
      return next(
        new AppError(
          "Gagal memproses. Parameter id_periode wajib disertakan di dalam request body.",
          400,
        ),
      );
    }

    const parsedIdPeriode = Number(id_periode);
    if (isNaN(parsedIdPeriode)) {
      return next(
        new AppError(
          "Gagal memproses. Parameter id_periode harus berupa angka yang valid.",
          400,
        ),
      );
    }

    // Panggil fungsi kalkulasi langsung tanpa instantiasi class
    await kalkulasiGajiAkhir(parsedIdPeriode);

    res.status(200).json({
      status: "success",
      statusCode: 200,
      message: `Kalkulasi rekap gaji untuk periode ID ${parsedIdPeriode} berhasil diproses dan status diperbarui ke Menunggu Approval.`,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllPeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const listPeriode = await queryService.getAllPeriode();
    res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Daftar semua periode berhasil diambil.",
      data: listPeriode,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/rekap-gaji
 */
export const getAllRekapGaji = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const rekapData = await queryService.getAllRekapGaji();
    res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Seluruh data rekap gaji berhasil diambil.",
      data: rekapData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/rekap-gaji/:idPeriode
 */
export const getRekapByPeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { idPeriode } = req.params;
    const parsedId = Number(idPeriode);

    if (isNaN(parsedId)) {
      return next(
        new AppError("ID Periode harus berupa angka yang valid.", 400),
      );
    }

    const rekapData = await queryService.getRekapByPeriode(parsedId);
    res.status(200).json({
      status: "success",
      statusCode: 200,
      message: `Data rekap gaji untuk periode ID ${parsedId} berhasil diambil.`,
      data: rekapData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/rekap-gaji/pegawai/:idPegawai
 */
export const getRekapByPegawai = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { idPegawai } = req.params;
    const parsedId = Number(idPegawai);

    if (isNaN(parsedId)) {
      return next(
        new AppError("ID Pegawai harus berupa angka yang valid.", 400),
      );
    }

    const rekapData = await queryService.getRekapByPegawai(parsedId);
    res.status(200).json({
      status: "success",
      statusCode: 200,
      message: `Daftar rekap gaji pegawai ID ${parsedId} berhasil diambil.`,
      data: rekapData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/rekap-gaji
 * Membuat rekap baru beserta detail rinciannya
 */
export const createRekapGaji = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      id_periode,
      id_pegawai,
      jabatan_snapshot,
      pangkat_golongan_snapshot,
      gaji_pokok_snapshot,
      total_penghasilan_bruto,
      total_potongan,
      total_penerimaan_clean,
      details,
    } = req.body;

    // Validasi basic input
    if (!id_periode || !id_pegawai) {
      return next(new AppError("ID Periode dan ID Pegawai wajib diisi.", 400));
    }

    const insertedId = await queryService.saveRekapGajiWithDetails({
      id_periode: Number(id_periode),
      id_pegawai: Number(id_pegawai),
      jabatan_snapshot,
      pangkat_golongan_snapshot,
      gaji_pokok_snapshot: Number(gaji_pokok_snapshot || 0),
      total_penghasilan_bruto: Number(total_penghasilan_bruto || 0),
      total_potongan: Number(total_potongan || 0),
      total_penerimaan_clean: Number(total_penerimaan_clean || 0),
      details,
    });

    res.status(201).json({
      status: "success",
      statusCode: 201,
      message: `Data rekap gaji berhasil disimpan dengan ID Rekap ${insertedId}.`,
      data: { id_rekap: insertedId },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/rekap-gaji/:idRekap
 */
export const deleteRekapGaji = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { idRekap } = req.params;
    const parsedId = Number(idRekap);

    if (isNaN(parsedId)) {
      return next(new AppError("ID Rekap harus berupa angka yang valid.", 400));
    }

    const success = await queryService.deleteRekapGaji(parsedId);

    if (!success) {
      return next(new AppError("Data rekap gaji tidak ditemukan.", 404));
    }

    res.status(200).json({
      status: "success",
      statusCode: 200,
      message: `Rekap Gaji ID ${parsedId} beserta detailnya berhasil dihapus.`,
    });
  } catch (error) {
    next(error);
  }
};
