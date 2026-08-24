import { pool } from "../../../../config/database";

/**
 * Mengambil seluruh rekap gaji untuk 1 periode tertentu beserta detail komponen dan absensi
 */
export const getRekapByPeriode = async (periodeId: number) => {
  const query = `
    SELECT 
      r.*, 
      p.nama_dan_tanggal_lahir,
      p.status_perkawinan,
      p.jumlah_anak,
      COALESCE(abs.total_hadir_ops_wfo, 0) AS total_hadir_wfo,
      COALESCE(abs.total_hadir_ops_wfh, 0) AS total_hadir_wfh,
      COALESCE(abs.total_izin, 0) AS total_izin,
      COALESCE(abs.total_sakit, 0) AS total_sakit,
      COALESCE(abs.total_alpha, 0) AS total_alpha,
      COALESCE(t_wfo.transport_wfo, 0) AS transport_uang_makan,
      COALESCE(t_struk.tunj_struk, 0) AS tunjangan_struktural,
      COALESCE(t_istri.tunj_istri, 0) AS tunjangan_istri,
      COALESCE(t_anak.tunj_anak, 0) AS tunjangan_anak,
      COALESCE(t_honor.honor_bln, 0) AS honor_bulan,
      (COALESCE(r.total_penghasilan_bruto, 0) - COALESCE(r.gaji_pokok_snapshot, 0) - COALESCE(t_wfo.transport_wfo, 0)) AS tunjangan_jabatan_dll,
      COALESCE(det.details, '[]'::json) AS details
    FROM tb_rekap_gaji r
    JOIN tb_pegawai p ON r.id_pegawai = p.id_pegawai
    LEFT JOIN tb_absensi_summary abs ON abs.id_periode = r.id_periode AND abs.id_pegawai = r.id_pegawai
    LEFT JOIN (
      SELECT id_rekap, SUM(nilai_snapshot) AS transport_wfo
      FROM tb_rekap_gaji_detail
      WHERE kode_kondisi_snapshot = 'HARIAN_HADIR_WFO'
      GROUP BY id_rekap
    ) t_wfo ON t_wfo.id_rekap = r.id_rekap
    LEFT JOIN (
      SELECT id_rekap, SUM(nilai_snapshot) AS tunj_struk
      FROM tb_rekap_gaji_detail
      WHERE kode_kondisi_snapshot = 'TUNJ_STRUKTURAL'
      GROUP BY id_rekap
    ) t_struk ON t_struk.id_rekap = r.id_rekap
    LEFT JOIN (
      SELECT id_rekap, SUM(nilai_snapshot) AS tunj_istri
      FROM tb_rekap_gaji_detail
      WHERE kode_kondisi_snapshot = 'PERSEN_GAJI_JIKA_KAW'
      GROUP BY id_rekap
    ) t_istri ON t_istri.id_rekap = r.id_rekap
    LEFT JOIN (
      SELECT id_rekap, SUM(nilai_snapshot) AS tunj_anak
      FROM tb_rekap_gaji_detail
      WHERE kode_kondisi_snapshot = 'PERSEN_GAJI_PER_ANAK'
      GROUP BY id_rekap
    ) t_anak ON t_anak.id_rekap = r.id_rekap
    LEFT JOIN (
      SELECT id_rekap, SUM(nilai_snapshot) AS honor_bln
      FROM tb_rekap_gaji_detail
      WHERE kode_kondisi_snapshot = 'HONOR_BULAN'
      GROUP BY id_rekap
    ) t_honor ON t_honor.id_rekap = r.id_rekap
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'id_rekap_detail', d.id_rekap_detail,
          'id_rekap', d.id_rekap,
          'jenis_komponen', d.jenis_komponen,
          'nama_komponen_snapshot', d.nama_komponen_snapshot,
          'nilai_snapshot', d.nilai_snapshot,
          'kode_kondisi_snapshot', d.kode_kondisi_snapshot
        ) ORDER BY d.jenis_komponen DESC, d.id_rekap_detail ASC
      ) AS details
      FROM tb_rekap_gaji_detail d
      WHERE d.id_rekap = r.id_rekap
    ) det ON TRUE
    WHERE r.id_periode = $1
    ORDER BY r.id_rekap ASC;
  `;
  const result = await pool.query(query, [periodeId]);
  return result.rows;
};

/**
 * Mengambil ringkasan seluruh rekap gaji per periode
 */
export const getAllRekap = async () => {
  const query = `
    SELECT 
      r.id_periode,
      per.bulan_gaji,
      per.tanggal_awal,
      per.tanggal_akhir,
      per.status,
      COUNT(r.id_rekap)::int AS total_pegawai,
      COALESCE(SUM(r.total_penerimaan_clean), 0) AS total_pengeluaran_gaji_bersih
    FROM tb_rekap_gaji r
    JOIN tb_periode per ON r.id_periode = per.id_periode
    WHERE per.deleted_at IS NULL
    GROUP BY r.id_periode, per.bulan_gaji, per.tanggal_awal, per.tanggal_akhir, per.status
    ORDER BY per.tanggal_awal DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
};

/**
 * Mengambil detail rekap gaji spesifik berdasarkan ID Rekap
 */
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

/**
 * Mengambil slip gaji pegawai spesifik berdasarkan ID Periode dan ID Pegawai
 */
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
