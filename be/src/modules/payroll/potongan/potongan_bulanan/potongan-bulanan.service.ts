import { pool } from "../../../../config/database";

// Interface untuk input dari Frontend/Client
export interface PotonganDetailInput {
  id_master_potongan: number;
  nilai_potongan: number;
}

export interface PotonganPegawaiInput {
  id_pegawai: number;
  details?: PotonganDetailInput[];
  potongan_angsuran?: number;
  potongan_dana_wajib?: number;
  potongan_s_pskd?: number;
  potongan_pelkes?: number;
  potongan_lainnya?: number;
}

const FLAT_POTONGAN_FIELDS = [
  { field: "potongan_angsuran" as const, kode: "POT_ANGSURAN" },
  { field: "potongan_dana_wajib" as const, kode: "POT_DANA_WAJIB" },
  { field: "potongan_s_pskd" as const, kode: "POT_S_PSKD" },
  { field: "potongan_pelkes" as const, kode: "POT_PELKES" },
  { field: "potongan_lainnya" as const, kode: "POT_LAINNYA" },
];

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
      COALESCE(MAX(CASE WHEN mp.kode_potongan = 'POT_ANGSURAN' THEN pbd.nilai_potongan END), 0)::float AS potongan_angsuran,
      COALESCE(MAX(CASE WHEN mp.kode_potongan = 'POT_DANA_WAJIB' THEN pbd.nilai_potongan END), 0)::float AS potongan_dana_wajib,
      COALESCE(MAX(CASE WHEN mp.kode_potongan = 'POT_S_PSKD' THEN pbd.nilai_potongan END), 0)::float AS potongan_s_pskd,
      COALESCE(MAX(CASE WHEN mp.kode_potongan = 'POT_PELKES' THEN pbd.nilai_potongan END), 0)::float AS potongan_pelkes,
      COALESCE(MAX(CASE WHEN mp.kode_potongan = 'POT_LAINNYA' THEN pbd.nilai_potongan END), 0)::float AS potongan_lainnya,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
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
    GROUP BY pb.id_potongan_bulanan, pb.id_periode, pb.id_pegawai, p.nama_dan_tanggal_lahir, pb.total_potongan_terhitung
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

    const pCheck = await client.query(
      "SELECT status FROM tb_periode WHERE id_periode = $1 AND deleted_at IS NULL",
      [id_periode],
    );
    if (pCheck.rows.length === 0) {
      throw new Error("Periode tidak ditemukan!");
    }
    if (["Dikunci", "Selesai", "Diproses Gaji"].includes(pCheck.rows[0].status)) {
      throw new Error("Gagal. Periode ini sudah dikunci atau selesai diproses!");
    }

    const masterResult = await client.query(
      `SELECT id_master_potongan, kode_potongan
       FROM tb_master_potongan
       WHERE deleted_at IS NULL`,
    );
    const kodeToId = new Map<string, number>(
      masterResult.rows.map((row) => [row.kode_potongan, row.id_master_potongan]),
    );

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
        continue;
      }

      for (const { field, kode } of FLAT_POTONGAN_FIELDS) {
        const idMaster = kodeToId.get(kode);
        if (idMaster === undefined) continue;

        arrPeriode.push(id_periode);
        arrPegawai.push(item.id_pegawai);
        arrMasterPot.push(idMaster);
        arrNilaiPot.push(parseFloat((item[field] ?? 0).toString()) || 0);
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
      UPDATE tb_potongan_bulanan pb
      SET total_potongan_terhitung = COALESCE(
        (SELECT SUM(pbd.nilai_potongan) 
         FROM tb_potongan_bulanan_detail pbd 
         WHERE pbd.id_periode = pb.id_periode AND pbd.id_pegawai = pb.id_pegawai), 
        0
      )
      WHERE pb.id_periode = $1;
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
