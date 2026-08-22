import { Request, Response } from "express";
import * as koreksiJamService from "./koreksi-jam.service";

export const getKoreksiJam = async (req: Request, res: Response): Promise<void> => {
  try {
    const id_periode = req.query.id_periode ? parseInt(req.query.id_periode as string, 10) : undefined;
    const id_pegawai = req.query.id_pegawai ? parseInt(req.query.id_pegawai as string, 10) : undefined;

    const data = await koreksiJamService.getKoreksiJam({ id_periode, id_pegawai });

    res.status(200).json({
      success: true,
      message: "Data log koreksi jam berhasil diambil.",
      count: data.length,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Terjadi kesalahan saat mengambil log koreksi jam.",
    });
  }
};

export const createKoreksiJam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_periode, id_pegawai, jam_koreksi, jenis_koreksi, keterangan, bukti_dokumen } = req.body;

    if (!id_periode || !id_pegawai || jam_koreksi === undefined || !jenis_koreksi || !keterangan) {
      res.status(400).json({
        success: false,
        message: "Semua field wajib diisi (id_periode, id_pegawai, jam_koreksi, jenis_koreksi, keterangan).",
      });
      return;
    }

    const id_staf_gaji = (req as any).user?.id_pengguna || req.body.id_staf_gaji;

    const result = await koreksiJamService.createKoreksiJam({
      id_periode: Number(id_periode),
      id_pegawai: Number(id_pegawai),
      id_staf_gaji: id_staf_gaji ? Number(id_staf_gaji) : undefined,
      jam_koreksi: Number(jam_koreksi),
      jenis_koreksi,
      keterangan,
      bukti_dokumen,
    });

    res.status(201).json({
      success: true,
      message: "Koreksi jam berhasil ditambahkan dan tunjangan lembur telah disinkronkan.",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Gagal menambahkan koreksi jam.",
    });
  }
};

export const deleteKoreksiJam = async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id_koreksi = parseInt(idParam, 10);
    if (isNaN(id_koreksi)) {
      res.status(400).json({
        success: false,
        message: "ID koreksi jam tidak valid.",
      });
      return;
    }

    await koreksiJamService.deleteKoreksiJam(id_koreksi);

    res.status(200).json({
      success: true,
      message: "Data koreksi jam berhasil dihapus dan tunjangan disinkronkan kembali.",
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Gagal menghapus data koreksi jam.",
    });
  }
};
