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
import { formatRupiah, parseNamaTanggalLahir, formatDate } from "@/lib/format";
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
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        errorObj?.response?.data?.message ||
        errorObj?.message ||
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
  const totalTransport = rekap.reduce(
    (acc, r) => acc + Number(r.transport_uang_makan || 0),
    0,
  );
  const totalBruto = rekap.reduce(
    (acc, r) => acc + Number(r.total_penghasilan_bruto || r.total_penerimaan_clean || 0),
    0,
  );
  const totalTunjangan = rekap.reduce((acc, r) => {
    const bruto = Number(r.total_penghasilan_bruto || r.total_penerimaan_clean || 0);
    const gapok = Number(r.gaji_pokok_snapshot || 0);
    const transp = Number(r.transport_uang_makan || 0);
    return acc + Number(r.tunjangan_jabatan_dll ?? Math.max(0, bruto - gapok - transp));
  }, 0);
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
      className="print:p-0 print:space-y-4"
      headerClassName="print:hidden"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            disabled={rekap.length === 0}
          >
            🖨️ Cetak Rekap
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={rekap.length === 0}
          >
            📥 Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleProcess}
            isLoading={processing}
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
        <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start justify-between gap-3 print:hidden">
          <div className="flex items-start gap-2">
            <span className="text-base">⚠️</span>
            <div>
              <p className="font-semibold text-rose-200">Gagal Memproses Gaji:</p>
              <p className="text-rose-300/80 mt-0.5">{errorMessage}</p>
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
        <div className="mb-6 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-850 border border-zinc-750 flex items-center justify-center text-base">
              💰
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-semibold text-zinc-100 text-sm">
                  Periode Gaji: {selectedPeriode.bulan_gaji}
                </h2>
                <Badge status={selectedPeriode.status} />
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {selectedPeriode.status === "Selesai"
                  ? "Seluruh kalkulasi telah dikunci permanen. Slip gaji siap dicetak/didistribusikan."
                  : "Periode siap dikalkulasi dan diajukan untuk disetujui Kepala Sekolah."}
              </p>
            </div>
          </div>

          {rekap.length > 0 && (
            <div className="flex items-center gap-6 border-l border-zinc-800/80 pl-6 text-right">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                  Total Pengeluaran Bersih (THP)
                </p>
                <p className="text-xl font-bold text-zinc-100 font-mono tabular-nums">
                  {formatRupiah(totalNetto)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kartu Ringkasan Metrik Rekap */}
      {rekap.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:hidden">
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Total Karyawan</p>
            <p className="text-xl font-bold text-zinc-100 mt-1 tabular-nums font-mono">
              {totalPegawai} <span className="text-xs font-normal text-zinc-500">Orang</span>
            </p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Total Gaji Pokok</p>
            <p className="text-xl font-bold text-zinc-100 mt-1 font-mono tabular-nums">
              {formatRupiah(totalGajiPokok)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Total Bruto (+Tunjangan)</p>
            <p className="text-xl font-bold text-zinc-100 mt-1 font-mono tabular-nums">
              {formatRupiah(totalBruto)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Total Potongan</p>
            <p className="text-xl font-bold text-zinc-400 mt-1 font-mono tabular-nums">
              {formatRupiah(totalPotongan)}
            </p>
          </div>
        </div>
      )}

      <Card
        className="print:border-none print:shadow-none print:p-0 print:bg-white"
        title={`Daftar Slip Gaji Pegawai — ${selectedPeriode?.bulan_gaji ?? ""}`}
      >
        {loading ? (
          <div className="py-12 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            <span>Memuat data rekapitulasi...</span>
          </div>
        ) : rekap.length === 0 ? (
          <div className="py-12 text-center text-zinc-500">
            <span className="text-3xl block mb-2 opacity-50">📋</span>
            <p className="text-sm font-medium text-zinc-300">
              Belum ada data kalkulasi rekap gaji untuk periode ini.
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Klik tombol &quot;Proses & Kunci Rekap Gaji&quot; di atas untuk
              memulai perhitungan otomatis.
            </p>
          </div>
        ) : (
          <div>
            {/* KOP RESMI LAPORAN REKAP GAJI (SESUAI FORMAT 1:1 EXCEL) */}
            <div className="mb-4 pb-3 border-b border-zinc-800 print:border-b-2 print:border-black">
              <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-zinc-100 print:text-black">
                REKAPITULASI GAJI
              </h2>
              <h3 className="text-xs sm:text-sm font-semibold text-zinc-300 print:text-black">
                SMK PSKD III
              </h3>
              <p className="text-xs font-mono text-zinc-500 print:text-black mt-0.5">
                Bulan : {selectedPeriode?.bulan_gaji?.toUpperCase() ?? "AGUSTUS 2026"}
              </p>
            </div>

            <Table>
              <TableHead>
                <TableHeaderCell className="w-12 text-center print:border print:border-black print:text-black print:bg-slate-100 print:text-[10px] print:px-2 print:py-1">
                  NO
                </TableHeaderCell>
                <TableHeaderCell className="print:border print:border-black print:text-black print:bg-slate-100 print:text-[10px] print:px-2 print:py-1">
                  NAMA GURU / PEGAWAI
                </TableHeaderCell>
                <TableHeaderCell className="print:border print:border-black print:text-black print:bg-slate-100 print:text-[10px] print:px-2 print:py-1">
                  Jabatan
                </TableHeaderCell>
                <TableHeaderCell className="text-center print:border print:border-black print:text-black print:bg-slate-100 print:text-[10px] print:px-2 print:py-1">
                  HR. HDR
                </TableHeaderCell>
                <TableHeaderCell className="text-right print:border print:border-black print:text-black print:bg-slate-100 print:text-[10px] print:px-2 print:py-1">
                  GAJI KOPETENSI
                </TableHeaderCell>
                <TableHeaderCell className="text-right print:border print:border-black print:text-black print:bg-slate-100 print:text-[10px] print:px-2 print:py-1">
                  TUNJANGAN JABATAN DLL
                </TableHeaderCell>
                <TableHeaderCell className="text-right print:border print:border-black print:text-black print:bg-slate-100 print:text-[10px] print:px-2 print:py-1">
                  TRANSPORT / U. MAKAN
                </TableHeaderCell>
                <TableHeaderCell className="text-right print:border print:border-black print:text-black print:bg-slate-100 print:text-[10px] print:px-2 print:py-1">
                  TOTAL PENGHASILAN
                </TableHeaderCell>
                <TableHeaderCell className="text-right print:border print:border-black print:text-black print:bg-slate-100 print:text-[10px] print:px-2 print:py-1">
                  JUMLAH POTONGAN
                </TableHeaderCell>
                <TableHeaderCell className="text-right print:border print:border-black print:text-black print:bg-slate-100 print:text-[10px] print:px-2 print:py-1">
                  TOTAL PENERIMAAN
                </TableHeaderCell>
                <TableHeaderCell className="text-center print:hidden">
                  Aksi
                </TableHeaderCell>
                <TableHeaderCell className="hidden print:table-cell text-center w-36 print:border print:border-black print:text-black print:bg-slate-100 print:text-[10px] print:px-2 print:py-1">
                  TANDA TANGAN
                </TableHeaderCell>
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
                    <TableRow key={r.id_rekap} className="hover:bg-zinc-850/50 print:hover:bg-transparent">
                      <TableCell className="text-center font-mono tabular-nums text-zinc-500 text-xs print:border print:border-black print:text-black print:text-[10px] print:px-2 print:py-1">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-medium text-zinc-100 print:border print:border-black print:text-black print:text-[10px] print:px-2 print:py-1">
                        {nama}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-xs print:border print:border-black print:text-black print:text-[10px] print:px-2 print:py-1">
                        {r.jabatan_snapshot}
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums text-xs text-zinc-300 print:border print:border-black print:text-black print:text-[10px] print:px-2 print:py-1">
                        {hadirWfo}
                      </TableCell>
                      <TableCell className="text-right text-zinc-200 font-mono tabular-nums text-xs print:border print:border-black print:text-black print:text-[10px] print:px-2 print:py-1">
                        {formatRupiah(gajiPokok)}
                      </TableCell>
                      <TableCell className="text-right text-zinc-200 font-mono tabular-nums text-xs print:border print:border-black print:text-black print:text-[10px] print:px-2 print:py-1">
                        {formatRupiah(tunjanganDll)}
                      </TableCell>
                      <TableCell className="text-right text-zinc-200 font-mono tabular-nums text-xs print:border print:border-black print:text-black print:text-[10px] print:px-2 print:py-1">
                        {formatRupiah(transport)}
                      </TableCell>
                      <TableCell className="text-right text-zinc-100 font-mono tabular-nums text-xs font-semibold print:border print:border-black print:text-black print:text-[10px] print:px-2 print:py-1">
                        {formatRupiah(bruto)}
                      </TableCell>
                      <TableCell className="text-right text-zinc-400 font-mono tabular-nums text-xs print:border print:border-black print:text-black print:text-[10px] print:px-2 print:py-1">
                        {formatRupiah(pot)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-zinc-100 font-mono tabular-nums text-xs print:border print:border-black print:text-black print:text-[10px] print:px-2 print:py-1">
                        {formatRupiah(cleanTHP)}
                      </TableCell>
                      <TableCell className="text-center print:hidden">
                        <Link href={`/rekap-gaji/slip/${r.id_rekap}`}>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="!px-2.5 !py-1 text-xs"
                          >
                            👁️ Slip
                          </Button>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden print:table-cell text-left text-xs font-mono py-2 print:border print:border-black print:text-black print:text-[10px] print:px-2 print:py-1">
                        {idx + 1}. ....................
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* BARIS TOTAL REKAPITULASI (SESUAI EXCEL SHEET 1:1) */}
                <TableRow className="bg-zinc-850/80 print:bg-slate-100 font-bold border-t-2 border-b border-zinc-700 print:border-t-2 print:border-b-2 print:border-black text-xs">
                  <TableCell className="text-center print:border print:border-black print:text-black print:text-[10px] print:px-2 print:py-1" />
                  <TableCell colSpan={3} className="font-bold text-zinc-100 print:border print:border-black print:text-black print:text-[10px] print:px-2 print:py-1">
                    JUMLAH TOTAL
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-zinc-100 print:border print:border-black print:text-black print:text-[10px] print:px-2 print:py-1">
                    {formatRupiah(totalGajiPokok)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-zinc-100 print:border print:border-black print:text-black print:text-[10px] print:px-2 print:py-1">
                    {formatRupiah(totalTunjangan)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-zinc-100 print:border print:border-black print:text-black print:text-[10px] print:px-2 print:py-1">
                    {formatRupiah(totalTransport)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-zinc-100 print:border print:border-black print:text-black font-semibold print:text-[10px] print:px-2 print:py-1">
                    {formatRupiah(totalBruto)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-zinc-400 print:border print:border-black print:text-black font-medium print:text-[10px] print:px-2 print:py-1">
                    {formatRupiah(totalPotongan)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-zinc-100 print:border print:border-black print:text-black font-extrabold print:text-[10px] print:px-2 print:py-1">
                    {formatRupiah(totalNetto)}
                  </TableCell>
                  <TableCell className="text-center print:hidden" />
                  <TableCell className="hidden print:table-cell print:border print:border-black print:text-black print:text-[10px] print:px-2 print:py-1" />
                </TableRow>
              </TableBody>
            </Table>

            {/* BLOK TANDA TANGAN PEJABAT RESMI (SESUAI EXCEL SHEET 1:1) */}
            <div className="mt-8 pt-6 border-t border-zinc-800 print:border-black flex justify-end">
              <div className="grid grid-cols-2 gap-16 text-center text-xs text-zinc-300 print:text-black min-w-[500px]">
                <div>
                  <p className="font-medium text-zinc-400 print:text-black">Mengetahui,</p>
                  <p className="font-semibold text-zinc-200 print:text-black">Kepala Sekolah</p>
                  <div className="h-20 flex items-end justify-center">
                    <p className="font-semibold text-zinc-100 print:text-black border-b border-dotted border-zinc-500 print:border-black pb-0.5 min-w-[140px]">
                      Thomas S.Pd., M.M.
                    </p>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-zinc-400 print:text-black">Jakarta, {formatDate(new Date())}</p>
                  <p className="font-semibold text-zinc-200 print:text-black">Bendahara / Staf Penggajian</p>
                  <div className="h-20 flex items-end justify-center">
                    <p className="font-semibold text-zinc-100 print:text-black border-b border-dotted border-zinc-500 print:border-black pb-0.5 min-w-[140px]">
                      Bendahara Sekolah
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* MODAL BERHASIL (ENTERPRISE DIGNIFIED CONFIRMATION) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Proses Rekapitulasi Gaji Selesai"
        size="md"
        footer={
          <div className="flex justify-end gap-2.5 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSuccessModal(false)}
            >
              Tutup
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowSuccessModal(false)}
            >
              Lihat Daftar Slip Gaji ➔
            </Button>
          </div>
        }
      >
        <div className="py-2 space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <span className="text-base text-emerald-400 mt-0.5">✓</span>
            <div>
              <p className="font-semibold text-zinc-100">Kalkulasi Gaji Berhasil Dikunci</p>
              <p className="text-zinc-400 mt-0.5">
                Perhitungan Gaji Pokok, Tunjangan, Jam Lebih, dan Potongan untuk periode{" "}
                <strong className="text-zinc-200">{selectedPeriode?.bulan_gaji}</strong>{" "}
                telah resmi di-snapshot ke basis data.
              </p>
            </div>
          </div>

          {/* Kartu Ringkasan Hasil Kalkulasi */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
              <span className="text-zinc-400">Total Pegawai Terkalkulasi:</span>
              <span className="font-medium text-zinc-200">
                {totalPegawai} Pegawai
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
              <span className="text-zinc-400">Total Penghasilan Bruto:</span>
              <span className="font-mono tabular-nums text-zinc-200">
                {formatRupiah(totalBruto)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
              <span className="text-zinc-400">Total Potongan (Taken List):</span>
              <span className="font-mono tabular-nums text-zinc-400">
                {formatRupiah(totalPotongan)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-semibold text-zinc-200">
                Total Bersih Siap Cair (THP):
              </span>
              <span className="font-bold text-zinc-100 text-sm font-mono tabular-nums">
                {formatRupiah(totalNetto)}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
