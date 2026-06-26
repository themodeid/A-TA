import { pool } from "../../config/database";
import { parseExcelPegawai } from "./excel.pegawai";

export const processMasterPegawaiSync = async (fileBuffer: Buffer) => {
  const pegawaiData = parseExcelPegawai(fileBuffer);
  console.log("Pegawai data yang diparse:", pegawaiData);
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

      // 2. UPSERT PEGAWAI (Gunakan nama_lengkap sebagai acuan UNIQUE)
      // id_pegawai tidak dimasukkan karena otomatis diisi oleh SERIAL di DB
      await client.query(
        `INSERT INTO tb_pegawai (
          nama_lengkap, id_jabatan, pangkat_golongan, 
          status_perkawinan, jumlah_anak, gaji_pokok_dasar, jenis_kelamin, no_hp, email
         ) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (nama_lengkap) DO UPDATE SET 
          id_jabatan = EXCLUDED.id_jabatan,
          pangkat_golongan = EXCLUDED.pangkat_golongan,
          status_perkawinan = EXCLUDED.status_perkawinan,
          jumlah_anak = EXCLUDED.jumlah_anak,
          gaji_pokok_dasar = EXCLUDED.gaji_pokok_dasar,
          jenis_kelamin = EXCLUDED.jenis_kelamin,
          no_hp = COALESCE(EXCLUDED.no_hp, tb_pegawai.no_hp),
          email = COALESCE(EXCLUDED.email, tb_pegawai.email)`,
        [
          pegawai.nama_lengkap, // Menjadi tiang pancang deteksi conflict
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

export const getMasterPegawai = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT * FROM tb_pegawai");
    return result.rows;
  } finally {
    client.release();
  }
};
