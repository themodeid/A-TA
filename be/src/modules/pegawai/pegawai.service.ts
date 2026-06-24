import { pool } from "../../config/database";
import { parseExcelPegawai } from "./excel.pegawai";

export const processMasterPegawaiSync = async (fileBuffer: Buffer) => {
  const pegawaiData = parseExcelPegawai(fileBuffer);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    for (const pegawai of pegawaiData) {
      // 1. UPSERT JABATAN
      const jabatanResult = await client.query(
        `INSERT INTO tb_jabatan (nama_jabatan) VALUES ($1) 
         ON CONFLICT (nama_jabatan) DO UPDATE SET nama_jabatan = EXCLUDED.nama_jabatan
         RETURNING id_jabatan`,
        [pegawai.nama_jabatan],
      );
      const idJabatan = jabatanResult.rows[0].id_jabatan;

      // 2. UPSERT PEGAWAI (Lengkap seluruh kolom)
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
          no_hp = COALESCE(EXCLUDED.no_hp, tb_pegawai.no_hp),
          email = COALESCE(EXCLUDED.email, tb_pegawai.email)`,
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
    await client.query("COMMIT");
    return pegawaiData.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
