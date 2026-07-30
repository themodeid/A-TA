import { Request, Response } from "express";
import * as potonganService from "./potongan-bulanan.service";

export const getPotonganByPeriode = async (req: Request, res: Response) => {
  try {
    const { id_periode } = req.params;
    if (!id_periode) {
      return res.status(400).json({ message: "ID Periode wajib diisi!" });
    }

    const data = await potonganService.getAllByPeriode(Number(id_periode));
    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      status: "error",
      message: error.message || "Terjadi kesalahan pada server",
    });
  }
};

export const initPotonganPeriode = async (req: Request, res: Response) => {
  try {
    const { id_periode } = req.body;
    if (!id_periode) {
      return res.status(400).json({ message: "ID Periode wajib diisi!" });
    }

    const result = await potonganService.initialize(Number(id_periode));
    return res.status(200).json({
      status: "success",
      message: result.message,
    });
  } catch (error: any) {
    return res.status(400).json({
      status: "error",
      message: error.message || "Gagal menginisialisasi potongan",
    });
  }
};

export const saveBulkPotongan = async (req: Request, res: Response) => {
  try {
    const { id_periode, data_input } = req.body;

    if (!id_periode || !Array.isArray(data_input)) {
      return res.status(400).json({
        message:
          "Payload tidak valid! Pastikan id_periode dan data_input diisi.",
      });
    }

    const result = await potonganService.saveBulk(
      Number(id_periode),
      data_input,
    );
    return res.status(200).json({
      status: "success",
      message: result.message,
    });
  } catch (error: any) {
    return res.status(500).json({
      status: "error",
      message: error.message || "Gagal menyimpan data potongan massal",
    });
  }
};
