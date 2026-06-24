import xlsx from "xlsx";
import { AppError } from "./appError";

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

export const parseExcelPegawai = (filePath: string): ExcelPegawaiRow[] => {
  try {
    const workbook = xlsx.readFile(filePath);
    // Kita asumsikan data pegawai ada di sheet pertama (indeks 0)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Ubah sheet menjadi JSON format raw array
    const rawData = xlsx.utils.sheet_to_json<any>(worksheet);

    if (rawData.length === 0) {
      throw new AppError(
        "File Excel kosong atau tidak memiliki data valid",
        400,
      );
    }

    // Mapping kolom Excel sekolah ke properti database kamu
    // Sesuaikan string di dalam dalam kurung [] dengan nama header di Excel aslimu!
    return rawData.map((row, index) => {
      const id = row["ID"] || row["NIP"] || row["id_pegawai"];
      if (!id) {
        throw new AppError(
          `Baris ke-${index + 2} tidak memiliki ID Pegawai/NIP`,
          400,
        );
      }

      return {
        id_pegawai: String(id).trim(),
        nama_lengkap: String(row["Nama"] || row["nama_lengkap"]).trim(),
        nama_jabatan: String(row["Jabatan"] || row["nama_jabatan"]).trim(),
        pangkat_golongan: String(
          row["Golongan"] || row["pangkat_golongan"] || "",
        ).trim(),
        status_perkawinan:
          String(row["Status"] || row["status_perkawinan"])
            .toUpperCase()
            .trim() === "K"
            ? "K"
            : "TK",
        jumlah_anak: Number(row["Anak"] || row["jumlah_anak"] || 0),
        gaji_pokok_dasar: Number(
          row["Gaji Pokok"] || row["gaji_pokok_dasar"] || 0,
        ),
        jenis_kelamin:
          String(row["JK"] || row["jenis_kelamin"])
            .toUpperCase()
            .trim() === "L"
            ? "L"
            : "P",
        no_hp: row["No HP"] ? String(row["No HP"]).trim() : undefined,
        email: row["Email"] ? String(row["Email"]).trim() : undefined,
      };
    });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Gagal membaca file Excel: ${error.message}`, 400);
  }
};
