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
  const { selectedPeriodeId, setSelectedPeriodeId } = usePeriode();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedPeriodeId) return;
    setLoading(true);
    fetchDashboardSummary(selectedPeriodeId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedPeriodeId]);

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shadow-lg shadow-indigo-500/20" />
          <p className="text-xs font-medium tracking-wide text-slate-400">
            Memuat Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-6 text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Zona 1: Header & Periode Selector */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-md shadow-lg shadow-black/40">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Dashboard Penggajian
          </h1>
          <p className="text-xs font-normal text-slate-400">
            Sistem Informasi Payroll & Rekapitulasi Presensi
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data?.periode && <Badge status={data.periode.status} />}
          <PeriodeSelector
            selectedId={selectedPeriodeId}
            onChange={setSelectedPeriodeId}
          />
        </div>
      </header>

      {/* Zona 2: Metric Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Pegawai"
          value={data?.metrics.total_pegawai}
          unit="Orang"
          icon="👥"
        />
        <StatCard
          title="Kehadiran"
          value={formatPercent(data?.metrics.persentase_kehadiran)}
          icon="✅"
        />
        <StatCard
          title="Estimasi Gaji"
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
          className="border-slate-800/80 bg-slate-900/40 backdrop-blur-sm lg:col-span-2"
          title="Progres Siklus Penggajian"
        >
          <WorkflowStepper currentStatus={data?.periode.status} />

          <div className="mt-8 border-t border-slate-800/80 pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">
                Koreksi Jam Terakhir
              </h3>
              <span className="text-xs text-slate-500">Update Realtime</span>
            </div>

            {(data?.recent_koreksi_jam?.length ?? 0) === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-800 p-8 text-center">
                <p className="text-sm text-slate-500">
                  Belum ada data koreksi jam untuk periode ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-800/60 bg-slate-950/40">
                <Table>
                  <TableHead>
                    <TableHeaderCell className="bg-slate-900/80 text-slate-400">
                      Pegawai
                    </TableHeaderCell>
                    <TableHeaderCell className="bg-slate-900/80 text-slate-400">
                      Jam
                    </TableHeaderCell>
                    <TableHeaderCell className="bg-slate-900/80 text-slate-400">
                      Jenis
                    </TableHeaderCell>
                    <TableHeaderCell className="bg-slate-900/80 text-slate-400">
                      Keterangan
                    </TableHeaderCell>
                  </TableHead>
                  <TableBody>
                    {data!.recent_koreksi_jam.map((k) => (
                      <TableRow
                        key={k.id_koreksi}
                        className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors"
                      >
                        <TableCell className="font-medium text-slate-200">
                          {k.nama_pegawai}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {k.jam_koreksi}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {k.jenis_koreksi}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-slate-400">
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

        <Card
          className="border-slate-800/80 bg-slate-900/40 backdrop-blur-sm"
          title="Aksi Cepat & Alert"
        >
          <QuickActionsPanel
            alerts={data?.alerts ?? []}
            onBukaPeriode={() => router.push("/periode")}
          />
        </Card>
      </section>
    </div>
  );
}
