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

export const initializePeriode = async (req: Request, res: Response) => {
  try {
    const { id_periode } = req.body;
    if (!id_periode) {
      return res
        .status(400)
        .json({ status: "fail", message: "id_periode wajib diisi!" });
    }

    const result = await tunjanganService.initialize(Number(id_periode));
    return res.status(200).json({ status: "success", ...result });
  } catch (error: any) {
    return res.status(400).json({ status: "fail", message: error.message });
  }
};

export const saveBulkData = async (req: Request, res: Response) => {
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
