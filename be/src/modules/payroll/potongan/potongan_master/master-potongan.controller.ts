import { Request, Response } from "express";
import * as masterPotonganService from "./master-potongan.service";

export const getAllMaster = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = await masterPotonganService.getAllMasterPotongan();
    res.status(200).json({
      status: "success",
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: "Gagal mengambil data master potongan.",
      error: error.message,
    });
  }
};

export const getMasterById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ status: "fail", message: "ID tidak valid." });
      return;
    }

    const data = await masterPotonganService.getMasterPotonganById(id);
    if (!data) {
      res.status(404).json({
        status: "fail",
        message: "Master potongan tidak ditemukan.",
      });
      return;
    }

    res.status(200).json({ status: "success", data });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: "Gagal mengambil detail master potongan.",
      error: error.message,
    });
  }
};

export const createMaster = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { nama_potongan, kode_potongan } = req.body;

    if (!nama_potongan || !kode_potongan) {
      res.status(400).json({
        status: "fail",
        message: "nama_potongan dan kode_potongan wajib diisi.",
      });
      return;
    }

    const data = await masterPotonganService.createMasterPotongan(req.body);
    res.status(201).json({
      status: "success",
      message: "Master potongan berhasil ditambahkan.",
      data,
    });
  } catch (error: any) {
    // Error unique constraint dari PostgreSQL
    if (error.code === "23505") {
      res.status(400).json({
        status: "fail",
        message: "kode_potongan sudah digunakan.",
      });
      return;
    }

    res.status(500).json({
      status: "error",
      message: "Gagal menambahkan master potongan.",
      error: error.message,
    });
  }
};

export const updateMaster = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ status: "fail", message: "ID tidak valid." });
      return;
    }

    const updated = await masterPotonganService.updateMasterPotongan(
      id,
      req.body,
    );
    if (!updated) {
      res.status(404).json({
        status: "fail",
        message: "Master potongan tidak ditemukan atau gagal diperbarui.",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Master potongan berhasil diperbarui.",
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: "Gagal memperbarui master potongan.",
      error: error.message,
    });
  }
};

export const deleteMaster = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ status: "fail", message: "ID tidak valid." });
      return;
    }

    const success = await masterPotonganService.deleteMasterPotongan(id);
    if (!success) {
      res.status(404).json({
        status: "fail",
        message: "Master potongan tidak ditemukan.",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Master potongan berhasil dihapus.",
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: "Gagal menghapus master potongan.",
      error: error.message,
    });
  }
};
