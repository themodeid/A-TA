import { pool } from "../../../../../config/database";

// 1. GET ALL BY PERIODE
export const getAllByPeriode = async (id_periode: number) => {
  const queryText = `
    SELECT 
      tb.id_tunjangan_bulanan,
      tb.id_periode,
      tb.id_pegawai,
      p.nama_dan_tanggal_lahir,
      tb.total_jam_lebih,
      tb.honor_bulan,
      tb.total_tunjangan_terhitung,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id_tunjangan_detail', tbd.id_tunjangan_detail,
            'id_tunjangan', tbd.id_tunjangan,
            'nama_tunjangan', t.nama_tunjangan,
            'kode_kondisi', t.kode_kondisi,
            'nilai_terhitung', tbd.nilai_terhitung
          )
        ) FILTER (WHERE tbd.id_tunjangan_detail IS NOT NULL), '[]'
      ) AS details
    FROM tb_tunjangan_bulanan tb
    JOIN tb_pegawai p ON tb.id_pegawai = p.id_pegawai
    LEFT JOIN tb_tunjangan_bulanan_detail tbd 
      ON tb.id_periode = tbd.id_periode AND tb.id_pegawai = tbd.id_pegawai
    LEFT JOIN tb_tunjangan t ON tbd.id_tunjangan = t.id_tunjangan
    WHERE tb.id_periode = $1
    GROUP BY 
      tb.id_tunjangan_bulanan, 
      tb.id_periode, 
      tb.id_pegawai, 
      p.nama_dan_tanggal_lahir, 
      tb.total_jam_lebih, 
      tb.honor_bulan, 
      tb.total_tunjangan_terhitung
    ORDER BY p.nama_dan_tanggal_lahir ASC;
  `;

  const result = await pool.query(queryText, [id_periode]);
  return result.rows;
};

// 2. DELETE BY PERIODE
export const deleteByPeriode = async (id_periode: number) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const pCheck = await client.query(
      "SELECT status FROM tb_periode WHERE id_periode = $1 AND deleted_at IS NULL",
      [id_periode],
    );

    if (pCheck.rows.length === 0) {
      throw new Error("Periode tidak ditemukan!");
    }

    if (["Dikunci", "Selesai", "Diproses Gaji"].includes(pCheck.rows[0].status)) {
      throw new Error(
        "Gagal. Periode ini sudah dikunci dan tidak bisa dihapus!",
      );
    }

    await client.query(
      "DELETE FROM tb_tunjangan_bulanan_detail WHERE id_periode = $1",
      [id_periode],
    );

    const resultHeader = await client.query(
      "DELETE FROM tb_tunjangan_bulanan WHERE id_periode = $1",
      [id_periode],
    );

    await client.query("COMMIT");

    return {
      message: `Berhasil menghapus seluruh data tunjangan untuk periode ini!`,
      deleted_count: resultHeader.rowCount,
    };
  } catch (error: any) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
