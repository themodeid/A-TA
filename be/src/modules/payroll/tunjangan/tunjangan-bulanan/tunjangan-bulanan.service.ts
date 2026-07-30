import { pool } from "../../../../config/database";

// Interface untuk Input Detail Tunjangan
export interface TunjanganDetailInput {
  id_tunjangan: number;
  nilai_terhitung: number;
}

// Interface untuk Input Per Pegawai
export interface TunjanganPegawaiInput {
  id_pegawai: number;
  total_jam_lebih?: number;
  honor_bulan?: number;
  details: TunjanganDetailInput[];
}

// ==========================================
// 1. LOGIKA GET ALL BY PERIODE (NESTED JSON ARRAY)
// ==========================================
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
    GROUP BY tb.id_tunjangan_bulanan, p.nama_dan_tanggal_lahir
    ORDER BY p.nama_dan_tanggal_lahir ASC;
  `;

  const result = await pool.query(queryText, [id_periode]);
  return result.rows;
};

// ==========================================
// 2. LOGIKA INISIALISASI PERIODE BARU
// ==========================================
export const initialize = async (id_periode: number) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const pCheck = await client.query(
      "SELECT status FROM tb_periode WHERE id_periode = $1",
      [id_periode],
    );
    if (pCheck.rows.length === 0) throw new Error("Periode tidak ditemukan!");
    if (pCheck.rows[0].status !== "Pengisian Absensi") {
      throw new Error(
        "Gagal. Status periode ini bukan Pengisian Absensi atau sudah dikunci!",
      );
    }

    const initQuery = `
      INSERT INTO tb_tunjangan_bulanan (id_periode, id_pegawai, total_jam_lebih, honor_bulan, total_tunjangan_terhitung)
      SELECT $1, id_pegawai, 0.00, 0.00, 0.00
      FROM tb_pegawai
      WHERE deleted_at IS NULL
      ON CONFLICT (id_periode, id_pegawai) DO NOTHING;
    `;
    await client.query(initQuery, [id_periode]);

    await client.query("COMMIT");
    return { message: "Inisialisasi wadah tunjangan bulanan berhasil!" };
  } catch (error: any) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// ==========================================
// 3. LOGIKA SIMPAN MASSAL (BULK SAVE HEADER & DETAIL)
// ==========================================
export const saveBulk = async (
  id_periode: number,
  data_input: TunjanganPegawaiInput[],
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Array tampungan Unnest
    const arrHeaderPeriode: number[] = [];
    const arrHeaderPegawai: number[] = [];
    const arrHeaderJamLebih: number[] = [];
    const arrHeaderHonorBulan: number[] = [];
    const arrHeaderTotalSum: number[] = [];

    const arrDetailPeriode: number[] = [];
    const arrDetailPegawai: number[] = [];
    const arrDetailIdTunjangan: number[] = [];
    const arrDetailNilai: number[] = [];

    for (const item of data_input) {
      let totalSumDetails = 0;

      if (item.details && item.details.length > 0) {
        for (const detail of item.details) {
          arrDetailPeriode.push(id_periode);
          arrDetailPegawai.push(item.id_pegawai);
          arrDetailIdTunjangan.push(detail.id_tunjangan);

          const val = parseFloat(detail.nilai_terhitung.toString()) || 0;
          arrDetailNilai.push(val);
          totalSumDetails += val;
        }
      }

      const jamLebih = parseFloat((item.total_jam_lebih || 0).toString());
      const honor = parseFloat((item.honor_bulan || 0).toString());

      arrHeaderPeriode.push(id_periode);
      arrHeaderPegawai.push(item.id_pegawai);
      arrHeaderJamLebih.push(jamLebih);
      arrHeaderHonorBulan.push(honor);
      // Total Header = Accumulation Details + Honor
      arrHeaderTotalSum.push(totalSumDetails + honor);
    }

    // A. Bulk Upsert Header (tb_tunjangan_bulanan)
    if (arrHeaderPegawai.length > 0) {
      const upsertHeader = `
        INSERT INTO tb_tunjangan_bulanan (
          id_periode, id_pegawai, total_jam_lebih, honor_bulan, total_tunjangan_terhitung
        )
        SELECT * FROM UNNEST($1::int[], $2::int[], $3::numeric[], $4::numeric[], $5::numeric[])
        ON CONFLICT (id_periode, id_pegawai)
        DO UPDATE SET 
          total_jam_lebih = EXCLUDED.total_jam_lebih,
          honor_bulan = EXCLUDED.honor_bulan,
          total_tunjangan_terhitung = EXCLUDED.total_tunjangan_terhitung;
      `;
      await client.query(upsertHeader, [
        arrHeaderPeriode,
        arrHeaderPegawai,
        arrHeaderJamLebih,
        arrHeaderHonorBulan,
        arrHeaderTotalSum,
      ]);
    }

    // B. Bulk Upsert Details (tb_tunjangan_bulanan_detail)
    if (arrDetailPegawai.length > 0) {
      const upsertDetail = `
        INSERT INTO tb_tunjangan_bulanan_detail (
          id_periode, id_pegawai, id_tunjangan, nilai_terhitung
        )
        SELECT * FROM UNNEST($1::int[], $2::int[], $3::int[], $4::numeric[])
        ON CONFLICT (id_periode, id_pegawai, id_tunjangan)
        DO UPDATE SET nilai_terhitung = EXCLUDED.nilai_terhitung;
      `;
      await client.query(upsertDetail, [
        arrDetailPeriode,
        arrDetailPegawai,
        arrDetailIdTunjangan,
        arrDetailNilai,
      ]);
    }

    await client.query("COMMIT");
    return { message: "Data tunjangan dan rincian detail berhasil disimpan!" };
  } catch (error: any) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
