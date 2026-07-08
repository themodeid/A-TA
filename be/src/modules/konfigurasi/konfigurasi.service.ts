import { pool } from "../../config/database";

export interface KonfigurasiInput {
  key_parameter: string;
  nilai_parameter: number;
  keterangan?: string;
}

// Ambil semua parameter konfigurasi untuk ditampilkan di pengaturan aplikasi
export const getAllKonfigurasi = async () => {
  const client = await pool.connect();
  try {
    const query = `SELECT id_konfigurasi, key_parameter, nilai_parameter, keterangan FROM tb_konfigurasi ORDER BY id_konfigurasi ASC`;
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
};

// Ambil 1 parameter spesifik berdasarkan KEY (sangat berguna untuk formula hitung gaji)
export const getKonfigurasiByKey = async (key: string) => {
  const client = await pool.connect();
  try {
    const query = `SELECT * FROM tb_konfigurasi WHERE key_parameter = $1`;
    const result = await client.query(query, [key]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

// Update nilai parameter (Misal: mengubah tarif transport WFO dari 30.000 menjadi 35.000)
export const updateKonfigurasi = async (
  id: number,
  nilai_parameter: number,
  keterangan?: string,
) => {
  const client = await pool.connect();
  try {
    const query = `
      UPDATE tb_konfigurasi 
      SET nilai_parameter = $1, keterangan = COALESCE($2, keterangan)
      WHERE id_konfigurasi = $3
      RETURNING *
    `;
    const result = await client.query(query, [nilai_parameter, keterangan, id]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};
