import { Request, Response } from "express";
import * as tunjanganService from "../tunjangan_bulanan/tunjanganBulananService"; // Sesuaikan path jika service-mu sudah .ts juga

export const getAllTunjanganByPeriode = async (req: Request, res: Response) => {
  try {
    // UBAH DI SINI: Mengambil dari req.params, bukan req.query
    const { id_periode } = req.params;

    // Validasi tetap sama, memastikan parameter yang diketik di URL adalah angka
    if (!id_periode || isNaN(Number(id_periode))) {
      return res.status(400).json({
        status: "error",
        message:
          "Gagal memuat data. Parameter 'id_periode' di URL wajib diisi dengan angka yang valid!",
      });
    }

    // Oper ke service dengan konversi ke number
    const data = await tunjanganService.getAllByPeriode(Number(id_periode));

    return res.status(200).json({
      status: "success",
      message: `Berhasil mengambil data tunjangan untuk periode ID: ${id_periode}`,
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      status: "error",
      message: error.message || "Terjadi kesalahan internal pada server.",
    });
  }
};

// ==========================================
// CONTROLLER: INISIALISASI WADAH PERIODE
// ==========================================
export const initializeTunjangan = async (req: Request, res: Response) => {
  try {
    const { id_periode } = req.body; // Biasanya init dilempar via body JSON

    if (!id_periode || isNaN(Number(id_periode))) {
      return res.status(400).json({
        status: "error",
        message: "Parameter 'id_periode' wajib diisi dalam request body!",
      });
    }

    const result = await tunjanganService.initialize(Number(id_periode));
    return res.status(200).json({ status: "success", ...result });
  } catch (error: any) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// ==========================================
// CONTROLLER: SIMPAN MASSAL (BULK SAVE)
// ==========================================
export const saveBulkTunjangan = async (req: Request, res: Response) => {
  try {
    const { id_periode, data_input } = req.body;

    if (!id_periode || isNaN(Number(id_periode))) {
      return res.status(400).json({
        status: "error",
        message: "Parameter 'id_periode' wajib diisi dalam request body!",
      });
    }

    if (!Array.isArray(data_input) || data_input.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Data input harus berupa array dan tidak boleh kosong!",
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
