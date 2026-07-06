import { pool } from "../../config/database";
import { parseExcelPegawai, ExcelPegawaiRow } from "./excel.pegawai";

export const processMasterPegawaiSync = async (fileBuffer: Buffer) => {
  const pegawaiData = parseExcelPegawai(fileBuffer);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Gunakan milidetik saat ini sebagai base ID unik awal
    const timestampBase = Date.now();

    // Mengubah ke for-loop biasa atau menggunakan index untuk menjamin keunikan NIP generator
    for (let i = 0; i < pegawaiData.length; i++) {
      const pegawai = pegawaiData[i];

      // Sesuaikan pengecekan properti hasil parse Excel kamu
      // Karena di Excel kolomnya bernama "NAMA DAN TANGGAL LAHIR", pastikan key di object-nya sudah sesuai
      const namaLengkap =
        pegawai.nama_lengkap || pegawai["NAMA DAN TANGGAL LAHIR"];

      if (!namaLengkap) {
        continue;
      }

      // 1. Dapatkan atau Buat Jabatan
      const namaJabatan = pegawai.nama_jabatan || "Staf"; // Fallback jika kosong di excel
      const { rows: jabatanRows } = await client.query(
        `INSERT INTO tb_jabatan (nama_jabatan) VALUES ($1) 
         ON CONFLICT (nama_jabatan) DO UPDATE SET nama_jabatan = EXCLUDED.nama_jabatan
         RETURNING id_jabatan`,
        [namaJabatan],
      );
      const idJabatan = jabatanRows[0].id_jabatan;

      // 2. Dapatkan atau Buat Golongan
      // Di file Excel kamu kolomnya bernama "PANGKAT GOL/RUANG"
      const namaGolongan =
        pegawai.pangkat_golongan || pegawai["PANGKAT GOL/RUANG"] || "-";
      const { rows: golonganRows } = await client.query(
        `INSERT INTO tb_golongan (nama_golongan) VALUES ($1) 
         ON CONFLICT (nama_golongan) DO UPDATE SET nama_golongan = EXCLUDED.nama_golongan
         RETURNING id_golongan`,
        [namaGolongan],
      );
      const idGolongan = golonganRows[0].id_golongan;

      let jumlahAnak = pegawai.jumlah_anak || pegawai["JLH JIWA"] || 0;
      if (pegawai.status_perkawinan === "TK" || pegawai["TK/K/D/J"] === "TK") {
        jumlahAnak = 0;
      }

      // Generator NIP Otomatis yang AMAN & UNIK (Kombinasi waktu + indeks baris)
      // Menghasilkan format seperti: REG-1719876543210-0, REG-1719876543210-1, dst.
      const nipPegawai = `REG-${timestampBase}-${i}`;

      const statusPerkawinan =
        pegawai.status_perkawinan || pegawai["TK/K/D/J"] || "TK";
      const gajiPokok =
        pegawai.gaji_pokok_dasar ||
        pegawai["GJ. POKOK\n(Rp)"] ||
        pegawai["GJ. POKOK (Rp)"] ||
        0;

      // 3. Eksekusi INSERT ke tb_pegawai
      // Jalankan UPLOAD / SYNC dengan aman tanpa takut duplikat
      await client.query(
        `INSERT INTO tb_pegawai (
     nama_dan_tanggal_lahir, id_jabatan, id_golongan, status_perkawinan, jumlah_anak, gaji_pokok_dasar
   ) 
   VALUES ($1, $2, $3, $4, $5, $6)
   ON CONFLICT (nama_dan_tanggal_lahir) -- Jika nama + tgl lahir sudah ada, lakukan UPDATE
   DO UPDATE SET
     id_jabatan = EXCLUDED.id_jabatan,
     id_golongan = EXCLUDED.id_golongan,
     status_perkawinan = EXCLUDED.status_perkawinan,
     jumlah_anak = EXCLUDED.jumlah_anak,
     gaji_pokok_dasar = EXCLUDED.gaji_pokok_dasar,
     updated_at = NOW(),
     deleted_at = NULL`,
        [
          namaLengkap, // Ini string gabungan dari Excel, misal: "Drs. Ahmad Fauzi, M.Pd\n01-03-1970"
          idJabatan,
          idGolongan,
          statusPerkawinan,
          jumlahAnak,
          gajiPokok,
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

// CREATE SINGLE PEGAWAI (Versi Sinkron dengan DB Baru + Auto NIP)
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

    // Gabungkan nama dan tanggal lahir sesuai dengan kolom tunggal di DB kamu
    const tglLahirStr = data.tanggal_lahir ? `\n${data.tanggal_lahir}` : "";
    const namaDanTanggalLahir = `${data.nama_lengkap}${tglLahirStr}`;

    // GENERATOR NIP OTOMATIS jika input data manual tidak membawa NIP (karena DB mewajibkan NOT NULL)
    const nipPegawai =
      data.nip ||
      `REG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Jalankan Query sesuai dengan struktur tabel baru (tb_pegawai)
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

    // Satukan string nama dan tanggal lahir
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
        gaji_pokok_dasar = $7
      WHERE id_pegawai = $8 AND deleted_at IS NULL
      RETURNING *
    `;

    const values = [
      data.nip || null, // Kalau nip mau diupdate
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
