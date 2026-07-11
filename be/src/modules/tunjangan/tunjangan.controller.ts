import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/appError";
import * as repo from "./tunjangan.service";

/**
 * 1. Get data tunjangan semua pegawai pada periode tertentu
 */
export const getTunjanganByPeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id_periode = Number(req.query.id_periode);

    if (!req.query.id_periode || isNaN(id_periode) || id_periode <= 0) {
      return next(
        new AppError(
          "Parameter 'id_periode' wajib disertakan dengan angka yang valid!",
          400,
        ),
      );
    }

    const data = await repo.getTunjanganByPeriode(id_periode);

    res.status(200).json({
      status: "success",
      statusCode: 200,
      results: data.length,
      data,
    });
  } catch (error: any) {
    return next(
      new AppError(
        `Gagal mengambil data tunjangan bulanan: ${error.message}`,
        500,
      ),
    );
  }
};

/**
 * 2. Save / Upsert Tunjangan Bulanan Pegawai (Mendukung bulk & single upload spreadsheet)
 */
export const saveTunjanganBulanan = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = req.body;

    if (!body || (Array.isArray(body) && body.length === 0)) {
      return next(
        new AppError("Data payload yang dikirim tidak boleh kosong!", 400),
      );
    }

    const records = Array.isArray(body) ? body : [body];
    const savedData = [];

    for (const record of records) {
      const id_periode = Number(record.id_periode);
      const id_pegawai = Number(record.id_pegawai);

      if (
        !record.id_periode ||
        isNaN(id_periode) ||
        !record.id_pegawai ||
        isNaN(id_pegawai)
      ) {
        return next(
          new AppError(
            "Setiap item data wajib memiliki 'id_periode' dan 'id_pegawai' berupa angka!",
            400,
          ),
        );
      }

      // Pastikan konversi tipe data angka mutlak untuk mencegah bug tipe string json lepas dari frontend
      const payload = {
        id_periode,
        id_pegawai,
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
      statusCode: 200,
      message: `${savedData.length} data tunjangan bulanan berhasil disimpan/diperbarui.`,
      data: Array.isArray(body) ? savedData : savedData[0],
    });
  } catch (error: any) {
    return next(
      new AppError(
        `Gagal menyimpan data tunjangan bulanan: ${error.message}`,
        500,
      ),
    );
  }
};

/**
 * 3. Get detail tunjangan bulanan spesifik berdasarkan ID Transaksi
 */
export const getTunjanganById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id_tunjangan_bulanan = Number(req.params.id_tunjangan_bulanan);
    if (isNaN(id_tunjangan_bulanan) || id_tunjangan_bulanan <= 0) {
      return next(
        new AppError("ID transaksi tunjangan bulanan tidak valid", 400),
      );
    }

    const data = await repo.getTunjanganById(id_tunjangan_bulanan);

    if (!data) {
      return next(
        new AppError(
          "Data tunjangan bulanan tidak ditemukan atau pegawai terkait telah dihapus!",
          404,
        ),
      );
    }

    res.status(200).json({ status: "success", statusCode: 200, data });
  } catch (error: any) {
    return next(
      new AppError(
        `Gagal mengambil detail data tunjangan: ${error.message}`,
        500,
      ),
    );
  }
};

/**
 * 4. Update data tunjangan bulanan spesifik (Untuk revisi parsial)
 */
export const updateTunjanganBulanan = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id_tunjangan_bulanan = Number(req.params.id_tunjangan_bulanan);
    if (isNaN(id_tunjangan_bulanan) || id_tunjangan_bulanan <= 0) {
      return next(
        new AppError("ID transaksi tunjangan bulanan tidak valid", 400),
      );
    }

    const updated = await repo.updateTunjanganBulanan(
      id_tunjangan_bulanan,
      req.body,
    );

    if (!updated) {
      return next(
        new AppError(
          "Gagal memperbarui! Data tidak ditemukan atau pegawai terkait sudah tidak aktif.",
          404,
        ),
      );
    }

    res.status(200).json({
      status: "success",
      statusCode: 200,
      message: "Data jabatan berhasil diperbarui",
      data: updated,
    });
  } catch (error: any) {
    return next(
      new AppError(
        `Gagal memperbarui data tunjangan bulanan: ${error.message}`,
        500,
      ),
    );
  }
};

/**
 * 5. Get data tunjangan spesifik untuk 1 pegawai di periode tertentu
 */
export const getTunjanganPegawaiByPeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id_pegawai = Number(req.params.id_pegawai);
    const id_periode = Number(req.query.id_periode);

    if (isNaN(id_pegawai) || id_pegawai <= 0) {
      return next(new AppError("Parameter 'id_pegawai' tidak valid!", 400));
    }

    if (!req.query.id_periode || isNaN(id_periode) || id_periode <= 0) {
      return next(
        new AppError(
          "Parameter 'id_periode' wajib diisi dengan angka valid di query string!",
          400,
        ),
      );
    }

    const data = await repo.getTunjanganPegawaiByPeriode(
      id_pegawai,
      id_periode,
    );

    if (!data) {
      res.status(200).json({
        status: "success",
        statusCode: 200,
        message:
          "Belum ada rekaman data tunjangan untuk pegawai ini di periode tersebut.",
        data: null,
      });
      return;
    }

    res.status(200).json({ status: "success", statusCode: 200, data });
  } catch (error: any) {
    return next(
      new AppError(
        `Gagal mengambil data tunjangan pegawai: ${error.message}`,
        500,
      ),
    );
  }
};
