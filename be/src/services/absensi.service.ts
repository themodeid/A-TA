import * as XLSX from "xlsx";
import { pool } from "../config/database";
import { AppError } from "../utils/error";
import { parseTanggalExcel } from "../utils/excel";
import { BarisAbsensiMentah, BarisGagal, BarisValid } from "../types/absensi";

const STATUS_VALID = ["Hadir", "Izin", "Sakit", "Alpha"];
const KOLOM_WAJIB = ["id_pegawai", "tanggal", "status_kehadiran"];

const normalizeHeader = (text: string) =>
  String(text).trim().toLowerCase().replace(/\s+/g, "_");

export async function processAbsensiUpload(
  fileBuffer: Buffer,
  fileName: string,
  idPeriode: number
) {
  // 1. Pastikan periode ada
  const periodeResult = await pool.query(
    "SELECT id_periode, tanggal_awal, tanggal_akhir FROM tb_periode WHERE id_periode = $1",
    [idPeriode]
  );
  if (periodeResult.rows.length === 0) {
    throw new AppError(`Periode dengan id ${idPeriode} tidak ditemukan`, 404);
  }
  const periode = periodeResult.rows[0];
  const tanggalAwal = new Date(periode.tanggal_awal);
  const tanggalAkhir = new Date(periode.tanggal_akhir);

  // 2. Parse file Excel dari buffer
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  // Baca sebagai array-of-array
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const headerRowIndex = rawRows.findIndex((row) => {
    const normalized = row.map((cell) => normalizeHeader(String(cell)));
    return KOLOM_WAJIB.every((kolom) => normalized.includes(kolom));
  });

  if (headerRowIndex === -1) {
    throw new AppError(
      `Header kolom tidak ditemukan. Pastikan file memiliki kolom: ${KOLOM_WAJIB.join(", ")}`,
      400
    );
  }

  const headerRow = rawRows[headerRowIndex].map((cell) => normalizeHeader(String(cell)));
  const dataRows = rawRows.slice(headerRowIndex + 1).filter((row) => row.some((cell) => cell !== ""));

  const rows: BarisAbsensiMentah[] = dataRows.map((row) => {
    const obj: BarisAbsensiMentah = {};
    headerRow.forEach((colName, i) => {
      (obj as any)[colName] = row[i] ?? "";
    });
    return obj;
  });

  if (rows.length === 0) {
    throw new AppError("File Excel kosong atau format kolom tidak sesuai", 400);
  }

  // 3. Ambil daftar id_pegawai valid
  const pegawaiResult = await pool.query("SELECT id_pegawai FROM tb_pegawai");
  const idPegawaiValid = new Set(pegawaiResult.rows.map((r: { id_pegawai: string }) => r.id_pegawai));

  const barisValid: BarisValid[] = [];
  const barisGagal: BarisGagal[] = [];

  rows.forEach((row, index) => {
    const nomorBaris = index + 2; // +2 karena baris 1 = header, data mulai baris 2
    const idPegawai = String(row.id_pegawai ?? "").trim();
    const statusKehadiran = String(row.status_kehadiran ?? "").trim();
    const tanggalParsed = parseTanggalExcel(row.tanggal);

    if (!idPegawai) {
      barisGagal.push({ baris: nomorBaris, alasan: "id_pegawai kosong", data: row });
      return;
    }
    if (!idPegawaiValid.has(idPegawai)) {
      barisGagal.push({
        baris: nomorBaris,
        alasan: `id_pegawai '${idPegawai}' tidak ditemukan di data master`,
        data: row,
      });
      return;
    }
    if (!tanggalParsed) {
      barisGagal.push({
        baris: nomorBaris,
        alasan: "Format tanggal tidak valid (gunakan DD/MM/YYYY)",
        data: row,
      });
      return;
    }
    if (tanggalParsed < tanggalAwal || tanggalParsed > tanggalAkhir) {
      barisGagal.push({
        baris: nomorBaris,
        alasan: `Tanggal di luar periode (${periode.tanggal_awal} s/d ${periode.tanggal_akhir})`,
        data: row,
      });
      return;
    }
    if (!STATUS_VALID.includes(statusKehadiran)) {
      barisGagal.push({
        baris: nomorBaris,
        alasan: `status_kehadiran harus salah satu dari: ${STATUS_VALID.join(", ")}`,
        data: row,
      });
      return;
    }

    barisValid.push({
      id_pegawai: idPegawai,
      tanggal: tanggalParsed.toISOString().slice(0, 10),
      status_kehadiran: statusKehadiran,
      keterangan: String(row.keterangan ?? "-").trim() || "-",
    });
  });

  // 4. Insert ke database dalam 1 transaction
  const client = await pool.connect();
  let barisSukses = 0;
  try {
    await client.query("BEGIN");

    for (const baris of barisValid) {
      try {
        await client.query(
          `INSERT INTO tb_absensi (id_periode, id_pegawai, tanggal, status_kehadiran, keterangan)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id_pegawai, tanggal) DO UPDATE
             SET status_kehadiran = EXCLUDED.status_kehadiran,
                 keterangan = EXCLUDED.keterangan`,
          [idPeriode, baris.id_pegawai, baris.tanggal, baris.status_kehadiran, baris.keterangan]
        );
        barisSukses++;
      } catch (err) {
        barisGagal.push({
          baris: -1,
          alasan: `Gagal insert ke database: ${(err as Error).message}`,
          data: baris,
        });
      }
    }

    await client.query(
      `INSERT INTO tb_upload_log (id_periode, nama_file, total_baris, baris_sukses, baris_gagal, detail_error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        idPeriode,
        fileName,
        rows.length,
        barisSukses,
        barisGagal.length,
        JSON.stringify(barisGagal),
      ]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw new AppError(`Gagal memproses upload: ${(err as Error).message}`, 500);
  } finally {
    client.release();
  }

  return {
    total_baris: rows.length,
    baris_sukses: barisSukses,
    baris_gagal: barisGagal.length,
    detail_gagal: barisGagal,
  };
}
