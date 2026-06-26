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

    const worksheet = workbook.Sheets["GJ.POKOK LENGKAP"];
    if (!worksheet) {
      throw new AppError(
        "Sheet 'GJ.POKOK LENGKAP' tidak ditemukan di dalam file Excel",
        400,
      );
    }

    // MENGGUNAKAN header: 1 agar menghasilkan array multi-dimensi [ [kolom1, kolom2], [kolom1, kolom2] ]
    const rawData = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

    // Baris 0: GAJI GURU/PEGAWAI...
    // Baris 1: BULAN : JUNI 2026...
    // Baris 2: NO., NAMA DAN TANGGAL LAHIR... (Header)
    // Data asli dimulai dari Baris ke-4 (indeks 3)
    const dataRows = rawData.slice(3);

    if (dataRows.length === 0) {
      throw new AppError(
        "File Excel kosong atau tidak memiliki data valid",
        400,
      );
    }

    return dataRows
      .map((row, index) => {
        // Jika baris kosong atau kolom nama tidak ada, skip
        if (!row || row.length === 0) return null;

        // Berdasarkan struktur Excel kamu:
        // Index 0 = NO (ex: 1, 2, 3)
        // Index 1 = NAMA DAN TANGGAL LAHIR
        // Index 2 = TK/K/D/J
        // Index 3 = PANGKAT GOL/RUANG
        // Index 4 = JLH JIWA
        // Index 5 = GJ. POKOK (Rp)
        // Index 8 = TUNJJABT Struktural/Fungsional

        const namaRaw = row[1];
        if (!namaRaw || String(namaRaw).toLowerCase().includes("total")) {
          return null;
        }

        // Pisahkan nama jika di dalam Excel ada enter (\n) yang menggabungkan Nama & Tanggal Lahir
        // Contoh: "Drs. Ahmad Fauzi, M.Pd\n01-03-1970" -> Diambil nama depannya saja
        let namaBersih = String(namaRaw).split("\n")[0].trim();

        // Bersihkan angka di depan nama jika ada (jika proteksi tambahan)
        namaBersih = namaBersih.replace(/^\d+[\.\s\)]*/, "").trim();

        if (!namaBersih) return null;

        const idPegawai = String(row[0] || index + 1);
        const statusRaw = String(row[2] || "TK")
          .toUpperCase()
          .trim();
        const statusPerkawinan = statusRaw.startsWith("K") ? "K" : "TK";

        const jumlahJiwa = Number(row[4] || 1);
        const pengurang = statusPerkawinan === "K" ? 2 : 1;
        const jumlahAnak = Math.max(0, jumlahJiwa - pengurang);

        const tunjJabatan = Number(row[8] || 0);
        let jabatanTetap = "Guru / Staff";
        if (tunjJabatan >= 1000000) {
          jabatanTetap = "Kepala Sekolah / Pimpinan";
        } else if (tunjJabatan > 0) {
          jabatanTetap = "Wakasek / Jabatan Struktural";
        }

        let jenisKelamin: "L" | "P" = "L";
        const namaLower = namaBersih.toLowerCase();
        if (
          namaLower.startsWith("siti") ||
          namaLower.startsWith("dewi") ||
          namaLower.startsWith("fitri") ||
          namaLower.includes("ni ") ||
          namaLower.includes("puan")
        ) {
          jenisKelamin = "P";
        }

        return {
          id_pegawai: idPegawai,
          nama_lengkap: namaBersih,
          nama_jabatan: jabatanTetap,
          pangkat_golongan: String(row[3] || "").trim(),
          status_perkawinan: statusPerkawinan,
          jumlah_anak: jumlahAnak,
          gaji_pokok_dasar: Number(row[5] || 0),
          jenis_kelamin: jenisKelamin,
        };
      })
      .filter((item): item is ExcelPegawaiRow => item !== null);
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Gagal memproses file Excel: ${error.message}`, 400);
  }
};
