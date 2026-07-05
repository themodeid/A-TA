import xlsx from "xlsx";
import { AppError } from "../../utils/appError";

export interface ExcelPegawaiRow {
  id_pegawai: string;
  nama_lengkap: string;
  tanggal_lahir: string | null; // format 'YYYY-MM-DD'
  nama_jabatan: string;
  pangkat_golongan: string;
  status_perkawinan: "K" | "TK";
  jumlah_anak: number;
  gaji_pokok_dasar: number;
}

const parseTanggalDdMmYyyyToIso = (raw: any): string | null => {
  const s = String(raw ?? "").trim();
  const match = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
};

const parseAngka = (raw: any): number => {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return raw;
  const s = String(raw).trim();
  if (!s) return 0;

  let cleaned = s.replace(/[^0-9,.\-]/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const lastSep = Math.max(lastComma, lastDot);

  if (lastSep !== -1 && cleaned.length - lastSep - 1 <= 2) {
    const decimalSep = cleaned[lastSep];
    const thousandsSep = decimalSep === "," ? "." : ",";
    cleaned = cleaned.split(thousandsSep).join("");
    cleaned = cleaned.slice(0, lastSep) + "." + cleaned.slice(lastSep + 1);
  } else {
    cleaned = cleaned.replace(/,/g, "").replace(/\./g, "");
  }

  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const parseNamaTanggalLahir = (
  namaCell: any,
  tanggalCell?: any,
): { nama: string; tanggal: string | null } => {
  const tanggalFromColumn = parseTanggalDdMmYyyyToIso(tanggalCell);

  const raw = String(namaCell ?? "").trim();
  const parts = raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  let nama = parts[0] || "";
  nama = nama
    .replace(/^\d+[\.\s\)]*/, "")
    .replace(/\s+/g, " ")
    .trim();

  const tanggalFromNewline =
    parts.length > 1 ? parseTanggalDdMmYyyyToIso(parts[1]) : null;
  if (tanggalFromNewline) return { nama, tanggal: tanggalFromNewline };
  if (tanggalFromColumn) return { nama, tanggal: tanggalFromColumn };

  const embedded = raw.match(/(\d{2}-\d{2}-\d{4})/);
  if (embedded) {
    const tanggal = parseTanggalDdMmYyyyToIso(embedded[1]);
    const namaEmbedded = raw
      .replace(embedded[1], "")
      .replace(/\s+/g, " ")
      .trim();
    return { nama: namaEmbedded || nama, tanggal };
  }

  return { nama, tanggal: null };
};

// Ambil peta nama -> jabatan asli dari sheet "Tunjangan"
const buildPetaJabatan = (workbook: xlsx.WorkBook): Map<string, string> => {
  const peta = new Map<string, string>();
  const sheetTunjangan = workbook.Sheets["Tunjangan"];
  if (!sheetTunjangan) return peta;

  const rows = xlsx.utils.sheet_to_json<any[]>(sheetTunjangan, { header: 1 });

  const headerIdx = rows.findIndex(
    (r) =>
      Array.isArray(r) &&
      r.some((c) => String(c).toLowerCase().includes("nama")),
  );
  if (headerIdx === -1) return peta;

  const header = rows[headerIdx].map((c: any) =>
    String(c).trim().toLowerCase(),
  );
  const idxNama = header.findIndex((c) => c.includes("nama"));
  const idxJabatan = header.findIndex((c) => c.includes("jabatan"));
  if (idxNama === -1 || idxJabatan === -1) return peta;

  rows.slice(headerIdx + 1).forEach((row) => {
    const nama = String(row?.[idxNama] || "").trim();
    const jabatan = String(row?.[idxJabatan] || "").trim();
    if (nama && jabatan) peta.set(nama.toLowerCase(), jabatan);
  });

  return peta;
};

export const parseExcelPegawai = (fileBuffer: Buffer): ExcelPegawaiRow[] => {
  try {
    const workbook = xlsx.read(fileBuffer, { type: "buffer" });

    let worksheet =
      workbook.Sheets["GJ.POKOK LENGKAP"] || workbook.Sheets["GJ.POKOK"];
    if (!worksheet) {
      const firstSheetName = workbook.SheetNames[0];
      if (firstSheetName) worksheet = workbook.Sheets[firstSheetName];
    }
    if (!worksheet) {
      throw new AppError(
        "Tidak ada sheet aktif yang ditemukan di dalam file Excel",
        400,
      );
    }

    const petaJabatan = buildPetaJabatan(workbook);

    const rawData = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    if (rawData.length === 0) {
      throw new AppError(
        "File Excel kosong atau tidak memiliki data valid",
        400,
      );
    }

    let idxNo = 0,
      idxNama = 1,
      idxStatus = 2,
      idxPangkat = 3,
      idxJiwa = 4,
      idxGaji = 5;
    let idxTanggal = -1;
    let idxGolongan = -1;

    const headerRowIndex = rawData.findIndex((row: any) => {
      if (!Array.isArray(row)) return false;
      const normalized = row.map((c: any) => String(c).trim().toLowerCase());
      return (
        normalized.some((c) => c.includes("nama")) &&
        normalized.some((c) => c.includes("pangkat") || c.includes("gol"))
      );
    });

    let dataRows: any[] = [];
    if (headerRowIndex !== -1) {
      const header = rawData[headerRowIndex].map((c: any) =>
        String(c).trim().toLowerCase().replace(/\s+/g, "_"),
      );
      header.forEach((cell, idx) => {
        if (cell.includes("no")) idxNo = idx;
        if (cell.includes("nama")) idxNama = idx;
        if (cell.includes("tanggal") && cell.includes("lahir"))
          idxTanggal = idx;
        if (
          cell.includes("status") ||
          cell.includes("tk/k") ||
          cell.includes("kawin")
        )
          idxStatus = idx;
        if (
          cell.includes("pangkat") ||
          cell.includes("gol") ||
          cell.includes("ruang")
        )
          idxPangkat = idx;
        if (cell.includes("gol") || cell.includes("ruang")) idxGolongan = idx;
        if (
          cell.includes("jiwa") ||
          cell.includes("jlh") ||
          cell.includes("anak")
        )
          idxJiwa = idx;
        if (
          cell.includes("gaji") ||
          cell.includes("gj.") ||
          cell.includes("pokok")
        )
          idxGaji = idx;
      });
      dataRows = rawData.slice(headerRowIndex + 1);
    } else {
      dataRows = rawData.slice(3);
    }

    if (dataRows.length === 0) {
      throw new AppError(
        "File Excel tidak memiliki data setelah baris header",
        400,
      );
    }

    const results: ExcelPegawaiRow[] = [];

    for (let index = 0; index < dataRows.length; index++) {
      const row = dataRows[index];
      if (!row || row.length === 0) continue;

      const namaRaw = row[idxNama];
      if (!namaRaw) continue;

      const namaStr = String(namaRaw).trim();
      if (!namaStr || namaStr.toLowerCase().includes("total")) continue;

      const tanggalOnly = parseTanggalDdMmYyyyToIso(namaStr);
      if (tanggalOnly && results.length > 0) {
        const last = results[results.length - 1];
        if (!last.tanggal_lahir) {
          last.tanggal_lahir = tanggalOnly;
          continue;
        }
      }

      const tanggalCell = idxTanggal !== -1 ? row[idxTanggal] : undefined;
      const { nama: namaBersih, tanggal: tanggalLahir } = parseNamaTanggalLahir(
        namaRaw,
        tanggalCell,
      );
      if (!namaBersih) continue;

      const idPegawai = String(row[idxNo] || index + 1).trim();
      const statusRaw = String(row[idxStatus] || "TK")
        .toUpperCase()
        .trim();
      const statusPerkawinan: "K" | "TK" = statusRaw.startsWith("K")
        ? "K"
        : "TK";

      const jumlahJiwaRaw = row[idxJiwa] ?? 1;
      const jumlahJiwa = Math.max(1, Math.round(parseAngka(jumlahJiwaRaw)));
      const pengurang = statusPerkawinan === "K" ? 2 : 1;
      const jumlahAnak = Math.max(0, jumlahJiwa - pengurang);

      const jabatanAsli =
        petaJabatan.get(namaBersih.toLowerCase()) || "Guru/Staff";

      const pangkatGolongan = String(
        (idxGolongan !== -1 && row[idxGolongan]) || row[idxPangkat] || "",
      ).trim();

      results.push({
        id_pegawai: idPegawai,
        nama_lengkap: namaBersih,
        tanggal_lahir: tanggalLahir,
        nama_jabatan: jabatanAsli,
        pangkat_golongan: pangkatGolongan,
        status_perkawinan: statusPerkawinan,
        jumlah_anak: jumlahAnak,
        gaji_pokok_dasar: parseAngka(row[idxGaji]),
      });
    }

    return results;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Gagal memproses file Excel: ${error.message}`, 400);
  }
};
