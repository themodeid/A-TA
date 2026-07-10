import { Request, Response, NextFunction, Express } from "express";
import { AppError } from "../../utils/appError";
import * as pegawaiService from "./pegawai.service";

export const createPegawai = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const dataPegawai = req.body;
    const newPegawai = await pegawaiService.createPegawai(dataPegawai);

    return res.status(201).json({
      status: "success",
      statusCode: 201,
      message: "Data pegawai berhasil ditambahkan",
      data: newPegawai,
    });
  } catch (error: any) {
    return next(new AppError(`Gagal menambah pegawai: ${error.message}`, 400));
  }
};

export const getAllMasterPegawai = async (req: Request, res: Response) => {
  try {
    const semuaPegawai = await pegawaiService.getAllMasterPegawai();

    return res.status(200).json({
      status: "success",
      data: semuaPegawai,
    });
  } catch (error: any) {
    return res.status(500).json({
      status: "error",
      message: `Gagal mengambil data master pegawai: ${error.message}`,
      statusCode: 500,
    });
  }
};

// mengambil data pegawai tertentu
export const getMasterPegawai = async (req: Request, res: Response) => {
  try {
    // 1. Ambil data dari params atau query (sesuaikan dengan route-mu)
    const idPeriodeRaw = req.query.idPeriode || req.params.idPeriode;
    const idPegawaiRaw = req.query.idPegawai || req.params.idPegawai;

    // 2. Konversi ke Integer
    const idPeriode = parseInt(idPeriodeRaw as string, 10);
    const idPegawai = parseInt(idPegawaiRaw as string, 10);

    // 3. WAJIB VALIDASI: Jika hasil konversi adalah NaN, langsung potong dengan bad request!
    if (isNaN(idPeriode) || isNaN(idPegawai)) {
      return res.status(400).json({
        status: "error",
        message: `ID Periode atau ID Pegawai tidak valid. Diterima: idPeriode=${idPeriodeRaw}, idPegawai=${idPegawaiRaw}`,
        statusCode: 400,
      });
    }

    // 4. Baru panggil fungsi query jika data sudah aman
    const dataPayroll = await pegawaiService.getPegawaiDataForPayroll(
      idPeriode,
      idPegawai,
    );

    return res.status(200).json({
      status: "success",
      data: dataPayroll,
    });
  } catch (error: any) {
    return res.status(500).json({
      status: "error",
      message: `Gagal mengambil data pegawai: ${error.message}`,
      statusCode: 500,
      stack: error.stack,
    });
  }
};

export const getPegawaiById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const pegawai = await pegawaiService.getPegawaiById(Number(id));

    if (!pegawai) {
      return next(
        new AppError("Pegawai tidak ditemukan atau telah dihapus", 404),
      );
    }

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      data: pegawai,
    });
  } catch (error: any) {
    return next(
      new AppError(`Gagal mengambil data pegawai: ${error.message}`, 500),
    );
  }
};

export const updatePegawai = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const dataUpdate = req.body;

    const updatedPegawai = await pegawaiService.updatePegawai(
      Number(id),
      dataUpdate,
    );

    if (!updatedPegawai) {
      return next(
        new AppError("Pegawai tidak ditemukan untuk diperbarui", 404),
      );
    }

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Data pegawai berhasil diperbarui",
      data: updatedPegawai,
    });
  } catch (error: any) {
    return next(
      new AppError(`Gagal memperbarui pegawai: ${error.message}`, 400),
    );
  }
};

export const deletePegawai = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const isDeleted = await pegawaiService.softDeletePegawai(Number(id));

    if (!isDeleted) {
      return next(
        new AppError("Pegawai tidak ditemukan atau sudah dihapus", 404),
      );
    }

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Data pegawai berhasil dihapus (Soft Delete)",
    });
  } catch (error: any) {
    return next(new AppError(`Gagal menghapus pegawai: ${error.message}`, 500));
  }
};
