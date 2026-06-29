import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/appError";
import * as jabatanService from "../jabatan/jabatan.service";

export const getAllJabatan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await jabatanService.getAllJabatan();
    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Data jabatan berhasil diambil",
      data,
    });
  } catch (error: any) {
    return next(
      new AppError(`Gagal mengambil data jabatan: ${error.message}`, 500),
    );
  }
};

export const createJabatan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { nama_jabatan, tunjangan_jabatan_struktural } = req.body;
    if (!nama_jabatan) {
      return next(new AppError("Nama jabatan wajib diisi", 400));
    }

    const newJabatan = await jabatanService.createJabatan({
      nama_jabatan,
      tunjangan_jabatan_struktural,
    });

    return res.status(201).json({
      status: "success",
      statusCode: 201,
      message: "Jabatan berhasil ditambahkan",
      data: newJabatan,
    });
  } catch (error: any) {
    return next(
      new AppError(`Gagal menambahkan jabatan: ${error.message}`, 400),
    );
  }
};

export const getJabatanById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const jabatan = await jabatanService.getJabatanById(Number(id));

    if (!jabatan) {
      return next(
        new AppError("Jabatan tidak ditemukan atau telah dihapus", 404),
      );
    }

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      data: jabatan,
    });
  } catch (error: any) {
    return next(
      new AppError(`Gagal mengambil detail jabatan: ${error.message}`, 500),
    );
  }
};

export const updateJabatan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { nama_jabatan, tunjangan_jabatan_struktural } = req.body;

    const updated = await jabatanService.updateJabatan(Number(id), {
      nama_jabatan,
      tunjangan_jabatan_struktural,
    });

    if (!updated) {
      return next(
        new AppError("Jabatan tidak ditemukan untuk diperbarui", 404),
      );
    }

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Data jabatan berhasil diperbarui",
      data: updated,
    });
  } catch (error: any) {
    return next(
      new AppError(`Gagal memperbarui jabatan: ${error.message}`, 400),
    );
  }
};

export const deleteJabatan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const isDeleted = await jabatanService.softDeleteJabatan(Number(id));

    if (!isDeleted) {
      return next(
        new AppError("Jabatan tidak ditemukan atau sudah dihapus", 404),
      );
    }

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Jabatan berhasil dihapus (Soft Delete)",
    });
  } catch (error: any) {
    return next(new AppError(`Gagal menghapus jabatan: ${error.message}`, 500));
  }
};
