"use client";

import { useEffect, useState } from "react";
import {
  getAllGolongan,
  createGolongan,
  updateGolongan,
  deleteGolongan,
} from "@/features/master/api/master.api";
import { Golongan } from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { formatRupiah } from "@/lib/format";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";

export default function MasterGolonganPage() {
  const [golonganList, setGolonganList] = useState<Golongan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Modal Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGolongan, setEditingGolongan] = useState<Golongan | null>(null);
  const [formNama, setFormNama] = useState("");
  const [formGajiStandar, setFormGajiStandar] = useState<number | string>(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingGolongan, setDeletingGolongan] = useState<Golongan | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Feedback Alert
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    getAllGolongan()
      .then((data) => setGolonganList(data))
      .catch((err) => {
        console.error("Gagal memuat golongan:", err);
        setError("Gagal memuat data master golongan.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingGolongan(null);
    setFormNama("");
    setFormGajiStandar(0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Golongan) => {
    setEditingGolongan(item);
    setFormNama(item.nama_golongan);
    setFormGajiStandar(item.gaji_pokok_standar || 0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openDeleteModal = (item: Golongan) => {
    setDeletingGolongan(item);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      setFormError("Nama golongan wajib diisi.");
      return;
    }

    const gajiVal = Number(formGajiStandar);
    if (isNaN(gajiVal) || gajiVal < 0) {
      setFormError("Nominal gaji pokok standar harus berupa angka non-negatif.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingGolongan) {
        await updateGolongan(editingGolongan.id_golongan, {
          nama_golongan: formNama.trim(),
          gaji_pokok_standar: gajiVal,
        });
        setFeedback({
          type: "success",
          text: `Golongan "${formNama.trim()}" berhasil diperbarui.`,
        });
      } else {
        await createGolongan({
          nama_golongan: formNama.trim(),
          gaji_pokok_standar: gajiVal,
        });
        setFeedback({
          type: "success",
          text: `Golongan "${formNama.trim()}" berhasil ditambahkan.`,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Gagal menyimpan data golongan.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGolongan) return;
    setDeleteLoading(true);
    try {
      await deleteGolongan(deletingGolongan.id_golongan);
      setFeedback({
        type: "success",
        text: `Golongan "${deletingGolongan.nama_golongan}" berhasil dihapus.`,
      });
      setIsDeleteOpen(false);
      setDeletingGolongan(null);
      loadData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Gagal menghapus golongan.";
      setFeedback({ type: "error", text: msg });
      setIsDeleteOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredList = golonganList.filter((g) =>
    g.nama_golongan.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <PageContainer
      title="Master Golongan"
      description="Kelola data jenjang golongan/pangkat dan besaran standar gaji pokok dasar"
      action={
        <Button
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-900/30"
        >
          + Tambah Golongan
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
              placeholder="Cari nama golongan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900 border-slate-700 text-xs"
            />
          </div>
          <div className="text-xs text-slate-400">
            Total: <span className="font-semibold text-slate-200">{filteredList.length}</span> Golongan
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mx-auto mb-2" />
            <p className="text-xs">Memuat data golongan...</p>
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
            <span className="text-3xl mb-2 block">🎖️</span>
            <p className="text-sm font-medium text-slate-300">
              {search ? "Golongan tidak ditemukan." : "Belum ada master golongan."}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {search
                ? "Coba kata kunci pencarian yang lain."
                : "Klik tombol '+ Tambah Golongan' di atas untuk membuat golongan baru."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800/80">
            <Table>
              <TableHead>
                <TableHeaderCell className="w-16 bg-slate-900/80">No</TableHeaderCell>
                <TableHeaderCell className="bg-slate-900/80">Nama Golongan</TableHeaderCell>
                <TableHeaderCell className="bg-slate-900/80 text-right">
                  Gaji Pokok Standar
                </TableHeaderCell>
                <TableHeaderCell className="w-32 bg-slate-900/80 text-center">
                  Aksi
                </TableHeaderCell>
              </TableHead>
              <TableBody>
                {filteredList.map((g, idx) => (
                  <TableRow
                    key={g.id_golongan}
                    className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors"
                  >
                    <TableCell className="text-slate-400">{idx + 1}</TableCell>
                    <TableCell className="font-medium text-slate-100">
                      {g.nama_golongan}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-emerald-400">
                      {formatRupiah(g.gaji_pokok_standar || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditModal(g)}
                          className="text-xs py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openDeleteModal(g)}
                          className="text-xs py-1 px-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60"
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

      {/* MODAL TAMBAH / EDIT GOLONGAN */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingGolongan ? "Edit Data Golongan" : "Tambah Golongan Baru"}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="form-golongan"
              isLoading={submitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {editingGolongan ? "Simpan Perubahan" : "Tambahkan"}
            </Button>
          </div>
        }
      >
        <form id="form-golongan" onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-rose-950/50 border border-rose-800 p-3 text-xs text-rose-300">
              {formError}
            </div>
          )}

          <Input
            label="Nama Golongan"
            placeholder="Contoh: Golongan I, Golongan II, IV/A, dll"
            value={formNama}
            onChange={(e) => setFormNama(e.target.value)}
            required
            disabled={submitting}
          />

          <Input
            label="Gaji Pokok Standar (Rp)"
            type="number"
            min="0"
            step="1000"
            placeholder="0"
            value={formGajiStandar}
            onChange={(e) => setFormGajiStandar(e.target.value)}
            disabled={submitting}
          />
          <p className="text-[11px] text-slate-400 italic">
            Nilai standar ini akan otomatis dijadikan acuan gaji pokok saat menambahkan pegawai dengan golongan terkait.
          </p>
        </form>
      </Modal>

      {/* MODAL KONFIRMASI HAPUS */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => !deleteLoading && setIsDeleteOpen(false)}
        title="Hapus Golongan"
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
            Apakah Anda yakin ingin menghapus golongan{" "}
            <strong className="text-white">"{deletingGolongan?.nama_golongan}"</strong>?
          </p>
          <p className="text-xs text-slate-400">
            Golongan ini akan dinonaktifkan (soft delete). Data transaksi riwayat gaji terdahulu tetap aman.
          </p>
        </div>
      </Modal>
    </PageContainer>
  );
}
