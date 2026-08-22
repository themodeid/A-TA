"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePeriode } from "@/hooks/usePeriodeContext";
import { fetchDashboardSummary } from "@/features/dashboard/api/dashboard.api";
import {
  approvePeriode,
  rejectPeriode,
  getPeriodeReadiness,
} from "@/features/periode/api/periode.api";
import { getAbsensiByPeriode } from "@/features/absensi/api/absensi.api";
import { getTunjanganByPeriode } from "@/features/tunjangan/api/tunjangan.api";
import { getPotonganByPeriode } from "@/features/potongan/api/potongan.api";
import { getAllPegawai } from "@/features/master/api/master.api";
import {
  AbsensiSummary,
  DashboardSummary,
  Pegawai,
  PeriodeReadiness,
  PotonganBulanan,
  TunjanganBulanan,
} from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatRupiah, formatPercent } from "@/lib/format";
import { StatCard } from "@/features/dashboard/components/StatCard";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";

type ActiveTab = "ringkasan" | "absensi" | "tunjangan" | "potongan";

interface MergedEmployeeItem {
  id_pegawai: number;
  nama: string;
  jabatan: string;
  golongan: string;
  status_nikah: string;
  jumlah_anak: number;
  gaji_pokok: number;
  hadir_wfo: number;
  hadir_wfh: number;
  izin: number;
  sakit: number;
  alpha: number;
  total_jam_lebih: number;
  honor_bulan: number;
  total_tunjangan: number;
  total_potongan: number;
  potongan_details: any[];
  tunjangan_details: any[];
  estimasi_thp: number;
}

export default function ApprovalPage() {
  const { selectedPeriodeId, selectedPeriode, refreshPeriodeList } =
    usePeriode();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [readiness, setReadiness] = useState<PeriodeReadiness | null>(null);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [absensiList, setAbsensiList] = useState<AbsensiSummary[]>([]);
  const [tunjanganList, setTunjanganList] = useState<TunjanganBulanan[]>([]);
  const [potonganList, setPotonganList] = useState<PotonganBulanan[]>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>("ringkasan");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<MergedEmployeeItem | null>(null);
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadApprovalData = async (id: number) => {
    setFetchingData(true);
    try {
      const [sumRes, readRes, pegRes, absRes, tunjRes, potRes] =
        await Promise.all([
          fetchDashboardSummary(id).catch(() => null),
          getPeriodeReadiness(id).catch(() => null),
          getAllPegawai().catch(() => []),
          getAbsensiByPeriode(id).catch(() => []),
          getTunjanganByPeriode(id).catch(() => []),
          getPotonganByPeriode(id).catch(() => []),
        ]);

      setSummary(sumRes);
      setReadiness(readRes);
      setPegawaiList(pegRes);
      setAbsensiList(absRes);
      setTunjanganList(tunjRes);
      setPotonganList(potRes);
    } catch (err) {
      console.error("Gagal memuat data audit approval:", err);
    } finally {
      setFetchingData(false);
    }
  };

  useEffect(() => {
    if (!selectedPeriodeId) return;
    loadApprovalData(selectedPeriodeId);
  }, [selectedPeriodeId]);

  const canAct = selectedPeriode?.status === "Menunggu Approval";
  const isAbsensiComplete = readiness?.absensi.isComplete ?? false;

  // Merged payroll items for all employees
  const mergedEmployees: MergedEmployeeItem[] = useMemo(() => {
    const map = new Map<number, MergedEmployeeItem>();

    // 1. Inisialisasi dari Master Pegawai
    pegawaiList.forEach((p) => {
      map.set(p.id_pegawai, {
        id_pegawai: p.id_pegawai,
        nama: p.nama_dan_tanggal_lahir,
        jabatan: p.nama_jabatan || "Guru / Staf",
        golongan: p.nama_golongan || "-",
        status_nikah: p.status_perkawinan || "TK",
        jumlah_anak: p.jumlah_anak || 0,
        gaji_pokok: Number(p.gaji_pokok_dasar || 0),
        hadir_wfo: 0,
        hadir_wfh: 0,
        izin: 0,
        sakit: 0,
        alpha: 0,
        total_jam_lebih: 0,
        honor_bulan: 0,
        total_tunjangan: 0,
        total_potongan: 0,
        potongan_details: [],
        tunjangan_details: [],
        estimasi_thp: Number(p.gaji_pokok_dasar || 0),
      });
    });

    // 2. Gabungkan Absensi
    absensiList.forEach((a) => {
      const existing = map.get(a.id_pegawai);
      if (existing) {
        existing.hadir_wfo = Number(a.total_hadir_ops_wfo || 0);
        existing.hadir_wfh = Number(a.total_hadir_ops_wfh || 0);
        existing.izin = Number(a.total_izin || 0);
        existing.sakit = Number(a.total_sakit || 0);
        existing.alpha = Number(a.total_alpha || 0);
      } else {
        map.set(a.id_pegawai, {
          id_pegawai: a.id_pegawai,
          nama: a.nama_dan_tanggal_lahir || `Pegawai #${a.id_pegawai}`,
          jabatan: "Guru / Staf",
          golongan: "-",
          status_nikah: "TK",
          jumlah_anak: 0,
          gaji_pokok: 0,
          hadir_wfo: Number(a.total_hadir_ops_wfo || 0),
          hadir_wfh: Number(a.total_hadir_ops_wfh || 0),
          izin: Number(a.total_izin || 0),
          sakit: Number(a.total_sakit || 0),
          alpha: Number(a.total_alpha || 0),
          total_jam_lebih: 0,
          honor_bulan: 0,
          total_tunjangan: 0,
          total_potongan: 0,
          potongan_details: [],
          tunjangan_details: [],
          estimasi_thp: 0,
        });
      }
    });

    // 3. Gabungkan Tunjangan
    tunjanganList.forEach((t) => {
      const existing = map.get(t.id_pegawai);
      const calculatedTotal =
        t.total_tunjangan_terhitung !== undefined
          ? Number(t.total_tunjangan_terhitung)
          : (t.details || []).reduce(
              (s, d) => s + Number(d.nilai_terhitung || 0),
              0,
            );

      if (existing) {
        existing.total_jam_lebih = Number(t.total_jam_lebih || 0);
        existing.honor_bulan = Number(t.honor_bulan || 0);
        existing.total_tunjangan = calculatedTotal;
        existing.tunjangan_details = t.details || [];
      }
    });

    // 4. Gabungkan Potongan & Hitung THP
    potonganList.forEach((p) => {
      const existing = map.get(p.id_pegawai);
      const potTotal =
        p.details && p.details.length > 0
          ? p.details.reduce((s, d) => s + Number(d.nilai_potongan || 0), 0)
          : Number(p.total_potongan_terhitung || 0);

      if (existing) {
        existing.total_potongan = potTotal;
        existing.potongan_details = p.details || [];
      }
    });

    // 5. Kalkulasi Estimasi Take Home Pay
    map.forEach((item) => {
      item.estimasi_thp =
        item.gaji_pokok + item.total_tunjangan - item.total_potongan;
    });

    return Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [pegawaiList, absensiList, tunjanganList, potonganList]);

  // Search filter
  const filteredMerged = useMemo(() => {
    if (!searchQuery.trim()) return mergedEmployees;
    return mergedEmployees.filter((e) =>
      e.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.jabatan.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [mergedEmployees, searchQuery]);

  const totalGajiPokokSum = mergedEmployees.reduce(
    (s, e) => s + e.gaji_pokok,
    0,
  );
  const totalTunjanganSum = mergedEmployees.reduce(
    (s, e) => s + e.total_tunjangan,
    0,
  );
  const totalPotonganSum = mergedEmployees.reduce(
    (s, e) => s + e.total_potongan,
    0,
  );
  const totalJamLemburSum = mergedEmployees.reduce(
    (s, e) => s + e.total_jam_lebih,
    0,
  );
  const grandTotalEstimasiTHP = mergedEmployees.reduce(
    (s, e) => s + e.estimasi_thp,
    0,
  );

  const handleApprove = async () => {
    if (!selectedPeriodeId) return;
    if (!isAbsensiComplete) {
      setErrorMsg(
        "Gagal Approve: Absensi semua pegawai belum terisi lengkap. Harap minta staf gaji melengkapi data absensi terlebih dahulu.",
      );
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      await approvePeriode(selectedPeriodeId, catatan);
      await refreshPeriodeList();
      setMessage("Periode berhasil disetujui oleh Kepala Sekolah.");
      loadApprovalData(selectedPeriodeId);
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
      setMessage("Periode berhasil ditolak (status dikembalikan ke Pengisian Absensi / Draft).");
      loadApprovalData(selectedPeriodeId);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal reject.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Approval & Verifikasi Penggajian"
      description="Dashboard verifikasi Kepala Sekolah (Approver) untuk memeriksa rincian Absensi, Tunjangan, dan Potongan sebelum pengesahan gaji"
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

      {/* HEADER STATUS */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-xs text-slate-400">Periode Gaji yang Diperiksa:</span>
            <h3 className="text-lg font-bold text-slate-100">
              {selectedPeriode?.bulan_gaji ?? "Belum ada periode"}
            </h3>
          </div>
          {selectedPeriode && <Badge status={selectedPeriode.status} />}
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400">Peran Pengguna:</span>
          <p className="text-xs font-semibold text-amber-300">
            👑 Kepala Sekolah / Approver (Pak Thomas)
          </p>
        </div>
      </div>

      {/* TOP STATS CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Total Pegawai Diperiksa"
          value={summary?.metrics.total_pegawai ?? mergedEmployees.length}
          unit="Orang"
        />
        <StatCard
          title="Tingkat Kehadiran Sekolah"
          value={formatPercent(summary?.metrics.persentase_kehadiran)}
        />
        <div className="rounded-xl border border-indigo-700/60 bg-gradient-to-br from-indigo-950/70 to-slate-900 p-4">
          <span className="text-xs text-indigo-300">Total Tunjangan & Lembur</span>
          <div className="text-lg font-bold text-indigo-100 mt-1">
            {formatRupiah(totalTunjanganSum)}
          </div>
          <span className="text-[11px] text-slate-400">
            {totalJamLemburSum} Jam Lembur
          </span>
        </div>
        <div className="rounded-xl border border-emerald-700/60 bg-gradient-to-br from-emerald-950/70 to-slate-900 p-4">
          <span className="text-xs text-emerald-300">Estimasi Total Beban Gaji</span>
          <div className="text-lg font-bold text-emerald-100 mt-1">
            {formatRupiah(grandTotalEstimasiTHP > 0 ? grandTotalEstimasiTHP : (summary?.metrics.estimasi_pengeluaran_gaji ?? 0))}
          </div>
          <span className="text-[11px] text-rose-300">
            Total Potongan: -{formatRupiah(totalPotonganSum)}
          </span>
        </div>
      </div>

      {/* AUDIT & VERIFICATION DATA PANEL */}
      <Card
        title="Rincian Audit & Pemeriksaan Data Penggajian"
        className="mb-6"
      >
        {/* TAB NAVIGATION & SEARCH */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTab("ringkasan")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "ringkasan"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              📊 Ringkasan Payroll ({filteredMerged.length} Pegawai)
            </button>
            <button
              onClick={() => setActiveTab("absensi")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "absensi"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              🕒 Rekap Kehadiran
            </button>
            <button
              onClick={() => setActiveTab("tunjangan")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "tunjangan"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              💰 Tunjangan & Lembur
            </button>
            <button
              onClick={() => setActiveTab("potongan")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "potongan"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              📉 Potongan (Taken List)
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="🔍 Cari nama atau jabatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {fetchingData ? (
          <p className="text-slate-400 py-8 text-center">Memuat data audit...</p>
        ) : filteredMerged.length === 0 ? (
          <p className="text-slate-400 py-8 text-center">
            Belum ada data transaksi yang diinput pada periode ini.
          </p>
        ) : (
          <>
            {/* TAB 1: RINGKASAN ALL-IN-ONE */}
            {activeTab === "ringkasan" && (
              <Table>
                <TableHead>
                  <TableHeaderCell>Nama Pegawai & Jabatan</TableHeaderCell>
                  <TableHeaderCell>Gaji Pokok</TableHeaderCell>
                  <TableHeaderCell className="text-center">Kehadiran (WFO / WFH)</TableHeaderCell>
                  <TableHeaderCell>Tunjangan</TableHeaderCell>
                  <TableHeaderCell>Potongan</TableHeaderCell>
                  <TableHeaderCell>Estimasi Gaji Bersih</TableHeaderCell>
                  <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
                </TableHead>
                <TableBody>
                  {filteredMerged.map((emp) => (
                    <TableRow key={emp.id_pegawai}>
                      <TableCell className="max-w-[200px]">
                        <div className="font-semibold text-slate-100">
                          {emp.nama}
                        </div>
                        <div className="text-[11px] text-indigo-300">
                          {emp.jabatan} • Gol. {emp.golongan}
                        </div>
                      </TableCell>

                      <TableCell className="text-slate-300">
                        {formatRupiah(emp.gaji_pokok)}
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-200 border border-slate-700">
                          🏢 {emp.hadir_wfo} WFO / 🏠 {emp.hadir_wfh} WFH
                        </span>
                      </TableCell>

                      <TableCell className="font-semibold text-indigo-300">
                        {formatRupiah(emp.total_tunjangan)}
                      </TableCell>

                      <TableCell>
                        <span
                          className={`font-semibold ${
                            emp.total_potongan > 0
                              ? "text-rose-300"
                              : "text-slate-500"
                          }`}
                        >
                          {emp.total_potongan > 0
                            ? `- ${formatRupiah(emp.total_potongan)}`
                            : "Rp 0"}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="font-bold text-emerald-300">
                          {formatRupiah(emp.estimasi_thp)}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDetail(emp)}
                          className="text-xs"
                        >
                          👁️ Rincian Lengkap
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* TAB 2: RINCIAN ABSENSI */}
            {activeTab === "absensi" && (
              <Table>
                <TableHead>
                  <TableHeaderCell>Nama Pegawai</TableHeaderCell>
                  <TableHeaderCell className="text-center">Hadir WFO</TableHeaderCell>
                  <TableHeaderCell className="text-center">Hadir WFH</TableHeaderCell>
                  <TableHeaderCell className="text-center">Izin</TableHeaderCell>
                  <TableHeaderCell className="text-center">Sakit</TableHeaderCell>
                  <TableHeaderCell className="text-center">Alpha</TableHeaderCell>
                  <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
                </TableHead>
                <TableBody>
                  {filteredMerged.map((emp) => (
                    <TableRow key={emp.id_pegawai}>
                      <TableCell className="font-medium text-slate-100">
                        {emp.nama}
                      </TableCell>
                      <TableCell className="text-center text-emerald-400 font-bold">
                        {emp.hadir_wfo} Hari
                      </TableCell>
                      <TableCell className="text-center text-cyan-400 font-bold">
                        {emp.hadir_wfh} Hari
                      </TableCell>
                      <TableCell className="text-center text-amber-400">
                        {emp.izin} Hari
                      </TableCell>
                      <TableCell className="text-center text-blue-400">
                        {emp.sakit} Hari
                      </TableCell>
                      <TableCell className="text-center text-rose-400 font-bold">
                        {emp.alpha} Hari
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDetail(emp)}
                          className="text-xs"
                        >
                          👁️ Rincian
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* TAB 3: RINCIAN TUNJANGAN */}
            {activeTab === "tunjangan" && (
              <Table>
                <TableHead>
                  <TableHeaderCell>Nama Pegawai</TableHeaderCell>
                  <TableHeaderCell className="text-center">Jam Lembur</TableHeaderCell>
                  <TableHeaderCell>Honor Bulan</TableHeaderCell>
                  <TableHeaderCell>Rincian Komponen Terhitung</TableHeaderCell>
                  <TableHeaderCell className="text-right">Total Tunjangan</TableHeaderCell>
                  <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
                </TableHead>
                <TableBody>
                  {filteredMerged.map((emp) => (
                    <TableRow key={emp.id_pegawai}>
                      <TableCell className="font-medium text-slate-100">
                        {emp.nama}
                      </TableCell>
                      <TableCell className="text-center">
                        {emp.total_jam_lebih > 0 ? (
                          <span className="font-bold text-amber-300">
                            ⏱️ {emp.total_jam_lebih} Jam
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">0 Jam</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.honor_bulan > 0 ? (
                          <span className="text-slate-200">
                            {formatRupiah(emp.honor_bulan)}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">Rp 0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.tunjangan_details.length === 0 ? (
                          <span className="text-xs text-slate-500 italic">
                            Tidak ada rincian komponen
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {emp.tunjangan_details.map((d: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700"
                              >
                                {d.nama_tunjangan || "Tunjangan"}: {formatRupiah(Number(d.nilai_terhitung))}
                              </span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-indigo-300">
                        {formatRupiah(emp.total_tunjangan)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDetail(emp)}
                          className="text-xs"
                        >
                          👁️ Rincian
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* TAB 4: RINCIAN POTONGAN */}
            {activeTab === "potongan" && (
              <Table>
                <TableHead>
                  <TableHeaderCell>Nama Pegawai</TableHeaderCell>
                  <TableHeaderCell>Rincian Potongan (Taken List)</TableHeaderCell>
                  <TableHeaderCell className="text-right">Total Potongan</TableHeaderCell>
                  <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
                </TableHead>
                <TableBody>
                  {filteredMerged.map((emp) => (
                    <TableRow key={emp.id_pegawai}>
                      <TableCell className="font-medium text-slate-100">
                        {emp.nama}
                      </TableCell>
                      <TableCell>
                        {emp.total_potongan === 0 ? (
                          <span className="text-xs text-slate-500 italic">
                            Tidak ada potongan (Rp 0)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/70">
                            Taken List: {formatRupiah(emp.total_potongan)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-rose-300">
                        {emp.total_potongan > 0
                          ? formatRupiah(emp.total_potongan)
                          : "Rp 0"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDetail(emp)}
                          className="text-xs"
                        >
                          👁️ Rincian
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </Card>

      {/* ACTION CARD FOR KEPSEK / APPROVER */}
      <Card title="Keputusan Verifikasi & Pengesahan Pimpinan">
        {!canAct ? (
          <div className="p-3 text-sm text-slate-400">
            {selectedPeriode?.status === "Disetujui" ? (
              <span className="text-emerald-300">
                ✅ Periode ini telah <strong>Disetujui</strong>. Staf Gaji sekarang dapat memproses rekap final dan mencetak slip gaji.
              </span>
            ) : selectedPeriode?.status === "Ditolak" ? (
              <span className="text-rose-300">
                ❌ Periode ini dalam status <strong>Ditolak</strong> dan sedang dikembalikan ke staf gaji untuk perbaikan data.
              </span>
            ) : (
              <span>
                Status periode saat ini: <strong>{selectedPeriode?.status}</strong>. Tindakan approval hanya aktif jika status periode <em>"Menunggu Approval"</em>.
              </span>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Status Absensi Banner */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                isAbsensiComplete
                  ? "bg-emerald-950/40 border-emerald-800 text-emerald-200"
                  : "bg-red-950/40 border-red-800 text-red-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{isAbsensiComplete ? "✅" : "⚠️"}</span>
                <div>
                  <h4 className="font-semibold text-sm">
                    Status Kelengkapan Absensi Pegawai
                  </h4>
                  <p className="text-xs text-slate-300">
                    {isAbsensiComplete
                      ? `Seluruh absensi pegawai (${readiness?.absensi.filledCount}/${readiness?.absensi.totalCount} pegawai) telah diverifikasi lengkap.`
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
              label="Catatan Verifikasi / Alasan (Opsional)"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Masukkan catatan pengesahan atau alasan penolakan untuk staf gaji..."
            />

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                onClick={handleApprove}
                isLoading={loading}
                disabled={!isAbsensiComplete}
                className={`bg-emerald-600 hover:bg-emerald-500 text-white ${
                  !isAbsensiComplete ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                ✅ Setujui Periode (Approve)
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                isLoading={loading}
              >
                ❌ Tolak & Kembalikan ke Staf Gaji
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* POP-UP MODAL AUDIT DETAIL LENGKAP PER PEGAWAI */}
      <Modal
        isOpen={!!selectedDetail}
        onClose={() => setSelectedDetail(null)}
        title={`Audit & Rincian Penggajian: ${selectedDetail?.nama ?? ""}`}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSelectedDetail(null)}>
            Tutup Pratinjau
          </Button>
        }
      >
        {selectedDetail && (
          <div className="space-y-4">
            {/* Header Data Pegawai */}
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Jabatan:</span>
                <p className="font-semibold text-slate-200 mt-0.5">{selectedDetail.jabatan}</p>
              </div>
              <div>
                <span className="text-slate-400">Golongan:</span>
                <p className="font-semibold text-slate-200 mt-0.5">{selectedDetail.golongan}</p>
              </div>
              <div>
                <span className="text-slate-400">Status Nikah:</span>
                <p className="font-semibold text-slate-200 mt-0.5">
                  {selectedDetail.status_nikah === "K" ? "Kawin" : "Tidak Kawin"}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Jumlah Anak:</span>
                <p className="font-semibold text-slate-200 mt-0.5">{selectedDetail.jumlah_anak} Anak</p>
              </div>
            </div>

            {/* Rincian Kehadiran */}
            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                📋 Rekap Kehadiran Operasional
              </h5>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60">
                  <span className="text-slate-400 text-[10px]">Hadir WFO</span>
                  <p className="font-bold text-emerald-300 text-sm mt-0.5">{selectedDetail.hadir_wfo}</p>
                </div>
                <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-800/60">
                  <span className="text-slate-400 text-[10px]">Hadir WFH</span>
                  <p className="font-bold text-cyan-300 text-sm mt-0.5">{selectedDetail.hadir_wfh}</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/60">
                  <span className="text-slate-400 text-[10px]">Izin</span>
                  <p className="font-bold text-amber-300 text-sm mt-0.5">{selectedDetail.izin}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-950/40 border border-blue-800/60">
                  <span className="text-slate-400 text-[10px]">Sakit</span>
                  <p className="font-bold text-blue-300 text-sm mt-0.5">{selectedDetail.sakit}</p>
                </div>
                <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/60">
                  <span className="text-slate-400 text-[10px]">Alpha</span>
                  <p className="font-bold text-rose-300 text-sm mt-0.5">{selectedDetail.alpha}</p>
                </div>
              </div>
            </div>

            {/* Breakdown Finansial: Penerimaan vs Potongan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Kolom Penerimaan */}
              <div className="p-3.5 bg-indigo-950/30 border border-indigo-800/60 rounded-xl flex flex-col justify-between">
                <div>
                  <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>➕ Penerimaan Gaji & Tunjangan</span>
                  </h5>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-indigo-900/50">
                      <span className="text-slate-300">Gaji Pokok Dasar:</span>
                      <span className="font-semibold text-slate-100">{formatRupiah(selectedDetail.gaji_pokok)}</span>
                    </div>

                    {selectedDetail.total_jam_lebih > 0 && (
                      <div className="flex justify-between py-1 border-b border-indigo-900/50">
                        <span className="text-slate-300">Jam Lembur ({selectedDetail.total_jam_lebih} Jam):</span>
                        <span className="font-semibold text-amber-300">
                          {formatRupiah(selectedDetail.total_jam_lebih * 25000)}
                        </span>
                      </div>
                    )}

                    {selectedDetail.honor_bulan > 0 && (
                      <div className="flex justify-between py-1 border-b border-indigo-900/50">
                        <span className="text-slate-300">Honor Bulan:</span>
                        <span className="font-semibold text-slate-100">{formatRupiah(selectedDetail.honor_bulan)}</span>
                      </div>
                    )}

                    {selectedDetail.tunjangan_details.map((d: any, i: number) => (
                      <div key={i} className="flex justify-between py-1 border-b border-indigo-900/50">
                        <span className="text-slate-300">{d.nama_tunjangan || "Tunjangan"}:</span>
                        <span className="font-semibold text-slate-100">{formatRupiah(Number(d.nilai_terhitung))}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 mt-2 border-t border-indigo-700/60 flex justify-between text-xs font-bold text-indigo-200">
                  <span>Total Penghasilan Kotor:</span>
                  <span>{formatRupiah(selectedDetail.gaji_pokok + selectedDetail.total_tunjangan)}</span>
                </div>
              </div>

              {/* Kolom Potongan */}
              <div className="p-3.5 bg-rose-950/30 border border-rose-800/60 rounded-xl flex flex-col justify-between">
                <div>
                  <h5 className="text-xs font-bold text-rose-300 uppercase tracking-wider mb-2">
                    ➖ Potongan (Taken List)
                  </h5>
                  <div className="space-y-1.5 text-xs">
                    {selectedDetail.total_potongan === 0 ? (
                      <p className="text-slate-400 py-3 text-center italic">
                        Tidak ada potongan pinjaman / kas pada periode ini.
                      </p>
                    ) : (
                      <div className="flex justify-between py-1 border-b border-rose-900/50">
                        <span className="text-slate-300">Taken List / Kas Pinjaman:</span>
                        <span className="font-semibold text-rose-300">
                          - {formatRupiah(selectedDetail.total_potongan)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-2 border-t border-rose-700/60 flex justify-between text-xs font-bold text-rose-200">
                  <span>Total Potongan:</span>
                  <span>- {formatRupiah(selectedDetail.total_potongan)}</span>
                </div>
              </div>
            </div>

            {/* Total Estimasi THP Pegawai */}
            <div className="p-4 bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-700 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-300">Estimasi Gaji Bersih Diterima (Take Home Pay):</span>
                <h4 className="text-xl font-black text-emerald-200 mt-0.5">
                  {formatRupiah(selectedDetail.estimasi_thp)}
                </h4>
              </div>
              <span className="px-3 py-1 bg-emerald-900/60 text-emerald-300 border border-emerald-700 rounded-lg text-xs font-bold">
                💵 Siap Dibayarkan
              </span>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
