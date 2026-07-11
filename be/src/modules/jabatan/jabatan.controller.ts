import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/appError";
import * as jabatanService from "./jabatan.service";

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

    // 1. Validasi Input Dasar
    if (
      !nama_jabatan ||
      typeof nama_jabatan !== "string" ||
      nama_jabatan.trim() === ""
    ) {
      return next(
        new AppError("Nama jabatan wajib diisi dengan teks yang valid", 400),
      );
    }

    // 2. Defensif: Pastikan nominal tunjangan dikonversi ke angka murni (menghindari string)
    const nominalTunjangan =
      tunjangan_jabatan_struktural !== undefined
        ? Number(tunjangan_jabatan_struktural)
        : 0;

    if (isNaN(nominalTunjangan) || nominalTunjangan < 0) {
      return next(
        new AppError(
          "Tunjangan jabatan struktural harus berupa angka positif",
          400,
        ),
      );
    }

    const newJabatan = await jabatanService.createJabatan({
      nama_jabatan: nama_jabatan.trim(),
      tunjangan_jabatan_struktural: nominalTunjangan,
    });

    return res.status(201).json({
      status: "success",
      statusCode: 201,
      message: "Jabatan berhasil ditambahkan",
      data: newJabatan,
    });
  } catch (error: any) {
    // Menangkap error jika melanggar unique constraint index aktif di database
    if (error.code === "23505") {
      return next(
        new AppError(
          "Nama jabatan tersebut sudah terdaftar dan masih aktif",
          400,
        ),
      );
    }
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
    const id = Number(req.params.id);

    // 3. Validasi ID agar tidak memproses NaN atau angka invalid
    if (isNaN(id) || id <= 0) {
      return next(new AppError("ID Jabatan tidak valid", 400));
    }

    const jabatan = await jabatanService.getJabatanById(id);

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
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
      return next(new AppError("ID Jabatan tidak valid", 400));
    }

    const { nama_jabatan, tunjangan_jabatan_struktural } = req.body;
    const updateData: {
      nama_jabatan?: string;
      tunjangan_jabatan_struktural?: number;
    } = {};

    // 4. Sanitisasi Parsial: Hanya masukkan property ke service jika dikirim di body
    if (nama_jabatan !== undefined) {
      if (typeof nama_jabatan !== "string" || nama_jabatan.trim() === "") {
        return next(new AppError("Nama jabatan baru tidak boleh kosong", 400));
      }
      updateData.nama_jabatan = nama_jabatan.trim();
    }

    if (tunjangan_jabatan_struktural !== undefined) {
      const nominal = Number(tunjangan_jabatan_struktural);
      if (isNaN(nominal) || nominal < 0) {
        return next(new AppError("Tunjangan harus berupa angka positif", 400));
      }
      updateData.tunjangan_jabatan_struktural = nominal;
    }

    const updated = await jabatanService.updateJabatan(id, updateData);

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
    if (error.code === "23505") {
      return next(
        new AppError(
          "Gagal memperbarui! Nama jabatan tersebut sudah digunakan oleh jabatan aktif lain",
          400,
        ),
      );
    }
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
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
      return next(new AppError("ID Jabatan tidak valid", 400));
    }

    const isDeleted = await jabatanService.softDeleteJabatan(id);

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
