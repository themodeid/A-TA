import { Request, Response } from "express";
import * as repo from "./tunjangan.service";

/**
 * 1. Get data tunjangan semua pegawai pada periode tertentu
 * URL: GET /api/tunjangan?id_periode=X
 */
export const getTunjanganByPeriode = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id_periode } = req.query;

    if (!id_periode) {
      res.status(400).json({
        status: "fail",
        message: "Parameter 'id_periode' wajib disertakan!",
      });
      return;
    }

    const data = await repo.getTunjanganByPeriode(Number(id_periode));

    res.status(200).json({
      status: "success",
      results: data.length,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error.message || "Gagal mengambil data tunjangan bulanan.",
    });
  }
};

/**
 * 2. Save / Upsert Tunjangan Bulanan Pegawai
 * URL: POST /api/tunjangan
 * Mendukung single object atau array (bulk) untuk input tipe spreadsheet di frontend
 */
export const saveTunjanganBulanan = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const body = req.body;

    // Validasi input kosong
    if (!body || (Array.isArray(body) && body.length === 0)) {
      res.status(400).json({
        status: "fail",
        message: "Data yang dikirim tidak boleh kosong!",
      });
      return;
    }

    // Ubah ke bentuk array jika inputnya cuma single object biar bisa diproses pakai loop yang sama
    const records = Array.isArray(body) ? body : [body];
    const savedData = [];

    // Loop dan jalankan upsert ke repository
    for (const record of records) {
      if (!record.id_periode || !record.id_pegawai) {
        res.status(400).json({
          status: "fail",
          message: "Setiap data wajib memiliki 'id_periode' dan 'id_pegawai'!",
        });
        return;
      }

      // Pastikan nilai numeric default ke 0 kalau dikosongkan/null dari frontend
      const payload = {
        id_periode: Number(record.id_periode),
        id_pegawai: Number(record.id_pegawai),
        tunjangan_kesra: Number(record.tunjangan_kesra ?? 0),
        tunjangan_supervisi: Number(record.tunjangan_supervisi ?? 0),
        tunjangan_wali_kelas: Number(record.tunjangan_wali_kelas ?? 0),
        tunjangan_piket: Number(record.tunjangan_piket ?? 0),
        tunjangan_jurbeng: Number(record.tunjangan_jurbeng ?? 0),
        honor_bulan: Number(record.honor_bulan ?? 0),
        tunjangan_khusus: Number(record.tunjangan_khusus ?? 0),
        total_jam_lebih: Number(record.total_jam_lebih ?? 0),
        tunj_kel_gabungan: Number(record.tunj_kel_gabungan ?? 0),
        tunjjab_25_pp1985: Number(record.tunjjab_25_pp1985 ?? 0),
        sb_dana_chuk_2_pp85: Number(record.sb_dana_chuk_2_pp85 ?? 0),
        sb_dana_chuk_8_pp85: Number(record.sb_dana_chuk_8_pp85 ?? 0),
        tunjangan_perbaikan_penghasilan: Number(
          record.tunjangan_perbaikan_penghasilan ?? 0,
        ),
      };

      const result = await repo.upsertTunjanganBulanan(payload);
      savedData.push(result);
    }

    res.status(200).json({
      status: "success",
      message: `${savedData.length} data tunjangan bulanan berhasil disimpan/diperbarui.`,
      data: Array.isArray(body) ? savedData : savedData[0],
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error.message || "Gagal menyimpan data tunjangan bulanan.",
    });
  }
};

/**
 * 3. Get detail tunjangan bulanan spesifik berdasarkan ID Transaksi
 * URL: GET /api/tunjangan/:id_tunjangan_bulanan
 */
export const getTunjanganById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id_tunjangan_bulanan } = req.params;
    const data = await repo.getTunjanganById(Number(id_tunjangan_bulanan));

    if (!data) {
      res.status(404).json({
        status: "fail",
        message: "Data tunjangan bulanan tidak ditemukan!",
      });
      return;
    }

    res.status(200).json({ status: "success", data });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error.message || "Gagal mengambil detail data tunjangan.",
    });
  }
};

/**
 * 4. Update data tunjangan bulanan spesifik (Untuk revisi parsial)
 * URL: PUT /api/tunjangan/:id_tunjangan_bulanan
 */
export const updateTunjanganBulanan = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id_tunjangan_bulanan } = req.params;
    const data = req.body;

    const updated = await repo.updateTunjanganBulanan(
      Number(id_tunjangan_bulanan),
      data,
    );

    if (!updated) {
      res.status(404).json({
        status: "fail",
        message: "Gagal memperbarui, data tidak ditemukan!",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Data tunjangan bulanan berhasil diperbarui.",
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error.message || "Gagal memperbarui data tunjangan bulanan.",
    });
  }
};

/**
 * 5. Get data tunjangan spesifik untuk 1 pegawai di periode tertentu
 * URL: GET /api/tunjangan/pegawai/:id_pegawai?id_periode=X
 */
export const getTunjanganPegawaiByPeriode = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id_pegawai } = req.params;
    const { id_periode } = req.query;

    if (!id_periode) {
      res.status(400).json({
        status: "fail",
        message: "Parameter 'id_periode' wajib diisi di query string!",
      });
      return;
    }

    const data = await repo.getTunjanganPegawaiByPeriode(
      Number(id_pegawai),
      Number(id_periode),
    );

    if (!data) {
      res.status(204).json({
        status: "success",
        message:
          "Belum ada rekaman data tunjangan untuk pegawai ini di periode tersebut.",
        data: null,
      });
      return;
    }

    res.status(200).json({ status: "success", data });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error.message || "Gagal mengambil data tunjangan pegawai.",
    });
  }
};
