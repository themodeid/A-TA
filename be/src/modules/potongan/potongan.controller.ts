import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/appError";
import * as potonganService from "./potongan.service";

/**
 * GET /api/potongan
 * Mengambil semua data potongan bulanan pegawai
 */
export const getAllPotongan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await potonganService.getAllPotongan();
    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Data potongan bulanan berhasil diambil",
      data,
    });
  } catch (error: any) {
    return next(
      new AppError(`Gagal mengambil data potongan: ${error.message}`, 500),
    );
  }
};

/**
 * GET /api/potongan/:id
 * Mengambil detail potongan bulanan berdasarkan ID
 */
export const getPotonganById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const potongan = await potonganService.getPotonganById(Number(id));

    if (!potongan) {
      return next(new AppError("Data potongan bulanan tidak ditemukan", 404));
    }

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      data: potongan,
    });
  } catch (error: any) {
    return next(
      new AppError(`Gagal mengambil detail potongan: ${error.message}`, 500),
    );
  }
};

/**
 * POST /api/potongan
 * Menyimpan data potongan bulanan baru untuk pegawai di periode tertentu
 */
export const createPotongan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      id_periode,
      id_pegawai,
      potongan_angsuran,
      potongan_dana_wajib,
      potongan_s_pskd,
      potongan_pelkes,
      potongan_lainnya,
    } = req.body;

    // Validasi basic input relasi yang wajib ada
    if (!id_periode || !id_pegawai) {
      return next(new AppError("ID Periode dan ID Pegawai wajib diisi", 400));
    }

    const newPotongan = await potonganService.createPotongan({
      id_periode: Number(id_periode),
      id_pegawai: Number(id_pegawai),
      potongan_angsuran: potongan_angsuran ? Number(potongan_angsuran) : 0,
      potongan_dana_wajib: potongan_dana_wajib
        ? Number(potongan_dana_wajib)
        : 0,
      potongan_s_pskd: potongan_s_pskd ? Number(potongan_s_pskd) : 0,
      potongan_pelkes: potongan_pelkes ? Number(potongan_pelkes) : 0,
      potongan_lainnya: potongan_lainnya ? Number(potongan_lainnya) : 0,
    });

    return res.status(201).json({
      status: "success",
      statusCode: 201,
      message: "Data potongan bulanan berhasil ditambahkan",
      data: newPotongan,
    });
  } catch (error: any) {
    return next(
      new AppError(`Gagal menambahkan data potongan: ${error.message}`, 400),
    );
  }
};

/**
 * PUT /api/potongan/:id
 * Memperbarui nominal potongan bulanan berdasarkan ID
 */
export const updatePotongan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const {
      potongan_angsuran,
      potongan_dana_wajib,
      potongan_s_pskd,
      potongan_pelkes,
      potongan_lainnya,
    } = req.body;

    const updated = await potonganService.updatePotongan(Number(id), {
      potongan_angsuran:
        potongan_angsuran !== undefined ? Number(potongan_angsuran) : undefined,
      potongan_dana_wajib:
        potongan_dana_wajib !== undefined
          ? Number(potongan_dana_wajib)
          : undefined,
      potongan_s_pskd:
        potongan_s_pskd !== undefined ? Number(potongan_s_pskd) : undefined,
      potongan_pelkes:
        potongan_pelkes !== undefined ? Number(potongan_pelkes) : undefined,
      potongan_lainnya:
        potongan_lainnya !== undefined ? Number(potongan_lainnya) : undefined,
    });

    if (!updated) {
      return next(
        new AppError("Data potongan tidak ditemukan untuk diperbarui", 404),
      );
    }

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Data potongan bulanan berhasil diperbarui",
      data: updated,
    });
  } catch (error: any) {
    return next(
      new AppError(`Gagal memperbarui data potongan: ${error.message}`, 400),
    );
  }
};

/**
 * DELETE /api/potongan/:id
 * Menghapus data potongan bulanan berdasarkan ID (Hard Delete karena data transaksional bulanan)
 */
export const deletePotongan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const isDeleted = await potonganService.deletePotongan(Number(id));

    if (!isDeleted) {
      return next(
        new AppError("Data potongan tidak ditemukan atau sudah dihapus", 404),
      );
    }

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Data potongan bulanan berhasil dihapus secara permanen",
    });
  } catch (error: any) {
    return next(
      new AppError(`Gagal menghapus data potongan: ${error.message}`, 500),
    );
  }
};
