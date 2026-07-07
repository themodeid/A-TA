import { pool } from "../../config/database";
import { Golongan, GolonganInput } from "./golongan.type";

/**
 * Mengambil semua data golongan yang aktif
 */
export const getAllGolongan = async (): Promise<Golongan[]> => {
  const query = `
    SELECT id_golongan, nama_golongan, gaji_pokok_standar 
    FROM tb_golongan 
    WHERE deleted_at IS NULL 
    ORDER BY id_golongan ASC;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

/**
 * Mengambil detail satu golongan berdasarkan ID
 */
export const getGolonganById = async (id: number): Promise<Golongan | null> => {
  const query = `
    SELECT id_golongan, nama_golongan, gaji_pokok_standar 
    FROM tb_golongan 
    WHERE id_golongan = $1 AND deleted_at IS NULL;
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
};

/**
 * Menambahkan data golongan baru
 * Menggunakan Database Error Handling untuk mencegah Race Condition
 */
export const createGolongan = async (
  data: GolonganInput,
): Promise<Golongan> => {
  try {
    const query = `
      INSERT INTO tb_golongan (nama_golongan, gaji_pokok_standar) 
      VALUES ($1, $2) 
      RETURNING id_golongan, nama_golongan, gaji_pokok_standar;
    `;
    const { rows } = await pool.query(query, [
      data.nama_golongan.trim(),
      data.gaji_pokok_standar ?? 0,
    ]);
    return rows[0];
  } catch (error: any) {
    // Kode error 23505 adalah Unique Violation di PostgreSQL
    if (error.code === "23505") {
      throw new Error(
        `Nama golongan '${data.nama_golongan}' sudah terdaftar di sistem`,
      );
    }
    throw error;
  }
};

/**
 * Memperbarui data golongan dengan pengamanan data parsial
 */
export const updateGolongan = async (
  id: number,
  data: Partial<GolonganInput>,
): Promise<Golongan | null> => {
  // 1. Dapatkan data eksisting sebagai fallback data
  const currentData = await getGolonganById(id);
  if (!currentData) return null;

  // 2. Siapkan data final (jika tidak dikirim di body, pakai data yang sudah ada)
  const namaGolongan = data.nama_golongan
    ? data.nama_golongan.trim()
    : currentData.nama_golongan;
  const gajiPokok = data.gaji_pokok_standar ?? currentData.gaji_pokok_standar;

  try {
    const query = `
      UPDATE tb_golongan 
      SET nama_golongan = $1, gaji_pokok_standar = $2 
      WHERE id_golongan = $3 AND deleted_at IS NULL
      RETURNING id_golongan, nama_golongan, gaji_pokok_standar;
    `;
    const { rows } = await pool.query(query, [namaGolongan, gajiPokok, id]);
    return rows[0] || null;
  } catch (error: any) {
    if (error.code === "23505") {
      throw new Error(
        `Nama golongan '${namaGolongan}' sudah digunakan oleh data lain`,
      );
    }
    throw error;
  }
};

/**
 * Menghapus golongan dengan proteksi integritas data relasional pegawai
 */
export const softDeleteGolongan = async (id: number): Promise<boolean> => {
  // 1. Validasi apakah ada pegawai aktif (deleted_at IS NULL) yang memakai golongan ini
  const checkPegawaiQuery = `
    SELECT id_pegawai 
    FROM tb_pegawai 
    WHERE id_golongan = $1 AND deleted_at IS NULL 
    LIMIT 1;
  `;
  const { rows: pegawaiRows } = await pool.query(checkPegawaiQuery, [id]);

  if (pegawaiRows.length > 0) {
    throw new Error(
      "Golongan tidak dapat dihapus karena masih terikat dengan pegawai aktif",
    );
  }

  // 2. Eksekusi soft delete jika aman
  const deleteQuery = `
    UPDATE tb_golongan 
    SET deleted_at = NOW() 
    WHERE id_golongan = $1 AND deleted_at IS NULL;
  `;
  const result = await pool.query(deleteQuery, [id]);

  return (result.rowCount ?? 0) > 0;
};
