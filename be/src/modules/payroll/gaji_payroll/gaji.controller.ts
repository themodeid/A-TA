import { Request, Response, NextFunction } from "express";
import * as gajiService from "./gaji.service";

// Helper konversi ID aman untuk string | string[] | undefined
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
  } catch (error: any) {
    if (error?.message && (error.message.includes("Gagal Memproses Gaji") || error.message.includes("tidak ditemukan"))) {
      res.status(400).json({
        success: false,
        message: error.message,
        data: null,
      });
      return;
    }
    next(error);
  }
};

import { pool } from "../../../config/database";

// 2. Ambil Semua Rekap Gaji per Periode
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

    const periodeRes = await pool.query(
      `SELECT 
         p.id_periode, p.bulan_gaji, p.status, p.tanggal_awal, p.tanggal_akhir,
         app.catatan AS catatan_approval,
         app.created_at AS tanggal_approval
       FROM tb_periode p
       LEFT JOIN LATERAL (
         SELECT catatan, created_at FROM tb_approval WHERE id_periode = p.id_periode ORDER BY id_approval DESC LIMIT 1
       ) app ON TRUE
       WHERE p.id_periode = $1 AND p.deleted_at IS NULL;`,
      [periodeId],
    );

    const sumGajiPokok = rekapData.reduce(
      (s, r) => s + Number(r.gaji_pokok_snapshot || 0),
      0,
    );
    const sumTunjangan = rekapData.reduce(
      (s, r) => s + Number(r.tunjangan_jabatan_dll || 0),
      0,
    );
    const sumTransport = rekapData.reduce(
      (s, r) => s + Number(r.transport_uang_makan || 0),
      0,
    );
    const sumBruto = rekapData.reduce(
      (s, r) => s + Number(r.total_penghasilan_bruto || 0),
      0,
    );
    const sumPotongan = rekapData.reduce(
      (s, r) => s + Number(r.total_potongan || 0),
      0,
    );
    const sumNetto = rekapData.reduce(
      (s, r) => s + Number(r.total_penerimaan_clean || 0),
      0,
    );

    res.status(200).json({
      success: true,
      message: "Berhasil mengambil rekap gaji per periode.",
      periode: periodeRes.rows[0] || null,
      summary: {
        total_pegawai: rekapData.length,
        total_gaji_pokok: sumGajiPokok,
        total_tunjangan_jabatan_dll: sumTunjangan,
        total_transport_uang_makan: sumTransport,
        total_penghasilan_bruto: sumBruto,
        total_potongan: sumPotongan,
        total_penerimaan_clean: sumNetto,
      },
      count: rekapData.length,
      data: rekapData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payroll/gaji/periode
 * GET /api/payroll/gaji/periode-list
 * Mengambil seluruh daftar periode gaji yang tersedia beserta ringkasan status & total payroll
 */
export const getAllPeriodeGaji = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        p.id_periode,
        p.bulan_gaji,
        p.tanggal_awal,
        p.tanggal_akhir,
        p.status,
        app.catatan AS catatan_approval,
        app.created_at AS tanggal_approval,
        COUNT(DISTINCT rg.id_rekap)::int AS total_pegawai_terkalkulasi,
        COALESCE(SUM(rg.total_penerimaan_clean), 0) AS total_pengeluaran_gaji_bersih
      FROM tb_periode p
      LEFT JOIN LATERAL (
        SELECT catatan, created_at FROM tb_approval WHERE id_periode = p.id_periode ORDER BY id_approval DESC LIMIT 1
      ) app ON TRUE
      LEFT JOIN tb_rekap_gaji rg ON rg.id_periode = p.id_periode
      WHERE p.deleted_at IS NULL
      GROUP BY p.id_periode, p.bulan_gaji, p.tanggal_awal, p.tanggal_akhir, p.status, app.catatan, app.created_at
      ORDER BY p.tanggal_awal DESC;
    `);

    res.status(200).json({
      success: true,
      message: "Berhasil mengambil seluruh daftar periode gaji yang tersedia.",
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payroll/gaji/rekap
 * Mengambil seluruh data rekapitulasi gaji pegawai dari semua periode
 */
export const getAllRekap = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const rekapData = await gajiService.getAllRekap();
    res.status(200).json({
      success: true,
      message: "Berhasil mengambil seluruh daftar rekapitulasi gaji.",
      count: rekapData.length,
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
