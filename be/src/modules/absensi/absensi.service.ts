import { pool } from "../../config/database";
import { AppError } from "../../utils/appError";
import { parseExcelAbsensi } from "./excel.absensi";
import { BarisAbsensiMentah, BarisGagal, BarisValid } from "./absensi.type";

const STATUS_VALID = ["Hadir", "Izin", "Sakit", "Alpha"];
const KOLOM_WAJIB = ["id_pegawai", "tanggal", "status_kehadiran"];

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

export async function processAbsensiUpload(
  fileBuffer: Buffer,
  fileName: string,
  idPeriode: number,
) {
  // 1. Pastikan periode ada dan statusnya masih 'Pengisian Absensi' atau 'AKTIF'
  const periodeResult = await pool.query(
    "SELECT id_periode, tanggal_awal, tanggal_akhir, status FROM tb_periode WHERE id_periode = $1",
    [idPeriode],
  );
  if (periodeResult.rows.length === 0) {
    throw new AppError(`Periode dengan id ${idPeriode} tidak ditemukan`, 404);
  }

  const periode = periodeResult.rows[0];
  if (periode.status !== "Pengisian Absensi") {
    throw new AppError(
      `Periode sudah tidak dapat diubah. Status saat ini: ${periode.status}`,
      400,
    );
  }

  const tanggalAwal = new Date(periode.tanggal_awal);
  const tanggalAkhir = new Date(periode.tanggal_akhir);

  // 2. Gunakan parser yang sudah kamu buat (Menghindari Double-Parsing)
  const rawRows = parseExcelAbsensi(fileBuffer);

  // Cari index baris tempat header berada
  const headerRowIndex = rawRows.findIndex((row: any) => {
    const normalized = row.map((cell: any) => normalizeHeader(String(cell)));
    return KOLOM_WAJIB.every((kolom) => normalized.includes(kolom));
  });

  if (headerRowIndex === -1) {
    throw new AppError(
      `Header kolom tidak ditemukan. Pastikan file memiliki kolom: ${KOLOM_WAJIB.join(", ")}`,
      400,
    );
  }

  const headerRow = rawRows[headerRowIndex].map((cell: any) =>
    normalizeHeader(String(cell)),
  );

  const rawDataRows = rawRows.slice(headerRowIndex + 1);
  const rows: (BarisAbsensiMentah & { __nomorBarisExcel: number })[] = [];

  // Looping baris data
  for (let i = 0; i < rawDataRows.length; i++) {
    const row = rawDataRows[i];
    const cellAwal = String(row[0] ?? "").trim();

    // Berhenti jika mendeteksi tabel Rekap Gaji dimulai atau selesai baris data
    if (cellAwal.includes("REKAP GAJI") || cellAwal === "ID Pegawai") {
      break;
    }

    if (!row.some((cell) => cell !== "")) continue;

    // Sesuai dengan id_pegawai di master kamu (Jika berupa angka, sesuaikan deteksinya)
    if (cellAwal !== "") {
      const obj: any = {};
      headerRow.forEach((colName, colIdx) => {
        obj[colName] = row[colIdx] ?? "";
      });

      obj.__nomorBarisExcel = headerRowIndex + i + 2;
      rows.push(obj);
    }
  }

  if (rows.length === 0) {
    throw new AppError(
      "Tidak ada data absensi yang ditemukan di dalam file",
      400,
    );
  }

  // 3. Ambil daftar id_pegawai valid dari database (Pastikan bertipe String untuk pencarian Set)
  const pegawaiResult = await pool.query(
    "SELECT id_pegawai FROM tb_pegawai WHERE deleted_at IS NULL",
  );
  const idPegawaiValid = new Set(
    pegawaiResult.rows.map((r: { id_pegawai: any }) =>
      String(r.id_pegawai).trim(),
    ),
  );

  const barisValid: BarisValid[] = [];
  const barisGagal: BarisGagal[] = [];

  rows.forEach((row) => {
    const nomorBaris = row.__nomorBarisExcel;
    const idPegawaiRaw = String(row.id_pegawai ?? "").trim();

    // Ekstrak angka saja jika id_pegawai di excel kamu mengandung teks seperti "ABS001" -> "001" -> 1
    const idPegawaiClean = idPegawaiRaw.replace(/\D/g, "");
    const statusKehadiran = String(row.status_kehadiran ?? "").trim();
    const tanggalParsed = parseTanggalExcel(row.tanggal);

    const { __nomorBarisExcel, ...cleanRowData } = row;

    if (!idPegawaiRaw) {
      barisGagal.push({
        baris: nomorBaris,
        alasan: "id_pegawai kosong",
        data: cleanRowData,
      });
      return;
    }
    if (!idPegawaiValid.has(idPegawaiClean)) {
      barisGagal.push({
        baris: nomorBaris,
        alasan: `id_pegawai '${idPegawaiRaw}' tidak terdaftar atau telah dihapus`,
        data: cleanRowData,
      });
      return;
    }
    if (!tanggalParsed) {
      barisGagal.push({
        baris: nomorBaris,
        alasan: "Format tanggal tidak valid (gunakan DD/MM/YYYY)",
        data: cleanRowData,
      });
      return;
    }
    if (tanggalParsed < tanggalAwal || tanggalParsed > tanggalAkhir) {
      barisGagal.push({
        baris: nomorBaris,
        alasan: `Tanggal di luar periode aktif`,
        data: cleanRowData,
      });
      return;
    }
    if (!STATUS_VALID.includes(statusKehadiran)) {
      barisGagal.push({
        baris: nomorBaris,
        alasan: `status_kehadiran harus salah satu dari: ${STATUS_VALID.join(", ")}`,
        data: cleanRowData,
      });
      return;
    }

    barisValid.push({
      id_pegawai: idPegawaiClean,
      tanggal: tanggalParsed.toISOString().slice(0, 10),
      status_kehadiran: statusKehadiran,
      keterangan: String(row.keterangan ?? "-").trim() || "-",
    });
  });

  // 4. Insert data rekap absensi ke database menggunakan Transaction
  const client = await pool.connect();
  let barisSukses = 0;
  try {
    await client.query("BEGIN");

    // Catat log upload file terlebih dahulu untuk mendapatkan id_upload
    const uploadLogResult = await client.query(
      `INSERT INTO tb_upload_absensi (id_periode, nama_file, total_baris, baris_sukses, baris_gagal, detail_error, status_proses)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_upload`,
      [
        idPeriode,
        fileName,
        rows.length,
        0,
        barisGagal.length,
        JSON.stringify(barisGagal),
        "processing",
      ],
    );
    const idUpload = uploadLogResult.rows[0].id_upload;

    // Kelompokkan data harian menjadi data summary per pegawai untuk tb_absensi_summary
    const summaryMap = new Map<string, any>();

    barisValid.forEach((item) => {
      if (!summaryMap.has(item.id_pegawai)) {
        summaryMap.set(item.id_pegawai, {
          hadir_wfo: 0,
          hadir_wfh: 0,
          izin: 0,
          sakit: 0,
          alpha: 0,
        });
      }
      const current = summaryMap.get(item.id_pegawai);

      // Di sini sistem mendeteksi tipe kehadiran (bisa kamu kembangkan lagi jika ada status 'WFH')
      if (item.status_kehadiran === "Hadir") current.hadir_wfo++;
      else if (item.status_kehadiran === "Izin") current.izin++;
      else if (item.status_kehadiran === "Sakit") current.sakit++;
      else if (item.status_kehadiran === "Alpha") current.alpha++;
    });

    // Eksekusi upsert ke tabel tb_absensi_summary sesuai skema database barumu
    for (const [idPegawai, counter] of summaryMap.entries()) {
      await client.query(
        `INSERT INTO tb_absensi_summary (id_periode, id_pegawai, id_upload, total_hadir_ops_wfo, total_hadir_ops_wfh, total_izin, total_sakit, total_alpha)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id_periode, id_pegawai) DO UPDATE SET
           id_upload = EXCLUDED.id_upload,
           total_hadir_ops_wfo = EXCLUDED.total_hadir_ops_wfo,
           total_hadir_ops_wfh = EXCLUDED.total_hadir_ops_wfh,
           total_izin = EXCLUDED.total_izin,
           total_sakit = EXCLUDED.total_sakit,
           total_alpha = EXCLUDED.total_alpha`,
        [
          idPeriode,
          Number(idPegawai),
          idUpload,
          counter.hadir_wfo,
          counter.hadir_wfh,
          counter.izin,
          counter.sakit,
          counter.alpha,
        ],
      );
      barisSukses +=
        counter.hadir_wfo +
        counter.hadir_wfh +
        counter.izin +
        counter.sakit +
        counter.alpha;
    }

    // Update log status upload menjadi sukses
    await client.query(
      `UPDATE tb_upload_absensi SET baris_sukses = $1, status_proses = 'success' WHERE id_upload = $2`,
      [barisValid.length, idUpload],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw new AppError(
      `Gagal memproses upload karena kendala database: ${(err as Error).message}`,
      500,
    );
  } finally {
    client.release();
  }

  return {
    total_baris: rows.length,
    baris_sukses: barisValid.length,
    baris_gagal: barisGagal.length,
    detail_gagal: barisGagal,
  };
}
