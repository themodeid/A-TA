import { pool } from "../../../config/database";

// 1. Ambil Semua Data Summary Absensi + Periode
export const getAllAbsensi = async () => {
  const query = `SELECT
    asum.id_absensi_summary,
    asum.id_pegawai,
    p.nama_lengkap,
    j.nama_jabatan,
    g.nama_golongan,
    asum.id_periode,
    prd.bulan_gaji,
    prd.tanggal_awal,
    prd.tanggal_akhir,
    prd.status AS status_periode,
    asum.id_upload,
    asum.total_hadir_ops_wfo,
    asum.total_hadir_ops_wfh,
    asum.total_izin,
    asum.total_sakit,
    asum.total_alpha
FROM
    tb_absensi_summary asum
LEFT JOIN
    tb_pegawai p ON asum.id_pegawai = p.id_pegawai
LEFT JOIN
    tb_jabatan j ON p.id_jabatan = j.id_jabatan
LEFT JOIN
    tb_golongan g ON p.id_golongan = g.id_golongan
LEFT JOIN
    tb_periode prd ON asum.id_periode = prd.id_periode
ORDER BY
    asum.id_absensi_summary ASC;`;

  const result = await pool.query(query);
  return result.rows;
};

// 2. Ambil Data Summary Absensi Berdasarkan ID
export const getAbsensiById = async (id: number) => {
  const query = `SELECT
    asum.id_absensi_summary,
    asum.id_pegawai,
    p.nama_lengkap,
    j.nama_jabatan,
    g.nama_golongan,
    asum.id_periode,
    prd.bulan_gaji,
    prd.tanggal_awal,
    prd.tanggal_akhir,
    prd.status AS status_periode,
    asum.id_upload,
    asum.total_hadir_ops_wfo,
    asum.total_hadir_ops_wfh,
    asum.total_izin,
    asum.total_sakit,
    asum.total_alpha
FROM
    tb_absensi_summary asum
LEFT JOIN
    tb_pegawai p ON asum.id_pegawai = p.id_pegawai
LEFT JOIN
    tb_jabatan j ON p.id_jabatan = j.id_jabatan
LEFT JOIN
    tb_golongan g ON p.id_golongan = g.id_golongan
LEFT JOIN
    tb_periode prd ON asum.id_periode = prd.id_periode
WHERE
    asum.id_absensi_summary = $1;`;

  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// 3. Update Total Rekap Absensi Pegawai
export const updateAbsensi = async (id: number, data: any) => {
  const query = `UPDATE tb_absensi_summary SET 
    id_pegawai = COALESCE($2, id_pegawai),
    id_periode = COALESCE($3, id_periode),
    id_upload = COALESCE($4, id_upload),
    total_hadir_ops_wfo = COALESCE($5, total_hadir_ops_wfo),
    total_hadir_ops_wfh = COALESCE($6, total_hadir_ops_wfh),
    total_izin = COALESCE($7, total_izin),
    total_sakit = COALESCE($8, total_sakit),
    total_alpha = COALESCE($9, total_alpha)
    WHERE id_absensi_summary = $1
    RETURNING *;`;

  const result = await pool.query(query, [
    id,
    data.id_pegawai,
    data.id_periode,
    data.id_upload,
    data.total_hadir_ops_wfo,
    data.total_hadir_ops_wfh,
    data.total_izin,
    data.total_sakit,
    data.total_alpha,
  ]);
  return result.rows[0];
};

// 4. Hapus Data Rekap Absensi (Hard Delete karena tidak ada kolom deleted_at)
export const deleteAbsensi = async (id: number) => {
  const query = `
    DELETE FROM tb_absensi_summary 
    WHERE id_absensi_summary = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};
