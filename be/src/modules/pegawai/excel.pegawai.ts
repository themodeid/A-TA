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

    // 1. Tembak sheet baru yang namanya 'GJ.POKOK LENGKAP'
    const worksheet = workbook.Sheets["GJ.POKOK LENGKAP"];
    if (!worksheet) {
      throw new AppError(
        "Sheet 'GJ.POKOK LENGKAP' tidak ditemukan di dalam file Excel",
        400,
      );
    }

    // range: 2 karena baris 1 dan 2 adalah Judul ("GAJI GURU...", "BULAN...")
    // Baris 3 (index 2) adalah header kolom asli
    const rawData = xlsx.utils.sheet_to_json<any>(worksheet, { range: 2 });

    if (rawData.length === 0) {
      throw new AppError(
        "File Excel kosong atau tidak memiliki data valid",
        400,
      );
    }

    return rawData
      .map((row) => {
        // 2. Ambil dari nama kolom baru 'NAMA GURU/PEGAWAI'
        const namaRaw = row["NAMA GURU/PEGAWAI"];

        // Skip baris kosong atau baris totalan di bawah
        if (
          !namaRaw ||
          String(namaRaw).trim().toUpperCase().startsWith("NO.") ||
          String(namaRaw).toLowerCase().includes("total")
        ) {
          return null;
        }

        const namaBersih = String(namaRaw).trim();

        // Buat ID unik berbasis nama bersih (hapus spasi, gelar, titik, koma)
        const idPegawai = namaBersih.toLowerCase().replace(/[^a-z0-9]/g, "");

        // 3. Ambil dari nama kolom baru 'TK/K/D/J'
        const statusRaw = String(row["TK/K/D/J"] || "TK")
          .toUpperCase()
          .trim();
        const statusPerkawinan = statusRaw.startsWith("K") ? "K" : "TK";

        // Hitung jumlah anak yang lebih akurat berdasarkan JLH JIWA
        const jumlahJiwa = Number(row["JLH\nJIWA"] || 1);
        const pengurang = statusPerkawinan === "K" ? 2 : 1; // K = Pegawai + Istri, TK = Pegawai saja
        const jumlahAnak = Math.max(0, jumlahJiwa - pengurang);

        // Map Jabatan sementara berdasarkan besaran tunjangan jabatan di excel jika kolom JABATAN tidak ada langsung di sheet ini
        const tunjJabatan = Number(
          row["TUNJJABT\nStruktural/\nFungsional"] || 0,
        );
        let jabatanTetap = "Guru / Staff";
        if (tunjJabatan >= 1000000) {
          jabatanTetap = "Kepala Sekolah / Pimpinan";
        } else if (tunjJabatan > 0) {
          jabatanTetap = "Wakasek / Jabatan Struktural";
        }

        return {
          id_pegawai: idPegawai,
          nama_lengkap: namaBersih,
          nama_jabatan: jabatanTetap,
          pangkat_golongan: String(row["PANGKAT\nGOL/RUANG"] || "").trim(),
          status_perkawinan: statusPerkawinan,
          jumlah_anak: jumlahAnak,
          gaji_pokok_dasar: Number(row["GJ. POKOK\n(Rp)"] || 0), // Menyesuaikan nama kolom baru
          jenis_kelamin: "L", // Default L, silakan sesuaikan nanti di CMS
        };
      })
      .filter((item): item is ExcelPegawaiRow => item !== null); // Bersihkan baris null
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Gagal memproses file Excel: ${error.message}`, 400);
  }
};
