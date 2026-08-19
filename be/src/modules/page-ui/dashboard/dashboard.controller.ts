import { Request, Response } from "express";
import { getDashboardSummary } from "./dashboard.service";

export async function getSummary(req: Request, res: Response) {
  const idPeriodeRaw = req.params.idPeriode;
  const idPeriode = Number(idPeriodeRaw);

  if (!idPeriodeRaw || Number.isNaN(idPeriode)) {
    return res.status(400).json({
      success: false,
      message: "Parameter id_periode wajib diisi dan harus berupa angka",
      data: null,
    });
  }

  try {
    const summary = await getDashboardSummary(idPeriode);
    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil ringkasan dashboard",
      data: summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan internal";

    const isNotFound = message.includes("tidak ditemukan");

    return res.status(isNotFound ? 404 : 500).json({
      success: false,
      message,
      data: null,
    });
  }
}
