import { pool } from "../../config/database";
import { PotonganBulanan, PotonganInput } from "./potongan.type";

/**
 * Mengambil semua data potongan bulanan
 */
export const getAllPotongan = async (): Promise<PotonganBulanan[]> => {
  const query = `
    SELECT 
      id_potongan_bulanan, id_periode, id_pegawai,
      potongan_angsuran, potongan_dana_wajib, potongan_s_pskd, potongan_pelkes, potongan_lainnya
    FROM tb_potongan_bulanan
    ORDER BY id_potongan_bulanan DESC;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

/**
 * Mengambil data potongan bulanan berdasarkan ID
 */
export const getPotonganById = async (
  id: number,
): Promise<PotonganBulanan | null> => {
  const query = `
    SELECT 
      id_potongan_bulanan, id_periode, id_pegawai,
      potongan_angsuran, potongan_dana_wajib, potongan_s_pskd, potongan_pelkes, potongan_lainnya
    FROM tb_potongan_bulanan
    WHERE id_potongan_bulanan = $1;
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
};

/**
 * Menyimpan data potongan bulanan baru (Satu pegawai per periode bersifat UNIQUE)
 */
export const createPotongan = async (
  data: PotonganInput,
): Promise<PotonganBulanan> => {
  // Cek apakah data potongan pegawai tersebut di periode yang sama sudah pernah diinput
  const checkQuery = `
    SELECT id_potongan_bulanan 
    FROM tb_potongan_bulanan 
    WHERE id_periode = $1 AND id_pegawai = $2;
  `;
  const checkResult = await pool.query(checkQuery, [
    data.id_periode,
    data.id_pegawai,
  ]);

  if (checkResult.rows.length > 0) {
    throw new Error(
      "Data potongan untuk pegawai ini di periode tersebut sudah ada",
    );
  }

  const query = `
    INSERT INTO tb_potongan_bulanan (
      id_periode, id_pegawai, 
      potongan_angsuran, potongan_dana_wajib, potongan_s_pskd, potongan_pelkes, potongan_lainnya
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id_potongan_bulanan, id_periode, id_pegawai, potongan_angsuran, potongan_dana_wajib, potongan_s_pskd, potongan_pelkes, potongan_lainnya;
  `;

  const values = [
    data.id_periode,
    data.id_pegawai,
    data.potongan_angsuran,
    data.potongan_dana_wajib,
    data.potongan_s_pskd,
    data.potongan_pelkes,
    data.potongan_lainnya,
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
};

/**
 * Memperbarui data nominal potongan bulanan
 */
export const updatePotongan = async (
  id: number,
  data: Partial<Omit<PotonganInput, "id_periode" | "id_pegawai">>,
): Promise<PotonganBulanan | null> => {
  const currentData = await getPotonganById(id);
  if (!currentData) return null;

  // Jika data input undefined/tidak dikirim, pertahankan nilai lama dari DB
  const angsuran = data.potongan_angsuran ?? currentData.potongan_angsuran;
  const danaWajib = data.potongan_dana_wajib ?? currentData.potongan_dana_wajib;
  const sPskd = data.potongan_s_pskd ?? currentData.potongan_s_pskd;
  const pelkes = data.potongan_pelkes ?? currentData.potongan_pelkes;
  const lainnya = data.potongan_lainnya ?? currentData.potongan_lainnya;

  const query = `
    UPDATE tb_potongan_bulanan
    SET 
      potongan_angsuran = $1,
      potongan_dana_wajib = $2,
      potongan_s_pskd = $3,
      potongan_pelkes = $4,
      potongan_lainnya = $5
    WHERE id_potongan_bulanan = $6
    RETURNING id_potongan_bulanan, id_periode, id_pegawai, potongan_angsuran, potongan_dana_wajib, potongan_s_pskd, potongan_pelkes, potongan_lainnya;
  `;

  const { rows } = await pool.query(query, [
    angsuran,
    danaWajib,
    sPskd,
    pelkes,
    lainnya,
    id,
  ]);
  return rows[0] || null;
};

/**
 * Menghapus data potongan bulanan secara permanen (Hard Delete)
 */
export const deletePotongan = async (id: number): Promise<boolean> => {
  const query = `
    DELETE FROM tb_potongan_bulanan
    WHERE id_potongan_bulanan = $1;
  `;
  const result = await pool.query(query, [id]);
  return (result.rowCount ?? 0) > 0;
};
