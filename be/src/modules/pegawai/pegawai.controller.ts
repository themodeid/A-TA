import { Request, Response, NextFunction } from "express";
import { parseExcelPegawai } from "../../utils/excel";
import { pool } from "../../config/database";
import { AppError } from "../../utils/appError";

export const uploadMasterPegawai = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.file) {
    return next(new AppError("Silakan unggah file Excel terlebih dahulu", 400));
  }

  const client = await pool.connect();

  try {
    // 1. Parsing file excel yang masuk
    const pegawaiData = parseExcelPegawai(req.file.path);

    // 2. Mulai transaksi database agar aman (All or Nothing)
    await client.query("BEGIN");

    for (const pegawai of pegawaiData) {
      // 3. UPSERT JABATAN DULU
      // Karena id_jabatan di tb_pegawai membutuhkan id relasi dari tb_jabatan
      const jabatanResult = await client.query(
        `INSERT INTO tb_jabatan (nama_jabatan) 
         VALUES ($1) 
         ON CONFLICT (nama_jabatan) DO UPDATE SET nama_jabatan = EXCLUDED.nama_jabatan
         RETURNING id_jabatan`,
        [pegawai.nama_jabatan],
      );

      const idJabatan = jabatanResult.rows[0].id_jabatan;

      // 4. UPSERT PEGAWAI (Jika ID Pegawai sudah ada, timpa data lamanya)
      await client.query(
        `INSERT INTO tb_pegawai (
          id_pegawai, nama_lengkap, id_jabatan, pangkat_golongan, 
          status_perkawinan, jumlah_anak, gaji_pokok_dasar, jenis_kelamin, no_hp, email
         ) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id_pegawai) DO UPDATE SET
          nama_lengkap = EXCLUDED.nama_lengkap,
          id_jabatan = EXCLUDED.id_jabatan,
          pangkat_golongan = EXCLUDED.pangkat_golongan,
          status_perkawinan = EXCLUDED.status_perkawinan,
          jumlah_anak = EXCLUDED.jumlah_anak,
          gaji_pokok_dasar = EXCLUDED.gaji_pokok_dasar,
          jenis_kelamin = EXCLUDED.jenis_kelamin,
          no_hp = EXCLUDED.no_hp,
          email = EXCLUDED.email`,
        [
          pegawai.id_pegawai,
          pegawai.nama_lengkap,
          idJabatan,
          pegawai.pangkat_golongan,
          pegawai.status_perkawinan,
          pegawai.jumlah_anak,
          pegawai.gaji_pokok_dasar,
          pegawai.jenis_kelamin,
          pegawai.no_hp,
          pegawai.email,
        ],
      );
    }

    // Komit semua transaksi jika berhasil tanpa error
    await client.query("COMMIT");

    return res.status(200).json({
      status: "success",
      statusCode: 200,
      message: `Berhasil sinkronisasi ${pegawaiData.length} data master pegawai dari Excel`,
    });
  } catch (error: any) {
    // Batalkan semua perubahan jika ada satu saja baris yang gagal
    await client.query("ROLLBACK");
    return next(
      new AppError(`Gagal memproses data pegawai: ${error.message}`, 500),
    );
  } finally {
    // Kembalikan koneksi ke pool database
    client.release();
  }
};
