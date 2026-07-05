import { pool } from "../../config/database";
import { parseExcelPegawai, ExcelPegawaiRow } from "./excel.pegawai";

export const processMasterPegawaiSync = async (fileBuffer: Buffer) => {
  const pegawaiData = parseExcelPegawai(fileBuffer);
  console.log("Pegawai data yang diparse:", pegawaiData);
  console.log("Pegawai data yang siap disimpan:", pegawaiData);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    for (const pegawai of pegawaiData) {
      if (!pegawai || !pegawai.nama_lengkap) {
        continue;
      }

      // 1. Dapatkan atau Buat Jabatan
      const { rows: jabatanRows } = await client.query(
        `INSERT INTO tb_jabatan (nama_jabatan) VALUES ($1) 
         ON CONFLICT (nama_jabatan) DO UPDATE SET nama_jabatan = EXCLUDED.nama_jabatan
         RETURNING id_jabatan`,
        [pegawai.nama_jabatan],
      );
      const idJabatan = jabatanRows[0].id_jabatan;

      // 2. Dapatkan atau Buat Golongan
      const { rows: golonganRows } = await client.query(
        `INSERT INTO tb_golongan (nama_golongan) VALUES ($1) 
         ON CONFLICT (nama_golongan) DO UPDATE SET nama_golongan = EXCLUDED.nama_golongan
         RETURNING id_golongan`,
        [pegawai.pangkat_golongan],
      );
      const idGolongan = golonganRows[0].id_golongan;

      let jumlahAnak = pegawai.jumlah_anak || 0;
      if (pegawai.status_perkawinan === "TK") {
        jumlahAnak = 0;
      }

      // 3. GUNAKAN UNIQUE CONSTRAINT ATAU ON CONFLICT DI SINI!
      // Pastikan tb_pegawai memiliki UNIQUE constraint pada nama_lengkap (jika nama dianggap unik)
      // atau lakukan pengecekan manual agar tidak terjadi duplikasi row saat upload ulang.
      await client.query(
        `INSERT INTO tb_pegawai (
          nama_lengkap, tanggal_lahir, id_jabatan, id_golongan, 
          status_perkawinan, jumlah_anak, gaji_pokok_dasar
         ) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (nama_lengkap) DO UPDATE SET
          id_jabatan = EXCLUDED.id_jabatan,
          id_golongan = EXCLUDED.id_golongan,
          status_perkawinan = EXCLUDED.status_perkawinan,
          jumlah_anak = EXCLUDED.jumlah_anak,
          gaji_pokok_dasar = EXCLUDED.gaji_pokok_dasar,
          tanggal_lahir = COALESCE(EXCLUDED.tanggal_lahir, tb_pegawai.tanggal_lahir),
          deleted_at = NULL`,
        [
          pegawai.nama_lengkap,
          pegawai.tanggal_lahir,
          idJabatan,
          idGolongan,
          pegawai.status_perkawinan,
          jumlahAnak,
          pegawai.gaji_pokok_dasar || 0,
        ],
      );
    }
    await client.query("COMMIT");
    return pegawaiData.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// GET ALL (Hanya mengambil data yang belum di-soft delete)
export const getMasterPegawai = async () => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT p.*, j.nama_jabatan, g.nama_golongan 
      FROM tb_pegawai p
      INNER JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
      INNER JOIN tb_golongan g ON p.id_golongan = g.id_golongan
      WHERE p.deleted_at IS NULL
      ORDER BY p.id_pegawai DESC
    `;
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
};

// CREATE SINGLE PEGAWAI
// CREATE SINGLE PEGAWAI (Versi Sinkron dengan DB Baru)
export const createPegawai = async (data: any) => {
  if (!data || !data.nama_lengkap) {
    throw new Error(
      "Gagal menambah pegawai: Data nama_lengkap tidak boleh kosong",
    );
  }
  const client = await pool.connect();
  try {
    // 1. Validasi Logis: Jika Tidak Kawin, anak otomatis 0
    let jumlahAnak = data.jumlah_anak || 0;
    if (data.status_perkawinan === "TK") {
      jumlahAnak = 0;
    }

    // 2. Resolusi ID Jabatan & Golongan dari nama/string jika diperlukan
    let idJabatan = data.id_jabatan;
    if (!idJabatan && data.nama_jabatan) {
      const { rows: jabatanRows } = await client.query(
        `SELECT id_jabatan FROM tb_jabatan WHERE nama_jabatan = $1 AND deleted_at IS NULL`,
        [data.nama_jabatan],
      );
      if (jabatanRows.length > 0) {
        idJabatan = jabatanRows[0].id_jabatan;
      }
    }

    let idGolongan = data.id_golongan;
    if (!idGolongan && data.pangkat_golongan) {
      const { rows: golonganRows } = await client.query(
        `SELECT id_golongan FROM tb_golongan WHERE nama_golongan = $1 AND deleted_at IS NULL`,
        [data.pangkat_golongan],
      );
      if (golonganRows.length > 0) {
        idGolongan = golonganRows[0].id_golongan;
      }
    }

    // 3. Gunakan ON CONFLICT untuk mengaktifkan kembali jika sebelumnya di-soft delete
    // Kolom jenis_kelamin, no_hp, dan email TELAH DIHAPUS
    const query = `
      INSERT INTO tb_pegawai (
        nama_lengkap, id_jabatan, id_golongan, status_perkawinan, 
        jumlah_anak, gaji_pokok_dasar, tanggal_lahir
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (nama_lengkap) DO UPDATE SET
        id_jabatan = EXCLUDED.id_jabatan,
        id_golongan = EXCLUDED.id_golongan,
        status_perkawinan = EXCLUDED.status_perkawinan,
        jumlah_anak = EXCLUDED.jumlah_anak,
        gaji_pokok_dasar = EXCLUDED.gaji_pokok_dasar,
        tanggal_lahir = COALESCE(EXCLUDED.tanggal_lahir, tb_pegawai.tanggal_lahir),
        deleted_at = NULL 
      RETURNING *
    `;

    const values = [
      data.nama_lengkap,
      idJabatan,
      idGolongan,
      data.status_perkawinan,
      jumlahAnak,
      data.gaji_pokok_dasar || 0,
      data.tanggal_lahir || null,
    ];

    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    client.release();
  }
};

// UPDATE PEGAWAI (Versi Sinkron dengan DB Baru)
export const updatePegawai = async (id: number, data: any) => {
  if (!data) {
    throw new Error("Data update pegawai tidak boleh kosong");
  }
  const client = await pool.connect();
  try {
    // Validasi Logis: Jika Tidak Kawin, anak otomatis 0
    let jumlahAnak = data.jumlah_anak;
    if (data.status_perkawinan === "TK") {
      jumlahAnak = 0;
    }

    // Resolusi ID Jabatan & Golongan dari nama/string jika diperlukan
    let idJabatan = data.id_jabatan;
    if (!idJabatan && data.nama_jabatan) {
      const { rows: jabatanRows } = await client.query(
        `SELECT id_jabatan FROM tb_jabatan WHERE nama_jabatan = $1 AND deleted_at IS NULL`,
        [data.nama_jabatan],
      );
      if (jabatanRows.length > 0) {
        idJabatan = jabatanRows[0].id_jabatan;
      }
    }

    let idGolongan = data.id_golongan;
    if (!idGolongan && data.pangkat_golongan) {
      const { rows: golonganRows } = await client.query(
        `SELECT id_golongan FROM tb_golongan WHERE nama_golongan = $1 AND deleted_at IS NULL`,
        [data.pangkat_golongan],
      );
      if (golonganRows.length > 0) {
        idGolongan = golonganRows[0].id_golongan;
      }
    }

    // Kolom jenis_kelamin, no_hp, dan email TELAH DIHAPUS
    const query = `
      UPDATE tb_pegawai 
      SET 
        nama_lengkap = $1, id_jabatan = $2, id_golongan = $3, 
        status_perkawinan = $4, jumlah_anak = $5, gaji_pokok_dasar = $6,
        tanggal_lahir = $7
      WHERE id_pegawai = $8 AND deleted_at IS NULL
      RETURNING *
    `;
    const values = [
      data.nama_lengkap,
      idJabatan,
      idGolongan,
      data.status_perkawinan,
      jumlahAnak,
      data.gaji_pokok_dasar,
      data.tanggal_lahir || null,
      id,
    ];
    const result = await client.query(query, values);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

// GET BY ID (Pastikan data yang sudah dihapus tidak bisa diakses)
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

// SOFT DELETE PEGAWAI
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
