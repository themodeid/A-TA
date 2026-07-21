import { Request, Response, NextFunction } from "express";
import { AppError } from "../../../utils/appError";
import * as pegawaiService from "./pegawai.service";

/**
 * POST /api/pegawai
 * Menambahkan data pegawai baru
 */
export const createPegawai = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dataPegawai = req.body;
    const newPegawai = await pegawaiService.createPegawai(dataPegawai);

    res.status(201).json({
      status: "success",
      statusCode: 201,
      message: "Data pegawai berhasil ditambahkan",
      data: newPegawai,
    });
  } catch (error: any) {
    next(new AppError(`Gagal menambah pegawai: ${error.message}`, 400));
  }
};

/**
 * GET /api/pegawai
 * Mengambil seluruh data master pegawai aktif
 */
export const getAllMasterPegawai = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const semuaPegawai = await pegawaiService.getAllMasterPegawai();

    res.status(200).json({
      status: "success",
      statusCode: 200,
      data: semuaPegawai,
    });
  } catch (error: any) {
    next(
      new AppError(
        `Gagal mengambil data master pegawai: ${error.message}`,
        500,
      ),
    );
  }
};

/**
 * GET /api/pegawai/payroll
 * Mengambil data spesifik pegawai untuk kebutuhan kalkulasi payroll berdasarkan idPeriode & idPegawai
 */
export const getMasterPegawai = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const idPeriodeRaw = req.query.idPeriode || req.params.idPeriode;
    const idPegawaiRaw = req.query.idPegawai || req.params.idPegawai;

    const idPeriode = parseInt(idPeriodeRaw as string, 10);
    const idPegawai = parseInt(idPegawaiRaw as string, 10);

    if (isNaN(idPeriode) || isNaN(idPegawai)) {
      res.status(400).json({
        status: "fail",
        statusCode: 400,
        message: `ID Periode atau ID Pegawai tidak valid. Diterima: idPeriode=${idPeriodeRaw}, idPegawai=${idPegawaiRaw}`,
      });
      return;
    }

    const dataPayroll = await pegawaiService.getPegawaiDataForPayroll(
      idPeriode,
      idPegawai,
    );

    res.status(200).json({
      status: "success",
      statusCode: 200,
      data: dataPayroll,
    });
  } catch (error: any) {
    next(
      new AppError(
        `Gagal mengambil data pegawai untuk payroll: ${error.message}`,
        500,
      ),
    );
  }
};

/**
 * GET /api/pegawai/:id
 * Mengambil detail ringkas satu pegawai berdasarkan ID
 */
export const getPegawaiById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const parsedId = Number(id);

    if (isNaN(parsedId)) {
      res.status(400).json({
        status: "fail",
        message: "ID Pegawai harus berupa angka yang valid.",
      });
      return;
    }

    const pegawai = await pegawaiService.getPegawaiById(parsedId);

    if (!pegawai) {
      next(new AppError("Pegawai tidak ditemukan atau telah dihapus", 404));
      return;
    }

    res.status(200).json({
      status: "success",
      statusCode: 200,
      data: pegawai,
    });
  } catch (error: any) {
    next(new AppError(`Gagal mengambil data pegawai: ${error.message}`, 500));
  }
};

/**
 * PUT /api/pegawai/:id
 * Mengubah data profil dasar pegawai
 */
export const updatePegawai = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const parsedId = Number(id);
    const dataUpdate = req.body;

    if (isNaN(parsedId)) {
      res.status(400).json({
        status: "fail",
        message: "ID Pegawai harus berupa angka yang valid.",
      });
      return;
    }

    const updatedPegawai = await pegawaiService.updatePegawai(
      parsedId,
      dataUpdate,
    );

    if (!updatedPegawai) {
      next(new AppError("Pegawai tidak ditemukan untuk diperbarui", 404));
      return;
    }

    res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Data pegawai berhasil diperbarui",
      data: updatedPegawai,
    });
  } catch (error: any) {
    next(new AppError(`Gagal memperbarui pegawai: ${error.message}`, 400));
  }
};

/**
 * DELETE /api/pegawai/:id
 * Mengapus data pegawai secara logis (Soft Delete)
 */
export const deletePegawai = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const parsedId = Number(id);

    if (isNaN(parsedId)) {
      res.status(400).json({
        status: "fail",
        message: "ID Pegawai harus berupa angka yang valid.",
      });
      return;
    }

    const isDeleted = await pegawaiService.softDeletePegawai(parsedId);

    if (!isDeleted) {
      next(new AppError("Pegawai tidak ditemukan atau sudah dihapus", 404));
      return;
    }

    res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Data pegawai berhasil dihapus (Soft Delete)",
    });
  } catch (error: any) {
    next(new AppError(`Gagal menghapus pegawai: ${error.message}`, 500));
  }
};
