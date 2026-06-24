// import * as XLSX from "xlsx";
// import { pool } from "../../config/database";
// import { AppError } from "../../utils/appError";
// import { parseTanggalExcel } from "../../utils/excel";
// import { BarisAbsensiMentah, BarisGagal, BarisValid } from "./absensi.type";

// const STATUS_VALID = ["Hadir", "Izin", "Sakit", "Alpha"];
// const KOLOM_WAJIB = ["id_pegawai", "tanggal", "status_kehadiran"];

// const normalizeHeader = (text: string) =>
//   String(text).trim().toLowerCase().replace(/\s+/g, "_");

// export async function processAbsensiUpload(
//   fileBuffer: Buffer,
//   fileName: string,
//   idPeriode: number,
// ) {
//   // 1. Pastikan periode ada
//   const periodeResult = await pool.query(
//     "SELECT id_periode, tanggal_awal, tanggal_akhir FROM tb_periode WHERE id_periode = $1",
//     [idPeriode],
//   );
//   if (periodeResult.rows.length === 0) {
//     throw new AppError(`Periode dengan id ${idPeriode} tidak ditemukan`, 404);
//   }
//   const periode = periodeResult.rows[0];
//   const tanggalAwal = new Date(periode.tanggal_awal);
//   const tanggalAkhir = new Date(periode.tanggal_akhir);

//   // 2. Parse file Excel dari buffer
//   const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: false });
//   const firstSheetName = workbook.SheetNames[0];
//   const sheet = workbook.Sheets[firstSheetName];

//   // Baca sebagai array-of-array
//   const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
//     header: 1,
//     defval: "",
//   });

//   const headerRowIndex = rawRows.findIndex((row) => {
//     const normalized = row.map((cell) => normalizeHeader(String(cell)));
//     return KOLOM_WAJIB.every((kolom) => normalized.includes(kolom));
//   });

//   if (headerRowIndex === -1) {
//     throw new AppError(
//       `Header kolom tidak ditemukan. Pastikan file memiliki kolom: ${KOLOM_WAJIB.join(", ")}`,
//       400,
//     );
//   }

//   const headerRow = rawRows[headerRowIndex].map((cell) =>
//     normalizeHeader(String(cell)),
//   );

//   const rawDataRows = rawRows.slice(headerRowIndex + 1);
//   const rows: (BarisAbsensiMentah & { __nomorBarisExcel: number })[] = [];

//   // Looping dengan melacak indeks baris asli untuk nomor baris excel yang akurat
//   for (let i = 0; i < rawDataRows.length; i++) {
//     const row = rawDataRows[i];
//     const cellAwal = String(row[0] ?? "").trim();

//     // Berhenti jika mendeteksi tabel Rekap Gaji dimulai
//     if (cellAwal.includes("REKAP GAJI") || cellAwal === "ID Pegawai") {
//       break;
//     }

//     if (!row.some((cell) => cell !== "")) continue;

//     if (cellAwal.startsWith("ABS")) {
//       const obj: any = {};
//       headerRow.forEach((colName, colIdx) => {
//         obj[colName] = row[colIdx] ?? "";
//       });

//       // KUNCI: Titipkan nomor baris excel asli ke dalam objek data mentah
//       obj.__nomorBarisExcel = headerRowIndex + i + 2;
//       rows.push(obj);
//     }
//   }

//   if (rows.length === 0) {
//     throw new AppError(
//       "Tidak ada data absensi valid yang ditemukan di dalam file",
//       400,
//     );
//   }

//   // 3. Ambil daftar id_pegawai valid
//   const pegawaiResult = await pool.query("SELECT id_pegawai FROM tb_pegawai");
//   const idPegawaiValid = new Set(
//     pegawaiResult.rows.map((r: { id_pegawai: string }) => r.id_pegawai),
//   );

//   const barisValid: BarisValid[] = [];
//   const barisGagal: BarisGagal[] = [];

//   rows.forEach((row) => {
//     // 💡 Menggunakan nomor baris asli yang sudah kita hitung secara dinamis tadi
//     const nomorBaris = row.__nomorBarisExcel;
//     const idPegawai = String(row.id_pegawai ?? "").trim();
//     const statusKehadiran = String(row.status_kehadiran ?? "").trim();
//     const tanggalParsed = parseTanggalExcel(row.tanggal);

//     // Salin objek tanpa properti metadata __nomorBarisExcel untuk log error
//     const { __nomorBarisExcel, ...cleanRowData } = row;

//     if (!idPegawai) {
//       barisGagal.push({
//         baris: nomorBaris,
//         alasan: "id_pegawai kosong",
//         data: cleanRowData,
//       });
//       return;
//     }
//     if (!idPegawaiValid.has(idPegawai)) {
//       barisGagal.push({
//         baris: nomorBaris,
//         alasan: `id_pegawai '${idPegawai}' tidak ditemukan di data master`,
//         data: cleanRowData,
//       });
//       return;
//     }
//     if (!tanggalParsed) {
//       barisGagal.push({
//         baris: nomorBaris,
//         alasan: "Format tanggal tidak valid (gunakan DD/MM/YYYY)",
//         data: cleanRowData,
//       });
//       return;
//     }
//     if (tanggalParsed < tanggalAwal || tanggalParsed > tanggalAkhir) {
//       barisGagal.push({
//         baris: nomorBaris,
//         alasan: `Tanggal di luar periode (${periode.tanggal_awal} s/d ${periode.tanggal_akhir})`,
//         data: cleanRowData,
//       });
//       return;
//     }
//     if (!STATUS_VALID.includes(statusKehadiran)) {
//       barisGagal.push({
//         baris: nomorBaris,
//         alasan: `status_kehadiran harus salah satu dari: ${STATUS_VALID.join(", ")}`,
//         data: cleanRowData,
//       });
//       return;
//     }

//     barisValid.push({
//       id_pegawai: idPegawai,
//       tanggal: tanggalParsed.toISOString().slice(0, 10),
//       status_kehadiran: statusKehadiran,
//       keterangan: String(row.keterangan ?? "-").trim() || "-",
//     });
//   });

//   // 4. Insert ke database dalam 1 transaction
//   const client = await pool.connect();
//   let barisSukses = 0;
//   try {
//     await client.query("BEGIN");

//     for (const baris of barisValid) {
//       await client.query(
//         `INSERT INTO tb_absensi (id_periode, id_pegawai, tanggal, status_kehadiran, keterangan)
//          VALUES ($1, $2, $3, $4, $5)
//          ON CONFLICT (id_pegawai, tanggal) DO UPDATE
//            SET status_kehadiran = EXCLUDED.status_kehadiran,
//                keterangan = EXCLUDED.keterangan`,
//         [
//           idPeriode,
//           baris.id_pegawai,
//           baris.tanggal,
//           baris.status_kehadiran,
//           baris.keterangan,
//         ],
//       );
//       barisSukses++;
//     }

//     await client.query(
//       `INSERT INTO tb_upload_absensi (id_periode, nama_file, total_baris, baris_sukses, baris_gagal, detail_error)
//        VALUES ($1, $2, $3, $4, $5, $6)`,
//       [
//         idPeriode,
//         fileName,
//         rows.length,
//         barisSukses,
//         barisGagal.length,
//         JSON.stringify(barisGagal),
//       ],
//     );

//     await client.query("COMMIT");
//   } catch (err) {
//     await client.query("ROLLBACK");
//     throw new AppError(
//       `Gagal memproses upload karena kendala database: ${(err as Error).message}`,
//       500,
//     );
//   } finally {
//     client.release();
//   }

//   return {
//     total_baris: rows.length,
//     baris_sukses: barisSukses,
//     baris_gagal: barisGagal.length,
//     detail_gagal: barisGagal,
//   };
// }
