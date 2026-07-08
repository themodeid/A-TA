// modules/tunjangan/tunjangan.controller.ts
import { Request, Response } from "express";
import * as repo from "./konfigurasi.service";

// 1. GET ALL TUNJANGAN
export const getTunjangan = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = await repo.getAllTunjangan();
    res.status(200).json({ status: "success", data });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error.message || "Gagal mengambil data tunjangan.",
    });
  }
};

// 2. POST / CREATE TUNJANGAN BARU
export const createTunjangan = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      nama_tunjangan,
      nilai,
      jenis_tunjangan,
      sifat_tunjangan,
      kode_kondisi,
      keterangan,
    } = req.body;

    // Validasi input wajib
    if (
      !nama_tunjangan ||
      nilai === undefined ||
      !jenis_tunjangan ||
      !sifat_tunjangan
    ) {
      res.status(400).json({
        status: "fail",
        message:
          "Kolom nama_tunjangan, nilai, jenis_tunjangan, dan sifat_tunjangan wajib diisi.",
      });
      return;
    }

    // Validasi ENUM values (mencegah error CHECK constraint di PostgreSQL)
    if (!["NOMINAL", "PERSENTASE"].includes(jenis_tunjangan)) {
      res.status(400).json({
        status: "fail",
        message: "jenis_tunjangan harus 'NOMINAL' atau 'PERSENTASE'.",
      });
      return;
    }
    if (!["BULANAN", "HARIAN"].includes(sifat_tunjangan)) {
      res.status(400).json({
        status: "fail",
        message: "sifat_tunjangan harus 'BULANAN' atau 'HARIAN'.",
      });
      return;
    }

    const dataBaru = await repo.createTunjangan({
      nama_tunjangan,
      nilai: Number(nilai),
      jenis_tunjangan,
      sifat_tunjangan,
      kode_kondisi,
      keterangan,
    });

    res.status(201).json({
      status: "success",
      message: "Tunjangan baru berhasil ditambahkan.",
      data: dataBaru,
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error.message || "Gagal menambahkan tunjangan baru.",
    });
  }
};

// 3. PUT / UPDATE TUNJANGAN
export const updateTunjangan = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      nama_tunjangan,
      nilai,
      jenis_tunjangan,
      sifat_tunjangan,
      kode_kondisi,
      keterangan,
    } = req.body;

    if (
      !nama_tunjangan ||
      nilai === undefined ||
      !jenis_tunjangan ||
      !sifat_tunjangan ||
      !kode_kondisi
    ) {
      res.status(400).json({
        status: "fail",
        message: "Semua kolom data tunjangan wajib diisi untuk pembaruan.",
      });
      return;
    }

    const updated = await repo.updateTunjangan(Number(id), {
      nama_tunjangan,
      nilai: Number(nilai),
      jenis_tunjangan,
      sifat_tunjangan,
      kode_kondisi,
      keterangan,
    });

    if (!updated) {
      res.status(404).json({
        status: "fail",
        message: "Data tunjangan tidak ditemukan.",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Data tunjangan berhasil diperbarui.",
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error.message || "Gagal memperbarui data tunjangan.",
    });
  }
};

// 4. DELETE TUNJANGAN
export const deleteTunjangan = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const isDeleted = await repo.deleteTunjangan(Number(id));

    if (!isDeleted) {
      res.status(404).json({
        status: "fail",
        message: "Data tunjangan tidak ditemukan atau sudah dihapus.",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Data tunjangan berhasil dihapus.",
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error.message || "Gagal menghapus data tunjangan.",
    });
  }
};
