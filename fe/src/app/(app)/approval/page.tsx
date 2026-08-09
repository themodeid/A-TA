"use client";

import { useEffect, useState } from "react";
import { usePeriode } from "@/hooks/usePeriodeContext";
import { fetchDashboardSummary } from "@/features/dashboard/api/dashboard.api";
import {
  approvePeriode,
  rejectPeriode,
} from "@/features/periode/api/periode.api";
import { DashboardSummary } from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatRupiah, formatPercent } from "@/lib/format";
import { StatCard } from "@/features/dashboard/components/StatCard";

export default function ApprovalPage() {
  const { selectedPeriodeId, selectedPeriode, refreshPeriodeList } =
    usePeriode();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!selectedPeriodeId) return;
    fetchDashboardSummary(selectedPeriodeId).then(setSummary);
  }, [selectedPeriodeId]);

  const canAct = selectedPeriode?.status === "Menunggu Approval";

  const handleApprove = async () => {
    if (!selectedPeriodeId) return;
    setLoading(true);
    try {
      await approvePeriode(selectedPeriodeId, catatan);
      await refreshPeriodeList();
      setMessage("Periode berhasil disetujui.");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Gagal approve.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPeriodeId) return;
    setLoading(true);
    try {
      await rejectPeriode(selectedPeriodeId, catatan);
      await refreshPeriodeList();
      setMessage("Periode ditolak.");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Gagal reject.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Approval Periode Gaji"
      description="Verifikasi & pengesahan periode sebelum proses gaji"
    >
      {message && (
        <div className="rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          {message}
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <span className="text-lg font-semibold">
          {selectedPeriode?.bulan_gaji}
        </span>
        {selectedPeriode && <Badge status={selectedPeriode.status} />}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Total Pegawai"
          value={summary?.metrics.total_pegawai}
          unit="Orang"
        />
        <StatCard
          title="Kehadiran"
          value={formatPercent(summary?.metrics.persentase_kehadiran)}
        />
        <StatCard
          title="Proyeksi Anggaran"
          value={formatRupiah(summary?.metrics.estimasi_pengeluaran_gaji)}
        />
      </div>

      <Card title="Action Box" className="mt-6">
        {!canAct ? (
          <p className="text-slate-500">
            Periode ini tidak dalam status Menunggu Approval.
          </p>
        ) : (
          <div className="space-y-4">
            <Input
              label="Catatan Approval"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan verifikasi (opsional)"
            />
            <div className="flex gap-3">
              <Button onClick={handleApprove} isLoading={loading}>
                Setujui Periode
              </Button>
              <Button variant="danger" onClick={handleReject} isLoading={loading}>
                Tolak
              </Button>
            </div>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
