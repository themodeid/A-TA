import { Router, Request, Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { pool } from "../config/database";
import { AppError, catchAsync } from "../utils/error";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new AppError("File harus berformat .xlsx atau .xls", 400));
    }
    cb(null, true);
  },
});

const STATUS_VALID = ["Hadir", "Izin", "Sakit", "Alpha"];

interface BarisAbsensiMentah {
  id_pegawai?: string;
  tanggal?: string | number;
  status_kehadiran?: string;
  keterangan?: string;
}

interface BarisGagal {
  baris: number;
  alasan: string;
  data: BarisAbsensiMentah;
}

function parseTanggalExcel(value: string | number | undefined): Date | null {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }

  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return isNaN(date.getTime()) ? null : date;
}

router.post(
  "/upload",
  upload.single("file"),
  catchAsync(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError("File Excel tidak ditemukan dalam request", 400);
    }

    const idPeriode = Number(req.body.id_periode);
    if (!idPeriode || isNaN(idPeriode)) {
      throw new AppError(
        "id_periode wajib disertakan dan harus berupa angka",
        400,
      );
    }

    const periodeResult = await pool.query(
      "SELECT id_periode, tanggal_awal, tanggal_akhir FROM tb_periode WHERE id_periode = $1",
      [idPeriode],
    );
    if (periodeResult.rows.length === 0) {
      throw new AppError(`Periode dengan id ${idPeriode} tidak ditemukan`, 404);
    }
    const periode = periodeResult.rows[0];
    const tanggalAwal = new Date(periode.tanggal_awal);
    const tanggalAkhir = new Date(periode.tanggal_akhir);

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellDates: false,
    });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];

    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    });
    const KOLOM_WAJIB = ["id_pegawai", "tanggal", "status_kehadiran"];

    const normalizeHeader = (text: string) =>
      String(text).trim().toLowerCase().replace(/\s+/g, "_");

    const headerRowIndex = rawRows.findIndex((row) => {
      const normalized = row.map((cell) => normalizeHeader(String(cell)));
      return KOLOM_WAJIB.every((kolom) => normalized.includes(kolom));
    });

    if (headerRowIndex === -1) {
      throw new AppError(
        `Header kolom tidak ditemukan. Pastikan file memiliki kolom: ${KOLOM_WAJIB.join(", ")}`,
        400,
      );
    }

    const headerRow = rawRows[headerRowIndex].map((cell) =>
      normalizeHeader(String(cell)),
    );
    const dataRows = rawRows
      .slice(headerRowIndex + 1)
      .filter((row) => row.some((cell) => cell !== ""));

    const rows: BarisAbsensiMentah[] = dataRows.map((row) => {
      const obj: BarisAbsensiMentah = {};
      headerRow.forEach((colName, i) => {
        (obj as any)[colName] = row[i] ?? "";
      });
      return obj;
    });

    if (rows.length === 0) {
      throw new AppError(
        "File Excel kosong atau format kolom tidak sesuai",
        400,
      );
    }

    const pegawaiResult = await pool.query("SELECT id_pegawai FROM tb_pegawai");
    const idPegawaiValid = new Set(
      pegawaiResult.rows.map((r: { id_pegawai: string }) => r.id_pegawai),
    );

    const barisValid: {
      id_pegawai: string;
      tanggal: string;
      status_kehadiran: string;
      keterangan: string;
    }[] = [];
    const barisGagal: BarisGagal[] = [];

    rows.forEach((row, index) => {
      const nomorBaris = index + 2;
      const idPegawai = String(row.id_pegawai ?? "").trim();
      const statusKehadiran = String(row.status_kehadiran ?? "").trim();
      const tanggalParsed = parseTanggalExcel(row.tanggal);

      if (!idPegawai) {
        barisGagal.push({
          baris: nomorBaris,
          alasan: "id_pegawai kosong",
          data: row,
        });
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
            [
              idPeriode,
              baris.id_pegawai,
              baris.tanggal,
              baris.status_kehadiran,
              baris.keterangan,
            ],
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
        `INSERT INTO tb_upload_absensi (id_periode, nama_file, total_baris, baris_sukses, baris_gagal, detail_error)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          idPeriode,
          req.file.originalname,
          rows.length,
          barisSukses,
          barisGagal.length,
          JSON.stringify(barisGagal),
        ],
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw new AppError(
        `Gagal memproses upload: ${(err as Error).message}`,
        500,
      );
    } finally {
      client.release();
    }

    res.status(200).json({
      message: "Upload absensi selesai diproses",
      total_baris: rows.length,
      baris_sukses: barisSukses,
      baris_gagal: barisGagal.length,
      detail_gagal: barisGagal,
    });
  }),
);

export default router;
