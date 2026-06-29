import * as XLSX from "xlsx";
import { AppError } from "../../utils/appError";

/**
 * Membaca Buffer Excel Absensi dan mengubahnya menjadi matriks array 2 dimensi.
 * Fungsi ini mengembalikan seluruh baris (termasuk header dan teks kosong)
 * agar indeks barisnya bisa dilacak secara akurat oleh service utama kamu.
 */
export const parseExcelAbsensi = (fileBuffer: Buffer): unknown[][] => {
  try {
    // 1. Membaca workbook dari buffer secara murni
    // cellDates: false dipertahankan agar format tanggal berupa string bawaan Excel/teks mentah
    const workbook = XLSX.read(fileBuffer, {
      type: "buffer",
      cellDates: false,
    });

    // 2. Ambil sheet pertama yang aktif
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];

    if (!sheet) {
      throw new AppError(
        "File Excel kosong atau tidak memiliki sheet aktif",
        400,
      );
    }

    // 3. Konversi sheet menjadi Array of Array (matriks baris & kolom mentah)
    // header: 1 memastikan output berupa [][] (eg: [['id_pegawai', 'tanggal'], ['ABS001', '16/05/2026']])
    // defval: "" memastikan cell yang kosong tidak dilewati (menjaga konsistensi indeks kolom)
    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    });

    return rawRows;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Gagal membaca file Excel: ${error.message}`, 400);
  }
};
