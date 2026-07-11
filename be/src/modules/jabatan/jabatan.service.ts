import { pool } from "../../config/database";

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
    // Skenario ON CONFLICT yang aman: Mengembalikan data lama jika duplikat aktif,
    // atau me-restore kembali jika data tersebut sebelumnya sudah di-soft delete.
    const query = `
      INSERT INTO tb_jabatan (nama_jabatan, tunjangan_jabatan_struktural) 
      VALUES ($1, $2)
      ON CONFLICT (nama_jabatan) 
      DO UPDATE SET 
        tunjangan_jabatan_struktural = CASE 
          WHEN tb_jabatan.deleted_at IS NOT NULL THEN EXCLUDED.tunjangan_jabatan_struktural 
          ELSE tb_jabatan.tunjangan_jabatan_struktural 
        END,
        deleted_at = CASE 
          WHEN tb_jabatan.deleted_at IS NOT NULL THEN NULL 
          ELSE tb_jabatan.deleted_at 
        END
      RETURNING *
    `;
    const values = [data.nama_jabatan, data.tunjangan_jabatan_struktural ?? 0];
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
  data: { nama_jabatan?: string; tunjangan_jabatan_struktural?: number },
) => {
  const client = await pool.connect();
  try {
    // Dioptimasi menggunakan COALESCE langsung di level SQL.
    // Jika data.nama_jabatan bernilai null/undefined, Postgres otomatis memakai nilai lama (nama_jabatan).
    const query = `
      UPDATE tb_jabatan 
      SET 
        nama_jabatan = COALESCE($1, nama_jabatan), 
        tunjangan_jabatan_struktural = COALESCE($2, tunjangan_jabatan_struktural)
      WHERE id_jabatan = $3 AND deleted_at IS NULL
      RETURNING *
    `;
    const values = [
      data.nama_jabatan ?? null,
      data.tunjangan_jabatan_struktural ?? null,
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
    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
};
