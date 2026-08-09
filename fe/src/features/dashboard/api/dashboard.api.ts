import api from "@/services/api";
import {
  ApiResponse,
  DashboardSummary,
  KoreksiJam,
  Pegawai,
} from "@/types";
import { getAllPeriode, getPeriodeById } from "@/features/periode/api/periode.api";

export async function fetchDashboardSummary(
  idPeriode: number,
): Promise<DashboardSummary> {
  try {
    const res = await api.get<ApiResponse<DashboardSummary>>(
      "/dashboard/summary",
      { params: { id_periode: idPeriode } },
    );
    return res.data.data;
  } catch {
    return buildDashboardSummaryFallback(idPeriode);
  }
}

async function buildDashboardSummaryFallback(
  idPeriode: number,
): Promise<DashboardSummary> {
  const [periode, pegawaiRes, absensiRes] = await Promise.all([
    getPeriodeById(idPeriode).catch(() => null),
    api.get<ApiResponse<Pegawai[]>>("/master/pegawai").catch(() => ({
      data: { data: [] as Pegawai[] },
    })),
    api
      .get<ApiResponse<Array<Record<string, number | string>>>>(
        `/absensi/periode/${idPeriode}`,
      )
      .catch(() => ({ data: { data: [] } })),
  ]);

  const periodeList = periode ?? (await getAllPeriode())[0];
  const pegawai = pegawaiRes.data.data ?? [];
  const absensi = absensiRes.data.data ?? [];

  let totalHadir = 0;
  let totalDays = 0;
  absensi.forEach((row) => {
    const wfo = Number(row.total_hadir_ops_wfo ?? 0);
    const wfh = Number(row.total_hadir_ops_wfh ?? 0);
    totalHadir += wfo + wfh;
    totalDays += wfo + wfh + Number(row.total_izin ?? 0) + Number(row.total_sakit ?? 0) + Number(row.total_alpha ?? 0);
  });

  const persentase =
    totalDays > 0 ? Math.round((totalHadir / totalDays) * 1000) / 10 : 0;

  let estimasi = pegawai.reduce((s, p) => s + Number(p.gaji_pokok_dasar ?? 0), 0);

  if (periodeList?.status === "Selesai") {
    try {
      const rekapRes = await api.get<
        ApiResponse<Array<{ netto_clean: number; total_potongan_clean: number }>>
      >(`/payroll/gaji/periode/${idPeriode}`);
      const rekap = rekapRes.data.data ?? [];
      estimasi = rekap.reduce(
        (s, r) => s + Number(r.netto_clean ?? 0) + Number(r.total_potongan_clean ?? 0),
        0,
      );
    } catch {
      /* keep estimate */
    }
  }

  const alerts: DashboardSummary["alerts"] = [];
  const filledPegawai = new Set(absensi.map((a) => Number(a.id_pegawai)));
  const missing = pegawai.filter((p) => !filledPegawai.has(p.id_pegawai));
  if (missing.length > 0) {
    alerts.push({
      type: "warning",
      message: `${missing.length} pegawai belum memiliki data absensi lengkap.`,
    });
  }

  const recent_koreksi_jam: KoreksiJam[] = [];

  return {
    periode: periodeList ?? {
      id_periode: idPeriode,
      bulan_gaji: "Periode",
      status: "Pengisian Absensi",
      tanggal_awal: "",
      tanggal_akhir: "",
    },
    metrics: {
      total_pegawai: pegawai.length,
      persentase_kehadiran: persentase,
      estimasi_pengeluaran_gaji: estimasi,
      total_potongan_terkumpul: 0,
    },
    alerts,
    recent_koreksi_jam,
  };
}
