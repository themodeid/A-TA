import { pool } from "../../../../config/database";

// Interface untuk input dari Frontend/Client
export interface PotonganDetailInput {
  id_master_potongan: number;
  nilai_potongan: number;
}

export interface PotonganPegawaiInput {
  id_pegawai: number;
  details: PotonganDetailInput[];
}

// ==========================================
// 1. GET ALL BY PERIODE (Untuk Grid UI)
// ==========================================
export const getAllByPeriode = async (id_periode: number) => {
  const queryText = `
    SELECT 
      pb.id_potongan_bulanan,
      pb.id_periode,
      pb.id_pegawai,
      p.nama_dan_tanggal_lahir,
      pb.total_potongan_terhitung,
      COALESCE(
        json_agg(
          json_build_object(
            'id_potongan_detail', pbd.id_potongan_detail,
            'id_master_potongan', pbd.id_master_potongan,
            'nama_potongan', mp.nama_potongan,
            'kode_potongan', mp.kode_potongan,
            'nilai_potongan', pbd.nilai_potongan
          )
        ) FILTER (WHERE pbd.id_potongan_detail IS NOT NULL), '[]'
      ) AS details
    FROM tb_potongan_bulanan pb
    JOIN tb_pegawai p ON pb.id_pegawai = p.id_pegawai
    LEFT JOIN tb_potongan_bulanan_detail pbd 
      ON pb.id_periode = pbd.id_periode AND pb.id_pegawai = pbd.id_pegawai
    LEFT JOIN tb_master_potongan mp 
      ON pbd.id_master_potongan = mp.id_master_potongan
    WHERE pb.id_periode = $1
    GROUP BY pb.id_potongan_bulanan, pb.id_periode, pb.id_pegawai, p.nama_dan_tanggal_lahir
    ORDER BY p.nama_dan_tanggal_lahir ASC;
  `;

  const result = await pool.query(queryText, [id_periode]);
  return result.rows;
};

// ==========================================
// 2. INITIALIZE PERIODE BARU
// ==========================================
export const initialize = async (id_periode: number) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Cek status periode
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

    // Insert Header Potongan untuk semua pegawai aktif
    const initHeaderQuery = `
      INSERT INTO tb_potongan_bulanan (id_periode, id_pegawai, total_potongan_terhitung)
      SELECT $1, id_pegawai, 0.00
      FROM tb_pegawai
      WHERE deleted_at IS NULL
      ON CONFLICT (id_periode, id_pegawai) DO NOTHING;
    `;
    await client.query(initHeaderQuery, [id_periode]);

    await client.query("COMMIT");
    return { message: "Inisialisasi wadah potongan bulanan berhasil!" };
  } catch (error: any) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const saveBulk = async (
  id_periode: number,
  data_input: PotonganPegawaiInput[],
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Ratakan (Flatten) data array dari Javascript untuk dikirim sekaligus ke SQL
    const arrPeriode: number[] = [];
    const arrPegawai: number[] = [];
    const arrMasterPot: number[] = [];
    const arrNilaiPot: number[] = [];

    for (const item of data_input) {
      if (item.details && item.details.length > 0) {
        for (const detail of item.details) {
          arrPeriode.push(id_periode);
          arrPegawai.push(item.id_pegawai);
          arrMasterPot.push(detail.id_master_potongan);
          arrNilaiPot.push(parseFloat(detail.nilai_potongan.toString()) || 0);
        }
      }
    }

    // 2. QUERY BATCH 1: Bulk Upsert Detail sekaligus dalam 1 Kali Hit Query
    if (arrPegawai.length > 0) {
      const upsertDetailBulk = `
        INSERT INTO tb_potongan_bulanan_detail (id_periode, id_pegawai, id_master_potongan, nilai_potongan)
        SELECT * FROM UNNEST($1::int[], $2::int[], $3::int[], $4::numeric[])
        ON CONFLICT (id_periode, id_pegawai, id_master_potongan)
        DO UPDATE SET nilai_potongan = EXCLUDED.nilai_potongan;
      `;
      await client.query(upsertDetailBulk, [
        arrPeriode,
        arrPegawai,
        arrMasterPot,
        arrNilaiPot,
      ]);
    }

    // 3. QUERY BATCH 2: Auto Recalculate & Sync ke Header langsung dari Postgres!
    // Memastikan total_potongan_terhitung selalu presisi 100% dari data detail
    const syncHeaderQuery = `
      INSERT INTO tb_potongan_bulanan (id_periode, id_pegawai, total_potongan_terhitung)
      SELECT 
        pbd.id_periode,
        pbd.id_pegawai,
        COALESCE(SUM(pbd.nilai_potongan), 0) as total_potongan
      FROM tb_potongan_bulanan_detail pbd
      WHERE pbd.id_periode = $1
      GROUP BY pbd.id_periode, pbd.id_pegawai
      ON CONFLICT (id_periode, id_pegawai)
      DO UPDATE SET total_potongan_terhitung = EXCLUDED.total_potongan_terhitung;
    `;
    await client.query(syncHeaderQuery, [id_periode]);

    await client.query("COMMIT");
    return {
      message: "Data potongan bulanan berhasil disimpan dan disinkronkan!",
    };
  } catch (error: any) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
