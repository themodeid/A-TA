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
          variant="primary"
        >
          + Tambah Golongan
        </Button>
      }
    >
      {feedback && (
        <div
          className={`mb-4 flex items-center justify-between rounded-lg p-4 text-xs font-medium border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/20 text-rose-300"
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
              className="bg-zinc-850 border-zinc-800 text-xs"
            />
          </div>
          <div className="text-xs text-zinc-400">
            Total: <span className="font-semibold text-zinc-200">{filteredList.length}</span> Golongan
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-400">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent mx-auto mb-2" />
            <p className="text-xs">Memuat data golongan...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 flex items-center justify-between text-xs">
            <span className="text-sm">{error}</span>
            <Button size="sm" variant="secondary" onClick={loadData}>
              Coba Lagi
            </Button>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 border border-dashed border-zinc-800 rounded-lg">
            <span className="text-3xl mb-2 block">🎖️</span>
            <p className="text-sm font-medium text-zinc-300">Belum ada data golongan</p>
            <p className="text-xs text-zinc-500 mt-1">
              Tambahkan jenjang golongan baru untuk standar gaji pokok pegawai.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableHeaderCell className="w-16">No</TableHeaderCell>
                <TableHeaderCell>Nama Golongan</TableHeaderCell>
                <TableHeaderCell className="text-right">
                  Gaji Pokok Standar
                </TableHeaderCell>
                <TableHeaderCell className="text-center w-32">
                  Aksi
                </TableHeaderCell>
              </TableHead>
              <TableBody>
                {filteredList.map((g, idx) => (
                  <TableRow
                    key={g.id_golongan}
                    className="border-b border-zinc-800/40 hover:bg-zinc-850/50 transition-colors"
                  >
                    <TableCell className="text-zinc-400">{idx + 1}</TableCell>
                    <TableCell className="font-medium text-zinc-100">
                      {g.nama_golongan}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-medium text-zinc-200">
                      {formatRupiah(g.gaji_pokok_standar || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditModal(g)}
                          className="text-xs py-1 px-2.5"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openDeleteModal(g)}
                          className="text-xs py-1 px-2.5"
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
              variant="primary"
            >
              {editingGolongan ? "Simpan Perubahan" : "Tambahkan"}
            </Button>
          </div>
        }
      >
        <form id="form-golongan" onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
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
