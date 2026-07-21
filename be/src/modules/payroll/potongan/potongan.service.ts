import { pool } from "../../../config/database";

interface PotonganDetailInput {
  id_master_potongan: number;
  nilai_potongan: number;
}

interface UpsertPotonganInput {
  id_periode: number;
  id_pegawai: number;
  details: PotonganDetailInput[];
}

/**
 * Menyimpan detail potongan dan menghitung otomatis total_potongan_terhitung di tabel induk
 */
export const upsertPotonganBulanan = async (data: UpsertPotonganInput) => {
  const { id_periode, id_pegawai, details } = data;

  const total_potongan_terhitung = details.reduce(
    (sum, item) => sum + Number(item.nilai_potongan),
    0,
  );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Upsert ke tabel induk: tb_potongan_bulanan
    const upsertIndukQuery = `
      INSERT INTO tb_potongan_bulanan (id_periode, id_pegawai, total_potongan_terhitung)
      VALUES ($1, $2, $3)
      ON CONFLICT (id_periode, id_pegawai) 
      DO UPDATE SET total_potongan_terhitung = EXCLUDED.total_potongan_terhitung
      RETURNING *;
    `;
    const indukResult = await client.query(upsertIndukQuery, [
      id_periode,
      id_pegawai,
      total_potongan_terhitung,
    ]);
    const indukData = indukResult.rows[0];

    // 2. Upsert ke tabel detail: tb_potongan_bulanan_detail
    const savedDetails = [];
    const upsertDetailQuery = `
      INSERT INTO tb_potongan_bulanan_detail (id_periode, id_pegawai, id_master_potongan, nilai_potongan)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id_periode, id_pegawai, id_master_potongan) 
      DO UPDATE SET nilai_potongan = EXCLUDED.nilai_potongan
      RETURNING *;
    `;

    for (const detail of details) {
      const detailResult = await client.query(upsertDetailQuery, [
        id_periode,
        id_pegawai,
        detail.id_master_potongan,
        detail.nilai_potongan,
      ]);
      savedDetails.push(detailResult.rows[0]);
    }

    await client.query("COMMIT");

    return {
      ...indukData,
      details: savedDetails,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Mengambil data rangkuman potongan beserta rincian detailnya
 */
export const getPotonganByPegawaiAndPeriode = async (
  id_periode: number,
  id_pegawai: number,
) => {
  const indukQuery = `
    SELECT * FROM tb_potongan_bulanan 
    WHERE id_periode = $1 AND id_pegawai = $2;
  `;
  const indukResult = await pool.query(indukQuery, [id_periode, id_pegawai]);

  if (indukResult.rows.length === 0) return null;

  const detailQuery = `
    SELECT * FROM tb_potongan_bulanan_detail 
    WHERE id_periode = $1 AND id_pegawai = $2;
  `;
  const detailResult = await pool.query(detailQuery, [id_periode, id_pegawai]);

  return {
    ...indukResult.rows[0],
    details: detailResult.rows,
  };
};
