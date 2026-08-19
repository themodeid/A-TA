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

    // 2. Clean Up Data Rekap Lama (Jika Re-run)
    await client.query(
      `DELETE FROM tb_rekap_gaji_detail WHERE id_rekap IN (SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = $1);`,
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
        -- Total Bruto = Gaji Pokok + Tunjangan Struktural + Total Tunjangan Var + Honor
        (
          COALESCE(p.gaji_pokok_dasar, 0) + 
          COALESCE(j.tunjangan_jabatan_struktural, 0) + 
          COALESCE(tb.honor_bulan, 0) +
          COALESCE((SELECT SUM(nilai_terhitung) FROM tb_tunjangan_bulanan_detail WHERE id_periode = $1 AND id_pegawai = p.id_pegawai), 0)
        ) AS total_penghasilan_bruto,
        -- Total Potongan
        COALESCE((SELECT SUM(nilai_potongan) FROM tb_potongan_bulanan_detail WHERE id_periode = $1 AND id_pegawai = p.id_pegawai), 0) AS total_potongan,
        -- Clean Receive
        (
          (
            COALESCE(p.gaji_pokok_dasar, 0) + 
            COALESCE(j.tunjangan_jabatan_struktural, 0) + 
            COALESCE(tb.honor_bulan, 0) +
            COALESCE((SELECT SUM(nilai_terhitung) FROM tb_tunjangan_bulanan_detail WHERE id_periode = $1 AND id_pegawai = p.id_pegawai), 0)
          ) - 
          COALESCE((SELECT SUM(nilai_potongan) FROM tb_potongan_bulanan_detail WHERE id_periode = $1 AND id_pegawai = p.id_pegawai), 0)
        ) AS total_penerimaan_clean
      FROM tb_pegawai p
      LEFT JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
      LEFT JOIN tb_golongan g ON p.id_golongan = g.id_golongan
      LEFT JOIN tb_tunjangan_bulanan tb ON tb.id_periode = $1 AND tb.id_pegawai = p.id_pegawai
      WHERE p.deleted_at IS NULL;
    `;
    await client.query(insertHeaderQuery, [periodeId]);

    // 4. Bulk Insert Detail Snapshot Tunjangan Struktural & Honor
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

    // 5. Bulk Insert Detail Snapshot Tunjangan Variabel
    await client.query(
      `
      INSERT INTO tb_rekap_gaji_detail (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
      SELECT 
        rg.id_rekap,
        'TUNJANGAN',
        t.nama_tunjangan,
        td.nilai_terhitung,
        COALESCE(t.formula_type, 'UMUM')
      FROM tb_tunjangan_bulanan_detail td
      JOIN tb_rekap_gaji rg ON td.id_periode = rg.id_periode AND td.id_pegawai = rg.id_pegawai
      JOIN tb_tunjangan t ON td.id_tunjangan = t.id_tunjangan
      WHERE td.id_periode = $1;
    `,
      [periodeId],
    );

    // 6. Bulk Insert Detail Snapshot Potongan
    await client.query(
      `
      INSERT INTO tb_rekap_gaji_detail (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
      SELECT 
        rg.id_rekap,
        'POTONGAN',
        m.nama_potongan,
        pd.nilai_potongan,
        m.kode_potongan
      FROM tb_potongan_bulanan_detail pd
      JOIN tb_rekap_gaji rg ON pd.id_periode = rg.id_periode AND pd.id_pegawai = rg.id_pegawai
      JOIN tb_master_potongan m ON pd.id_master_potongan = m.id_master_potongan
      WHERE pd.id_periode = $1;
    `,
      [periodeId],
    );

    // 7. Update Status Periode 'Diproses Gaji' / 'Selesai'
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
