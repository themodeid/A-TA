import { pool } from "../../../config/database";
import { AppError } from "../../../utils/appError";
import { parseExcelAbsensi } from "../excel.absensi";
import { BarisAbsensiMentah, BarisGagal, BarisValid } from "../absensi.type";

const STATUS_VALID = ["Hadir", "Izin", "Sakit", "Alpha"];

/**
 * Fungsi privat (Internal Service) untuk menghitung tanggal cut-off 16 - 15 otomatis
 */
function hitungTanggalPeriode(bulan: number, year: number) {
  // Tanggal Mulai: Tanggal 16 di bulan SEBELUMNYA
  let bulanMulai = bulan - 1;
  let tahunMulai = year;

  if (bulanMulai === 0) {
    bulanMulai = 12;
    tahunMulai = year - 1;
  }

  const tanggalAwal = `${tahunMulai}-${String(bulanMulai).padStart(2, "0")}-16`;
  const tanggalAkhir = `${year}-${String(bulan).padStart(2, "0")}-15`;

  const namaBulan = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const bulanGaji = `${namaBulan[bulan - 1]} ${year}`; // Contoh: "Juni 2026" pas dengan kolom bulan_gaji tb_periode

  return { tanggalAwal, tanggalAkhir, bulanGaji };
}

/**
 * Service untuk membuat periode baru otomatis berdasarkan input bulan & tahun
 */
export const createPeriodeOtomatis = async (bulan: number, tahun: number) => {
  const { tanggalAwal, tanggalAkhir, bulanGaji } = hitungTanggalPeriode(
    bulan,
    tahun,
  );

  // Cek apakah periode bulan tersebut sudah pernah dibuat sebelumnya
  const checkQuery = `SELECT id_periode, bulan_gaji, tanggal_awal, tanggal_akhir, status FROM tb_periode WHERE bulan_gaji = $1;`;
  const checkResult = await pool.query(checkQuery, [bulanGaji]);

  // JIKA SUDAH ADA: Kembalikan data yang ada agar upload ulang di bulan yang sama bisa berjalan
  if (checkResult.rows.length > 0) {
    return checkResult.rows[0];
  }

  // JIKA BELUM ADA: Buat baru
  const query = `
    INSERT INTO tb_periode (bulan_gaji, tanggal_awal, tanggal_akhir, status)
    VALUES ($1, $2, $3, 'Pengisian Absensi')
    RETURNING id_periode, bulan_gaji, tanggal_awal, tanggal_akhir, status;
  `;

  const { rows } = await pool.query(query, [
    bulanGaji,
    tanggalAwal,
    tanggalAkhir,
  ]);
  return rows[0];
};

const normalizeHeader = (text: string) =>
  String(text).trim().toLowerCase().replace(/\s+/g, "_");

const parseTanggalExcel = (value: any): Date | null => {
  if (!value) return null;

  if (value instanceof Date) return value;

  // Handle Excel Serial Number
  if (typeof value === "number" && value > 0) {
    // Excel dates start from 1899-12-30 (for Windows)
    const baseDate = new Date(1899, 11, 30);
    return new Date(baseDate.getTime() + value * 24 * 60 * 60 * 1000);
  }

  // Handle String format "DD/MM/YYYY" (as per requirement)
  const parts = String(value)
    .split("/")
    .map((p) => p.trim());
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const date = new Date(year, month, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
      ) {
        return date;
      }
    }
  }

  return null;
};

// 1. Sesuaikan Kolom Wajib di paling atas file service-mu
const KOLOM_WAJIB = ["no", "nama_guru/karyawan", "h", "a", "i", "s"];

export async function processAbsensiUpload(
  fileBuffer: Buffer,
  fileName: string,
  idPeriode: number,
  idPengguna: number,
) {
  // (Bagian 1: Validasi periode tetap sama seperti kodemu yang dulu)
  const periodeResult = await pool.query(
    "SELECT id_periode, tanggal_awal, tanggal_akhir, status FROM tb_periode WHERE id_periode = $1",
    [idPeriode],
  );
  if (periodeResult.rows.length === 0) {
    throw new AppError(`Periode dengan id ${idPeriode} tidak ditemukan`, 404);
  }
  const periode = periodeResult.rows[0];

  // 2. Parse Excel/CSV menggunakan parser yang kamu punya
  const rawRows = parseExcelAbsensi(fileBuffer);

  // Cari baris tempat header berada (NO, NAMA GURU/KARYAWAN, dst...)
  const headerRowIndex = rawRows.findIndex((row: any) => {
    const normalized = row.map((cell: any) => normalizeHeader(String(cell)));
    return KOLOM_WAJIB.every((kolom) => normalized.includes(kolom));
  });

  if (headerRowIndex === -1) {
    throw new AppError(
      "Format header Excel tidak cocok. Pastikan ada kolom NO, NAMA GURU/KARYAWAN, H, A, I, S",
      400,
    );
  }

  const headerRow = rawRows[headerRowIndex].map((cell: any) =>
    normalizeHeader(String(cell)),
  );
  const rawDataRows = rawRows.slice(headerRowIndex + 2); // +2 karena di filemu ada baris "Sel, Rab, Kam" di bawah header utama

  // Ambil data master pegawai dari DB buat validasi ID
  const pegawaiResult = await pool.query(
    "SELECT id_pegawai FROM tb_pegawai WHERE deleted_at IS NULL",
  );
  const idPegawaiValid = new Set(
    pegawaiResult.rows.map((r: any) => String(r.id_pegawai).trim()),
  );

  const barisGagal: any[] = [];
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Bikin log upload
    const uploadLogResult = await client.query(
      `INSERT INTO tb_upload_absensi (id_periode, nama_file, total_baris, baris_sukses, baris_gagal, detail_error, status_proses)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_upload`,
      [idPeriode, fileName, rawDataRows.length, 0, 0, "[]", "processing"],
    );
    const idUpload = uploadLogResult.rows[0].id_upload;

    let barisSuksesHitung = 0;

    // 3. Looping data horizontal langsung ke summary-nya
    for (let i = 0; i < rawDataRows.length; i++) {
      const row = rawDataRows[i];
      if (!row || row.length === 0 || String(row[0]).trim() === "") continue;

      // Map isi kolom berdasarkan nama headernya
      const obj: any = {};
      headerRow.forEach((colName, colIdx) => {
        obj[colName] = row[colIdx];
      });

      // Asumsi: Kolom 'NO' di excel diisi dengan ID Pegawai (1, 2, 3...)
      const idPegawaiClean = String(obj["no"] ?? "").trim();
      const namaPegawai = String(obj["nama_guru/karyawan"] ?? "").trim();

      // Ambil totalan dari kolom paling kanan excel
      const totalHadir = parseInt(obj["h"]) || 0;
      const totalAlpha = parseInt(obj["a"]) || 0;
      const totalIzin = parseInt(obj["i"]) || 0;
      const totalSakit = parseInt(obj["s"]) || 0;

      // Validasi apakah ID Pegawai tersebut ada di DB
      if (!idPegawaiClean || !idPegawaiValid.has(idPegawaiClean)) {
        barisGagal.push({
          baris: headerRowIndex + i + 3,
          alasan: `ID Pegawai '${idPegawaiClean}' (${namaPegawai}) tidak terdaftar di database`,
          data: { nama: namaPegawai },
        });
        continue;
      }

      // 4. Langsung UPSERT ke tb_absensi_summary (Tanpa perlu mapping harian lagi!)
      await client.query(
        `INSERT INTO tb_absensi_summary (id_periode, id_pegawai, id_upload, total_hadir_ops_wfo, total_hadir_ops_wfh, total_izin, total_sakit, total_alpha)
         VALUES ($1, $2, $3, $4, 0, $5, $6, $7)
         ON CONFLICT (id_periode, id_pegawai) DO UPDATE SET
           id_upload = EXCLUDED.id_upload,
           total_hadir_ops_wfo = EXCLUDED.total_hadir_ops_wfo,
           total_izin = EXCLUDED.total_izin,
           total_sakit = EXCLUDED.total_sakit,
           total_alpha = EXCLUDED.total_alpha`,
        [
          idPeriode,
          Number(idPegawaiClean),
          idUpload,
          totalHadir,
          totalIzin,
          totalSakit,
          totalAlpha,
        ],
      );

      barisSuksesHitung++;
    }

    // Update status log akhir
    await client.query(
      `UPDATE tb_upload_absensi SET baris_sukses = $1, baris_gagal = $2, detail_error = $3, status_proses = 'success' WHERE id_upload = $4`,
      [
        barisSuksesHitung,
        barisGagal.length,
        JSON.stringify(barisGagal),
        idUpload,
      ],
    );

    await client.query("COMMIT");

    return {
      total_baris: rawDataRows.length,
      baris_sukses: barisSuksesHitung,
      baris_gagal: barisGagal.length,
      detail_gagal: barisGagal,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw new AppError(
      `Gagal memproses karena kendala database: ${(err as Error).message}`,
      500,
    );
  } finally {
    client.release();
  }
}
