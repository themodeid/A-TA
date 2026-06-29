import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/appError";
import * as golonganService from "../golongan/golongan.service";

export const getAllGolongan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await golonganService.getAllGolongan();
    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Data golongan berhasil diambil",
      data,
    });
  } catch (error: any) {
    return next(
      new AppError(`Gagal mengambil data golongan: ${error.message}`, 500),
    );
  }
};

export const getGolonganById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const golongan = await golonganService.getGolonganById(Number(id));

    if (!golongan) {
      return next(
        new AppError("Golongan tidak ditemukan atau telah dihapus", 404),
      );
    }

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      data: golongan,
    });
  } catch (error: any) {
    return next(
      new AppError(`Gagal mengambil detail golongan: ${error.message}`, 500),
    );
  }
};

export const createGolongan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { nama_golongan, gaji_pokok_standar } = req.body;
    if (!nama_golongan) {
      return next(new AppError("Nama golongan wajib diisi", 400));
    }

    const newGolongan = await golonganService.createGolongan({
      nama_golongan,
      gaji_pokok_standar,
    });

    return res.status(201).json({
      status: "success",
      statusCode: 201,
      message: "Golongan berhasil ditambahkan",
      data: newGolongan,
    });
  } catch (error: any) {
    return next(
      new AppError(`Gagal menambahkan golongan: ${error.message}`, 400),
    );
  }
};

export const updateGolongan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { nama_golongan, gaji_pokok_standar } = req.body;

    const updated = await golonganService.updateGolongan(Number(id), {
      nama_golongan,
      gaji_pokok_standar,
    });

    if (!updated) {
      return next(
        new AppError("Golongan tidak ditemukan untuk diperbarui", 404),
      );
    }

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Data golongan berhasil diperbarui",
      data: updated,
    });
  } catch (error: any) {
    return next(
      new AppError(`Gagal memperbarui golongan: ${error.message}`, 400),
    );
  }
};

export const deleteGolongan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const isDeleted = await golonganService.softDeleteGolongan(Number(id));

    if (!isDeleted) {
      return next(
        new AppError("Golongan tidak ditemukan atau sudah dihapus", 404),
      );
    }

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Golongan berhasil dihapus (Soft Delete)",
    });
  } catch (error: any) {
    return next(
      new AppError(`Gagal menghapus golongan: ${error.message}`, 500),
    );
  }
};
