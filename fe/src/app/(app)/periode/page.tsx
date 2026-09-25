"use client";

import { useCallback, useEffect, useState } from "react";
import { usePeriode } from "@/hooks/usePeriodeContext";
import {
  createPeriode,
  submitApproval,
  getPeriodeReadiness,
  autoInitPeriode,
  getApprovalLogs,
  ApprovalLog,
} from "@/features/periode/api/periode.api";
import { Periode, PeriodeReadiness } from "@/types";
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

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function getNextRecommendedPeriod(list: Periode[]): {
  month: number;
  year: number;
} {
  if (list.length > 0) {
    const sorted = [...list].sort(
      (a, b) =>
        new Date(b.tanggal_akhir).getTime() - new Date(a.tanggal_akhir).getTime(),
    );
    const latest = sorted[0];
    const d = new Date(latest.tanggal_akhir);
    d.setMonth(d.getMonth() + 1);
    return { month: d.getMonth(), year: d.getFullYear() };
  }
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

function calculateDatesForMonthYear(month: number, year: number) {
  // Tanggal awal: tanggal 16 bulan sebelumnya
  const prevDate = new Date(year, month - 1, 16);
  const prevYear = prevDate.getFullYear();
  const prevMonthStr = String(prevDate.getMonth() + 1).padStart(2, "0");
  const tanggal_awal = `${prevYear}-${prevMonthStr}-16`;

  // Tanggal akhir: tanggal 15 bulan gaji target
  const currMonthStr = String(month + 1).padStart(2, "0");
  const tanggal_akhir = `${year}-${currMonthStr}-15`;

  const bulan_gaji = `${MONTH_NAMES[month]} ${year}`;
  return { bulan_gaji, tanggal_awal, tanggal_akhir };
}

export default function PeriodePage() {
  const { periodeList, refreshPeriodeList, selectedPeriode, setSelectedPeriodeId } =
    usePeriode();
  const [modalOpen, setModalOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [readiness, setReadiness] = useState<PeriodeReadiness | null>(null);
  const [approvalLogs, setApprovalLogs] = useState<ApprovalLog[]>([]);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  // Form states
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth(),
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [autoInit, setAutoInit] = useState(true);
  const [copyPotongan, setCopyPotongan] = useState(true);

  const [form, setForm] = useState({
    bulan_gaji: "",
    tanggal_awal: "",
    tanggal_akhir: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadReadinessAndLogs = useCallback(async () => {
    if (!selectedPeriode?.id_periode) return;
    setReadinessLoading(true);
    try {
      const [readData, logsData] = await Promise.all([
        getPeriodeReadiness(selectedPeriode.id_periode).catch(() => null),
        getApprovalLogs(selectedPeriode.id_periode).catch(() => []),
      ]);
      setReadiness(readData);
      setApprovalLogs(logsData);
    } catch (err) {
      console.error("Gagal memuat kesiapan periode:", err);
    } finally {
      setReadinessLoading(false);
    }
  }, [selectedPeriode?.id_periode]);

  useEffect(() => {
    loadReadinessAndLogs();
  }, [loadReadinessAndLogs]);

  const handleOpenModal = () => {
    const next = getNextRecommendedPeriod(periodeList);
    setSelectedMonth(next.month);
    setSelectedYear(next.year);
    const calculated = calculateDatesForMonthYear(next.month, next.year);
    setForm(calculated);
    setIsCustomDate(false);
    setAutoInit(true);
    setCopyPotongan(periodeList.length > 0);
    setMessage("");
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleMonthYearChange = (newMonth: number, newYear: number) => {
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    const calculated = calculateDatesForMonthYear(newMonth, newYear);
    setForm(calculated);
  };

  const applyPresetNextMonth = () => {
    const next = getNextRecommendedPeriod(periodeList);
    handleMonthYearChange(next.month, next.year);
    setIsCustomDate(false);
  };

  const applyPresetThisMonth = () => {
    const now = new Date();
    handleMonthYearChange(now.getMonth(), now.getFullYear());
    setIsCustomDate(false);
  };

  const handleCreate = async () => {
    setLoading(true);
    setMessage("");
    setErrorMsg("");
    try {
      const latestPeriode =
        periodeList.length > 0
          ? [...periodeList].sort(
              (a, b) =>
                new Date(b.tanggal_awal).getTime() -
                new Date(a.tanggal_awal).getTime(),
            )[0]
          : null;

      const newPeriode = await createPeriode({
        ...form,
        auto_init: autoInit,
        copy_potongan_from_periode_id:
          copyPotongan && latestPeriode ? latestPeriode.id_periode : undefined,
      });

      await refreshPeriodeList();
      if (newPeriode?.id_periode) {
        setSelectedPeriodeId(newPeriode.id_periode);
      }
      setModalOpen(false);
      setMessage(
        autoInit
          ? `🎉 Periode "${form.bulan_gaji}" berhasil dibuka dan seluruh data transaksi otomatis disiapkan!`
          : `✅ Periode "${form.bulan_gaji}" berhasil dibuka.`,
      );
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal membuka periode baru.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickInitActivePeriode = async () => {
    if (!selectedPeriode) return;
    setInitLoading(true);
    setMessage("");
    setErrorMsg("");
    try {
      const previousPeriode = periodeList.find(
        (p) => p.id_periode !== selectedPeriode.id_periode,
      );
      await autoInitPeriode(selectedPeriode.id_periode, {
        default_absensi: true,
        copy_potongan_from_periode_id: previousPeriode?.id_periode,
      });
      await loadReadinessAndLogs();
      setMessage(
        "⚡ Seluruh data transaksi (Absensi default, Tunjangan Master, Potongan) berhasil disiapkan secara otomatis!",
      );
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Gagal menginisialisasi data periode.",
      );
    } finally {
      setInitLoading(false);
    }
  };

  const handleOpenVerification = async () => {
    setMessage("");
    setErrorMsg("");
    await loadReadinessAndLogs();
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

  const currentYear = new Date().getFullYear();
  const yearOptions = [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
    currentYear + 2,
  ];

  return (
    <PageContainer
      title="Periode Gaji"
      description="Kelola siklus penggajian — buka periode baru dengan cepat, lengkapi data transaksi, dan pantau alur kerja"
      action={
        <Button onClick={handleOpenModal} variant="primary">
          + Buka Periode Baru
        </Button>
      }
    >
      {message && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-300">
          {message}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-xs text-rose-300">
          ⚠️ {errorMsg}
        </div>
      )}

      {selectedPeriode && (
        <div className="space-y-6">
          <Card title={`Periode Aktif: ${selectedPeriode.bulan_gaji}`}>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <Badge status={selectedPeriode.status} />
              <span className="text-sm font-medium text-zinc-300">
                📅 {formatDate(selectedPeriode.tanggal_awal)} &nbsp;—&nbsp;{" "}
                {formatDate(selectedPeriode.tanggal_akhir)}
              </span>
              {isPeriodeLocked(selectedPeriode.status) ? (
                <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs text-amber-400">
                  🔒 Transaksi Terkunci
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-400">
                  ✏️ Siap Diisi / Diedit
                </span>
              )}
            </div>

            <div className="mb-6">
              <WorkflowStepper currentStatus={selectedPeriode.status} />
            </div>

            {/* Penuntun Alur Kerja / Step-by-step Action Cards */}
            <div className="mt-6 border-t border-zinc-800/80 pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Checklist & Panduan Pengisian Data Transaksi:
                </h3>
                <div className="flex items-center gap-3">
                  {isEditable && !readiness?.isReady && (
                    <button
                      onClick={handleQuickInitActivePeriode}
                      disabled={initLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-750 transition-colors"
                      title="Isi otomatis absensi default, tunjangan master, dan potongan untuk seluruh pegawai"
                    >
                      {initLoading ? "⚡ Menyiapkan data..." : "⚡ Inisialisasi Cepat Semua Data"}
                    </button>
                  )}
                  <button
                    onClick={loadReadinessAndLogs}
                    disabled={readinessLoading}
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {readinessLoading ? "Memeriksa data..." : "🔄 Perbarui Status Data"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Langkah 1: Absensi */}
                <div className={`p-4 rounded-xl border transition-all ${
                  isEditable ? "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700" : "bg-zinc-900/30 border-zinc-850 opacity-80"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Langkah 1
                    </span>
                    <span className="text-base text-zinc-400">📊</span>
                  </div>
                  <h4 className="font-semibold text-zinc-100 text-sm mb-1">Absensi & Kehadiran</h4>
                  <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                    Rekap total kehadiran WFO/WFH, izin, sakit, dan alpha pegawai.
                  </p>
                  <div className="mb-4">
                    {readiness?.absensi.isComplete ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                        ✓ {readiness.absensi.filledCount}/{readiness.absensi.totalCount} Pegawai Terisi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
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
                  isEditable ? "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700" : "bg-zinc-900/30 border-zinc-850 opacity-80"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Langkah 2
                    </span>
                    <span className="text-base text-zinc-400">💰</span>
                  </div>
                  <h4 className="font-semibold text-zinc-100 text-sm mb-1">Tunjangan Bulanan</h4>
                  <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                    Input jam lembur dan honor bulanan tambahan per pegawai.
                  </p>
                  <div className="mb-4">
                    {readiness?.tunjangan.isComplete ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                        ✓ {readiness.tunjangan.filledCount}/{readiness.tunjangan.totalCount} Pegawai Terisi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
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
                  isEditable ? "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700" : "bg-zinc-900/30 border-zinc-850 opacity-80"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Langkah 3
                    </span>
                    <span className="text-base text-zinc-400">📉</span>
                  </div>
                  <h4 className="font-semibold text-zinc-100 text-sm mb-1">Potongan Bulanan</h4>
                  <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                    Input angsuran pinjaman, dana wajib, pelkes, dan potongan lainnya.
                  </p>
                  <div className="mb-4">
                    {readiness?.potongan.isComplete ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                        ✓ {readiness.potongan.filledCount}/{readiness.potongan.totalCount} Pegawai Terisi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
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
              {selectedPeriode.status === "Ditolak" && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-3 shadow-none">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">❌</span>
                      <div>
                        <h4 className="font-semibold text-rose-200 text-sm mb-0.5">
                          Pengajuan Approval Ditolak oleh Kepala Sekolah
                        </h4>
                        <p className="text-xs text-rose-300/80">
                          Kepala Sekolah mengembalikan periode ini ke staf gaji untuk dilakukan perbaikan data.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleOpenVerification}
                      variant="primary"
                      size="sm"
                      className="whitespace-nowrap text-xs"
                    >
                      Periksa & Ajukan Ulang ➔
                    </Button>
                  </div>

                  <div className="p-3 bg-zinc-950/80 border border-rose-500/30 rounded-lg text-xs">
                    <span className="font-semibold text-rose-300 block mb-1 text-xs">
                      Catatan & Alasan Penolakan dari Kepala Sekolah:
                    </span>
                    <p className="text-rose-200 font-medium text-xs bg-rose-950/40 p-2.5 rounded border border-rose-800/40">
                      &quot;{selectedPeriode.catatan_approval ||
                        approvalLogs.find((l) => l.status === "Rejected")?.catatan ||
                        "potongan untuk pegawai tolong diperiksa kembali"}&quot;
                    </p>
                  </div>
                </div>
              )}

              {selectedPeriode.status === "Pengisian Absensi" && (
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-zinc-100 text-sm mb-1">
                      Siap Mengajukan Periode ke Approver?
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Sistem akan memverifikasi kelengkapan Absensi, Tunjangan, dan Potongan sebelum diserahkan ke Pimpinan.
                    </p>
                  </div>
                  <Button
                    onClick={handleOpenVerification}
                    variant="primary"
                    size="sm"
                    className="whitespace-nowrap text-xs"
                  >
                    Periksa Kesiapan & Ajukan Approval ➔
                  </Button>
                </div>
              )}

              {selectedPeriode.status === "Menunggu Approval" && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-amber-200 text-sm mb-1">
                      ⏳ Menunggu Verifikasi & Approval Pimpinan
                    </h4>
                    <p className="text-xs text-amber-300/80">
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
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-emerald-200 text-sm mb-1">
                      ✅ Periode Telah Disetujui
                    </h4>
                    <p className="text-xs text-emerald-300/80">
                      Langkah selanjutnya: Hitung dan kunci kalkulasi slip gaji pada menu Rekap Gaji.
                    </p>
                  </div>
                  <Link href="/rekap-gaji">
                    <Button variant="primary" size="sm">
                      Proses Rekap Gaji ➔
                    </Button>
                  </Link>
                </div>
              )}

              {selectedPeriode.status === "Selesai" && (
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-zinc-200 text-sm mb-1">
                      Periode Penggajian Selesai
                    </h4>
                    <p className="text-xs text-zinc-400">
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
            <TableHeaderCell>Catatan Pimpinan / Alasan</TableHeaderCell>
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
                <TableCell>
                  {p.catatan_approval ? (
                    <span
                      className={`inline-block max-w-xs text-xs font-semibold px-2 py-1 rounded border truncate ${
                        p.status === "Ditolak"
                          ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                          : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                      }`}
                      title={p.catatan_approval}
                    >
                      💬 {p.catatan_approval}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500 italic">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* MODAL BUKA PERIODE BARU */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Buka Periode Penggajian Baru"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleCreate}
              isLoading={loading}
              variant="primary"
            >
              Buka Periode Sekarang
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Pilihan Cepat (Presets):
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyPresetNextMonth}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-750 transition-colors flex items-center gap-1.5"
              >
                ⚡ Bulan Berikutnya (+1 Bulan)
              </button>
              <button
                type="button"
                onClick={applyPresetThisMonth}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-850 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
              >
                📅 Bulan Ini
              </button>
            </div>
          </div>

          {/* Month & Year Selectors */}
          {!isCustomDate ? (
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-850/60 border border-zinc-800">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Bulan
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) =>
                    handleMonthYearChange(Number(e.target.value), selectedYear)
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Tahun
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) =>
                    handleMonthYearChange(selectedMonth, Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Preview Box */}
              <div className="col-span-2 pt-2 border-t border-zinc-750 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Rentang Tanggal Otomatis:</span>
                <span className="font-mono font-medium text-zinc-200">
                  {form.tanggal_awal} s/d {form.tanggal_akhir}
                </span>
              </div>
            </div>
          ) : (
            /* Custom Manual Date Inputs */
            <div className="space-y-3 p-3.5 rounded-xl bg-zinc-850/60 border border-zinc-800">
              <Input
                label="Nama Bulan Gaji"
                placeholder="Misal: Agustus 2026"
                value={form.bulan_gaji}
                onChange={(e) =>
                  setForm({ ...form, bulan_gaji: e.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Tanggal Awal"
                  type="date"
                  value={form.tanggal_awal}
                  onChange={(e) =>
                    setForm({ ...form, tanggal_awal: e.target.value })
                  }
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
            </div>
          )}

          {/* Toggle Custom / Automatic Mode */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => setIsCustomDate(!isCustomDate)}
              className="text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-4"
            >
              {isCustomDate
                ? "← Kembali ke Pemilih Bulan Otomatis"
                : "⚙️ Atur Tanggal Manual (Cut-off khusus)"}
            </button>
          </div>

          {/* Automation & Setup Checkboxes */}
          <div className="space-y-2.5 pt-2 border-t border-zinc-800">
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Opsi Inisialisasi Otomatis (1-Klik Siap Pakai):
            </label>

            {/* Checkbox 1: Auto-Init */}
            <label className="flex items-start gap-3 p-3 rounded-lg bg-zinc-850/70 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={autoInit}
                onChange={(e) => setAutoInit(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-zinc-100 focus:ring-zinc-500 focus:ring-offset-zinc-900"
              />
              <div className="text-xs">
                <span className="font-semibold text-zinc-200 block">
                  ⚡ Inisialisasi Otomatis Data Seluruh Pegawai (Direkomendasikan)
                </span>
                <span className="text-zinc-400 block mt-0.5">
                  Menyiapkan absensi hadir default, menghitung tunjangan master (jabatan, keluarga, transport WFO), dan menyiapkan wadah potongan.
                </span>
              </div>
            </label>

            {/* Checkbox 2: Copy Potongan */}
            {periodeList.length > 0 && autoInit && (
              <label className="flex items-start gap-3 p-3 rounded-lg bg-zinc-850/70 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={copyPotongan}
                  onChange={(e) => setCopyPotongan(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-zinc-100 focus:ring-zinc-500 focus:ring-offset-zinc-900"
                />
                <div className="text-xs">
                  <span className="font-semibold text-zinc-200 block">
                    📋 Salin Potongan Rutin dari Periode Terakhir
                  </span>
                  <span className="text-zinc-400 block mt-0.5">
                    Menyalin angsuran pinjaman, dana wajib, dan potongan rutin bulan lalu agar tidak perlu input ulang dari nol.
                  </span>
                </div>
              </label>
            )}
          </div>
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
              variant="primary"
            >
              {readiness?.isReady
                ? "Konfirmasi & Kirim ke Approver"
                : "Data Belum Lengkap"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-400">
            Berikut adalah hasil pengecekan kelengkapan data untuk{" "}
            <strong className="text-zinc-200">{readiness?.totalPegawai ?? 0} Pegawai</strong> pada periode ini sebelum diajukan ke Pimpinan:
          </p>

          {/* Checklist Items */}
          <div className="space-y-3">
            {/* Absensi */}
            <div className={`p-3.5 rounded-lg border flex items-center justify-between ${
              readiness?.absensi.isComplete
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-amber-500/10 border-amber-500/20"
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-base">{readiness?.absensi.isComplete ? "✅" : "⚠️"}</span>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Rekapitulasi Absensi & Kehadiran</h4>
                  <p className="text-[11px] text-zinc-400">
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
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-amber-500/10 border-amber-500/20"
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-base">{readiness?.tunjangan.isComplete ? "✅" : "⚠️"}</span>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Tunjangan Bulanan & Honor</h4>
                  <p className="text-[11px] text-zinc-400">
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
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-amber-500/10 border-amber-500/20"
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-base">{readiness?.potongan.isComplete ? "✅" : "⚠️"}</span>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Potongan Bulanan</h4>
                  <p className="text-[11px] text-zinc-400">
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
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
              <p className="font-semibold text-rose-200">Perhatian sebelum mengajukan approval:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {readiness.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {readiness?.isReady && (
            <div className="p-3.5 rounded-lg bg-zinc-850 border border-zinc-800 text-xs text-zinc-300">
              💡 <strong>Catatan:</strong> Setelah diajukan, status periode akan berubah menjadi <strong>&quot;Menunggu Approval&quot;</strong> dan seluruh data transaksi akan <strong>dikunci (read-only)</strong> hingga Approver memberikan keputusan persetujuan.
            </div>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
}
