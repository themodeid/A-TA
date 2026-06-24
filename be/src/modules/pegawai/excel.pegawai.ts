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

    // Pastikan kita membaca sheet Gaji Pokok (misal indeks 0 atau cari yang namanya mirip)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // range: 2 artinya skip baris 1 & 2 (Judul Laporan), membaca header di baris 3
    const rawData = xlsx.utils.sheet_to_json<any>(worksheet, { range: 2 });

    if (rawData.length === 0) {
      throw new AppError("File Excel kosong atau format tidak sesuai", 400);
    }

    return rawData.map((row, index) => {
      // Ambil data nama raw (bisa jadi gabung sama tgl lahir di Excel asli)
      const namaRaw =
        row["NAMA GURU/PEGAWAI"] ||
        row["NAMA DAN\nTANGGAL LAHIR"] ||
        row["Nama"];

      if (!namaRaw) {
        throw new AppError(
          `Baris ke-${index + 4} tidak memiliki Nama Pegawai`,
          400,
        );
      }

      // Bersihkan nama dari baris baru (\n) jika ada tanggal lahir di bawahnya
      const namaBersih = String(namaRaw).split("\n")[0].trim();

      // GENERATE ID PEGAWAI SECARA AMAN:
      // Jika di Excel asli tidak ada kolom NIP/ID unik, gunakan slug nama bersih sebagai ID unik sementara
      const idPegawai =
        row["ID"] ||
        row["NIP"] ||
        namaBersih.toLowerCase().replace(/[^a-z0-9]/g, "");

      // Mapping Status Kepegawaian / Pernikahan
      const statusRaw = String(
        row["TK\nK\nD\nJ"] || row["STATUS KEPEG"] || row["Status"] || "TK",
      )
        .toUpperCase()
        .trim();

      return {
        id_pegawai: String(idPegawai).trim(),
        nama_lengkap: namaBersih,
        nama_jabatan: String(
          row["JABATAN"] || row["Jabatan"] || "Staff",
        ).trim(),
        pangkat_golongan: String(
          row["PANGKAT\nGOL/RUANG"] || row["GOL/RUANG"] || "",
        ).trim(),
        status_perkawinan: statusRaw.startsWith("K") ? "K" : "TK",
        jumlah_anak: Number(row["JLH\nJIWA"] || row["Jumlah Anak"] || 0),
        gaji_pokok_dasar: Number(
          row["GJ. POKOK\nP.P.1997\nP.P.1985"] || row["GAJI POKOK"] || 0,
        ),
        jenis_kelamin:
          String(row["JK"] || "L")
            .toUpperCase()
            .trim() === "P"
            ? "P"
            : "L",
        no_hp: row["No HP"] ? String(row["No HP"]).trim() : undefined,
        email: row["Email"] ? String(row["Email"]).trim() : undefined,
      };
    });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      `Gagal membaca struktur data Excel: ${error.message}`,
      400,
    );
  }
};
