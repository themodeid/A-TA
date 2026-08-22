"use client";

import { useEffect, useMemo, useState } from "react";
import { usePeriode } from "@/hooks/usePeriodeContext";
import {
  getKoreksiJamList,
  createKoreksiJam,
  deleteKoreksiJam,
} from "@/features/koreksi-jam/api/koreksi-jam.api";
import { getAllPegawai } from "@/features/master/api/master.api";
import { KoreksiJam, Pegawai } from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { formatDate, parseNamaTanggalLahir } from "@/lib/format";
import { isPeriodeLocked } from "@/lib/permissions";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";

export default function AuditKoreksiJamPage() {
  const { selectedPeriodeId, selectedPeriode } = usePeriode();

  const [logs, setLogs] = useState<KoreksiJam[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterPeriodeOnly, setFilterPeriodeOnly] = useState(true);
  const [selectedPegawaiFilter, setSelectedPegawaiFilter] = useState<string>("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedKoreksiToDelete, setSelectedKoreksiToDelete] =
    useState<KoreksiJam | null>(null);

  // Form State
  const [formPegawaiId, setFormPegawaiId] = useState<string>("");
  const [formJamKoreksi, setFormJamKoreksi] = useState<string>("");
  const [formJenisKoreksi, setFormJenisKoreksi] = useState<"ADD" | "SUBTRACT">(
    "ADD"
  );
  const [formKeterangan, setFormKeterangan] = useState<string>("");
  const [formBuktiDokumen, setFormBuktiDokumen] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const isLocked = selectedPeriode ? isPeriodeLocked(selectedPeriode.status) : false;

  // Load Pegawai List
  useEffect(() => {
    getAllPegawai()
      .then(setPegawaiList)
      .catch((err) => console.error("Gagal memuat master pegawai:", err));
  }, []);

  // Load Koreksi Logs
  const loadLogs = async () => {
    setLoading(true);
    try {
      const pid = filterPeriodeOnly ? selectedPeriodeId || undefined : undefined;
      const eid = selectedPegawaiFilter
        ? parseInt(selectedPegawaiFilter, 10)
        : undefined;
      const data = await getKoreksiJamList(pid, eid);
      setLogs(data);
    } catch (err: any) {
      console.error("Gagal mengambil data log koreksi jam:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [selectedPeriodeId, filterPeriodeOnly, selectedPegawaiFilter]);

  // Statistics
  const stats = useMemo(() => {
    let totalAdd = 0;
    let totalSubtract = 0;

    logs.forEach((item) => {
      const jam = parseFloat(String(item.jam_koreksi)) || 0;
      if (item.jenis_koreksi === "ADD") {
        totalAdd += jam;
      } else if (item.jenis_koreksi === "SUBTRACT") {
        totalSubtract += jam;
      }
    });

    return {
      count: logs.length,
      totalAdd,
      totalSubtract,
      netHours: totalAdd - totalSubtract,
    };
  }, [logs]);

  // Handle Form Submit
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedPeriodeId) {
      setFormError("Periode aktif belum dipilih.");
      return;
    }

    if (!formPegawaiId) {
      setFormError("Pilih pegawai yang akan dikoreksi.");
      return;
    }

    const jam = parseFloat(formJamKoreksi);
    if (isNaN(jam) || jam <= 0) {
      setFormError("Jumlah jam koreksi harus lebih dari 0.");
      return;
    }

    if (!formKeterangan.trim()) {
      setFormError("Keterangan atau alasan koreksi wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      await createKoreksiJam({
        id_periode: selectedPeriodeId,
        id_pegawai: parseInt(formPegawaiId, 10),
        jam_koreksi: jam,
        jenis_koreksi: formJenisKoreksi,
        keterangan: formKeterangan.trim(),
        bukti_dokumen: formBuktiDokumen.trim() || undefined,
      });

      setIsModalOpen(false);
      resetForm();
      setActionSuccess(
        "Koreksi jam lembur berhasil ditambahkan dan tunjangan otomatis disinkronkan!"
      );
      loadLogs();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Gagal menyimpan koreksi jam.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormPegawaiId("");
    setFormJamKoreksi("");
    setFormJenisKoreksi("ADD");
    setFormKeterangan("");
    setFormBuktiDokumen("");
    setFormError(null);
  };

  const handleDelete = async () => {
    if (!selectedKoreksiToDelete) return;
    setSubmitting(true);
    try {
      await deleteKoreksiJam(selectedKoreksiToDelete.id_koreksi);
      setIsDeleteModalOpen(false);
      setSelectedKoreksiToDelete(null);
      setActionSuccess(
        "Log koreksi jam berhasil dihapus dan honor disinkronkan."
      );
      loadLogs();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Gagal menghapus log koreksi jam."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer
      title="Audit Koreksi Jam"
      description="Histori & audit trail penyesuaian jam mengajar / lembur (tb_koreksi_jam)"
    >
      {/* Toast Alert Success */}
      {actionSuccess && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm text-emerald-300 shadow-lg">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-xs text-emerald-400 hover:text-emerald-200"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Top Stat Summary Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-md">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Total Entri Koreksi
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-100">{stats.count}</p>
          <p className="mt-1 text-xs text-slate-500">
            {filterPeriodeOnly ? "Pada periode aktif" : "Semua periode"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-md">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
            Total Jam Ditambah (+)
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            +{stats.totalAdd.toFixed(1)} Jam
          </p>
          <p className="mt-1 text-xs text-slate-500">Koreksi lembur positif</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-md">
          <p className="text-xs font-medium uppercase tracking-wider text-rose-400">
            Total Jam Dikurang (-)
          </p>
          <p className="mt-1 text-2xl font-bold text-rose-400">
            -{stats.totalSubtract.toFixed(1)} Jam
          </p>
          <p className="mt-1 text-xs text-slate-500">Koreksi lembur negatif</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-md">
          <p className="text-xs font-medium uppercase tracking-wider text-indigo-400">
            Net Jam Efektif
          </p>
          <p className="mt-1 text-2xl font-bold text-indigo-300">
            {stats.netHours >= 0 ? `+${stats.netHours.toFixed(1)}` : stats.netHours.toFixed(1)} Jam
          </p>
          <p className="mt-1 text-xs text-slate-500">Akumulasi bersih lembur</p>
        </div>
      </div>

      {/* Main Table Card */}
      <Card
        title="Daftar Log Audit Koreksi Jam"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilterPeriodeOnly(!filterPeriodeOnly)}
            >
              {filterPeriodeOnly ? "Tampilkan Semua Periode" : "Hanya Periode Aktif"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isLocked || !selectedPeriodeId}
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              title={
                isLocked
                  ? "Periode sudah dikunci atau selesai diproses"
                  : "Tambah entri audit koreksi jam"
              }
            >
              + Tambah Koreksi Jam
            </Button>
          </div>
        }
      >
        {/* Filter Toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="font-medium text-slate-400">Periode Saat Ini:</span>
            <span className="rounded-md border border-indigo-500/30 bg-indigo-950/40 px-2.5 py-0.5 font-medium text-indigo-300">
              {selectedPeriode?.bulan_gaji || "Belum dipilih"}
            </span>
            {selectedPeriode && (
              <Badge status={selectedPeriode.status} />
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Filter Pegawai:</label>
            <select
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={selectedPegawaiFilter}
              onChange={(e) => setSelectedPegawaiFilter(e.target.value)}
            >
              <option value="">Semua Pegawai</option>
              {pegawaiList.map((p) => {
                const { nama } = parseNamaTanggalLahir(p.nama_dan_tanggal_lahir);
                return (
                  <option key={p.id_pegawai} value={p.id_pegawai}>
                    {nama}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Audit Notice */}
        <div className="mb-4 rounded-lg border border-indigo-900/40 bg-indigo-950/20 p-3 text-xs text-indigo-300">
          Setiap penambahan atau penghapusan log koreksi jam akan dicatat dalam audit trail dan secara otomatis menyinkronkan <strong>total_jam_lebih</strong> serta <strong>honor_bulan</strong> pada modul Tunjangan & Slip Gaji.
        </div>

        {/* Log Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableHeaderCell>Waktu Log</TableHeaderCell>
              <TableHeaderCell>Periode</TableHeaderCell>
              <TableHeaderCell>Pegawai</TableHeaderCell>
              <TableHeaderCell>Jabatan / Golongan</TableHeaderCell>
              <TableHeaderCell className="text-center">Jam Awal</TableHeaderCell>
              <TableHeaderCell className="text-center">Koreksi</TableHeaderCell>
              <TableHeaderCell className="text-center">Jam Akhir</TableHeaderCell>
              <TableHeaderCell>Keterangan & Alasan</TableHeaderCell>
              <TableHeaderCell>Diinput Oleh</TableHeaderCell>
              <TableHeaderCell className="text-center">Aksi</TableHeaderCell>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                      <span>Memuat log koreksi jam...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-slate-400">
                    Belum ada riwayat koreksi jam lembur untuk filter yang dipilih.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((item) => {
                  const { nama } = parseNamaTanggalLahir(item.nama_pegawai || "");
                  const isItemLocked = item.status_periode
                    ? isPeriodeLocked(item.status_periode as any)
                    : false;
                  return (
                    <TableRow key={item.id_koreksi}>
                      <TableCell className="whitespace-nowrap text-xs text-slate-400">
                        {item.created_at ? new Date(item.created_at).toLocaleString("id-ID") : "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-medium text-slate-300">
                        {item.bulan_gaji || `Periode #${item.id_periode}`}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-100">
                        {nama || item.nama_pegawai || `Pegawai #${item.id_pegawai}`}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        <div>{item.nama_jabatan || "-"}</div>
                        <div className="text-[11px] text-slate-500">{item.nama_golongan || "-"}</div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-slate-400">
                        {parseFloat(String(item.jam_awal)).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-bold">
                        {item.jenis_koreksi === "ADD" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 px-2 py-0.5 text-emerald-400 border border-emerald-800/40">
                            +{parseFloat(String(item.jam_koreksi)).toFixed(1)} Jam
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-950/60 px-2 py-0.5 text-rose-400 border border-rose-800/40">
                            -{parseFloat(String(item.jam_koreksi)).toFixed(1)} Jam
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-bold text-indigo-300">
                        {parseFloat(String(item.jam_akhir)).toFixed(1)}
                      </TableCell>
                      <TableCell className="max-w-xs text-xs text-slate-300">
                        <div>{item.keterangan}</div>
                        {item.bukti_dokumen && (
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            Ref: {item.bukti_dokumen}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {item.nama_staf_gaji || "Staf Gaji"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={isItemLocked}
                          onClick={() => {
                            setSelectedKoreksiToDelete(item);
                            setIsDeleteModalOpen(true);
                          }}
                          title={
                            isItemLocked
                              ? "Tidak dapat dihapus karena periode sudah selesai/dikunci"
                              : "Hapus log koreksi ini"
                          }
                        >
                          Hapus
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal Tambah Koreksi Jam */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!submitting) {
            setIsModalOpen(false);
            resetForm();
          }
        }}
        title="Tambah Entri Audit Koreksi Jam"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Periode Aktif
            </label>
            <input
              type="text"
              readOnly
              disabled
              value={selectedPeriode?.bulan_gaji || "Belum dipilih"}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Pilih Pegawai <span className="text-rose-400">*</span>
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              value={formPegawaiId}
              onChange={(e) => setFormPegawaiId(e.target.value)}
              required
            >
              <option value="">-- Pilih Guru / Karyawan --</option>
              {pegawaiList.map((p) => {
                const { nama } = parseNamaTanggalLahir(p.nama_dan_tanggal_lahir);
                return (
                  <option key={p.id_pegawai} value={p.id_pegawai}>
                    {nama} - {p.nama_jabatan || "Pegawai"} ({p.nama_golongan || "-"})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-300">
                Jenis Penyesuaian <span className="text-rose-400">*</span>
              </label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                value={formJenisKoreksi}
                onChange={(e) =>
                  setFormJenisKoreksi(e.target.value as "ADD" | "SUBTRACT")
                }
              >
                <option value="ADD">ADD (Tambah Jam Lembur)</option>
                <option value="SUBTRACT">SUBTRACT (Kurangi Jam Lembur)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Jumlah Jam <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                required
                placeholder="Contoh: 2.0"
                value={formJamKoreksi}
                onChange={(e) => setFormJamKoreksi(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Keterangan / Alasan Koreksi <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="Contoh: Lembur persiapan Ujian Sekolah, dinas luar, atau rapat dewan guru."
              value={formKeterangan}
              onChange={(e) => setFormKeterangan(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Referensi / Bukti Dokumen (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Surat Tugas No. 042/ST/PSKD3/2026"
              value={formBuktiDokumen}
              onChange={(e) => setFormBuktiDokumen(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "Menyimpan..." : "Simpan Koreksi"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!submitting) {
            setIsDeleteModalOpen(false);
            setSelectedKoreksiToDelete(null);
          }
        }}
        title="Konfirmasi Hapus Log Koreksi Jam"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Apakah Anda yakin ingin menghapus log koreksi jam untuk{" "}
            <strong className="text-slate-100">
              {selectedKoreksiToDelete?.nama_pegawai}
            </strong>{" "}
            sebesar{" "}
            <strong className="text-indigo-400">
              {selectedKoreksiToDelete?.jenis_koreksi === "ADD" ? "+" : "-"}
              {selectedKoreksiToDelete?.jam_koreksi} Jam
            </strong>
            ?
          </p>
          <p className="text-xs text-rose-400">
            Tindakan ini akan mengembalikan kalkulasi honor lembur pegawai pada periode terkait.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedKoreksiToDelete(null);
              }}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={submitting}
              onClick={handleDelete}
            >
              {submitting ? "Menghapus..." : "Ya, Hapus Log"}
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
