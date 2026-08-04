import { Request, Response, NextFunction } from "express";
import { pool } from "../../../config/database";
import * as gajiService from "./gaji.service";

// 1. Trigger Proses Payroll & Snapshot
export const processPayroll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const periodeId = parseInt(req.params.id_periode as string, 10);
    if (isNaN(periodeId)) {
      res.status(400).json({
        status: "fail",
        message: "ID Periode harus berupa angka yang valid.",
      });
      return;
    }

    const result = await gajiService.executePayrollProcess(periodeId);

    res.status(200).json({
      status: "success",
      message: "Proses kalkulasi gaji berhasil dieksekusi dan di-snapshot.",
      data: result,
    });
  } catch (error: any) {
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
    const rawId = req.params.id_periode as string;
    const periodeId = parseInt(rawId, 10);

    if (isNaN(periodeId)) {
      res.status(400).json({
        status: "fail",
        message: "ID Periode harus berupa angka yang valid.",
      });
      return;
    }

    const query = `
      SELECT r.*, p.nama_dan_tanggal_lahir 
      FROM tb_rekap_gaji r
      JOIN tb_pegawai p ON r.id_pegawai = p.id_pegawai
      WHERE r.id_periode = $1;
    `;
    const result = await pool.query(query, [periodeId]);

    res.status(200).json({
      status: "success",
      data: result.rows,
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
    const rawId = req.params.id_rekap as string;
    const idRekap = parseInt(rawId, 10);

    if (isNaN(idRekap)) {
      res.status(400).json({
        status: "fail",
        message: "ID Rekap harus berupa angka yang valid.",
      });
      return;
    }

    const rekapQuery = `
      SELECT r.*, p.nama_dan_tanggal_lahir 
      FROM tb_rekap_gaji r
      JOIN tb_pegawai p ON r.id_pegawai = p.id_pegawai
      WHERE r.id_rekap = $1;
    `;
    const rekapRes = await pool.query(rekapQuery, [idRekap]);

    if (rekapRes.rows.length === 0) {
      res.status(404).json({
        status: "fail",
        message: "Data rekap gaji tidak ditemukan.",
      });
      return;
    }

    const detailQuery = `
      SELECT * FROM tb_rekap_gaji_detail WHERE id_rekap = $1;
    `;
    const detailRes = await pool.query(detailQuery, [idRekap]);

    res.status(200).json({
      status: "success",
      data: {
        ...rekapRes.rows[0],
        details: detailRes.rows,
      },
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
    const { id_periode, id_pegawai } = req.params;

    const rekapQuery = `
      SELECT r.*, p.nama_dan_tanggal_lahir 
      FROM tb_rekap_gaji r
      JOIN tb_pegawai p ON r.id_pegawai = p.id_pegawai
      WHERE r.id_periode = $1 AND r.id_pegawai = $2;
    `;
    const rekapRes = await pool.query(rekapQuery, [id_periode, id_pegawai]);

    if (rekapRes.rows.length === 0) {
      res.status(404).json({
        status: "fail",
        message: "Slip gaji untuk pegawai dan periode tersebut belum tersedia.",
      });
      return;
    }

    const idRekap = rekapRes.rows[0].id_rekap;
    const detailQuery = `
      SELECT * FROM tb_rekap_gaji_detail WHERE id_rekap = $1;
    `;
    const detailRes = await pool.query(detailQuery, [idRekap]);

    res.status(200).json({
      status: "success",
      data: {
        ...rekapRes.rows[0],
        details: detailRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 5. Placeholder untuk Download PDF (Opsional)
export const downloadSlipPdf = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  res.status(501).json({
    status: "error",
    message: "Fitur download PDF belum diimplementasikan.",
  });
};
