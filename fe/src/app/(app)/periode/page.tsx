"use client";

import { useCallback, useEffect, useState } from "react";
import { usePeriode } from "@/hooks/usePeriodeContext";
import {
  createPeriode,
  submitApproval,
  getPeriodeReadiness,
} from "@/features/periode/api/periode.api";
import { PeriodeReadiness } from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { WorkflowStepper } from "@/features/dashboard/components/WorkflowStepper";
import { isPeriodeLocked } from "@/lib/permissions";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";

import Link from "next/link";
import { formatDate } from "@/lib/format";

export default function PeriodePage() {
  const { periodeList, refreshPeriodeList, selectedPeriode } = usePeriode();
  const [modalOpen, setModalOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [readiness, setReadiness] = useState<PeriodeReadiness | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);

  const [form, setForm] = useState({
    bulan_gaji: "",
    tanggal_awal: "",
    tanggal_akhir: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadReadiness = useCallback(async () => {
    if (!selectedPeriode?.id_periode) return;
    setReadinessLoading(true);
    try {
      const data = await getPeriodeReadiness(selectedPeriode.id_periode);
      setReadiness(data);
    } catch (err) {
      console.error("Gagal memuat kesiapan periode:", err);
    } finally {
      setReadinessLoading(false);
    }
  }, [selectedPeriode?.id_periode]);

  useEffect(() => {
    loadReadiness();
  }, [loadReadiness]);

  const handleCreate = async () => {
    setLoading(true);
    setMessage("");
    setErrorMsg("");
    try {
      await createPeriode(form);
      await refreshPeriodeList();
      setModalOpen(false);
      setForm({ bulan_gaji: "", tanggal_awal: "", tanggal_akhir: "" });
      setMessage("Periode baru berhasil dibuka.");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal membuka periode baru.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVerification = async () => {
    setMessage("");
    setErrorMsg("");
    await loadReadiness();
    setVerificationModalOpen(true);
  };

  const handleConfirmSubmitApproval = async () => {
    if (!selectedPeriode) return;
    setLoading(true);
    setErrorMsg("");
    try {
      await submitApproval(selectedPeriode.id_periode);
      await refreshPeriodeList();
      setVerificationModalOpen(false);
      setMessage("Periode berhasil diajukan untuk approval.");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal mengajukan approval.",
      );
    } finally {
      setLoading(false);
    }
  };

  const isEditable =
    selectedPeriode?.status === "Pengisian Absensi" ||
    selectedPeriode?.status === "Ditolak";

  return (
    <PageContainer
      title="Periode Gaji"
      description="Kelola siklus penggajian — buka periode baru, isi data transaksi, dan pantau status alur kerja"
      action={
        <Button onClick={() => setModalOpen(true)}>+ Buka Periode Baru</Button>
      }
    >
      {message && (
        <div className="rounded-lg bg-emerald-950/60 border border-emerald-700 px-4 py-3 text-sm text-emerald-200">
          ✅ {message}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg bg-red-950/60 border border-red-700 px-4 py-3 text-sm text-red-200">
          ⚠️ {errorMsg}
        </div>
      )}

      {selectedPeriode && (
        <div className="space-y-6">
          <Card title={`Periode Aktif: ${selectedPeriode.bulan_gaji}`}>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <Badge status={selectedPeriode.status} />
              <span className="text-sm font-medium text-slate-300">
                📅 {formatDate(selectedPeriode.tanggal_awal)} &nbsp;—&nbsp; {formatDate(selectedPeriode.tanggal_akhir)}
              </span>
              {isPeriodeLocked(selectedPeriode.status) ? (
                <span className="rounded-full bg-amber-950/70 border border-amber-700/60 px-2.5 py-0.5 text-xs text-amber-300">
                  🔒 Transaksi Terkunci
                </span>
              ) : (
                <span className="rounded-full bg-emerald-950/70 border border-emerald-700/60 px-2.5 py-0.5 text-xs text-emerald-300">
                  ✏️ Siap Diisi / Diedit
                </span>
              )}
            </div>

            <div className="mb-6">
              <WorkflowStepper currentStatus={selectedPeriode.status} />
            </div>

            {/* Penuntun Alur Kerja / Step-by-step Action Cards */}
            <div className="mt-6 border-t border-slate-800 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  📋 Checklist & Panduan Pengisian Data Transaksi:
                </h3>
                <button
                  onClick={loadReadiness}
                  disabled={readinessLoading}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {readinessLoading ? "Memeriksa data..." : "🔄 Perbarui Status Data"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Langkah 1: Absensi */}
                <div className={`p-4 rounded-xl border transition-all ${
                  isEditable ? "bg-slate-800/60 border-slate-700 hover:border-indigo-500" : "bg-slate-900/40 border-slate-800 opacity-80"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">
                      Langkah 1
                    </span>
                    <span className="text-lg">📊</span>
                  </div>
                  <h4 className="font-semibold text-slate-100 text-sm mb-1">Absensi & Kehadiran</h4>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                    Rekap total kehadiran WFO/WFH, izin, sakit, dan alpha pegawai.
                  </p>
                  <div className="mb-4">
                    {readiness?.absensi.isComplete ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/60">
                        ✓ {readiness.absensi.filledCount}/{readiness.absensi.totalCount} Pegawai Terisi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-950/60 px-2 py-1 rounded border border-amber-800/60">
                        ⚠️ {readiness?.absensi.filledCount ?? 0}/{readiness?.totalPegawai ?? 0} Pegawai Terisi
                      </span>
                    )}
                  </div>
                  <Link href="/transaksi/absensi">
                    <Button variant="secondary" size="sm" className="w-full">
                      Buka Input Absensi ➔
                    </Button>
                  </Link>
                </div>

                {/* Langkah 2: Tunjangan */}
                <div className={`p-4 rounded-xl border transition-all ${
                  isEditable ? "bg-slate-800/60 border-slate-700 hover:border-indigo-500" : "bg-slate-900/40 border-slate-800 opacity-80"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">
                      Langkah 2
                    </span>
                    <span className="text-lg">💰</span>
                  </div>
                  <h4 className="font-semibold text-slate-100 text-sm mb-1">Tunjangan Bulanan</h4>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                    Input jam lembur dan honor bulanan tambahan per pegawai.
                  </p>
                  <div className="mb-4">
                    {readiness?.tunjangan.isComplete ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/60">
                        ✓ {readiness.tunjangan.filledCount}/{readiness.tunjangan.totalCount} Pegawai Terisi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-950/60 px-2 py-1 rounded border border-amber-800/60">
                        ⚠️ {readiness?.tunjangan.filledCount ?? 0}/{readiness?.totalPegawai ?? 0} Pegawai Terisi
                      </span>
                    )}
                  </div>
                  <Link href="/transaksi/tunjangan">
                    <Button variant="secondary" size="sm" className="w-full">
                      Buka Input Tunjangan ➔
                    </Button>
                  </Link>
                </div>

                {/* Langkah 3: Potongan */}
                <div className={`p-4 rounded-xl border transition-all ${
                  isEditable ? "bg-slate-800/60 border-slate-700 hover:border-indigo-500" : "bg-slate-900/40 border-slate-800 opacity-80"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">
                      Langkah 3
                    </span>
                    <span className="text-lg">📉</span>
                  </div>
                  <h4 className="font-semibold text-slate-100 text-sm mb-1">Potongan Bulanan</h4>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                    Input angsuran pinjaman, dana wajib, pelkes, dan potongan lainnya.
                  </p>
                  <div className="mb-4">
                    {readiness?.potongan.isComplete ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/60">
                        ✓ {readiness.potongan.filledCount}/{readiness.potongan.totalCount} Pegawai Terisi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-950/60 px-2 py-1 rounded border border-amber-800/60">
                        ⚠️ {readiness?.potongan.filledCount ?? 0}/{readiness?.totalPegawai ?? 0} Pegawai Terisi
                      </span>
                    )}
                  </div>
                  <Link href="/transaksi/potongan">
                    <Button variant="secondary" size="sm" className="w-full">
                      Buka Input Potongan ➔
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Status Action Banner */}
              {isEditable && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/80 to-slate-900 border border-indigo-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-100 text-sm mb-1">
                      Siap Mengajukan Periode ke Approver?
                    </h4>
                    <p className="text-xs text-slate-300">
                      Sistem akan memverifikasi kelengkapan Absensi, Tunjangan, dan Potongan sebelum diserahkan ke Pimpinan.
                    </p>
                  </div>
                  <Button
                    onClick={handleOpenVerification}
                    className="whitespace-nowrap shadow-lg shadow-indigo-600/30"
                  >
                    🔍 Periksa Kesiapan & Ajukan Approval
                  </Button>
                </div>
              )}

              {selectedPeriode.status === "Menunggu Approval" && (
                <div className="p-4 rounded-xl bg-orange-950/50 border border-orange-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-orange-200 text-sm mb-1">
                      ⏳ Menunggu Verifikasi & Approval Pimpinan
                    </h4>
                    <p className="text-xs text-orange-300/80">
                      Periode ini telah diajukan dan sedang menunggu persetujuan dari akun Approver.
                    </p>
                  </div>
                  <Link href="/approval">
                    <Button variant="secondary" size="sm">
                      Buka Halaman Approval ➔
                    </Button>
                  </Link>
                </div>
              )}

              {selectedPeriode.status === "Disetujui" && (
                <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-emerald-200 text-sm mb-1">
                      ✅ Periode Telah Disetujui!
                    </h4>
                    <p className="text-xs text-emerald-300/80">
                      Langkah selanjutnya: Hitung dan kunci kalkulasi slip gaji pada menu Rekap Gaji.
                    </p>
                  </div>
                  <Link href="/rekap-gaji">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white">
                      Proses Rekap Gaji ➔
                    </Button>
                  </Link>
                </div>
              )}

              {selectedPeriode.status === "Selesai" && (
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-200 text-sm mb-1">
                      🎉 Periode Penggajian Selesai
                    </h4>
                    <p className="text-xs text-slate-400">
                      Seluruh rekapitulasi dan slip gaji pegawai sudah dicatat secara permanen.
                    </p>
                  </div>
                  <Link href="/rekap-gaji">
                    <Button variant="secondary" size="sm">
                      Lihat Slip & Rekap Gaji ➔
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <Card title="Daftar Riwayat Periode" className="mt-6">
        <Table>
          <TableHead>
            <TableHeaderCell>Bulan Gaji</TableHeaderCell>
            <TableHeaderCell>Tanggal Awal</TableHeaderCell>
            <TableHeaderCell>Tanggal Akhir</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableHead>
          <TableBody>
            {periodeList.map((p) => (
              <TableRow key={p.id_periode}>
                <TableCell className="font-medium text-slate-100">{p.bulan_gaji}</TableCell>
                <TableCell className="text-slate-300">{formatDate(p.tanggal_awal)}</TableCell>
                <TableCell className="text-slate-300">{formatDate(p.tanggal_akhir)}</TableCell>
                <TableCell>
                  <Badge status={p.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Buka Periode Baru"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreate} isLoading={loading}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Bulan Gaji"
            placeholder="Agustus 2026"
            value={form.bulan_gaji}
            onChange={(e) => setForm({ ...form, bulan_gaji: e.target.value })}
          />
          <Input
            label="Tanggal Awal"
            type="date"
            value={form.tanggal_awal}
            onChange={(e) => setForm({ ...form, tanggal_awal: e.target.value })}
          />
          <Input
            label="Tanggal Akhir"
            type="date"
            value={form.tanggal_akhir}
            onChange={(e) =>
              setForm({ ...form, tanggal_akhir: e.target.value })
            }
          />
        </div>
      </Modal>

      {/* Modal Verifikasi Kesiapan Approval */}
      <Modal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        title={`Pengecekan Kesiapan Periode: ${selectedPeriode?.bulan_gaji ?? ""}`}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setVerificationModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmSubmitApproval}
              isLoading={loading}
              disabled={!readiness?.isReady || readinessLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {readiness?.isReady
                ? "Konfirmasi & Kirim ke Approver"
                : "Data Belum Lengkap"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Berikut adalah hasil pengecekan kelengkapan data untuk{" "}
            <strong>{readiness?.totalPegawai ?? 0} Pegawai</strong> pada periode ini sebelum diajukan ke Pimpinan:
          </p>

          {/* Checklist Items */}
          <div className="space-y-3">
            {/* Absensi */}
            <div className={`p-3.5 rounded-lg border flex items-center justify-between ${
              readiness?.absensi.isComplete
                ? "bg-emerald-950/30 border-emerald-800/60"
                : "bg-amber-950/30 border-amber-800/60"
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{readiness?.absensi.isComplete ? "✅" : "⚠️"}</span>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">Rekapitulasi Absensi & Kehadiran</h4>
                  <p className="text-xs text-slate-400">
                    {readiness?.absensi.filledCount} dari {readiness?.absensi.totalCount} pegawai terdata
                  </p>
                </div>
              </div>
              <Link href="/transaksi/absensi" onClick={() => setVerificationModalOpen(false)}>
                <Button variant="secondary" size="sm">
                  {readiness?.absensi.isComplete ? "Lihat" : "Isi Data"}
                </Button>
              </Link>
            </div>

            {/* Tunjangan */}
            <div className={`p-3.5 rounded-lg border flex items-center justify-between ${
              readiness?.tunjangan.isComplete
                ? "bg-emerald-950/30 border-emerald-800/60"
                : "bg-amber-950/30 border-amber-800/60"
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{readiness?.tunjangan.isComplete ? "✅" : "⚠️"}</span>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">Tunjangan Bulanan & Honor</h4>
                  <p className="text-xs text-slate-400">
                    {readiness?.tunjangan.filledCount} dari {readiness?.tunjangan.totalCount} pegawai terdata
                  </p>
                </div>
              </div>
              <Link href="/transaksi/tunjangan" onClick={() => setVerificationModalOpen(false)}>
                <Button variant="secondary" size="sm">
                  {readiness?.tunjangan.isComplete ? "Lihat" : "Isi Data"}
                </Button>
              </Link>
            </div>

            {/* Potongan */}
            <div className={`p-3.5 rounded-lg border flex items-center justify-between ${
              readiness?.potongan.isComplete
                ? "bg-emerald-950/30 border-emerald-800/60"
                : "bg-amber-950/30 border-amber-800/60"
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{readiness?.potongan.isComplete ? "✅" : "⚠️"}</span>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">Potongan Bulanan</h4>
                  <p className="text-xs text-slate-400">
                    {readiness?.potongan.filledCount} dari {readiness?.potongan.totalCount} pegawai terdata
                  </p>
                </div>
              </div>
              <Link href="/transaksi/potongan" onClick={() => setVerificationModalOpen(false)}>
                <Button variant="secondary" size="sm">
                  {readiness?.potongan.isComplete ? "Lihat" : "Isi Data"}
                </Button>
              </Link>
            </div>
          </div>

          {/* Warning / Error Reasons */}
          {!readiness?.isReady && readiness?.reasons && readiness.reasons.length > 0 && (
            <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-300 space-y-1">
              <p className="font-semibold text-red-200">Perhatian sebelum mengajukan approval:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {readiness.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {readiness?.isReady && (
            <div className="p-3.5 rounded-lg bg-indigo-950/40 border border-indigo-800/80 text-xs text-indigo-200">
              💡 <strong>Catatan:</strong> Setelah diajukan, status periode akan berubah menjadi <strong>&quot;Menunggu Approval&quot;</strong> dan seluruh data transaksi akan <strong>dikunci (read-only)</strong> hingga Approver memberikan keputusan persetujuan.
            </div>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
}
