import { Request, Response } from "express";
import * as potonganService from "./potongan.service";

export const upsertPotongan = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id_periode, id_pegawai, details } = req.body;

    if (!id_periode || !id_pegawai || !Array.isArray(details)) {
      res.status(400).json({
        status: "fail",
        message:
          "Payload tidak valid. Pastikan id_periode, id_pegawai, dan details (array) dikirim.",
      });
      return;
    }

    const result = await potonganService.upsertPotonganBulanan({
      id_periode: Number(id_periode),
      id_pegawai: Number(id_pegawai),
      details,
    });

    res.status(200).json({
      status: "success",
      message: "Data potongan berhasil diperbarui.",
      data: result,
    });
  } catch (error: any) {
    console.error("Error saat melakukan upsert potongan:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server.",
      error: error.message,
    });
  }
};

export const getPotonganDetail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id_periode, id_pegawai } = req.query;

    if (!id_periode || !id_pegawai) {
      res.status(400).json({
        status: "fail",
        message: "Query parameter id_periode dan id_pegawai wajib disertakan.",
      });
      return;
    }

    const data = await potonganService.getPotonganByPegawaiAndPeriode(
      Number(id_periode),
      Number(id_pegawai),
    );

    if (!data) {
      res.status(404).json({
        status: "fail",
        message:
          "Data potongan tidak ditemukan untuk periode dan pegawai tersebut.",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat mengambil data.",
      error: error.message,
    });
  }
};
