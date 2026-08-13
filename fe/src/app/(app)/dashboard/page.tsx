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
      <div className="flex h-64 items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-6">
      {/* Zona 1: Header & Periode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm shadow-black/20">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Dashboard Penggajian
          </h1>
          <p className="text-sm text-slate-400">
            Sistem Informasi Payroll & Rekapitulasi
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data?.periode && <Badge status={data.periode.status} />}
          <PeriodeSelector
            selectedId={selectedPeriodeId}
            onChange={setSelectedPeriodeId}
          />
        </div>
      </div>

      {/* Zona 2: Metric Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
      </div>

      {/* Zona 3 & 4 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Progres Siklus Penggajian">
          <WorkflowStepper currentStatus={data?.periode.status} />

          <div className="mt-8">
            <h3 className="mb-3 text-sm font-semibold text-slate-300">
              Koreksi Jam Terakhir
            </h3>
            {(data?.recent_koreksi_jam?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-400">
                Belum ada data koreksi jam.
              </p>
            ) : (
              <Table>
                <TableHead>
                  <TableHeaderCell>Pegawai</TableHeaderCell>
                  <TableHeaderCell>Jam</TableHeaderCell>
                  <TableHeaderCell>Jenis</TableHeaderCell>
                  <TableHeaderCell>Keterangan</TableHeaderCell>
                </TableHead>
                <TableBody>
                  {data!.recent_koreksi_jam.map((k) => (
                    <TableRow key={k.id_koreksi}>
                      <TableCell>{k.nama_pegawai}</TableCell>
                      <TableCell>{k.jam_koreksi}</TableCell>
                      <TableCell>{k.jenis_koreksi}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {k.keterangan}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>

        <Card title="Aksi Cepat & Alert">
          <QuickActionsPanel
            alerts={data?.alerts ?? []}
            onBukaPeriode={() => router.push("/periode")}
          />
        </Card>
      </div>
    </div>
  );
}
