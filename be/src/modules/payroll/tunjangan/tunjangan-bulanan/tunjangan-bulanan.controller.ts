import { Request, Response } from "express";
import * as tunjanganService from "./tunjangan-bulanan.service";

export const getByPeriode = async (req: Request, res: Response) => {
  try {
    const { id_periode } = req.params;
    const data = await tunjanganService.getAllByPeriode(Number(id_periode));

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      status: "error",
      message: error.message || "Gagal mengambil data tunjangan bulanan.",
    });
  }
};

export const initialize = async (req: Request, res: Response) => {
  try {
    // 1. Ambil id_periode secara aman (support req.body maupun req.params)
    const id_periode = req.body?.id_periode || req.params?.id_periode;

    // 2. Validasi sebelum dikirim ke service
    if (!id_periode || isNaN(Number(id_periode))) {
      return res.status(400).json({
        status: "fail",
        message: "Parameter 'id_periode' wajib diisi dan harus berupa angka!",
      });
    }

    // 3. Eksekusi service
    const result = await tunjanganService.initialize(Number(id_periode));
    return res.status(200).json({ status: "success", ...result });
  } catch (error: any) {
    return res.status(400).json({ status: "fail", message: error.message });
  }
};

export const saveBulk = async (req: Request, res: Response) => {
  try {
    const { id_periode, data_input } = req.body;

    if (!id_periode || !Array.isArray(data_input)) {
      return res.status(400).json({
        status: "fail",
        message:
          "Payload tidak valid. Pastikan id_periode dan data_input bertipe array.",
      });
    }

    const result = await tunjanganService.saveBulk(
      Number(id_periode),
      data_input,
    );
    return res.status(200).json({ status: "success", ...result });
  } catch (error: any) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

export const deleteByPeriode = async (req: Request, res: Response) => {
  try {
    const { id_periode } = req.params;

    if (isNaN(Number(id_periode))) {
      return res.status(400).json({
        status: "error",
        message: "ID Periode tidak valid! Harus berupa angka.",
      });
    }

    const result = await tunjanganService.deleteByPeriode(Number(id_periode));

    return res.status(200).json({
      status: "success",
      message: result.message,
      data: {
        total_deleted: result.deleted_count,
      },
    });
  } catch (error: any) {
    const statusCode =
      error.message.includes("tidak ditemukan") ||
      error.message.includes("dikunci")
        ? 400
        : 500;

    return res.status(statusCode).json({
      status: "error",
      message: error.message || "Terjadi kesalahan internal pada server.",
    });
  }
};
