import { PoolClient } from "pg";
import { pool } from "../../../../../config/database";

/**
 * Validasi status periode sebelum eksekusi kalkulasi.
 * Memastikan periode belum dikunci atau selesai.
 */
const validatePeriodeStatus = async (
  client: PoolClient,
  id_periode: number,
) => {
  const pCheck = await client.query(
    "SELECT status FROM tb_periode WHERE id_periode = $1 AND deleted_at IS NULL",
    [id_periode],
  );
  if (pCheck.rows.length === 0) throw new Error("Periode tidak ditemukan!");
  if (["Dikunci", "Selesai", "Diproses Gaji"].includes(pCheck.rows[0].status)) {
    throw new Error(
      "Gagal. Status periode sudah dikunci atau selesai diproses!",
    );
  }
};

/**
 * CORE ENGINE: Eksekusi sinkronisasi dan kalkulasi tunjangan bulanan (Idempotent UPSERT).
 * Query ini aman dijalankan kapan saja (awal bulan saat inisialisasi, maupun re-kalkulasi absensi/lembur).
 */
const executeTunjanganSync = async (
  client: PoolClient,
  id_periode: number,
) => {
  // 1. Inisialisasi Header Tunjangan Bulanan (Jika belum ada row header pegawai)
  const initHeaderQuery = `
    INSERT INTO tb_tunjangan_bulanan (id_periode, id_pegawai, total_jam_lebih, honor_bulan, total_tunjangan_terhitung)
    SELECT $1, id_pegawai, 0.00, 0.00, 0.00
    FROM tb_pegawai
    WHERE deleted_at IS NULL
    ON CONFLICT (id_periode, id_pegawai) DO NOTHING;
  `;
  await client.query(initHeaderQuery, [id_periode]);

  // 2. Sinkronisasi jam lembur dan honor_bulan jika terdapat data di tb_koreksi_jam
  const updateLemburQuery = `
    WITH rekap_lembur AS (
      SELECT 
        id_pegawai,
        COALESCE(SUM(
          CASE 
            WHEN jenis_koreksi = 'ADD' THEN jam_koreksi 
            WHEN jenis_koreksi = 'SUBTRACT' THEN -jam_koreksi 
            ELSE 0 
          END
        ), 0.00) AS total_jam
      FROM tb_koreksi_jam
      WHERE id_periode = $1
      GROUP BY id_pegawai
    ),
    tarif_lembur AS (
      SELECT COALESCE(nilai, 0.00) AS rate 
      FROM tb_tunjangan 
      WHERE (kode_kondisi = 'LEMBUR_PER_JAM' OR formula_type = 'PER_JAM_LEMBUR')
        AND deleted_at IS NULL 
      LIMIT 1
    )
    UPDATE tb_tunjangan_bulanan tb
    SET 
      total_jam_lebih = COALESCE(rl.total_jam, 0.00),
      honor_bulan = ROUND(COALESCE(rl.total_jam, 0.00) * COALESCE((SELECT rate FROM tarif_lembur), 0.00), 0)
    FROM tb_pegawai p
    LEFT JOIN rekap_lembur rl ON p.id_pegawai = rl.id_pegawai
    WHERE tb.id_pegawai = p.id_pegawai AND tb.id_periode = $1;
  `;
  await client.query(updateLemburQuery, [id_periode]);

  // 3. IDEMPOTENT UPSERT: Hitung Nilai Detail Tunjangan Berdasarkan Absensi, Status Perkawinan, & Gaji Pokok
  // Jika baris belum ada -> INSERT. Jika baris sudah ada -> UPDATE nilai_terhitung terbaru!
  const upsertDetailQuery = `
    INSERT INTO tb_tunjangan_bulanan_detail (id_periode, id_pegawai, id_tunjangan, nilai_terhitung)
    SELECT 
      $1 AS id_periode,
      p.id_pegawai,
      t.id_tunjangan,
      ROUND(
        CASE 
          WHEN t.kode_kondisi = 'TRN_WFO' OR t.formula_type = 'HARIAN_HADIR_WFO' THEN 
            COALESCE(abs.total_hadir_ops_wfo, 0) * t.nilai
          WHEN t.kode_kondisi = 'TUNJ_ISTRI' OR t.formula_type = 'PERSEN_GAJI_JIKA_KAWIN' THEN 
            CASE WHEN p.status_perkawinan = 'K' THEN (p.gaji_pokok_dasar * t.nilai) ELSE 0.00 END
          WHEN t.kode_kondisi = 'TUNJ_ANAK' OR t.formula_type = 'PERSEN_GAJI_PER_ANAK' THEN 
            CASE 
              WHEN p.jumlah_anak > 0 THEN (p.gaji_pokok_dasar * (LEAST(p.jumlah_anak, 2) * t.nilai))
              ELSE 0.00 
            END
          ELSE CASE 
            WHEN t.jenis_tunjangan = 'PERSEN' OR t.jenis_tunjangan = 'PERSENTASE' THEN (p.gaji_pokok_dasar * t.nilai)
            ELSE t.nilai
          END
        END,
        0
      ) AS nilai_terhitung
    FROM tb_pegawai p
    LEFT JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
    CROSS JOIN tb_tunjangan t
    LEFT JOIN tb_absensi_summary abs ON abs.id_pegawai = p.id_pegawai AND abs.id_periode = $1
    WHERE p.deleted_at IS NULL 
      AND t.deleted_at IS NULL
      AND t.kode_kondisi != 'LEMBUR_PER_JAM'
      AND COALESCE(t.formula_type, '') != 'PER_JAM_LEMBUR'
    ON CONFLICT (id_periode, id_pegawai, id_tunjangan) 
    DO UPDATE SET nilai_terhitung = EXCLUDED.nilai_terhitung;
  `;
  await client.query(upsertDetailQuery, [id_periode]);

  // 4. Update Header total_tunjangan_terhitung (Agregasi Lembur + Seluruh Detail)
  const updateTotalHeaderQuery = `
    UPDATE tb_tunjangan_bulanan tb
    SET total_tunjangan_terhitung = ROUND(COALESCE(tb.honor_bulan, 0.00) + COALESCE((
      SELECT SUM(nilai_terhitung)
      FROM tb_tunjangan_bulanan_detail tbd
      WHERE tbd.id_periode = tb.id_periode AND tbd.id_pegawai = tb.id_pegawai
    ), 0.00), 0)
    WHERE tb.id_periode = $1;
  `;
  await client.query(updateTotalHeaderQuery, [id_periode]);
};

// 1. INITIALIZE PERIODE BARU
export const initialize = async (id_periode: number) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await validatePeriodeStatus(client, id_periode);
    await executeTunjanganSync(client, id_periode);
    await client.query("COMMIT");
    return {
      message: "Inisialisasi tunjangan bulanan beserta detail berhasil!",
    };
  } catch (error: any) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// 2. RE-CALCULATE TUNJANGAN
export const calculate = async (id_periode: number) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await validatePeriodeStatus(client, id_periode);
    await executeTunjanganSync(client, id_periode);
    await client.query("COMMIT");
    return { message: "Kalkulasi tunjangan bulanan berhasil diperbarui!" };
  } catch (error: any) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
