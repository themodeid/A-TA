import { Request, Response } from "express";
import * as repo from "./konfigurasi.service";

export const getKonfigurasi = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = await repo.getAllKonfigurasi();
    res.status(200).json({ status: "success", data });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error.message || "Gagal mengambil konfigurasi.",
    });
  }
};

export const updateKonfigurasi = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { nilai_parameter, keterangan } = req.body;

    if (nilai_parameter === undefined) {
      res.status(400).json({
        status: "fail",
        message: "Kolom 'nilai_parameter' wajib diisi.",
      });
      return;
    }

    const updated = await repo.updateKonfigurasi(
      Number(id),
      Number(nilai_parameter),
      keterangan,
    );

    if (!updated) {
      res.status(404).json({
        status: "fail",
        message: "Parameter konfigurasi tidak ditemukan.",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Parameter konfigurasi berhasil diperbarui.",
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error.message || "Gagal memperbarui konfigurasi.",
    });
  }
};
