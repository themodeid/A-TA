import { pool } from "../../config/database";

export interface PegawaiInputDTO {
  // Disamakan persis dengan nama kolom di database PostgreSQL kamu
  nama_dan_tanggal_lahir: string;

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

export interface PegawaiInputDTO {
  nama_dan_tanggal_lahir: string; // Langsung sinkron dengan kolom database
  nama_jabatan?: string;
  id_jabatan?: number;
  pangkat_golongan?: string;
  id_golongan?: number;
  status_perkawinan: string;
  jumlah_anak?: number;
  gaji_pokok_dasar: number;
}

export interface PegawaiInputDTO {
  nama_dan_tanggal_lahir: string; // Langsung sinkron dengan kolom database
  nama_jabatan?: string;
  id_jabatan?: number;
  pangkat_golongan?: string;
  id_golongan?: number;
  status_perkawinan: string;
  jumlah_anak?: number;
  gaji_pokok_dasar: number;
}

export const createPegawai = async (data: PegawaiInputDTO) => {
  // 1. VALIDASI UTAMA
  if (!data || !data.nama_dan_tanggal_lahir) {
    throw new Error("Data nama_dan_tanggal_lahir wajib diisi.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 2. LOGIKA KONDISIONAL STATUS PERKAWINAN
    let jumlahAnak = data.jumlah_anak || 0;
    if (data.status_perkawinan === "TK") {
      jumlahAnak = 0;
    }

    // 3. LOOKUP ID JABATAN (Jika hanya mengirim nama_jabatan)
    let idJabatan = data.id_jabatan;
    if (!idJabatan && data.nama_jabatan) {
      const { rows: jabatanRows } = await client.query(
        `SELECT id_jabatan FROM tb_jabatan WHERE nama_jabatan = $1 AND deleted_at IS NULL`,
        [data.nama_jabatan],
      );
      if (jabatanRows.length > 0) idJabatan = jabatanRows[0].id_jabatan;
    }

    // 4. LOOKUP ID GOLONGAN (Jika hanya mengirim pangkat_golongan)
    let idGolongan = data.id_golongan;
    if (!idGolongan && data.pangkat_golongan) {
      const { rows: golonganRows } = await client.query(
        `SELECT id_golongan FROM tb_golongan WHERE nama_golongan = $1 AND deleted_at IS NULL`,
        [data.pangkat_golongan],
      );
      if (golonganRows.length > 0) idGolongan = golonganRows[0].id_golongan;
    }

    const namaDanTanggalLahir = data.nama_dan_tanggal_lahir;

    // 5. INSERT DATA UTAMA PEGAWAI
    const query = `
      INSERT INTO tb_pegawai (
        nama_dan_tanggal_lahir, id_jabatan, id_golongan, status_perkawinan, 
        jumlah_anak, gaji_pokok_dasar
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      namaDanTanggalLahir,
      idJabatan,
      idGolongan,
      data.status_perkawinan || "TK",
      jumlahAnak,
      data.gaji_pokok_dasar || 0,
    ];

    const result = await client.query(query, values);
    const pegawaiBaru = result.rows[0];

    // 6. OTOMATISASI DATA PERIODE BERJALAN & KALKULASI GAJI
    const qPeriode = `
      SELECT id_periode FROM tb_periode 
      WHERE status = 'Pengisian Absensi' AND deleted_at IS NULL 
      LIMIT 1
    `;
    const { rows: periodeRows } = await client.query(qPeriode);

    if (periodeRows.length > 0) {
      const idPeriode = parseInt(periodeRows[0].id_periode, 10); // Amankan tipe data di Node.js
      const idPegawai = pegawaiBaru.id_pegawai;

      // Hubungkan pegawai baru ke periode aktif lewat summary absensi
      await client.query(
        `INSERT INTO tb_absensi_summary (
            id_pegawai, id_periode, total_hadir_ops_wfo, total_hadir_ops_wfh, total_izin, total_sakit, total_alpha
         ) VALUES ($1, $2, 0, 0, 0, 0, 0) ON CONFLICT DO NOTHING`,
        [idPegawai, idPeriode],
      );

      // Trigger fungsi kalkulasi otomatis bawaan database
      await client.query(
        `SELECT public.fungsi_kalkulasi_gaji_akhir($1::INTEGER)`,
        [idPeriode],
      );
    }

    // 7. AMBIL DATA LENGKAP UNTUK RESPONSE API (DENGAN RELASI NAMA JABATAN & GOLONGAN)
    const qLengkap = `
      SELECT 
        p.id_pegawai,
        p.nama_dan_tanggal_lahir,
        p.status_perkawinan,
        p.jumlah_anak,
        p.gaji_pokok_dasar,
        j.nama_jabatan,
        g.nama_golongan
      FROM tb_pegawai p
      LEFT JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
      LEFT JOIN tb_golongan g ON p.id_golongan = g.id_golongan
      WHERE p.id_pegawai = $1
    `;
    const { rows: dataLengkapRows } = await client.query(qLengkap, [
      pegawaiBaru.id_pegawai,
    ]);

    await client.query("COMMIT");
    return dataLengkapRows[0];
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
  if (!data || Object.keys(data).length === 0) {
    throw new Error("Data update pegawai tidak boleh kosong");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Ambil data pegawai yang lama terlebih dahulu untuk fallback data yang tidak di-update
    const { rows: currentPegawaiRows } = await client.query(
      `SELECT * FROM tb_pegawai WHERE id_pegawai = $1 AND deleted_at IS NULL`,
      [id],
    );

    if (currentPegawaiRows.length === 0) {
      throw new Error("Pegawai tidak ditemukan atau sudah dihapus");
    }

    const currentPegawai = currentPegawaiRows[0];

    // 2. Tentukan nilai kolom nama_dan_tanggal_lahir
    // Jika frontend mengirim yang baru, pakai yang baru. Jika tidak, pertahankan yang lama.
    const namaDanTanggalLahir =
      data.nama_dan_tanggal_lahir !== undefined
        ? data.nama_dan_tanggal_lahir
        : currentPegawai.nama_dan_tanggal_lahir;

    // 3. Logika kondisional Status Perkawinan & Jumlah Anak
    const statusPerkawinan =
      data.status_perkawinan !== undefined
        ? data.status_perkawinan
        : currentPegawai.status_perkawinan;

    let jumlahAnak =
      data.jumlah_anak !== undefined
        ? data.jumlah_anak
        : currentPegawai.jumlah_anak;

    if (statusPerkawinan === "TK") {
      jumlahAnak = 0;
    }

    // 4. Lookup ID Jabatan (jika kirim nama_jabatan tapi tidak kirim id_jabatan)
    let idJabatan =
      data.id_jabatan !== undefined
        ? data.id_jabatan
        : currentPegawai.id_jabatan;
    if (data.id_jabatan === undefined && data.nama_jabatan) {
      const { rows: jabatanRows } = await client.query(
        `SELECT id_jabatan FROM tb_jabatan WHERE nama_jabatan = $1 AND deleted_at IS NULL`,
        [data.nama_jabatan],
      );
      if (jabatanRows.length > 0) idJabatan = jabatanRows[0].id_jabatan;
    }

    // 5. Lookup ID Golongan (jika kirim pangkat_golongan tapi tidak kirim id_golongan)
    let idGolongan =
      data.id_golongan !== undefined
        ? data.id_golongan
        : currentPegawai.id_golongan;
    if (data.id_golongan === undefined && data.pangkat_golongan) {
      const { rows: golonganRows } = await client.query(
        `SELECT id_golongan FROM tb_golongan WHERE nama_golongan = $1 AND deleted_at IS NULL`,
        [data.pangkat_golongan],
      );
      if (golonganRows.length > 0) idGolongan = golonganRows[0].id_golongan;
    }

    // 6. Gaji Pokok Dasar Fallback
    const gajiPokokDasar =
      data.gaji_pokok_dasar !== undefined
        ? data.gaji_pokok_dasar
        : currentPegawai.gaji_pokok_dasar;

    // 7. Eksekusi Query Update
    const query = `
      UPDATE tb_pegawai 
      SET 
        nama_dan_tanggal_lahir = $1, 
        id_jabatan = $2, 
        id_golongan = $3, 
        status_perkawinan = $4, 
        jumlah_anak = $5, 
        gaji_pokok_dasar = $6,
        updated_at = NOW()
      WHERE id_pegawai = $7 AND deleted_at IS NULL
      RETURNING *
    `;

    const values = [
      namaDanTanggalLahir,
      idJabatan,
      idGolongan,
      statusPerkawinan,
      jumlahAnak,
      gajiPokokDasar,
      id,
    ];

    const result = await client.query(query, values);
    const pegawaiUpdated = result.rows[0];

    // 8. Otomatisasi sinkronisasi ke data periode berjalan setelah update data pegawai
    const qPeriode = `
      SELECT id_periode FROM tb_periode 
      WHERE status = 'Pengisian Absensi' AND deleted_at IS NULL 
      LIMIT 1
    `;
    const { rows: periodeRows } = await client.query(qPeriode);

    if (periodeRows.length > 0) {
      const idPeriode = parseInt(periodeRows[0].id_periode, 10);

      // Hitung ulang gaji akhir di periode aktif karena mungkin ada perubahan gaji_pokok/tunjangan keluarga
      await client.query(
        `SELECT public.fungsi_kalkulasi_gaji_akhir($1::INTEGER)`,
        [idPeriode],
      );
    }

    // 9. Ambil data lengkap hasil update beserta nama relasinya untuk response API
    const qLengkap = `
      SELECT 
        p.id_pegawai,
        p.nama_dan_tanggal_lahir,
        p.status_perkawinan,
        p.jumlah_anak,
        p.gaji_pokok_dasar,
        j.nama_jabatan,
        g.nama_golongan
      FROM tb_pegawai p
      LEFT JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
      LEFT JOIN tb_golongan g ON p.id_golongan = g.id_golongan
      WHERE p.id_pegawai = $1
    `;
    const { rows: dataLengkapRows } = await client.query(qLengkap, [id]);

    await client.query("COMMIT");
    return dataLengkapRows[0] || null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
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
