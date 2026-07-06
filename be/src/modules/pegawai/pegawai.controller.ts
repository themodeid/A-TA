import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/appError";
import * as pegawaiService from "./pegawai.service";

export const syncMasterPegawai = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    console.log("[PEGAWAI UPLOAD] Menerima request sync master pegawai");

    if (!req.file) {
      console.log("[PEGAWAI UPLOAD] Kesalahan: Tidak ada file terunggah");
      return next(
        new AppError("Harap unggah file Excel pegawai (.xlsx/.xls)", 400),
      );
    }

    console.log(
      "[PEGAWAI UPLOAD] File berhasil diterima:",
      req.file.originalname,
    );

    const totalDataDisinkron = await pegawaiService.processMasterPegawaiSync(
      req.file.buffer,
    );

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: `Sinkronisasi data master berhasil. Total ${totalDataDisinkron} pegawai diproses/diperbarui.`,
    });
  } catch (error: any) {
    return next(
      new AppError(
        `Gagal melakukan sinkronisasi data pegawai: ${error.message}`,
        400,
      ),
    );
  }
};

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

export const getMasterPegawai = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await pegawaiService.getMasterPegawai();
    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Data master pegawai berhasil diambil",
      data,
    });
  } catch (error: any) {
    return next(
      new AppError(
        `Gagal mengambil data master pegawai: ${error.message}`,
        500,
      ),
    );
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
