// PERHATIAN: sesuaikan path import pool di bawah ini dengan lokasi
// konfigurasi database kamu yang sebenarnya (misal "../../config/database"
// atau "../../shared/db/pool"). Aku asumsikan named export `pool` dari `pg`.
import { pool } from "../../../config/database";

// ==========================================
// TYPES
// ==========================================
export interface DashboardPeriode {
  id_periode: number;
  bulan_gaji: string;
  status: string;
  tanggal_awal: string;
  tanggal_akhir: string;
  catatan_approval?: string;
}

export interface DashboardMetrics {
  total_pegawai: number;
  persentase_kehadiran: number;
  estimasi_pengeluaran_gaji: number;
  total_potongan_terkumpul: number;
}

export interface DashboardAlert {
  type: "info" | "warning" | "error";
  message: string;
}

export interface RecentKoreksiJam {
  id_koreksi: number;
  nama_pegawai: string;
  jam_koreksi: number;
  jenis_koreksi: string;
  keterangan: string;
}

export interface DashboardSummary {
  periode: DashboardPeriode;
  metrics: DashboardMetrics;
  alerts: DashboardAlert[];
  recent_koreksi_jam: RecentKoreksiJam[];
}

// ==========================================
// HELPER: Ambil data periode terpilih
// ==========================================
async function getPeriode(idPeriode: number): Promise<DashboardPeriode> {
  const { rows } = await pool.query(
    `SELECT 
       p.id_periode, p.bulan_gaji, p.status, p.tanggal_awal, p.tanggal_akhir,
       app.catatan AS catatan_approval
     FROM tb_periode p
     LEFT JOIN LATERAL (
       SELECT catatan FROM tb_approval WHERE id_periode = p.id_periode ORDER BY id_approval DESC LIMIT 1
     ) app ON TRUE
     WHERE p.id_periode = $1 AND p.deleted_at IS NULL`,
    [idPeriode],
  );

  if (rows.length === 0) {
    throw new Error(`Periode dengan id ${idPeriode} tidak ditemukan`);
  }

  return rows[0];
}

// ==========================================
// HELPER: Total pegawai aktif
// ==========================================
async function getTotalPegawai(): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM tb_pegawai WHERE deleted_at IS NULL`,
  );
  return rows[0]?.total ?? 0;
}

// ==========================================
// HELPER: Persentase kehadiran periode berjalan
// ==========================================
async function getPersentaseKehadiran(idPeriode: number): Promise<number> {
  const { rows } = await pool.query(
    `SELECT
        COALESCE(SUM(total_hadir_ops_wfo + total_hadir_ops_wfh), 0)::numeric AS total_hadir,
        COALESCE(SUM(
          total_hadir_ops_wfo + total_hadir_ops_wfh + total_izin + total_sakit + total_alpha
        ), 0)::numeric AS total_tercatat
     FROM tb_absensi_summary
     WHERE id_periode = $1`,
    [idPeriode],
  );

  const totalHadir = Number(rows[0]?.total_hadir ?? 0);
  const totalTercatat = Number(rows[0]?.total_tercatat ?? 0);

  if (totalTercatat === 0) return 0;
  return Number(((totalHadir / totalTercatat) * 100).toFixed(2));
}

// ==========================================
// HELPER: Estimasi pengeluaran gaji periode berjalan
// ==========================================
async function getEstimasiPengeluaranGaji(idPeriode: number): Promise<number> {
  // Prioritas 1: kalau rekap gaji final sudah ada, pakai itu (paling akurat)
  const rekap = await pool.query(
    `SELECT COALESCE(SUM(total_penerimaan_clean), 0)::numeric AS total
     FROM tb_rekap_gaji
     WHERE id_periode = $1`,
    [idPeriode],
  );

  const totalRekap = Number(rekap.rows[0]?.total ?? 0);
  if (totalRekap > 0) return totalRekap;

  // Prioritas 2 (fallback): estimasi dari gaji pokok + tunjangan - potongan
  // untuk pegawai yang sudah punya data di periode ini
  const estimasi = await pool.query(
    `SELECT
        COALESCE(SUM(p.gaji_pokok_dasar), 0)::numeric AS total_gaji_pokok,
        COALESCE((
          SELECT SUM(tb.total_tunjangan_terhitung)
          FROM tb_tunjangan_bulanan tb
          WHERE tb.id_periode = $1
        ), 0)::numeric AS total_tunjangan,
        COALESCE((
          SELECT SUM(pb.total_potongan_terhitung)
          FROM tb_potongan_bulanan pb
          WHERE pb.id_periode = $1
        ), 0)::numeric AS total_potongan
     FROM tb_pegawai p
     WHERE p.deleted_at IS NULL`,
    [idPeriode],
  );

  const row = estimasi.rows[0];
  const totalGajiPokok = Number(row?.total_gaji_pokok ?? 0);
  const totalTunjangan = Number(row?.total_tunjangan ?? 0);
  const totalPotongan = Number(row?.total_potongan ?? 0);

  return totalGajiPokok + totalTunjangan - totalPotongan;
}

// ==========================================
// HELPER: Total potongan terkumpul pada periode
// ==========================================
async function getTotalPotonganTerkumpul(idPeriode: number): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(total_potongan_terhitung), 0)::numeric AS total
     FROM tb_potongan_bulanan
     WHERE id_periode = $1`,
    [idPeriode],
  );
  return Number(rows[0]?.total ?? 0);
}

// ==========================================
// HELPER: Alert sistem berdasarkan status periode
// ==========================================
async function getAlerts(
  periode: DashboardPeriode,
  totalPegawai: number,
): Promise<DashboardAlert[]> {
  const alerts: DashboardAlert[] = [];

  // Cek kelengkapan absensi
  const { rows: absensiRows } = await pool.query(
    `SELECT COUNT(DISTINCT id_pegawai)::int AS jumlah
     FROM tb_absensi_summary
     WHERE id_periode = $1`,
    [periode.id_periode],
  );
  const pegawaiDenganAbsensi = absensiRows[0]?.jumlah ?? 0;

  if (
    periode.status === "Pengisian Absensi" &&
    pegawaiDenganAbsensi < totalPegawai
  ) {
    alerts.push({
      type: "warning",
      message: `Baru ${pegawaiDenganAbsensi} dari ${totalPegawai} pegawai yang memiliki data absensi.`,
    });
  }

  // Cek total alpha (kehadiran bermasalah)
  const { rows: alphaRows } = await pool.query(
    `SELECT COALESCE(SUM(total_alpha), 0)::int AS total_alpha
     FROM tb_absensi_summary
     WHERE id_periode = $1`,
    [periode.id_periode],
  );
  const totalAlpha = alphaRows[0]?.total_alpha ?? 0;
  if (totalAlpha > 0) {
    alerts.push({
      type: "info",
      message: `Tercatat ${totalAlpha} hari alpha pada periode ini.`,
    });
  }

  // Status menunggu approval
  if (periode.status === "Menunggu Approval") {
    alerts.push({
      type: "info",
      message: "Periode ini sedang menunggu approval.",
    });
  }

  if (periode.status === "Ditolak") {
    alerts.push({
      type: "error",
      message: "Periode ini ditolak pada tahap approval. Perlu ditinjau ulang.",
    });
  }

  // Rekap gaji belum dibuat padahal status sudah Diproses Gaji
  if (periode.status === "Diproses Gaji") {
    const { rows: rekapRows } = await pool.query(
      `SELECT COUNT(*)::int AS jumlah FROM tb_rekap_gaji WHERE id_periode = $1`,
      [periode.id_periode],
    );
    if ((rekapRows[0]?.jumlah ?? 0) === 0) {
      alerts.push({
        type: "warning",
        message:
          "Status sudah Diproses Gaji, tetapi rekap gaji belum tergenerate.",
      });
    }
  }

  return alerts;
}

// ==========================================
// HELPER: Koreksi jam terbaru pada periode
// ==========================================
async function getRecentKoreksiJam(
  idPeriode: number,
): Promise<RecentKoreksiJam[]> {
  const { rows } = await pool.query(
    `SELECT
        k.id_koreksi,
        p.nama_dan_tanggal_lahir AS nama_pegawai,
        k.jam_koreksi,
        k.jenis_koreksi,
        k.keterangan
     FROM tb_koreksi_jam k
     JOIN tb_pegawai p ON p.id_pegawai = k.id_pegawai
     WHERE k.id_periode = $1
     ORDER BY k.created_at DESC
     LIMIT 5`,
    [idPeriode],
  );

  return rows;
}

// ==========================================
// MAIN: Rangkum semua data untuk dashboard
// ==========================================
export async function getDashboardSummary(
  idPeriode: number,
): Promise<DashboardSummary> {
  const periode = await getPeriode(idPeriode);
  const totalPegawai = await getTotalPegawai();

  const [
    persentaseKehadiran,
    estimasiPengeluaranGaji,
    totalPotonganTerkumpul,
    alerts,
    recentKoreksiJam,
  ] = await Promise.all([
    getPersentaseKehadiran(idPeriode),
    getEstimasiPengeluaranGaji(idPeriode),
    getTotalPotonganTerkumpul(idPeriode),
    getAlerts(periode, totalPegawai),
    getRecentKoreksiJam(idPeriode),
  ]);

  return {
    periode,
    metrics: {
      total_pegawai: totalPegawai,
      persentase_kehadiran: persentaseKehadiran,
      estimasi_pengeluaran_gaji: estimasiPengeluaranGaji,
      total_potongan_terkumpul: totalPotonganTerkumpul,
    },
    alerts,
    recent_koreksi_jam: recentKoreksiJam,
  };
}
