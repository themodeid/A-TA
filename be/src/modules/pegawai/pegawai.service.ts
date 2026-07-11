import { pool } from "../../config/database";

export interface PegawaiInputDTO {
  nip?: string;
  nama_lengkap: string;
  tanggal_lahir?: string;
  nama_jabatan?: string;
  id_jabatan?: number;
  pangkat_golongan?: string;
  id_golongan?: number;
  status_perkawinan: string;
  jumlah_anak?: number;
  gaji_pokok_dasar: number;
}

// READ: Mengambil semua master pegawai aktif
export const getAllMasterPegawai = async () => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        p.id_pegawai,
        p.nama_dan_tanggal_lahir,
        p.status_perkawinan,
        p.jumlah_anak,
        p.gaji_pokok_dasar,
        j.nama_jabatan,
        g.nama_golongan
      FROM tb_pegawai p
      INNER JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
      INNER JOIN tb_golongan g ON p.id_golongan = g.id_golongan
      WHERE p.deleted_at IS NULL
      ORDER BY p.id_pegawai ASC;
    `;
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
};

// READ: Mengambil data relasi pegawai terikat absensi & transaksi untuk payroll
export const getPegawaiDataForPayroll = async (
  idPeriode: number,
  idPegawai: number,
) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        p.id_pegawai,
        p.nama_dan_tanggal_lahir,
        p.status_perkawinan,
        p.jumlah_anak,
        p.gaji_pokok_dasar,
        j.nama_jabatan,
        j.tunjangan_jabatan_struktural,
        g.nama_golongan,

        COALESCE(abs.total_hadir_ops_wfo, 0) AS total_hadir_ops_wfo,
        COALESCE(abs.total_hadir_ops_wfh, 0) AS total_hadir_ops_wfh,
        COALESCE(abs.total_izin, 0) AS total_izin,
        COALESCE(abs.total_sakit, 0) AS total_sakit,
        COALESCE(abs.total_alpha, 0) AS total_alpha,

        COALESCE(tunj_b.honor_bulan, 0) AS honor_bulan,
        COALESCE(tunj_b.total_jam_lebih, 0) AS total_jam_lebih,
        
        COALESCE(MAX(CASE WHEN t_detail.id_tunjangan = 2 THEN t_detail.nilai_terhitung END), 0) AS tunjangan_istri_snapshot,
        COALESCE(MAX(CASE WHEN t_detail.id_tunjangan = 3 THEN t_detail.nilai_terhitung END), 0) AS tunjangan_anak_snapshot,

        COALESCE(pot.potongan_angsuran, 0) AS potongan_angsuran,
        COALESCE(pot.potongan_dana_wajib, 0) AS potongan_dana_wajib,
        COALESCE(pot.potongan_s_pskd, 0) AS potongan_s_pskd,
        COALESCE(pot.potongan_pelkes, 0) AS potongan_pelkes,
        COALESCE(pot.potongan_lainnya, 0) AS potongan_lainnya

      FROM tb_pegawai p
      INNER JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
      INNER JOIN tb_golongan g ON p.id_golongan = g.id_golongan
      
      LEFT JOIN tb_absensi_summary abs 
        ON p.id_pegawai = abs.id_pegawai AND abs.id_periode = $1
      LEFT JOIN tb_tunjangan_bulanan tunj_b 
        ON p.id_pegawai = tunj_b.id_pegawai AND tunj_b.id_periode = $1
      LEFT JOIN tb_tunjangan_bulanan_detail t_detail
        ON p.id_pegawai = t_detail.id_pegawai AND t_detail.id_periode = $1
      LEFT JOIN tb_potongan_bulanan pot 
        ON p.id_pegawai = pot.id_pegawai AND pot.id_periode = $1

      WHERE p.id_pegawai = $2 AND p.deleted_at IS NULL
      
      GROUP BY 
        p.id_pegawai, j.nama_jabatan, j.tunjangan_jabatan_struktural, g.nama_golongan, 
        abs.id_absensi_summary, tunj_b.id_tunjangan_bulanan, pot.id_potongan_bulanan;
    `;

    const result = await client.query(query, [idPeriode, idPegawai]);

    if (result.rows.length === 0) {
      throw new Error("Pegawai tidak ditemukan atau sudah dinonaktifkan.");
    }

    return result.rows[0];
  } finally {
    client.release();
  }
};

// READ: Mengambil detail satu pegawai berdasarkan ID
export const getPegawaiById = async (id: number) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT p.*, j.nama_jabatan, g.nama_golongan 
      FROM tb_pegawai p
      INNER JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
      INNER JOIN tb_golongan g ON p.id_golongan = g.id_golongan
      WHERE p.id_pegawai = $1 AND p.deleted_at IS NULL
    `;
    const result = await client.query(query, [id]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

// CREATE: Tambah pegawai baru dan otomatis inject baris data kosong ke periode berjalan
export const createPegawai = async (data: PegawaiInputDTO) => {
  if (!data || !data.nama_lengkap) {
    throw new Error("Data nama_lengkap wajib diisi.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let jumlahAnak = data.jumlah_anak || 0;
    if (data.status_perkawinan === "TK") {
      jumlahAnak = 0;
    }

    let idJabatan = data.id_jabatan;
    if (!idJabatan && data.nama_jabatan) {
      const { rows: jabatanRows } = await client.query(
        `SELECT id_jabatan FROM tb_jabatan WHERE nama_jabatan = $1 AND deleted_at IS NULL`,
        [data.nama_jabatan],
      );
      if (jabatanRows.length > 0) idJabatan = jabatanRows[0].id_jabatan;
    }

    let idGolongan = data.id_golongan;
    if (!idGolongan && data.pangkat_golongan) {
      const { rows: golonganRows } = await client.query(
        `SELECT id_golongan FROM tb_golongan WHERE nama_golongan = $1 AND deleted_at IS NULL`,
        [data.pangkat_golongan],
      );
      if (golonganRows.length > 0) idGolongan = golonganRows[0].id_golongan;
    }

    const tglLahirStr = data.tanggal_lahir ? `\n${data.tanggal_lahir}` : "";
    const namaDanTanggalLahir = `${data.nama_lengkap}${tglLahirStr}`;
    const nipPegawai =
      data.nip ||
      `REG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const query = `
      INSERT INTO tb_pegawai (
        nip, nama_dan_tanggal_lahir, id_jabatan, id_golongan, status_perkawinan, 
        jumlah_anak, gaji_pokok_dasar
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (nip) DO UPDATE SET
        nama_dan_tanggal_lahir = EXCLUDED.nama_dan_tanggal_lahir,
        id_jabatan = EXCLUDED.id_jabatan,
        id_golongan = EXCLUDED.id_golongan,
        status_perkawinan = EXCLUDED.status_perkawinan,
        jumlah_anak = EXCLUDED.jumlah_anak,
        gaji_pokok_dasar = EXCLUDED.gaji_pokok_dasar,
        deleted_at = NULL 
      RETURNING *
    `;

    const values = [
      nipPegawai,
      namaDanTanggalLahir,
      idJabatan,
      idGolongan,
      data.status_perkawinan || "TK",
      jumlahAnak,
      data.gaji_pokok_dasar || 0,
    ];

    const result = await client.query(query, values);
    const pegawaiBaru = result.rows[0];

    // Otomatisasi data periode berjalan (jika ada)
    const qPeriode = `
      SELECT id_periode FROM tb_periode 
      WHERE status = 'Pengisian Absensi' AND deleted_at IS NULL 
      LIMIT 1
    `;
    const { rows: periodeRows } = await client.query(qPeriode);

    if (periodeRows.length > 0) {
      const idPeriode = periodeRows[0].id_periode;
      const idPegawai = pegawaiBaru.id_pegawai;

      await client.query(
        `INSERT INTO tb_absensi_summary (id_pegawai, id_periode, total_hadir, total_absen, total_izin)
         VALUES ($1, $2, 0, 0, 0) ON CONFLICT DO NOTHING`,
        [idPegawai, idPeriode],
      );

      await client.query(
        `INSERT INTO tb_potongan_bulanan (id_pegawai, id_periode, potongan_terlambat, total_potongan)
         VALUES ($1, $2, 0, 0) ON CONFLICT DO NOTHING`,
        [idPegawai, idPeriode],
      );

      await client.query(
        `INSERT INTO tb_rekap_gaji (id_pegawai, id_periode, gaji_pokok, total_tunjangan, total_potongan, gaji_bersih, status_pembayaran)
         VALUES ($1, $2, $3, 0, 0, 0, 'Pending') ON CONFLICT DO NOTHING`,
        [idPegawai, idPeriode, data.gaji_pokok_dasar || 0],
      );
    }

    await client.query("COMMIT");
    return pegawaiBaru;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// UPDATE: Memperbarui data pegawai
export const updatePegawai = async (
  id: number,
  data: Partial<PegawaiInputDTO>,
) => {
  if (!data) {
    throw new Error("Data update pegawai tidak boleh kosong");
  }
  const client = await pool.connect();
  try {
    let jumlahAnak = data.jumlah_anak;
    if (data.status_perkawinan === "TK") {
      jumlahAnak = 0;
    }

    let idJabatan = data.id_jabatan;
    if (!idJabatan && data.nama_jabatan) {
      const { rows: jabatanRows } = await client.query(
        `SELECT id_jabatan FROM tb_jabatan WHERE nama_jabatan = $1 AND deleted_at IS NULL`,
        [data.nama_jabatan],
      );
      if (jabatanRows.length > 0) idJabatan = jabatanRows[0].id_jabatan;
    }

    let idGolongan = data.id_golongan;
    if (!idGolongan && data.pangkat_golongan) {
      const { rows: golonganRows } = await client.query(
        `SELECT id_golongan FROM tb_golongan WHERE nama_golongan = $1 AND deleted_at IS NULL`,
        [data.pangkat_golongan],
      );
      if (golonganRows.length > 0) idGolongan = golonganRows[0].id_golongan;
    }

    const tglLahirStr = data.tanggal_lahir ? `\n${data.tanggal_lahir}` : "";
    const namaDanTanggalLahir = `${data.nama_lengkap}${tglLahirStr}`;

    const query = `
      UPDATE tb_pegawai 
      SET 
        nip = COALESCE($1, nip),
        nama_dan_tanggal_lahir = $2, 
        id_jabatan = $3, 
        id_golongan = $4, 
        status_perkawinan = $5, 
        jumlah_anak = $6, 
        gaji_pokok_dasar = $7,
        updated_at = NOW()
      WHERE id_pegawai = $8 AND deleted_at IS NULL
      RETURNING *
    `;

    const values = [
      data.nip || null,
      namaDanTanggalLahir,
      idJabatan,
      idGolongan,
      data.status_perkawinan,
      jumlahAnak,
      data.gaji_pokok_dasar,
      id,
    ];
    const result = await client.query(query, values);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

// DELETE: Menggunakan Soft Delete
export const softDeletePegawai = async (id: number): Promise<boolean> => {
  const client = await pool.connect();
  try {
    const query = `
      UPDATE tb_pegawai 
      SET deleted_at = NOW() 
      WHERE id_pegawai = $1 AND deleted_at IS NULL
      RETURNING id_pegawai
    `;
    const result = await client.query(query, [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  } finally {
    client.release();
  }
};
