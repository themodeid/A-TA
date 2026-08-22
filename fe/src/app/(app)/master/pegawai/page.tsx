"use client";

import { useEffect, useState } from "react";
import {
  getAllPegawai,
  getPegawaiById,
  createPegawai,
  updatePegawai,
  deletePegawai,
  getAllJabatan,
  getAllGolongan,
} from "@/features/master/api/master.api";
import { Golongan, Jabatan, Pegawai } from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatRupiah } from "@/lib/format";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";

const STATUS_PERKAWINAN_OPTIONS = [
  { value: "TK", label: "TK — Tidak Kawin (0 Anak)" },
  { value: "K0", label: "K/0 — Kawin (0 Anak)" },
  { value: "K1", label: "K/1 — Kawin (1 Anak)" },
  { value: "K2", label: "K/2 — Kawin (2 Anak)" },
  { value: "K3", label: "K/3 — Kawin (3+ Anak)" },
];

export default function MasterPegawaiPage() {
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [jabatanList, setJabatanList] = useState<Jabatan[]>([]);
  const [golonganList, setGolonganList] = useState<Golongan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Modal Create / Edit State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPegawai, setEditingPegawai] = useState<Pegawai | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formNamaTTL, setFormNamaTTL] = useState("");
  const [formJabatanId, setFormJabatanId] = useState<number | string>("");
  const [formGolonganId, setFormGolonganId] = useState<number | string>("");
  const [formStatusKawin, setFormStatusKawin] = useState("TK");
  const [formJumlahAnak, setFormJumlahAnak] = useState<number | string>(0);
  const [formGajiPokok, setFormGajiPokok] = useState<number | string>(0);

  // Modal Detail State
  const [selectedPegawai, setSelectedPegawai] = useState<Pegawai | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modal Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingPegawai, setDeletingPegawai] = useState<Pegawai | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Feedback Alert
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pegRes, jabRes, golRes] = await Promise.all([
        getAllPegawai().catch(() => []),
        getAllJabatan().catch(() => []),
        getAllGolongan().catch(() => []),
      ]);
      setPegawaiList(pegRes);
      setJabatanList(jabRes);
      setGolonganList(golRes);
    } catch (err: any) {
      console.error("Gagal memuat master pegawai:", err);
      setError("Gagal memuat data pegawai. Pastikan server backend sedang berjalan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingPegawai(null);
    setFormNamaTTL("");
    const defaultJabatan = jabatanList.length > 0 ? jabatanList[0].id_jabatan : "";
    const defaultGolongan = golonganList.length > 0 ? golonganList[0].id_golongan : "";
    const defaultGaji = golonganList.length > 0 ? (golonganList[0].gaji_pokok_standar || 0) : 0;

    setFormJabatanId(defaultJabatan);
    setFormGolonganId(defaultGolongan);
    setFormStatusKawin("TK");
    setFormJumlahAnak(0);
    setFormGajiPokok(defaultGaji);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (p: Pegawai) => {
    setEditingPegawai(p);
    setFormNamaTTL(p.nama_dan_tanggal_lahir);
    
    // Find matching jabatan id by id or name
    let jId = p.id_jabatan;
    if (!jId && p.nama_jabatan) {
      const found = jabatanList.find((j) => j.nama_jabatan === p.nama_jabatan);
      if (found) jId = found.id_jabatan;
    }
    setFormJabatanId(jId || (jabatanList.length > 0 ? jabatanList[0].id_jabatan : ""));

    // Find matching golongan id by id or name
    let gId = p.id_golongan;
    if (!gId && p.nama_golongan) {
      const found = golonganList.find((g) => g.nama_golongan === p.nama_golongan);
      if (found) gId = found.id_golongan;
    }
    setFormGolonganId(gId || (golonganList.length > 0 ? golonganList[0].id_golongan : ""));

    setFormStatusKawin(p.status_perkawinan || "TK");
    setFormJumlahAnak(p.jumlah_anak ?? 0);
    setFormGajiPokok(p.gaji_pokok_dasar ?? 0);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Saat golongan dipilih saat create/edit, jika formGajiPokok belum diubah manual, sesuaikan
  const handleGolonganChange = (selectedId: string) => {
    const numId = Number(selectedId);
    setFormGolonganId(numId);
    const found = golonganList.find((g) => g.id_golongan === numId);
    if (found && (!editingPegawai || formGajiPokok === 0)) {
      setFormGajiPokok(found.gaji_pokok_standar || 0);
    }
  };

  const handleStatusKawinChange = (val: string) => {
    setFormStatusKawin(val);
    if (val === "TK") {
      setFormJumlahAnak(0);
    } else if (val === "K0") {
      setFormJumlahAnak(0);
    } else if (val === "K1") {
      setFormJumlahAnak(1);
    } else if (val === "K2") {
      setFormJumlahAnak(2);
    } else if (val === "K3") {
      setFormJumlahAnak(3);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaTTL.trim()) {
      setFormError("Nama dan Tanggal Lahir pegawai wajib diisi.");
      return;
    }
    if (!formJabatanId) {
      setFormError("Pilih salah satu jabatan.");
      return;
    }
    if (!formGolonganId) {
      setFormError("Pilih salah satu golongan.");
      return;
    }

    const gajiVal = Number(formGajiPokok);
    if (isNaN(gajiVal) || gajiVal < 0) {
      setFormError("Gaji pokok dasar harus berupa angka non-negatif.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload: Partial<Pegawai> = {
      nama_dan_tanggal_lahir: formNamaTTL.trim(),
      id_jabatan: Number(formJabatanId),
      id_golongan: Number(formGolonganId),
      status_perkawinan: formStatusKawin,
      jumlah_anak: formStatusKawin === "TK" ? 0 : Number(formJumlahAnak || 0),
      gaji_pokok_dasar: gajiVal,
    };

    try {
      if (editingPegawai) {
        await updatePegawai(editingPegawai.id_pegawai, payload);
        setFeedback({
          type: "success",
          text: `Data pegawai "${formNamaTTL.trim()}" berhasil diperbarui.`,
        });
      } else {
        await createPegawai(payload);
        setFeedback({
          type: "success",
          text: `Pegawai baru "${formNamaTTL.trim()}" berhasil ditambahkan.`,
        });
      }
      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Gagal menyimpan data pegawai.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const openDetailModal = async (id: number) => {
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await getPegawaiById(id);
      setSelectedPegawai(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const openDeleteModal = (p: Pegawai) => {
    setDeletingPegawai(p);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingPegawai) return;
    setDeleteLoading(true);
    try {
      await deletePegawai(deletingPegawai.id_pegawai);
      setFeedback({
        type: "success",
        text: `Pegawai "${deletingPegawai.nama_dan_tanggal_lahir}" berhasil dihapus.`,
      });
      setIsDeleteOpen(false);
      setDeletingPegawai(null);
      loadData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Gagal menghapus pegawai.";
      setFeedback({ type: "error", text: msg });
      setIsDeleteOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredList = pegawaiList.filter((p) =>
    p.nama_dan_tanggal_lahir.toLowerCase().includes(search.toLowerCase()) ||
    (p.nama_jabatan && p.nama_jabatan.toLowerCase().includes(search.toLowerCase())) ||
    (p.nama_golongan && p.nama_golongan.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <PageContainer
      title="Master Pegawai"
      description="Kelola profil pegawai, relasi jabatan struktural, golongan, dan gaji pokok dasar"
      action={
        <Button
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-900/30"
        >
          + Tambah Pegawai
        </Button>
      }
    >
      {feedback && (
        <div
          className={`mb-4 flex items-center justify-between rounded-lg p-4 text-sm font-medium border ${
            feedback.type === "success"
              ? "bg-emerald-950/50 border-emerald-800 text-emerald-300"
              : "bg-rose-950/50 border-rose-800 text-rose-300"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 underline"
          >
            Tutup
          </button>
        </div>
      )}

      <Card>
        <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Cari nama, jabatan, atau golongan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900 border-slate-700 text-xs"
            />
          </div>
          <div className="text-xs text-slate-400">
            Total: <span className="font-semibold text-slate-200">{filteredList.length}</span> Pegawai
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mx-auto mb-2" />
            <p className="text-xs">Memuat data master pegawai...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <Button size="sm" variant="secondary" onClick={loadData}>
              Coba Lagi
            </Button>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 border border-dashed border-slate-800 rounded-lg">
            <span className="text-3xl mb-2 block">👥</span>
            <p className="text-sm font-medium text-slate-300">
              {search ? "Pegawai tidak ditemukan." : "Belum ada master pegawai."}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {search
                ? "Coba kata kunci pencarian yang lain."
                : "Klik tombol '+ Tambah Pegawai' di atas untuk mendaftarkan pegawai baru."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800/80">
            <Table>
              <TableHead>
                <TableHeaderCell className="w-12 bg-slate-900/80">No</TableHeaderCell>
                <TableHeaderCell className="bg-slate-900/80">Nama & TTL</TableHeaderCell>
                <TableHeaderCell className="bg-slate-900/80">Jabatan</TableHeaderCell>
                <TableHeaderCell className="bg-slate-900/80">Golongan</TableHeaderCell>
                <TableHeaderCell className="bg-slate-900/80">Status</TableHeaderCell>
                <TableHeaderCell className="bg-slate-900/80 text-right">Gaji Pokok</TableHeaderCell>
                <TableHeaderCell className="w-40 bg-slate-900/80 text-center">Aksi</TableHeaderCell>
              </TableHead>
              <TableBody>
                {filteredList.map((p, idx) => (
                  <TableRow
                    key={p.id_pegawai}
                    className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors"
                  >
                    <TableCell className="text-slate-400">{idx + 1}</TableCell>
                    <TableCell className="font-medium text-slate-100">
                      {p.nama_dan_tanggal_lahir}
                    </TableCell>
                    <TableCell className="text-slate-300">{p.nama_jabatan || "—"}</TableCell>
                    <TableCell className="text-slate-300">{p.nama_golongan || "—"}</TableCell>
                    <TableCell className="text-slate-300">
                      <span className="inline-block rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-300">
                        {p.status_perkawinan}
                        {p.status_perkawinan !== "TK" && ` (${p.jumlah_anak ?? 0} anak)`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-emerald-400">
                      {formatRupiah(p.gaji_pokok_dasar || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openDetailModal(p.id_pegawai)}
                          className="text-xs py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          Detail
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditModal(p)}
                          className="text-xs py-1 px-2 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/60"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openDeleteModal(p)}
                          className="text-xs py-1 px-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60"
                        >
                          Hapus
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* MODAL TAMBAH / EDIT PEGAWAI */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => !submitting && setIsFormOpen(false)}
        title={editingPegawai ? "Edit Data Pegawai" : "Tambah Pegawai Baru"}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => setIsFormOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="form-pegawai"
              isLoading={submitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {editingPegawai ? "Simpan Perubahan" : "Tambahkan Pegawai"}
            </Button>
          </div>
        }
      >
        <form id="form-pegawai" onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-rose-950/50 border border-rose-800 p-3 text-xs text-rose-300">
              {formError}
            </div>
          )}

          <Input
            label="Nama Lengkap & Tanggal Lahir"
            placeholder="Contoh: Budi Santoso, 12-05-1988"
            value={formNamaTTL}
            onChange={(e) => setFormNamaTTL(e.target.value)}
            required
            disabled={submitting}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Jabatan Struktural"
              value={formJabatanId}
              onChange={(e) => setFormJabatanId(e.target.value)}
              options={
                jabatanList.length === 0
                  ? [{ value: "", label: "Belum ada jabatan (Buat di Master Jabatan)" }]
                  : jabatanList.map((j) => ({
                      value: j.id_jabatan,
                      label: `${j.nama_jabatan} (+${formatRupiah(j.tunjangan_jabatan_struktural || 0)})`,
                    }))
              }
              disabled={submitting || jabatanList.length === 0}
            />

            <Select
              label="Golongan / Pangkat"
              value={formGolonganId}
              onChange={(e) => handleGolonganChange(e.target.value)}
              options={
                golonganList.length === 0
                  ? [{ value: "", label: "Belum ada golongan (Buat di Master Golongan)" }]
                  : golonganList.map((g) => ({
                      value: g.id_golongan,
                      label: `${g.nama_golongan} (Std: ${formatRupiah(g.gaji_pokok_standar || 0)})`,
                    }))
              }
              disabled={submitting || golonganList.length === 0}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Status Perkawinan"
              value={formStatusKawin}
              onChange={(e) => handleStatusKawinChange(e.target.value)}
              options={STATUS_PERKAWINAN_OPTIONS}
              disabled={submitting}
            />

            <Input
              label="Jumlah Anak"
              type="number"
              min="0"
              max="10"
              value={formJumlahAnak}
              onChange={(e) => setFormJumlahAnak(e.target.value)}
              disabled={submitting || formStatusKawin === "TK"}
            />
          </div>

          <Input
            label="Gaji Pokok Dasar (Rp)"
            type="number"
            min="0"
            step="1000"
            placeholder="0"
            value={formGajiPokok}
            onChange={(e) => setFormGajiPokok(e.target.value)}
            required
            disabled={submitting}
          />
          <p className="text-[11px] text-slate-400 italic">
            Gaji pokok otomatis terisi sesuai standar golongan yang dipilih, namun dapat disesuaikan manual jika diperlukan.
          </p>
        </form>
      </Modal>

      {/* MODAL DETAIL PEGAWAI */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Detail Profil Pegawai"
        size="md"
        footer={
          <div className="flex justify-between w-full">
            <Button
              variant="secondary"
              onClick={() => {
                if (selectedPegawai) {
                  setIsDetailOpen(false);
                  openEditModal(selectedPegawai);
                }
              }}
              className="bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-800"
            >
              ✏️ Edit Pegawai Ini
            </Button>
            <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
              Tutup
            </Button>
          </div>
        }
      >
        {detailLoading ? (
          <div className="py-8 text-center text-slate-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mx-auto mb-2" />
            <p className="text-xs">Memuat data pegawai...</p>
          </div>
        ) : selectedPegawai ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-2 border-b border-slate-800/80 pb-2.5">
              <span className="text-slate-400">ID Pegawai</span>
              <span className="col-span-2 font-mono font-medium text-slate-200">
                #{selectedPegawai.id_pegawai}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-800/80 pb-2.5">
              <span className="text-slate-400">Nama Lengkap & TTL</span>
              <span className="col-span-2 font-semibold text-white">
                {selectedPegawai.nama_dan_tanggal_lahir}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-800/80 pb-2.5">
              <span className="text-slate-400">Jabatan</span>
              <span className="col-span-2 font-medium text-indigo-300">
                {selectedPegawai.nama_jabatan || "—"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-800/80 pb-2.5">
              <span className="text-slate-400">Golongan</span>
              <span className="col-span-2 font-medium text-slate-200">
                {selectedPegawai.nama_golongan || "—"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-800/80 pb-2.5">
              <span className="text-slate-400">Status Perkawinan</span>
              <span className="col-span-2 font-medium text-slate-200">
                {selectedPegawai.status_perkawinan || "TK"} (
                {selectedPegawai.status_perkawinan === "TK"
                  ? "Belum Kawin"
                  : `Kawin / ${selectedPegawai.jumlah_anak ?? 0} Anak`}
                )
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-800/80 pb-2.5">
              <span className="text-slate-400">Jumlah Anak</span>
              <span className="col-span-2 font-medium text-slate-200">
                {selectedPegawai.jumlah_anak ?? 0} Orang
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <span className="text-slate-400">Gaji Pokok Dasar</span>
              <span className="col-span-2 font-mono font-bold text-emerald-400 text-base">
                {formatRupiah(selectedPegawai.gaji_pokok_dasar || 0)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-rose-400 py-4 text-center">Pegawai tidak ditemukan.</p>
        )}
      </Modal>

      {/* MODAL KONFIRMASI HAPUS */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => !deleteLoading && setIsDeleteOpen(false)}
        title="Hapus Pegawai"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={deleteLoading}
              onClick={() => setIsDeleteOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              isLoading={deleteLoading}
              onClick={handleDelete}
            >
              Ya, Hapus
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-slate-300 text-sm">
          <p>
            Apakah Anda yakin ingin menghapus pegawai{" "}
            <strong className="text-white">"{deletingPegawai?.nama_dan_tanggal_lahir}"</strong>?
          </p>
          <p className="text-xs text-slate-400">
            Pegawai ini akan dinonaktifkan (soft delete). Riwayat transaksi gaji masa lalu tidak akan terhapus.
          </p>
        </div>
      </Modal>
    </PageContainer>
  );
}
