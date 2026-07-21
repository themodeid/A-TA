import { pool } from "../../../config/database";
import { Golongan, GolonganInput } from "./golongan.type";

/**
 * Mengambil semua data golongan yang aktif (Sesuai INDEX idx_golongan_active)
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
    if (error.code === "23505") {
      throw new Error(
        `Nama golongan '${data.nama_golongan}' sudah terdaftar di sistem`,
      );
    }
    throw error;
  }
};

/**
 * Memperbarui data golongan dengan opsi kaskade ke pegawai aktif jika dibutuhkan
 */
export const updateGolongan = async (
  id: number,
  data: Partial<GolonganInput>,
): Promise<Golongan | null> => {
  const currentData = await getGolonganById(id);
  if (!currentData) return null;

  const namaGolongan = data.nama_golongan
    ? data.nama_golongan.trim()
    : currentData.nama_golongan;
  const gajiPokok = data.gaji_pokok_standar ?? currentData.gaji_pokok_standar;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Update data master golongannya sendiri
    const updateGolonganQuery = `
      UPDATE tb_golongan 
      SET nama_golongan = $1, gaji_pokok_standar = $2 
      WHERE id_golongan = $3 AND deleted_at IS NULL
      RETURNING id_golongan, nama_golongan, gaji_pokok_standar;
    `;
    const { rows } = await client.query(updateGolonganQuery, [
      namaGolongan,
      gajiPokok,
      id,
    ]);

    // 2. OPSI INTEGRASI: Jika standar gaji berubah, perbarui juga gaji_pokok_dasar di tb_pegawai yang masih aktif
    if (data.gaji_pokok_standar !== undefined) {
      const updatePegawaiGajiQuery = `
        UPDATE tb_pegawai
        SET gaji_pokok_dasar = $1, updated_at = NOW()
        WHERE id_golongan = $2 AND deleted_at IS NULL;
      `;
      await client.query(updatePegawaiGajiQuery, [gajiPokok, id]);
    }

    await client.query("COMMIT");
    return rows[0] || null;
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      throw new Error(
        `Nama golongan '${namaGolongan}' sudah digunakan oleh data lain`,
      );
    }
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Menghapus golongan dengan proteksi integritas tb_pegawai (Sesuai Relasi DDL Baru)
 */
export const softDeleteGolongan = async (id: number): Promise<boolean> => {
  // Amankan integritas data relasional. Pegawai aktif tidak boleh kehilangan referensi golongannya
  const checkPegawaiQuery = `
    SELECT id_pegawai 
    FROM tb_pegawai 
    WHERE id_golongan = $1 AND deleted_at IS NULL 
    LIMIT 1;
  `;
  const { rows: pegawaiRows } = await pool.query(checkPegawaiQuery, [id]);

  if (pegawaiRows.length > 0) {
    throw new Error(
      "Golongan tidak dapat dihapus karena masih terikat dengan pegawai aktif di sistem",
    );
  }

  const deleteQuery = `
    UPDATE tb_golongan 
    SET deleted_at = NOW() 
    WHERE id_golongan = $1 AND deleted_at IS NULL;
  `;
  const result = await pool.query(deleteQuery, [id]);

  return (result.rowCount ?? 0) > 0;
};
