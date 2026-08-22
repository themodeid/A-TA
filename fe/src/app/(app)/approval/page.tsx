"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePeriode } from "@/hooks/usePeriodeContext";
import { fetchDashboardSummary } from "@/features/dashboard/api/dashboard.api";
import {
  approvePeriode,
  rejectPeriode,
  getPeriodeReadiness,
} from "@/features/periode/api/periode.api";
import { DashboardSummary, PeriodeReadiness } from "@/types";
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
  const [readiness, setReadiness] = useState<PeriodeReadiness | null>(null);
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!selectedPeriodeId) return;
    fetchDashboardSummary(selectedPeriodeId).then(setSummary);
    getPeriodeReadiness(selectedPeriodeId)
      .then(setReadiness)
      .catch((err) => console.error("Gagal load readiness approval:", err));
  }, [selectedPeriodeId]);

  const canAct = selectedPeriode?.status === "Menunggu Approval";
  const isAbsensiComplete = readiness?.absensi.isComplete ?? false;

  const handleApprove = async () => {
    if (!selectedPeriodeId) return;
    if (!isAbsensiComplete) {
      setErrorMsg(
        "Gagal Approve: Absensi semua pegawai belum terisi lengkap. Harap lengkapi data absensi terlebih dahulu.",
      );
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      await approvePeriode(selectedPeriodeId, catatan);
      await refreshPeriodeList();
      setMessage("Periode berhasil disetujui.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal approve.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPeriodeId) return;
    setLoading(true);
    setErrorMsg("");
    try {
      await rejectPeriode(selectedPeriodeId, catatan);
      await refreshPeriodeList();
      setMessage("Periode berhasil ditolak (status dikembalikan ke Ditolak).");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal reject.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Approval Periode Gaji"
      description="Verifikasi & pengesahan periode sebelum proses kalkulasi gaji"
    >
      {message && (
        <div className="rounded-lg bg-emerald-950/60 border border-emerald-700 px-4 py-3 text-sm text-emerald-200 mb-4">
          ✅ {message}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg bg-red-950/60 border border-red-700 px-4 py-3 text-sm text-red-200 mb-4">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <span className="text-lg font-semibold text-slate-100">
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

      <Card title="Pemeriksaan & Tindakan Approval" className="mt-6">
        {!canAct ? (
          <p className="text-slate-500">
            Periode ini tidak dalam status Menunggu Approval.
          </p>
        ) : (
          <div className="space-y-5">
            {/* Status Absensi Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              isAbsensiComplete
                ? "bg-emerald-950/40 border-emerald-800 text-emerald-200"
                : "bg-red-950/40 border-red-800 text-red-200"
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{isAbsensiComplete ? "✅" : "⚠️"}</span>
                <div>
                  <h4 className="font-semibold text-sm">
                    Status Kelengkapan Absensi Pegawai
                  </h4>
                  <p className="text-xs text-slate-300">
                    {isAbsensiComplete
                      ? `Seluruh absensi pegawai (${readiness?.absensi.filledCount}/${readiness?.absensi.totalCount} pegawai) telah terisi lengkap.`
                      : `Absensi belum lengkap (${readiness?.absensi.filledCount ?? 0}/${readiness?.absensi.totalCount ?? 0} pegawai). Periode TIDAK DAPAT disetujui sampai seluruh absensi terisi.`}
                  </p>
                </div>
              </div>

              {!isAbsensiComplete && (
                <Link href="/transaksi/absensi">
                  <Button variant="secondary" size="sm">
                    Lengkapi Absensi ➔
                  </Button>
                </Link>
              )}
            </div>

            <Input
              label="Catatan Approval"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan verifikasi (opsional)"
            />

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleApprove}
                isLoading={loading}
                disabled={!isAbsensiComplete}
                className={!isAbsensiComplete ? "opacity-50 cursor-not-allowed" : ""}
              >
                {isAbsensiComplete ? "Setujui Periode" : "Absensi Belum Lengkap"}
              </Button>
              <Button variant="danger" onClick={handleReject} isLoading={loading}>
                Tolak Periode
              </Button>
            </div>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
