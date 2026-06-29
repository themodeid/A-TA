import { pool } from "../../config/database";
import { parseExcelPegawai } from "./excel.pegawai";

export const processMasterPegawaiSync = async (fileBuffer: Buffer) => {
  const pegawaiData = parseExcelPegawai(fileBuffer);
  console.log("Pegawai data yang diparse:", pegawaiData);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    for (const pegawai of pegawaiData) {
      const { rows: jabatanRows } = await client.query(
        `INSERT INTO tb_jabatan (nama_jabatan) VALUES ($1) 
         ON CONFLICT (nama_jabatan) DO UPDATE SET nama_jabatan = EXCLUDED.nama_jabatan
         RETURNING id_jabatan`,
        [pegawai.nama_jabatan],
      );
      const idJabatan = jabatanRows[0].id_jabatan;

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
          email = COALESCE(EXCLUDED.email, tb_pegawai.email),
          deleted_at = NULL`,
        [
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

// GET ALL (Hanya mengambil data yang belum di-soft delete)
export const getMasterPegawai = async () => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT p.*, j.nama_jabatan 
      FROM tb_pegawai p
      INNER JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
      WHERE p.deleted_at IS NULL
      ORDER BY p.id_pegawai DESC
    `;
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
};

// CREATE SINGLE PEGAWAI
export const createPegawai = async (data: any) => {
  const client = await pool.connect();
  try {
    // 1. Validasi Logis: Jika Tidak Kawin, anak otomatis 0
    let jumlahAnak = data.jumlah_anak || 0;
    if (data.status_perkawinan === "TK") {
      jumlahAnak = 0;
    }

    // 2. Gunakan ON CONFLICT untuk mengaktifkan kembali jika sebelumnya di-soft delete
    const query = `
      INSERT INTO tb_pegawai (
        nama_lengkap, id_jabatan, pangkat_golongan, status_perkawinan, 
        jumlah_anak, gaji_pokok_dasar, jenis_kelamin, no_hp, email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (nama_lengkap) DO UPDATE SET
        id_jabatan = EXCLUDED.id_jabatan,
        pangkat_golongan = EXCLUDED.pangkat_golongan,
        status_perkawinan = EXCLUDED.status_perkawinan,
        jumlah_anak = EXCLUDED.jumlah_anak,
        gaji_pokok_dasar = EXCLUDED.gaji_pokok_dasar,
        jenis_kelamin = EXCLUDED.jenis_kelamin,
        no_hp = COALESCE(EXCLUDED.no_hp, tb_pegawai.no_hp),
        email = COALESCE(EXCLUDED.email, tb_pegawai.email),
        deleted_at = NULL -- Hidupkan kembali data jika sebelumnya dihapus
      RETURNING *
    `;

    const values = [
      data.nama_lengkap,
      data.id_jabatan,
      data.pangkat_golongan,
      data.status_perkawinan,
      jumlahAnak,
      data.gaji_pokok_dasar || 0,
      data.jenis_kelamin,
      data.no_hp,
      data.email,
    ];

    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    client.release();
  }
};

// GET BY ID (Pastikan data yang sudah dihapus tidak bisa diakses)
export const getPegawaiById = async (id: number) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT p.*, j.nama_jabatan 
      FROM tb_pegawai p
      INNER JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
      WHERE p.id_pegawai = $1 AND p.deleted_at IS NULL
    `;
    const result = await client.query(query, [id]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

// UPDATE PEGAWAI
export const updatePegawai = async (id: number, data: any) => {
  const client = await pool.connect();
  try {
    // Validasi Logis: Jika Tidak Kawin, anak otomatis 0
    let jumlahAnak = data.jumlah_anak;
    if (data.status_perkawinan === "TK") {
      jumlahAnak = 0;
    }

    const query = `
      UPDATE tb_pegawai 
      SET 
        nama_lengkap = $1, id_jabatan = $2, pangkat_golongan = $3, 
        status_perkawinan = $4, jumlah_anak = $5, gaji_pokok_dasar = $6, 
        jenis_kelamin = $7, no_hp = $8, email = $9
      WHERE id_pegawai = $10 AND deleted_at IS NULL
      RETURNING *
    `;
    const values = [
      data.nama_lengkap,
      data.id_jabatan,
      data.pangkat_golongan,
      data.status_perkawinan,
      jumlahAnak,
      data.gaji_pokok_dasar,
      data.jenis_kelamin,
      data.no_hp,
      data.email,
      id,
    ];
    const result = await client.query(query, values);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

// SOFT DELETE PEGAWAI
export const softDeletePegawai = async (id: number): Promise<boolean> => {
  const client = await pool.connect();
  try {
    const query = `
      UPDATE tb_pegawai 
      SET deleted_at = NOW() 
      WHERE id_pegawai = $1 AND deleted_at IS NULL
      RETURNING id_pegawai
    `;
    const result = await client.query(query, [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  } finally {
    client.release();
  }
};
