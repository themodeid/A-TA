"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePeriode } from "@/hooks/usePeriodeContext";
import {
  getRekapByPeriode,
  processPayroll,
  exportRekapCsv,
} from "@/features/rekap/api/rekap.api";
import { RekapGaji } from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { formatRupiah, parseNamaTanggalLahir } from "@/lib/format";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";

export default function RekapGajiPage() {
  const { selectedPeriodeId, selectedPeriode, refreshPeriodeList } =
    usePeriode();
  const [rekap, setRekap] = useState<RekapGaji[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const load = () => {
    if (!selectedPeriodeId) return;
    setLoading(true);
    getRekapByPeriode(selectedPeriodeId)
      .then((data) => {
        setRekap(data);
      })
      .catch(() => setRekap([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [selectedPeriodeId]);

  const handleProcess = async () => {
    if (!selectedPeriodeId) return;
    setProcessing(true);
    setErrorMessage("");
    try {
      await processPayroll(selectedPeriodeId);
      await refreshPeriodeList();
      load();
      setShowSuccessModal(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Gagal memproses rekapitulasi gaji.";
      setErrorMessage(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = () => {
    exportRekapCsv(
      rekap,
      `rekap-gaji-${selectedPeriode?.bulan_gaji ?? "export"}.csv`,
      selectedPeriode?.bulan_gaji,
    );
  };

  // Kalkulasi ringkasan angka dari rekap
  const totalPegawai = rekap.length;
  const totalGajiPokok = rekap.reduce(
    (acc, r) => acc + Number(r.gaji_pokok_snapshot || 0),
    0,
  );
  const totalBruto = rekap.reduce(
    (acc, r) => acc + Number(r.total_penghasilan_bruto || r.total_penerimaan_clean || 0),
    0,
  );
  const totalPotongan = rekap.reduce(
    (acc, r) => acc + Number(r.total_potongan || r.total_potongan_clean || 0),
    0,
  );
  const totalNetto = rekap.reduce(
    (acc, r) =>
      acc +
      Number(
        r.total_penerimaan_clean ||
          r.netto_clean ||
          Number(r.total_penghasilan_bruto || 0) - Number(r.total_potongan || 0),
      ),
    0,
  );

  return (
    <PageContainer
      title="Rekapitulasi Gaji"
      description="Kalkulasi massal, tabel rekapitulasi permanen & pencetakan slip gaji"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={rekap.length === 0}
            className="text-xs"
          >
            📥 Export CSV
          </Button>
          <Button
            onClick={handleProcess}
            isLoading={processing}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 text-xs font-semibold"
          >
            {rekap.length > 0
              ? "🔄 Hitung Ulang & Kunci Rekap"
              : "⚡ Proses & Kunci Rekap Gaji"}
          </Button>
        </div>
      }
    >
      {/* Alert Error jika ada */}
      {errorMessage && (
        <div className="mb-4 p-4 rounded-xl bg-rose-950/80 border border-rose-600 text-xs text-rose-200 flex items-start justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-bold">Gagal Memproses Gaji:</p>
              <p className="text-rose-300/90 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage("")}
            className="text-rose-400 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Info Status Periode */}
      {selectedPeriode && (
        <div className="mb-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center text-xl">
              💰
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-100 text-base">
                  Periode Gaji: {selectedPeriode.bulan_gaji}
                </h2>
                <Badge status={selectedPeriode.status} />
              </div>
              <p className="text-xs text-slate-400">
                {selectedPeriode.status === "Selesai"
                  ? "✅ Seluruh kalkulasi telah dikunci permanen. Slip gaji siap didistribusikan."
                  : "⏳ Periode siap dikalkulasi setelah disetujui Kepala Sekolah."}
              </p>
            </div>
          </div>

          {rekap.length > 0 && (
            <div className="flex items-center gap-6 border-l border-slate-800 pl-6 text-right">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                  Total Pengeluaran Bersih (THP)
                </p>
                <p className="text-lg font-bold text-emerald-400 font-mono">
                  {formatRupiah(totalNetto)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kartu Ringkasan Metrik Rekap */}
      {rekap.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <p className="text-xs text-slate-400">Total Karyawan</p>
            <p className="text-xl font-bold text-slate-100 mt-1">
              {totalPegawai} <span className="text-xs font-normal text-slate-400">Orang</span>
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <p className="text-xs text-slate-400">Total Gaji Pokok</p>
            <p className="text-xl font-bold text-indigo-300 mt-1 font-mono">
              {formatRupiah(totalGajiPokok)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <p className="text-xs text-slate-400">Total Bruto (+Tunjangan)</p>
            <p className="text-xl font-bold text-emerald-300 mt-1 font-mono">
              {formatRupiah(totalBruto)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <p className="text-xs text-slate-400">Total Potongan (Taken List)</p>
            <p className="text-xl font-bold text-rose-300 mt-1 font-mono">
              {formatRupiah(totalPotongan)}
            </p>
          </div>
        </div>
      )}

      <Card title={`Daftar Slip Gaji Pegawai — ${selectedPeriode?.bulan_gaji ?? ""}`}>
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Memuat data rekapitulasi...</span>
          </div>
        ) : rekap.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <span className="text-3xl block mb-2">📋</span>
            <p className="text-sm font-semibold text-slate-300">
              Belum ada data kalkulasi rekap gaji untuk periode ini.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Klik tombol &quot;Proses & Kunci Rekap Gaji&quot; di atas untuk
              memulai perhitungan otomatis.
            </p>
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableHeaderCell className="w-12 text-center">NO</TableHeaderCell>
              <TableHeaderCell>NAMA GURU / PEGAWAI</TableHeaderCell>
              <TableHeaderCell>Jabatan</TableHeaderCell>
              <TableHeaderCell className="text-center">HR. HDR</TableHeaderCell>
              <TableHeaderCell className="text-right">GAJI KOPETENSI</TableHeaderCell>
              <TableHeaderCell className="text-right">TUNJANGAN JABATAN DLL</TableHeaderCell>
              <TableHeaderCell className="text-right">TRANSPORT / U. MAKAN</TableHeaderCell>
              <TableHeaderCell className="text-right">TOTAL PENGHASILAN</TableHeaderCell>
              <TableHeaderCell className="text-right">JUMLAH POTONGAN</TableHeaderCell>
              <TableHeaderCell className="text-right">TOTAL PENERIMAAN (THP)</TableHeaderCell>
              <TableHeaderCell className="text-center">Aksi</TableHeaderCell>
            </TableHead>
            <TableBody>
              {rekap.map((r, idx) => {
                const { nama } = parseNamaTanggalLahir(r.nama_dan_tanggal_lahir ?? "");
                const hadirWfo = Number(r.total_hadir_wfo ?? 0);
                const gajiPokok = Number(r.gaji_pokok_snapshot || 0);
                const transport = Number(r.transport_uang_makan || 0);
                const bruto = Number(
                  r.total_penghasilan_bruto || r.total_penerimaan_clean || 0,
                );
                const tunjanganDll = Number(
                  r.tunjangan_jabatan_dll ?? Math.max(0, bruto - gajiPokok - transport),
                );
                const pot = Number(
                  r.total_potongan || r.total_potongan_clean || 0,
                );
                const cleanTHP = Number(
                  r.total_penerimaan_clean ||
                    r.netto_clean ||
                    bruto - pot,
                );

                return (
                  <TableRow key={r.id_rekap} className="hover:bg-slate-800/40">
                    <TableCell className="text-center font-mono text-slate-400 text-xs">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium text-slate-100">
                      {nama}
                    </TableCell>
                    <TableCell className="text-slate-300 text-xs">
                      {r.jabatan_snapshot}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-indigo-300">
                      {hadirWfo}
                    </TableCell>
                    <TableCell className="text-right text-slate-200 font-mono text-xs">
                      {formatRupiah(gajiPokok)}
                    </TableCell>
                    <TableCell className="text-right text-indigo-300 font-mono text-xs">
                      {formatRupiah(tunjanganDll)}
                    </TableCell>
                    <TableCell className="text-right text-amber-300 font-mono text-xs">
                      {formatRupiah(transport)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-300 font-mono text-xs font-semibold">
                      {formatRupiah(bruto)}
                    </TableCell>
                    <TableCell className="text-right text-rose-300 font-mono text-xs font-medium">
                      {formatRupiah(pot)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-400 font-mono text-xs">
                      {formatRupiah(cleanTHP)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Link href={`/rekap-gaji/slip/${r.id_rekap}`}>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-xs border border-slate-700"
                        >
                          👁️ Slip
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* MODAL ANIMASI BERHASIL (CELEBRATION POP-UP) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="🎉 Proses Penggajian Selesai!"
        size="md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => setShowSuccessModal(false)}
              className="text-xs"
            >
              Tutup
            </Button>
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 text-xs font-semibold"
            >
              Lihat Daftar Slip Gaji ➔
            </Button>
          </div>
        }
      >
        <div className="text-center py-4 space-y-4">
          {/* Animasi Bouncing Green Checkmark dengan Glow Pulse */}
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
            {/* Ripple Pulse Background */}
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <div className="absolute -inset-2 rounded-full bg-emerald-500/10 animate-pulse" />
            {/* Main Badge Circle */}
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-xl shadow-emerald-900/50 text-white border-2 border-emerald-300">
              <svg
                className="h-9 w-9 animate-bounce"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-100">
              Rekapitulasi Gaji Berhasil Dikunci!
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Perhitungan Gaji Pokok, Tunjangan, Jam Lembur, dan Potongan untuk{" "}
              <strong className="text-emerald-300">
                {selectedPeriode?.bulan_gaji}
              </strong>{" "}
              telah resmi di-snapshot ke basis data.
            </p>
          </div>

          {/* Kartu Ringkasan Hasil Kalkulasi */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-900/60 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Total Pegawai Terkalkulasi:</span>
              <span className="font-bold text-slate-200">
                {totalPegawai} Pegawai
              </span>
            </div>
            <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Total Penghasilan Bruto:</span>
              <span className="font-bold text-indigo-300 font-mono">
                {formatRupiah(totalBruto)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Total Potongan (Taken List):</span>
              <span className="font-bold text-rose-300 font-mono">
                {formatRupiah(totalPotongan)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="font-bold text-slate-200">
                Total Bersih Siap Cair (THP):
              </span>
              <span className="font-bold text-emerald-400 text-sm font-mono">
                {formatRupiah(totalNetto)}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
