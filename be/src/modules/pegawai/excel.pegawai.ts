import xlsx from "xlsx";
import { AppError } from "../../utils/appError";

export interface ExcelPegawaiRow {
  id_pegawai: string;
  nama_lengkap: string;
  nama_jabatan: string;
  pangkat_golongan: string;
  status_perkawinan: "K" | "TK";
  jumlah_anak: number;
  gaji_pokok_dasar: number;
  jenis_kelamin: "L" | "P";
  no_hp?: string;
  email?: string;
}

export const parseExcelPegawai = (fileBuffer: Buffer): ExcelPegawaiRow[] => {
  try {
    const workbook = xlsx.read(fileBuffer, { type: "buffer" });

    // Tembak langsung sheet GJ.POKOK
    const worksheet = workbook.Sheets["GJ.POKOK"];
    if (!worksheet) {
      throw new AppError(
        "Sheet 'GJ.POKOK' tidak ditemukan di dalam file Excel",
        400,
      );
    }

    // range: 2 untuk skip Judul Laporan di baris 1 & 2
    const rawData = xlsx.utils.sheet_to_json<any>(worksheet, { range: 2 });

    if (rawData.length === 0) {
      throw new AppError(
        "File Excel kosong atau tidak memiliki data valid",
        400,
      );
    }

    return rawData
      .map((row, index) => {
        const namaRaw = row["NAMA DAN\nTANGGAL LAHIR"];
        if (!namaRaw) return null; // Skip jika baris kosong / totalan di bawah

        // Split nama dengan tanggal lahir
        const namaBersih = String(namaRaw).split("\n")[0].trim();

        // Buat ID unik berbasis nama (menghilangkan spasi dan gelar/titik)
        const idPegawai = namaBersih.toLowerCase().replace(/[^a-z0-9]/g, "");

        // Ambil status perkawinan (K / TK)
        const statusRaw = String(row["TK\nK\nD\nJ"] || "TK")
          .toUpperCase()
          .trim();

        return {
          id_pegawai: idPegawai,
          nama_lengkap: namaBersih,
          nama_jabatan: String(row["JABATAN"] || "Staff").trim(),
          pangkat_golongan: String(row["PANGKAT\nGOL/RUANG"] || "").trim(),
          status_perkawinan: statusRaw.startsWith("K") ? "K" : "TK",
          // Mengurangi 1 dari jumlah jiwa karena kolom 'JLH JIWA' di excel biasanya termasuk pegawainya sendiri
          jumlah_anak: Math.max(0, Number(row["JLH\nJIWA"] || 1) - 1),
          gaji_pokok_dasar: Number(row["GJ. POKOK\nP.P.1997\nP.P.1985"] || 0),
          jenis_kelamin: "L", // Default L, sesuaikan jika ada indikator gender di Excel asli
        };
      })
      .filter(Boolean) as ExcelPegawaiRow[]; // Filter out data null
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Gagal memproses file Excel: ${error.message}`, 400);
  }
};
