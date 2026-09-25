"use client";

import { useEffect, useState } from "react";
import {
  getAllJabatan,
  createJabatan,
  updateJabatan,
  deleteJabatan,
} from "@/features/master/api/master.api";
import { Jabatan } from "@/types";
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

export default function MasterJabatanPage() {
  const [jabatanList, setJabatanList] = useState<Jabatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Modal Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJabatan, setEditingJabatan] = useState<Jabatan | null>(null);
  const [formNama, setFormNama] = useState("");
  const [formTunjangan, setFormTunjangan] = useState<number | string>(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingJabatan, setDeletingJabatan] = useState<Jabatan | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Feedback Alert
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    getAllJabatan()
      .then((data) => setJabatanList(data))
      .catch((err) => {
        console.error("Gagal memuat jabatan:", err);
        setError("Gagal memuat data master jabatan.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingJabatan(null);
    setFormNama("");
    setFormTunjangan(0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Jabatan) => {
    setEditingJabatan(item);
    setFormNama(item.nama_jabatan);
    setFormTunjangan(item.tunjangan_jabatan_struktural || 0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openDeleteModal = (item: Jabatan) => {
    setDeletingJabatan(item);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      setFormError("Nama jabatan wajib diisi.");
      return;
    }

    const tunjanganVal = Number(formTunjangan);
    if (isNaN(tunjanganVal) || tunjanganVal < 0) {
      setFormError("Nominal tunjangan struktural harus berupa angka non-negatif.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingJabatan) {
        await updateJabatan(editingJabatan.id_jabatan, {
          nama_jabatan: formNama.trim(),
          tunjangan_jabatan_struktural: tunjanganVal,
        });
        setFeedback({
          type: "success",
          text: `Jabatan "${formNama.trim()}" berhasil diperbarui.`,
        });
      } else {
        await createJabatan({
          nama_jabatan: formNama.trim(),
          tunjangan_jabatan_struktural: tunjanganVal,
        });
        setFeedback({
          type: "success",
          text: `Jabatan "${formNama.trim()}" berhasil ditambahkan.`,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Gagal menyimpan data jabatan.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingJabatan) return;
    setDeleteLoading(true);
    try {
      await deleteJabatan(deletingJabatan.id_jabatan);
      setFeedback({
        type: "success",
        text: `Jabatan "${deletingJabatan.nama_jabatan}" berhasil dihapus.`,
      });
      setIsDeleteOpen(false);
      setDeletingJabatan(null);
      loadData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Gagal menghapus jabatan.";
      setFeedback({ type: "error", text: msg });
      setIsDeleteOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredList = jabatanList.filter((j) =>
    j.nama_jabatan.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <PageContainer
      title="Master Jabatan"
      description="Kelola data jabatan struktural dan besaran tunjangan jabatan"
      action={
        <Button
          onClick={openCreateModal}
          variant="primary"
        >
          + Tambah Jabatan
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
              placeholder="Cari nama jabatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-850 border-zinc-800 text-xs"
            />
          </div>
          <div className="text-xs text-zinc-400">
            Total: <span className="font-semibold text-zinc-200">{filteredList.length}</span> Jabatan
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-400">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent mx-auto mb-2" />
            <p className="text-xs">Memuat data jabatan...</p>
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
            <span className="text-3xl mb-2 block">💼</span>
            <p className="text-sm font-medium text-zinc-300">Belum ada data jabatan</p>
            <p className="text-xs text-zinc-500 mt-1">
              Tambahkan jabatan baru untuk mengaitkan tunjangan struktural.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableHeaderCell className="w-16">No</TableHeaderCell>
                <TableHeaderCell>Nama Jabatan</TableHeaderCell>
                <TableHeaderCell className="text-right">
                  Tunjangan Struktural
                </TableHeaderCell>
                <TableHeaderCell className="text-center w-32">
                  Aksi
                </TableHeaderCell>
              </TableHead>
              <TableBody>
                {filteredList.map((j, idx) => (
                  <TableRow
                    key={j.id_jabatan}
                    className="border-b border-zinc-800/40 hover:bg-zinc-850/50 transition-colors"
                  >
                    <TableCell className="text-zinc-400">{idx + 1}</TableCell>
                    <TableCell className="font-medium text-zinc-100">
                      {j.nama_jabatan}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-medium text-zinc-200">
                      {formatRupiah(j.tunjangan_jabatan_struktural || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditModal(j)}
                          className="text-xs py-1 px-2.5"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openDeleteModal(j)}
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

      {/* MODAL TAMBAH / EDIT JABATAN */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingJabatan ? "Edit Data Jabatan" : "Tambah Jabatan Baru"}
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
              form="form-jabatan"
              isLoading={submitting}
              variant="primary"
            >
              {editingJabatan ? "Simpan Perubahan" : "Tambahkan"}
            </Button>
          </div>
        }
      >
        <form id="form-jabatan" onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
              {formError}
            </div>
          )}

          <Input
            label="Nama Jabatan"
            placeholder="Contoh: Kepala Sekolah, Wali Kelas, dll"
            value={formNama}
            onChange={(e) => setFormNama(e.target.value)}
            required
            disabled={submitting}
          />

          <Input
            label="Tunjangan Jabatan Struktural (Rp)"
            type="number"
            min="0"
            step="1000"
            placeholder="0"
            value={formTunjangan}
            onChange={(e) => setFormTunjangan(e.target.value)}
            disabled={submitting}
          />
          <p className="text-[11px] text-slate-400 italic">
            Nominal tunjangan akan otomatis dihitung ke dalam slip gaji pegawai yang memegang jabatan ini.
          </p>
        </form>
      </Modal>

      {/* MODAL KONFIRMASI HAPUS */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => !deleteLoading && setIsDeleteOpen(false)}
        title="Hapus Jabatan"
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
            Apakah Anda yakin ingin menghapus jabatan{" "}
            <strong className="text-white">"{deletingJabatan?.nama_jabatan}"</strong>?
          </p>
          <p className="text-xs text-slate-400">
            Jabatan ini akan dinonaktifkan (soft delete). Data transaksi riwayat gaji terdahulu tetap aman.
          </p>
        </div>
      </Modal>
    </PageContainer>
  );
}
