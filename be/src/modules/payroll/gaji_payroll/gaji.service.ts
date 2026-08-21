import { pool } from "../../../config/database";

export const executePayrollProcess = async (periodeId: number) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock Row & Cek Status Periode
    const periodeRes = await client.query(
      `SELECT status FROM tb_periode WHERE id_periode = $1 AND deleted_at IS NULL FOR UPDATE;`,
      [periodeId],
    );
    const currentStatus = periodeRes.rows[0]?.status;

    if (!currentStatus) {
      throw new Error(`Periode dengan ID ${periodeId} tidak ditemukan.`);
    }
    if (currentStatus !== "Disetujui") {
      throw new Error(
        `Gagal Memproses Gaji: Status periode saat ini '${currentStatus}'. Wajib 'Disetujui'.`,
      );
    }

    // 2. Clean Up Data Rekap Lama (Mendukung Re-run / Hitung Ulang)
    await client.query(
      `DELETE FROM tb_rekap_gaji_detail 
       WHERE id_rekap IN (SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = $1);`,
      [periodeId],
    );
    await client.query(`DELETE FROM tb_rekap_gaji WHERE id_periode = $1;`, [
      periodeId,
    ]);

    // 3. Bulk Insert Header Snapshot (tb_rekap_gaji)
    const insertHeaderQuery = `
  INSERT INTO tb_rekap_gaji (
    id_periode, 
    id_pegawai, 
    jabatan_snapshot, 
    pangkat_golongan_snapshot, 
    gaji_pokok_snapshot, 
    total_penghasilan_bruto, 
    total_potongan, 
    total_penerimaan_clean
  )
  SELECT 
    $1 AS id_periode,
    p.id_pegawai,
    COALESCE(j.nama_jabatan, '-') AS jabatan_snapshot,
    COALESCE(g.nama_golongan, '-') AS pangkat_golongan_snapshot,
    COALESCE(p.gaji_pokok_dasar, 0) AS gaji_pokok_snapshot,
    
    -- Total Bruto = Gaji Pokok + Total Seluruh Tunjangan (Struktural, Honor, & Detail Variabel)
    (
      COALESCE(p.gaji_pokok_dasar, 0) + 
      COALESCE(j.tunjangan_jabatan_struktural, 0) + 
      COALESCE(tb.honor_bulan, 0) +
      COALESCE(t_var.total_tunj_var, 0)
    ) AS total_penghasilan_bruto,

    COALESCE(p_var.total_pot, 0) AS total_potongan,

    (
      (
        COALESCE(p.gaji_pokok_dasar, 0) + 
        COALESCE(j.tunjangan_jabatan_struktural, 0) + 
        COALESCE(tb.honor_bulan, 0) +
        COALESCE(t_var.total_tunj_var, 0)
      ) - COALESCE(p_var.total_pot, 0)
    ) AS total_penerimaan_clean

  FROM tb_pegawai p
  LEFT JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
  LEFT JOIN tb_golongan g ON p.id_golongan = g.id_golongan
  LEFT JOIN tb_tunjangan_bulanan tb ON tb.id_periode = $1 AND tb.id_pegawai = p.id_pegawai
  
  -- Agregat Tunjangan Variabel (Menggunakan nilai_terhitung yang sudah dikalkulasi Rupiah)
  LEFT JOIN (
    SELECT id_pegawai, SUM(nilai_terhitung) AS total_tunj_var
    FROM tb_tunjangan_bulanan_detail
    WHERE id_periode = $1
    GROUP BY id_pegawai
  ) t_var ON t_var.id_pegawai = p.id_pegawai

  LEFT JOIN (
    SELECT id_pegawai, SUM(nilai_potongan) AS total_pot
    FROM tb_potongan_bulanan_detail
    WHERE id_periode = $1
    GROUP BY id_pegawai
  ) p_var ON p_var.id_pegawai = p.id_pegawai

  WHERE p.deleted_at IS NULL;
`;
    await client.query(insertHeaderQuery, [periodeId]);

    // 4. Bulk Insert Detail Snapshot Tunjangan Struktural
    await client.query(
      `
      INSERT INTO tb_rekap_gaji_detail (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
      SELECT 
        rg.id_rekap,
        'TUNJANGAN',
        CONCAT('Tunjangan Struktural ', j.nama_jabatan),
        j.tunjangan_jabatan_struktural,
        'TUNJ_STRUKTURAL'
      FROM tb_rekap_gaji rg
      JOIN tb_pegawai p ON rg.id_pegawai = p.id_pegawai
      JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
      WHERE rg.id_periode = $1 AND j.tunjangan_jabatan_struktural > 0;
    `,
      [periodeId],
    );

    // 5. Bulk Insert Detail Snapshot Honor Bulan
    await client.query(
      `
      INSERT INTO tb_rekap_gaji_detail (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
      SELECT 
        rg.id_rekap,
        'TUNJANGAN',
        'Honor Bulanan',
        tb.honor_bulan,
        'HONOR_BULAN'
      FROM tb_rekap_gaji rg
      JOIN tb_tunjangan_bulanan tb ON rg.id_periode = tb.id_periode AND rg.id_pegawai = tb.id_pegawai
      WHERE rg.id_periode = $1 AND tb.honor_bulan > 0;
    `,
      [periodeId],
    );

    // 6. Bulk Insert Detail Snapshot Tunjangan Variabel
    await client.query(
      `
  INSERT INTO tb_rekap_gaji_detail (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
  SELECT 
    rg.id_rekap,
    'TUNJANGAN',
    t.nama_tunjangan,
    CAST(tbd.nilai_terhitung AS VARCHAR), -- Simpan hasil kalkulasi Rupiah (misal: 500000.00), bukan rate persen
    LEFT(COALESCE(t.formula_type, t.kode_kondisi, 'UMUM'), 20)
  FROM tb_tunjangan_bulanan_detail tbd
  JOIN tb_rekap_gaji rg ON tbd.id_periode = rg.id_periode AND tbd.id_pegawai = rg.id_pegawai
  JOIN tb_tunjangan t ON tbd.id_tunjangan = t.id_tunjangan
  WHERE tbd.id_periode = $1;
  `,
      [periodeId],
    );

    // 7. Bulk Insert Detail Snapshot Potongan
    await client.query(
      `
  INSERT INTO tb_rekap_gaji_detail (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
  SELECT 
    rg.id_rekap,
    'POTONGAN',
    m.nama_potongan,
    pbd.nilai_potongan,
    LEFT(COALESCE(m.formula_type, m.kode_potongan, 'UMUM'), 20) -- Dipotong maksimal 20 karakter
  FROM tb_potongan_bulanan_detail pbd
  JOIN tb_rekap_gaji rg ON pbd.id_periode = rg.id_periode AND pbd.id_pegawai = rg.id_pegawai
  JOIN tb_master_potongan m ON pbd.id_master_potongan = m.id_master_potongan
  WHERE pbd.id_periode = $1;
`,
      [periodeId],
    );

    // 8. Update Status Periode ke 'Selesai'
    const updatedPeriodeRes = await client.query(
      `UPDATE tb_periode SET status = 'Selesai' WHERE id_periode = $1 RETURNING *;`,
      [periodeId],
    );

    await client.query("COMMIT");
    return updatedPeriodeRes.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getRekapByPeriode = async (periodeId: number) => {
  const query = `
    SELECT r.*, p.nama_dan_tanggal_lahir 
    FROM tb_rekap_gaji r
    JOIN tb_pegawai p ON r.id_pegawai = p.id_pegawai
    WHERE r.id_periode = $1;
  `;
  const result = await pool.query(query, [periodeId]);
  return result.rows;
};

export const getDetailRekap = async (idRekap: number) => {
  const rekapQuery = `
    SELECT r.*, p.nama_dan_tanggal_lahir 
    FROM tb_rekap_gaji r
    JOIN tb_pegawai p ON r.id_pegawai = p.id_pegawai
    WHERE r.id_rekap = $1;
  `;
  const rekapRes = await pool.query(rekapQuery, [idRekap]);
  if (rekapRes.rows.length === 0) return null;

  const detailQuery = `SELECT * FROM tb_rekap_gaji_detail WHERE id_rekap = $1;`;
  const detailRes = await pool.query(detailQuery, [idRekap]);

  return {
    ...rekapRes.rows[0],
    details: detailRes.rows,
  };
};

export const getSlipByPeriodeAndPegawai = async (
  idPeriode: number,
  idPegawai: number,
) => {
  const rekapQuery = `
    SELECT r.*, p.nama_dan_tanggal_lahir 
    FROM tb_rekap_gaji r
    JOIN tb_pegawai p ON r.id_pegawai = p.id_pegawai
    WHERE r.id_periode = $1 AND r.id_pegawai = $2;
  `;
  const rekapRes = await pool.query(rekapQuery, [idPeriode, idPegawai]);
  if (rekapRes.rows.length === 0) return null;

  const idRekap = rekapRes.rows[0].id_rekap;
  const detailQuery = `SELECT * FROM tb_rekap_gaji_detail WHERE id_rekap = $1;`;
  const detailRes = await pool.query(detailQuery, [idRekap]);

  return {
    ...rekapRes.rows[0],
    details: detailRes.rows,
  };
};
