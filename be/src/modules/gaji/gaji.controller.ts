import { Request, Response, NextFunction } from "express";
import * as queryService from "./services/gaji-crud-services";
import * as commandService from "./services/kalkulasi-gaji.service";
import { AppError } from "../../utils/appError";

/**
 * HTTP Handler untuk memicu kalkulasi penggajian bulanan
 * POST /api/rekap-gaji/hitung
 */
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

    await commandService.kalkulasiPeriode(parsedIdPeriode);

    res.status(200).json({
      status: "success",
      statusCode: 200,
      message: `Kalkulasi rekap gaji untuk periode ID ${parsedIdPeriode} berhasil diproses dan status diperbarui ke Menunggu Approval.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler untuk mengambil data historical snapshot rekap gaji berdasarkan periode
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
 * HTTP Handler untuk mengambil semua daftar periode
 * GET /api/rekap-gaji/periode/list
 */
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
