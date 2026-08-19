import { Request, Response, NextFunction } from "express";
import * as gajiService from "./gaji.service";

// Helper internal dengan tipe yang sudah disesuaikan untuk req.params / req.query
const parseId = (value: string | string[] | undefined): number | null => {
  if (!value) return null;
  const str = Array.isArray(value) ? value[0] : value;
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? null : parsed;
};

// 1. Trigger Proses Payroll & Snapshot
export const processPayroll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const periodeId = parseId(req.params.id_periode);
    if (!periodeId) {
      res.status(400).json({
        success: false,
        message: "ID Periode harus berupa angka yang valid.",
        data: null,
      });
      return;
    }

    const result = await gajiService.executePayrollProcess(periodeId);

    res.status(200).json({
      success: true,
      message: "Proses kalkulasi gaji berhasil dieksekusi dan di-snapshot.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Ambil Semua Rekap Gaji per Periode (Tabel Summary Admin)
export const getRekapByPeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const periodeId = parseId(req.params.id_periode);
    if (!periodeId) {
      res.status(400).json({
        success: false,
        message: "ID Periode harus berupa angka yang valid.",
        data: null,
      });
      return;
    }

    const rekapData = await gajiService.getRekapByPeriode(periodeId);

    res.status(200).json({
      success: true,
      message: "Berhasil mengambil rekap gaji per periode.",
      data: rekapData,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Ambil Detail Slip Gaji berdasarkan ID Rekap
export const getDetailRekap = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const idRekap = parseId(req.params.id_rekap);
    if (!idRekap) {
      res.status(400).json({
        success: false,
        message: "ID Rekap harus berupa angka yang valid.",
        data: null,
      });
      return;
    }

    const detailGaji = await gajiService.getDetailRekap(idRekap);
    if (!detailGaji) {
      res.status(404).json({
        success: false,
        message: "Data rekap gaji tidak ditemukan.",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Berhasil mengambil detail slip gaji.",
      data: detailGaji,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Ambil Slip Gaji berdasarkan Periode & ID Pegawai
export const getSlipGajiPegawai = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const idPeriode = parseId(req.params.id_periode);
    const idPegawai = parseId(req.params.id_pegawai);

    if (!idPeriode || !idPegawai) {
      res.status(400).json({
        success: false,
        message: "ID Periode dan ID Pegawai harus berupa angka yang valid.",
        data: null,
      });
      return;
    }

    const slipData = await gajiService.getSlipByPeriodeAndPegawai(
      idPeriode,
      idPegawai,
    );
    if (!slipData) {
      res.status(404).json({
        success: false,
        message: "Slip gaji untuk pegawai dan periode tersebut belum tersedia.",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Berhasil mengambil slip gaji pegawai.",
      data: slipData,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Placeholder untuk Download PDF
export const downloadSlipPdf = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  res.status(501).json({
    success: false,
    message: "Fitur download PDF belum diimplementasikan.",
    data: null,
  });
};
