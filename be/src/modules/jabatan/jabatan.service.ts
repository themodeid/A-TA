import { pool } from "../../config/database";

// ==========================================
// PENDATANG BARU: SINKRONISASI PARAMETER / KONFIGURASI
// ==========================================

// GET ALL CONFIGURATIONS (Untuk nampilin tarif transport, persen istri/anak di frontend)
export const getAllKonfigurasi = async () => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT id_konfigurasi, key_parameter, nilai_parameter, keterangan 
      FROM tb_konfigurasi 
      ORDER BY id_konfigurasi ASC
    `;
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
};

// UPDATE CONFIGURATION VALUE BY KEY (Untuk edit nominal tarif/persen)
export const updateKonfigurasiByKey = async (
  keyParameter: string,
  nilaiParameter: number,
) => {
  const client = await pool.connect();
  try {
    const query = `
      UPDATE tb_konfigurasi 
      SET nilai_parameter = $1 
      WHERE key_parameter = $2
      RETURNING *
    `;
    const result = await client.query(query, [nilaiParameter, keyParameter]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

export const getAllJabatan = async () => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT id_jabatan, nama_jabatan, tunjangan_jabatan_struktural 
      FROM tb_jabatan 
      WHERE deleted_at IS NULL 
      ORDER BY id_jabatan ASC
    `;
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
};

export const createJabatan = async (data: {
  nama_jabatan: string;
  tunjangan_jabatan_struktural?: number;
}) => {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO tb_jabatan (nama_jabatan, tunjangan_jabatan_struktural) 
      VALUES ($1, $2)
      ON CONFLICT (nama_jabatan) DO UPDATE SET 
        tunjangan_jabatan_struktural = EXCLUDED.tunjangan_jabatan_struktural,
        deleted_at = NULL
      RETURNING *
    `;
    const values = [data.nama_jabatan, data.tunjangan_jabatan_struktural || 0];
    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    client.release();
  }
};

export const getJabatanById = async (id: number) => {
  const client = await pool.connect();
  try {
    const query = `SELECT * FROM tb_jabatan WHERE id_jabatan = $1 AND deleted_at IS NULL`;
    const result = await client.query(query, [id]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

export const updateJabatan = async (
  id: number,
  data: { nama_jabatan: string; tunjangan_jabatan_struktural?: number },
) => {
  const client = await pool.connect();
  try {
    const query = `
      UPDATE tb_jabatan 
      SET nama_jabatan = $1, tunjangan_jabatan_struktural = $2
      WHERE id_jabatan = $3 AND deleted_at IS NULL
      RETURNING *
    `;
    const values = [
      data.nama_jabatan,
      data.tunjangan_jabatan_struktural || 0,
      id,
    ];
    const result = await client.query(query, values);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

export const softDeleteJabatan = async (id: number): Promise<boolean> => {
  const client = await pool.connect();
  try {
    const query = `
      UPDATE tb_jabatan 
      SET deleted_at = NOW() 
      WHERE id_jabatan = $1 AND deleted_at IS NULL
      RETURNING id_jabatan
    `;
    const result = await client.query(query, [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  } finally {
    client.release();
  }
};
