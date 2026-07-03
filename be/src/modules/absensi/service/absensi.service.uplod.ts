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

  // JIKA BELUM ADA: Buat baru (Biarkan status diisi oleh DEFAULT dari database)
  const query = `
  INSERT INTO tb_periode (bulan_gaji, tanggal_awal, tanggal_akhir)
  VALUES ($1, $2, $3)
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
  const periodeResult = await pool.query(
    "SELECT id_periode, tanggal_awal, tanggal_akhir, status FROM tb_periode WHERE id_periode = $1",
    [idPeriode],
  );
  if (periodeResult.rows.length === 0) {
    throw new AppError(`Periode dengan id ${idPeriode} tidak ditemukan`, 404);
  }

  const rawRows = parseExcelAbsensi(fileBuffer);

  const headerRowIndex = rawRows.findIndex((row: any) => {
    const normalized = row.map((cell: any) =>
      String(cell).trim().toLowerCase().replace(/\s+/g, "_"),
    );
    return KOLOM_WAJIB.every((kolom) => normalized.includes(kolom));
  });

  if (headerRowIndex === -1) {
    throw new AppError(
      "Format header Excel tidak cocok. Pastikan ada kolom NO, NAMA GURU/KARYAWAN, H, A, I, S",
      400,
    );
  }

  const headerRow = rawRows[headerRowIndex].map((cell: any) =>
    String(cell).trim().toLowerCase().replace(/\s+/g, "_"),
  );

  const rawDataRows = rawRows.slice(headerRowIndex + 2);

  // AMBIL DATA PEGAWAI BERDASARKAN NAMA (Sebab kolom 'NO' di Excel adalah nomor urut 1,2,3 dst)
  const pegawaiResult = await pool.query(
    "SELECT id_pegawai, nama_lengkap FROM tb_pegawai WHERE deleted_at IS NULL",
  );

  // Buat Map agar pencarian nama pegawai super cepat dan mengabaikan spasi/huruf kapital
  const namaPegawaiMap = new Map<string, number>();
  pegawaiResult.rows.forEach((p: any) => {
    namaPegawaiMap.set(p.nama_lengkap.trim().toLowerCase(), p.id_pegawai);
  });

  const barisGagal: any[] = [];
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const uploadLogResult = await client.query(
      `INSERT INTO tb_upload_absensi (id_periode, nama_file, total_baris, baris_sukses, baris_gagal, detail_error, status_proses)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_upload`,
      [idPeriode, fileName, rawDataRows.length, 0, 0, "[]", "processing"],
    );
    const idUpload = uploadLogResult.rows[0].id_upload;

    let barisSuksesHitung = 0;

    for (let i = 0; i < rawDataRows.length; i++) {
      const row = rawDataRows[i];
      if (!row || row.length === 0) continue;

      const obj: any = {};
      headerRow.forEach((colName, colIdx) => {
        obj[colName] = row[colIdx];
      });

      const noUrut = String(obj["no"] ?? "").trim();
      const namaPegawai = String(obj["nama_guru/karyawan"] ?? "").trim();

      // PROTEKSI: Jika kolom NO bukan angka (misal kosong, teks total, atau tanda tangan), lewati saja tanpa dianggap gagal
      if (!noUrut || isNaN(Number(noUrut)) || namaPegawai === "") {
        continue;
      }

      const totalHadir = parseInt(obj["h"], 10) || 0;
      const totalAlpha = parseInt(obj["a"], 10) || 0;
      const totalIzin = parseInt(obj["i"], 10) || 0;
      const totalSakit = parseInt(obj["s"], 10) || 0;

      // Cari id_pegawai asli di DB berdasarkan nama dari Excel
      const namaKey = namaPegawai.toLowerCase();
      const idPegawaiDb = namaPegawaiMap.get(namaKey);

      if (!idPegawaiDb) {
        barisGagal.push({
          baris: headerRowIndex + i + 3,
          alasan: `Pegawai bernama '${namaPegawai}' tidak ditemukan di database aplikasi`,
          data: { nama: namaPegawai },
        });
        continue;
      }

      // UPSERT menggunakan id_pegawai yang valid hasil deteksi nama
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
          idPegawaiDb,
          idUpload,
          totalHadir,
          totalIzin,
          totalSakit,
          totalAlpha,
        ],
      );

      barisSuksesHitung++;
    }

    // Update status log akhir dengan total baris riil yang diproses
    await client.query(
      `UPDATE tb_upload_absensi SET total_baris = $1, baris_sukses = $2, baris_gagal = $3, detail_error = $4, status_proses = 'success' WHERE id_upload = $5`,
      [
        barisSuksesHitung + barisGagal.length,
        barisSuksesHitung,
        barisGagal.length,
        JSON.stringify(barisGagal),
        idUpload,
      ],
    );

    await client.query("COMMIT");

    return {
      total_baris: barisSuksesHitung + barisGagal.length,
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
