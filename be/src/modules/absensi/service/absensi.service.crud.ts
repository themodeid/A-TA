import { pool } from "../../../config/database";

export const getAllAbsensi = async () => {
  const query = `SELECT
    a.id_absensi,
    a.id_pegawai,
    p.nama_lengkap,
    j.nama_jabatan,
    g.nama_golongan,
    m.nama_masjid,
    s.nama_shift,
    a.tanggal,
    a.hari,
    a.status,
    a.keterangan,
    a.jam_datang,
    a.jam_pulang,
    a.durasi_kerja,
    a.created_at,
    a.updated_at
FROM
    tb_absensi a
LEFT JOIN
    tb_pegawai p ON a.id_pegawai = p.id_pegawai
LEFT JOIN
    tb_jabatan j ON p.id_jabatan = j.id_jabatan
LEFT JOIN
    tb_golongan g ON p.id_golongan = g.id_golongan
LEFT JOIN
    tb_masjid m ON p.id_masjid = m.id_masjid
LEFT JOIN
    tb_shift s ON a.id_shift = s.id_shift
WHERE
    a.deleted_at IS NULL
ORDER BY
    a.id_absensi ASC;`;
  const result = await pool.query(query);
  return result.rows;
};

export const getAbsensiById = async (id: number) => {
  const query = `SELECT
    a.id_absensi,
    a.id_pegawai,
    p.nama_lengkap,
    j.nama_jabatan,
    g.nama_golongan,
    m.nama_masjid,
    s.nama_shift,
    a.tanggal,
    a.hari,
    a.status,
    a.keterangan,
    a.jam_datang,
    a.jam_pulang,
    a.durasi_kerja,
    a.created_at,
    a.updated_at
FROM
    tb_absensi a
LEFT JOIN
    tb_pegawai p ON a.id_pegawai = p.id_pegawai
LEFT JOIN
    tb_jabatan j ON p.id_jabatan = j.id_jabatan
LEFT JOIN
    tb_golongan g ON p.id_golongan = g.id_golongan
LEFT JOIN
    tb_masjid m ON p.id_masjid = m.id_masjid
LEFT JOIN
    tb_shift s ON a.id_shift = s.id_shift
WHERE
    a.id_absensi = $1 AND a.deleted_at IS NULL;`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

export const updateAbsensi = async (id: number, data: any) => {
  const query = `UPDATE tb_absensi SET 
    id_pegawai = COALESCE($2, id_pegawai),
    id_shift = COALESCE($3, id_shift),
    tanggal = COALESCE($4, tanggal),
    hari = COALESCE($5, hari),
    status = COALESCE($6, status),
    keterangan = COALESCE($7, keterangan),
    jam_datang = COALESCE($8, jam_datang),
    jam_pulang = COALESCE($9, jam_pulang),
    durasi_kerja = COALESCE($10, durasi_kerja),
    updated_at = NOW()
    WHERE id_absensi = $1 AND deleted_at IS NULL
    RETURNING *;`;
  const result = await pool.query(query, [
    id,
    data.id_pegawai,
    data.id_shift,
    data.tanggal,
    data.hari,
    data.status,
    data.keterangan,
    data.jam_datang,
    data.jam_pulang,
    data.durasi_kerja,
  ]);
  return result.rows[0];
};

export const deleteAbsensi = async (id: number) => {
  const query = `
    UPDATE tb_absensi 
    SET deleted_at = NOW() 
    WHERE id_absensi = $1 AND deleted_at IS NULL
    RETURNING *;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};
