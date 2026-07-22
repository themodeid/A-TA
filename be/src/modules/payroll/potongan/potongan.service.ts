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

    // 2. HAPUS detail potongan lama yang TIDAK ADA dalam array input baru (PENTING!)
    const activeMasterIds = details.map((d) => d.id_master_potongan);

    if (activeMasterIds.length > 0) {
      await client.query(
        `DELETE FROM tb_potongan_bulanan_detail 
         WHERE id_periode = $1 
           AND id_pegawai = $2 
           AND id_master_potongan NOT IN (${activeMasterIds.map((_, i) => `$${i + 3}`).join(",")})`,
        [id_periode, id_pegawai, ...activeMasterIds],
      );
    } else {
      // Jika user mengosongkan semua detail
      await client.query(
        `DELETE FROM tb_potongan_bulanan_detail WHERE id_periode = $1 AND id_pegawai = $2`,
        [id_periode, id_pegawai],
      );
    }

    // 3. Upsert ke tabel detail menggunakan Batch/Unnest (Lebih Cepat & Efisien)
    let savedDetails: any[] = [];
    if (details.length > 0) {
      const masterIds = details.map((d) => d.id_master_potongan);
      const nilaiList = details.map((d) => d.nilai_potongan);

      const batchUpsertQuery = `
        INSERT INTO tb_potongan_bulanan_detail (id_periode, id_pegawai, id_master_potongan, nilai_potongan)
        SELECT $1, $2, UNNEST($3::int[]), UNNEST($4::numeric[])
        ON CONFLICT (id_periode, id_pegawai, id_master_potongan) 
        DO UPDATE SET nilai_potongan = EXCLUDED.nilai_potongan
        RETURNING *;
      `;

      const detailResult = await client.query(batchUpsertQuery, [
        id_periode,
        id_pegawai,
        masterIds,
        nilaiList,
      ]);
      savedDetails = detailResult.rows;
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
 * Mengambil data rangkuman potongan beserta rincian detailnya (Include nama_potongan)
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

  // JOIN dengan master potongan agar frontend langsung dapat nama komponennya
  const detailQuery = `
    SELECT 
      d.id_potongan_detail,
      d.id_periode,
      d.id_pegawai,
      d.id_master_potongan,
      m.nama_potongan,
      m.kode_potongan,
      d.nilai_potongan
    FROM tb_potongan_bulanan_detail d
    JOIN tb_master_potongan m ON d.id_master_potongan = m.id_master_potongan
    WHERE d.id_periode = $1 AND d.id_pegawai = $2;
  `;
  const detailResult = await pool.query(detailQuery, [id_periode, id_pegawai]);

  return {
    ...indukResult.rows[0],
    details: detailResult.rows,
  };
};
