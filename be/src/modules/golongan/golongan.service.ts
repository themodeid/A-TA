import { pool } from "../../config/database";
// Impor tipe data dari file terpisah
import { Golongan, GolonganInput } from "./golongan.type";

/**
 * Mengambil semua data golongan yang belum dihapus (soft delete)
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
 */
export const createGolongan = async (
  data: GolonganInput,
): Promise<Golongan> => {
  // Cek apakah nama_golongan sudah terdaftar untuk menghindari duplikasi
  const checkQuery = `SELECT id_golongan FROM tb_golongan WHERE nama_golongan = $1 AND deleted_at IS NULL;`;
  const checkResult = await pool.query(checkQuery, [data.nama_golongan]);

  if (checkResult.rows.length > 0) {
    throw new Error("Nama golongan sudah digunakan");
  }

  const query = `
    INSERT INTO tb_golongan (nama_golongan, gaji_pokok_standar) 
    VALUES ($1, $2) 
    RETURNING id_golongan, nama_golongan, gaji_pokok_standar;
  `;
  const { rows } = await pool.query(query, [
    data.nama_golongan,
    data.gaji_pokok_standar,
  ]);
  return rows[0];
};

/**
 * Memperbarui data golongan
 */
export const updateGolongan = async (
  id: number,
  data: Partial<GolonganInput>,
): Promise<Golongan | null> => {
  // Cek keberadaan golongan terlebih dahulu
  const targetGolongan = await getGolonganById(id);
  if (!targetGolongan) return null;

  // Jika nama golongan diubah, cek keunikan nama baru tersebut
  if (
    data.nama_golongan &&
    data.nama_golongan !== targetGolongan.nama_golongan
  ) {
    const checkQuery = `SELECT id_golongan FROM tb_golongan WHERE nama_golongan = $1 AND id_golongan != $2 AND deleted_at IS NULL;`;
    const checkResult = await pool.query(checkQuery, [data.nama_golongan, id]);
    if (checkResult.rows.length > 0) {
      throw new Error("Nama golongan baru sudah digunakan oleh golongan lain");
    }
  }

  const namaGolongan = data.nama_golongan ?? targetGolongan.nama_golongan;
  const gajiPokok =
    data.gaji_pokok_standar ?? targetGolongan.gaji_pokok_standar;

  const query = `
    UPDATE tb_golongan 
    SET nama_golongan = $1, gaji_pokok_standar = $2 
    WHERE id_golongan = $3 AND deleted_at IS NULL
    RETURNING id_golongan, nama_golongan, gaji_pokok_standar;
  `;
  const { rows } = await pool.query(query, [namaGolongan, gajiPokok, id]);
  return rows[0] || null;
};

/**
 * Menghapus golongan menggunakan metode Soft Delete dengan proteksi integritas data pegawai
 */
export const softDeleteGolongan = async (id: number): Promise<boolean> => {
  // 1. Logika Krusial: Cek apakah masih ada pegawai aktif yang menggunakan id_golongan ini
  const checkPegawaiQuery = `
    SELECT id_pegawai 
    FROM tb_pegawai 
    WHERE id_golongan = $1 AND deleted_at IS NULL 
    LIMIT 1;
  `;
  const { rows: pegawaiRows } = await pool.query(checkPegawaiQuery, [id]);

  if (pegawaiRows.length > 0) {
    throw new Error(
      "Golongan tidak bisa dihapus karena masih digunakan oleh pegawai",
    );
  }

  // 2. Jika aman dari relasi pegawai, lakukan soft delete
  const deleteQuery = `
    UPDATE tb_golongan 
    SET deleted_at = NOW() 
    WHERE id_golongan = $1 AND deleted_at IS NULL;
  `;
  const result = await pool.query(deleteQuery, [id]);

  // Kembalikan true jika ada baris yang berhasil diperbarui (terhapus)
  return (result.rowCount ?? 0) > 0;
};
