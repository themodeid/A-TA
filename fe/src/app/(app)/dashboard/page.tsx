"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePeriode } from "@/hooks/usePeriodeContext";
import { fetchDashboardSummary } from "@/features/dashboard/api/dashboard.api";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { WorkflowStepper } from "@/features/dashboard/components/WorkflowStepper";
import { QuickActionsPanel } from "@/features/dashboard/components/QuickActionsPanel";
import { PeriodeSelector } from "@/features/dashboard/components/PeriodeSelector";
import { DashboardSummary } from "@/types";
import { formatRupiah, formatPercent } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

export default function DashboardPage() {
  const router = useRouter();
  const {
    selectedPeriodeId,
    setSelectedPeriodeId,
    periodeList,
    isLoading: periodeLoading,
  } = usePeriode();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPeriodeId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchDashboardSummary(selectedPeriodeId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedPeriodeId]);

  if (periodeLoading || (loading && !data)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          <p className="text-xs font-medium tracking-wide text-zinc-400">
            Memuat Dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!selectedPeriodeId || !data) {
    return (
      <div className="min-h-screen space-y-6 bg-zinc-950 p-6 text-zinc-100 selection:bg-zinc-800">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Dashboard Penggajian
            </h1>
            <p className="text-xs font-normal text-zinc-400">
              Sistem Informasi Payroll & Rekapitulasi Presensi
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PeriodeSelector
              selectedId={selectedPeriodeId}
              onChange={setSelectedPeriodeId}
            />
          </div>
        </header>

        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <span className="text-4xl mb-3">📅</span>
          <h3 className="text-base font-semibold text-zinc-200">
            {periodeList.length === 0
              ? "Belum Ada Periode Penggajian"
              : "Pilih Periode Penggajian"}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-zinc-400">
            {periodeList.length === 0
              ? "Sistem belum memiliki periode penggajian. Silakan buat periode baru terlebih dahulu untuk mulai mengelola data payroll."
              : "Silakan pilih salah satu periode yang tersedia di pojok kanan atas."}
          </p>
          {periodeList.length === 0 && (
            <button
              onClick={() => router.push("/periode")}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 shadow-sm hover:bg-zinc-200 transition-colors"
            >
              + Buka Menu Periode
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-zinc-950 p-6 text-zinc-100 selection:bg-zinc-800">
      {/* Zona 1: Header & Periode Selector */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-none">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Dashboard Penggajian
          </h1>
          <p className="text-xs text-zinc-400">
            Sistem Informasi Payroll & Rekapitulasi Presensi — SMK PSKD 3 Jakarta
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodeSelector
            selectedId={selectedPeriodeId}
            onChange={setSelectedPeriodeId}
          />
        </div>
      </header>

      {/* Zona Alert Penolakan Approval jika ada */}
      {data?.periode?.status === "Ditolak" && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="font-semibold text-rose-300 text-xs">
                Pengajuan Periode Ini Ditolak oleh Kepala Sekolah (Pak Thomas)
              </h4>
              <p className="text-xs text-rose-300/80 mt-0.5">
                {data?.periode?.catatan_approval ? (
                  <>
                    Catatan Revisi: <strong className="text-white italic">&quot;{data.periode.catatan_approval}&quot;</strong>
                  </>
                ) : (
                  "Kepala sekolah meminta perbaikan data sebelum periode ini dapat disetujui."
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/periode")}
            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 font-medium rounded-lg text-xs whitespace-nowrap transition-colors"
          >
            Buka Periode & Perbaiki ➔
          </button>
        </div>
      )}

      {/* Zona 2: Metric Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Pegawai"
          value={data?.metrics.total_pegawai}
          unit="Orang"
          icon="👥"
        />
        <StatCard
          title="Persentase Kehadiran"
          value={formatPercent(data?.metrics.persentase_kehadiran)}
          icon="✅"
        />
        <StatCard
          title="Estimasi Gaji Bruto"
          value={formatRupiah(data?.metrics.estimasi_pengeluaran_gaji)}
          icon="💰"
        />
        <StatCard
          title="Status Periode"
          value={data?.periode.status ?? "—"}
          icon="📅"
        />
      </section>

      {/* Zona 3 & 4: Main Content Area */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Progres Siklus Penggajian"
        >
          <WorkflowStepper currentStatus={data?.periode.status} />

          <div className="mt-8 border-t border-zinc-800/80 pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Log Koreksi Jam Terakhir
              </h3>
              <span className="text-[11px] text-zinc-500 font-mono">Tersinkronisasi</span>
            </div>

            {(data?.recent_koreksi_jam?.length ?? 0) === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center">
                <p className="text-xs text-zinc-500">
                  Belum ada data koreksi jam untuk periode ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-900/30">
                <Table>
                  <TableHead>
                    <TableHeaderCell>Pegawai</TableHeaderCell>
                    <TableHeaderCell>Jam</TableHeaderCell>
                    <TableHeaderCell>Jenis</TableHeaderCell>
                    <TableHeaderCell>Keterangan</TableHeaderCell>
                  </TableHead>
                  <TableBody>
                    {data!.recent_koreksi_jam.map((k) => (
                      <TableRow
                        key={k.id_koreksi}
                        className="hover:bg-zinc-850/50 transition-colors"
                      >
                        <TableCell className="font-medium text-zinc-200">
                          {k.nama_pegawai}
                        </TableCell>
                        <TableCell className="text-zinc-400 font-mono">
                          {k.jam_koreksi}
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {k.jenis_koreksi}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-zinc-400">
                          {k.keterangan}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Card>

        <Card title="Aksi Cepat & Alert">
          <QuickActionsPanel
            alerts={data?.alerts ?? []}
            onBukaPeriode={() => router.push("/periode")}
          />
        </Card>
      </section>
    </div>
  );
}
