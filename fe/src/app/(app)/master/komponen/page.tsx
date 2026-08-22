"use client";

import { useEffect, useState } from "react";
import {
  getTunjanganMaster,
  getPotonganMaster,
  createTunjanganMaster,
  updateTunjanganMaster,
  deleteTunjanganMaster,
  createPotonganMaster,
  updatePotonganMaster,
  deletePotonganMaster,
} from "@/features/master/api/master.api";
import { MasterPotongan, MasterTunjangan } from "@/types";
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

export default function MasterKomponenPage() {
  const [tunjangan, setTunjangan] = useState<MasterTunjangan[]>([]);
  const [potongan, setPotongan] = useState<MasterPotongan[]>([]);

  // Modals state
  const [openTunjangan, setOpenTunjangan] = useState(false);
  const [openPotongan, setOpenPotongan] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Edit / Detail State for Tunjangan
  const [editingTunjangan, setEditingTunjangan] = useState<MasterTunjangan | null>(null);
  const [detailTunjangan, setDetailTunjangan] = useState<MasterTunjangan | null>(null);
  const [deletingTunjangan, setDeletingTunjangan] = useState<MasterTunjangan | null>(null);

  // Edit / Detail State for Potongan
  const [editingPotongan, setEditingPotongan] = useState<MasterPotongan | null>(null);
  const [detailPotongan, setDetailPotongan] = useState<MasterPotongan | null>(null);
  const [deletingPotongan, setDeletingPotongan] = useState<MasterPotongan | null>(null);

  // Form Tunjangan
  const [formTunjangan, setFormTunjangan] = useState({
    nama_tunjangan: "",
    nilai: 0,
    jenis_tunjangan: "NOMINAL",
    kode_kondisi: "UMUM",
    sifat_tunjangan: "BULANAN",
  });

  // Form Potongan
  const [formPotongan, setFormPotongan] = useState({
    nama_potongan: "",
    kode_potongan: "",
    nilai: 0,
    jenis_potongan: "NOMINAL",
    sifat_potongan: "BULANAN",
  });

  const load = () => {
    getTunjanganMaster()
      .then(setTunjangan)
      .catch(() => setTunjangan([]));
    getPotonganMaster()
      .then(setPotongan)
      .catch(() => setPotongan([]));
  };

  useEffect(() => {
    load();
  }, []);

  const renderBesaran = (nilai?: number, jenis?: string) => {
    if (!nilai && nilai !== 0) return "—";
    if (jenis === "PERSEN" || jenis === "PERSENTASE") return `${nilai * 100}%`;
    return formatRupiah(nilai);
  };

  // ================= TUNJANGAN HANDLERS =================
  const handleOpenCreateTunjangan = () => {
    setEditingTunjangan(null);
    setFormTunjangan({
      nama_tunjangan: "",
      nilai: 0,
      jenis_tunjangan: "NOMINAL",
      kode_kondisi: "UMUM",
      sifat_tunjangan: "BULANAN",
    });
    setOpenTunjangan(true);
  };

  const handleOpenEditTunjangan = (item: MasterTunjangan) => {
    setEditingTunjangan(item);
    setFormTunjangan({
      nama_tunjangan: item.nama_tunjangan,
      nilai: item.nilai ?? 0,
      jenis_tunjangan: item.jenis_tunjangan || "NOMINAL",
      kode_kondisi: item.kode_kondisi || "UMUM",
      sifat_tunjangan: item.sifat_tunjangan || "BULANAN",
    });
    setOpenTunjangan(true);
  };

  const handleSaveTunjangan = async () => {
    setLoadingForm(true);
    setMessage("");
    setErrorMsg("");
    try {
      let finalKode = formTunjangan.kode_kondisi;
      if (finalKode === "UMUM" && !editingTunjangan) {
        finalKode = `UMUM_${Math.floor(Math.random() * 10000)}`;
      }

      if (editingTunjangan) {
        await updateTunjanganMaster(editingTunjangan.id_tunjangan, {
          ...formTunjangan,
          kode_kondisi: finalKode,
        });
        setMessage(`Master Tunjangan "${formTunjangan.nama_tunjangan}" berhasil diperbarui.`);
      } else {
        await createTunjanganMaster({
          ...formTunjangan,
          kode_kondisi: finalKode,
        });
        setMessage(`Master Tunjangan "${formTunjangan.nama_tunjangan}" berhasil ditambahkan.`);
      }

      setOpenTunjangan(false);
      load();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          "Gagal menyimpan tunjangan. (Pastikan Kondisi/Kode unik).",
      );
    } finally {
      setLoadingForm(false);
    }
  };

  const handleDeleteTunjangan = async () => {
    if (!deletingTunjangan) return;
    setLoadingForm(true);
    setMessage("");
    setErrorMsg("");
    try {
      await deleteTunjanganMaster(deletingTunjangan.id_tunjangan);
      setMessage(`Master Tunjangan "${deletingTunjangan.nama_tunjangan}" berhasil dihapus.`);
      setDeletingTunjangan(null);
      load();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || "Gagal menghapus master tunjangan.",
      );
    } finally {
      setLoadingForm(false);
    }
  };

  // ================= POTONGAN HANDLERS =================
  const handleOpenCreatePotongan = () => {
    setEditingPotongan(null);
    setFormPotongan({
      nama_potongan: "",
      kode_potongan: "",
      nilai: 0,
      jenis_potongan: "NOMINAL",
      sifat_potongan: "BULANAN",
    });
    setOpenPotongan(true);
  };

  const handleOpenEditPotongan = (item: MasterPotongan) => {
    setEditingPotongan(item);
    setFormPotongan({
      nama_potongan: item.nama_potongan,
      kode_potongan: item.kode_potongan || "",
      nilai: item.nilai ?? 0,
      jenis_potongan: item.jenis_potongan || "NOMINAL",
      sifat_potongan: item.sifat_potongan || "BULANAN",
    });
    setOpenPotongan(true);
  };

  const handleSavePotongan = async () => {
    setLoadingForm(true);
    setMessage("");
    setErrorMsg("");
    try {
      if (editingPotongan) {
        await updatePotonganMaster(editingPotongan.id_master_potongan, formPotongan);
        setMessage(`Master Potongan "${formPotongan.nama_potongan}" berhasil diperbarui.`);
      } else {
        await createPotonganMaster(formPotongan);
        setMessage(`Master Potongan "${formPotongan.nama_potongan}" berhasil ditambahkan.`);
      }

      setOpenPotongan(false);
      load();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || "Gagal menyimpan master potongan.",
      );
    } finally {
      setLoadingForm(false);
    }
  };

  const handleDeletePotongan = async () => {
    if (!deletingPotongan) return;
    setLoadingForm(true);
    setMessage("");
    setErrorMsg("");
    try {
      await deletePotonganMaster(deletingPotongan.id_master_potongan);
      setMessage(`Master Potongan "${deletingPotongan.nama_potongan}" berhasil dihapus.`);
      setDeletingPotongan(null);
      load();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || "Gagal menghapus master potongan.",
      );
    } finally {
      setLoadingForm(false);
    }
  };

  return (
    <PageContainer
      title="Master Komponen Penggajian"
      description="Kelola komponen master tunjangan & potongan — tambah, sesuaikan besaran/formula, lihat detail, atau hapus komponen"
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* TABEL MASTER TUNJANGAN */}
        <Card
          title="Master Tunjangan"
          action={
            <Button size="sm" onClick={handleOpenCreateTunjangan}>
              + Tambah Tunjangan
            </Button>
          }
        >
          <Table>
            <TableHead>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>Nama Tunjangan</TableHeaderCell>
              <TableHeaderCell>Besaran / Jenis</TableHeaderCell>
              <TableHeaderCell>Kondisi</TableHeaderCell>
              <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
            </TableHead>
            <TableBody>
              {tunjangan.map((t) => (
                <TableRow key={t.id_tunjangan}>
                  <TableCell className="text-slate-400 font-mono text-xs">{t.id_tunjangan}</TableCell>
                  <TableCell className="font-semibold text-slate-100">{t.nama_tunjangan}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-indigo-300">
                        {renderBesaran(t.nilai, t.jenis_tunjangan)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {t.sifat_tunjangan || "BULANAN"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate text-xs text-slate-300">
                    {t.kode_kondisi ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setDetailTunjangan(t)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
                        title="Lihat Detail"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => handleOpenEditTunjangan(t)}
                        className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                        title="Edit Komponen"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeletingTunjangan(t)}
                        className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                        title="Hapus Komponen"
                      >
                        🗑️
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* TABEL MASTER POTONGAN */}
        <Card
          title="Master Potongan"
          action={
            <Button size="sm" onClick={handleOpenCreatePotongan}>
              + Tambah Potongan
            </Button>
          }
        >
          <Table>
            <TableHead>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>Nama Potongan</TableHeaderCell>
              <TableHeaderCell>Besaran Default</TableHeaderCell>
              <TableHeaderCell>Kode</TableHeaderCell>
              <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
            </TableHead>
            <TableBody>
              {potongan.map((p) => (
                <TableRow key={p.id_master_potongan}>
                  <TableCell className="text-slate-400 font-mono text-xs">{p.id_master_potongan}</TableCell>
                  <TableCell className="font-semibold text-slate-100">{p.nama_potongan}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-rose-300">
                        {renderBesaran(p.nilai, p.jenis_potongan)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {p.sifat_potongan || "BULANAN"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate text-xs text-slate-300 font-mono">
                    {p.kode_potongan ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setDetailPotongan(p)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
                        title="Lihat Detail"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => handleOpenEditPotongan(p)}
                        className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                        title="Edit Komponen"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeletingPotongan(p)}
                        className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                        title="Hapus Komponen"
                      >
                        🗑️
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* MODAL FORM TUNJANGAN (TAMBAH / EDIT) */}
      <Modal
        isOpen={openTunjangan}
        onClose={() => setOpenTunjangan(false)}
        title={editingTunjangan ? `Edit Tunjangan: ${editingTunjangan.nama_tunjangan}` : "Tambah Tunjangan Baru"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpenTunjangan(false)}>
              Batal
            </Button>
            <Button isLoading={loadingForm} onClick={handleSaveTunjangan}>
              {editingTunjangan ? "Simpan Perubahan" : "Tambah Tunjangan"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nama Tunjangan"
            placeholder="Misal: Tunjangan Makan"
            value={formTunjangan.nama_tunjangan}
            onChange={(e) =>
              setFormTunjangan({ ...formTunjangan, nama_tunjangan: e.target.value })
            }
          />
          <Select
            label="Jenis Nilai"
            value={formTunjangan.jenis_tunjangan}
            onChange={(e) =>
              setFormTunjangan({ ...formTunjangan, jenis_tunjangan: e.target.value })
            }
            options={[
              { label: "Nominal (Rupiah)", value: "NOMINAL" },
              { label: "Persentase (%) dari Gaji Pokok", value: "PERSEN" },
            ]}
          />
          <Input
            label={formTunjangan.jenis_tunjangan === "PERSEN" ? "Nilai Persen (Misal: 0.05 untuk 5%)" : "Nilai / Besaran (Rp)"}
            type="number"
            step={formTunjangan.jenis_tunjangan === "PERSEN" ? "0.01" : "1000"}
            placeholder="50000 atau 0.05"
            value={formTunjangan.nilai || ""}
            onChange={(e) =>
              setFormTunjangan({ ...formTunjangan, nilai: Number(e.target.value) })
            }
          />
          <Select
            label="Kondisi / Formula"
            value={formTunjangan.kode_kondisi}
            onChange={(e) =>
              setFormTunjangan({ ...formTunjangan, kode_kondisi: e.target.value })
            }
            options={[
              { label: "Tanpa Syarat (Umum / Tetap)", value: "UMUM" },
              { label: "Harian Hadir WFO (Transport)", value: "TRN_WFO" },
              { label: "Tunjangan Istri (Jika Kawin)", value: "TUNJ_ISTRI" },
              { label: "Tunjangan Anak (Maks 2 Anak)", value: "TUNJ_ANAK" },
            ]}
          />
          <Select
            label="Sifat Tunjangan"
            value={formTunjangan.sifat_tunjangan}
            onChange={(e) =>
              setFormTunjangan({ ...formTunjangan, sifat_tunjangan: e.target.value })
            }
            options={[
              { label: "BULANAN (Rutin Tiap Periode)", value: "BULANAN" },
              { label: "KONDISIONAL (Sesuai Kehadiran/Syarat)", value: "KONDISIONAL" },
            ]}
          />
        </div>
      </Modal>

      {/* MODAL FORM POTONGAN (TAMBAH / EDIT) */}
      <Modal
        isOpen={openPotongan}
        onClose={() => setOpenPotongan(false)}
        title={editingPotongan ? `Edit Potongan: ${editingPotongan.nama_potongan}` : "Tambah Potongan Baru"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpenPotongan(false)}>
              Batal
            </Button>
            <Button isLoading={loadingForm} onClick={handleSavePotongan}>
              {editingPotongan ? "Simpan Perubahan" : "Tambah Potongan"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nama Potongan"
            placeholder="Misal: Potongan BPJS"
            value={formPotongan.nama_potongan}
            onChange={(e) =>
              setFormPotongan({ ...formPotongan, nama_potongan: e.target.value })
            }
          />
          <Input
            label="Kode Unik Potongan"
            placeholder="POT_BPJS"
            value={formPotongan.kode_potongan}
            onChange={(e) =>
              setFormPotongan({
                ...formPotongan,
                kode_potongan: e.target.value.toUpperCase(),
              })
            }
          />
          <Select
            label="Jenis Nilai Default"
            value={formPotongan.jenis_potongan}
            onChange={(e) =>
              setFormPotongan({ ...formPotongan, jenis_potongan: e.target.value })
            }
            options={[
              { label: "Nominal (Rupiah)", value: "NOMINAL" },
              { label: "Persentase (%) dari Gaji", value: "PERSEN" },
            ]}
          />
          <Input
            label="Nilai Default (Opsional)"
            type="number"
            placeholder="0"
            value={formPotongan.nilai || ""}
            onChange={(e) =>
              setFormPotongan({ ...formPotongan, nilai: Number(e.target.value) })
            }
          />
          <Select
            label="Sifat Potongan"
            value={formPotongan.sifat_potongan}
            onChange={(e) =>
              setFormPotongan({ ...formPotongan, sifat_potongan: e.target.value })
            }
            options={[
              { label: "BULANAN (Rutin Tiap Periode)", value: "BULANAN" },
              { label: "KONDISIONAL (Insidental / Angsuran)", value: "KONDISIONAL" },
            ]}
          />
        </div>
      </Modal>

      {/* MODAL DETAIL TUNJANGAN */}
      <Modal
        isOpen={!!detailTunjangan}
        onClose={() => setDetailTunjangan(null)}
        title={`Detail Master Tunjangan: ${detailTunjangan?.nama_tunjangan ?? ""}`}
        footer={
          <Button onClick={() => setDetailTunjangan(null)}>Tutup</Button>
        }
      >
        {detailTunjangan && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">ID Komponen:</span>
              <span className="font-mono text-slate-200">#{detailTunjangan.id_tunjangan}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Nama Tunjangan:</span>
              <span className="font-semibold text-slate-100">{detailTunjangan.nama_tunjangan}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Besaran / Nilai:</span>
              <span className="font-semibold text-indigo-300">
                {renderBesaran(detailTunjangan.nilai, detailTunjangan.jenis_tunjangan)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Jenis Nilai:</span>
              <span className="text-slate-200">{detailTunjangan.jenis_tunjangan || "NOMINAL"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Kode / Kondisi:</span>
              <span className="font-mono text-slate-200">{detailTunjangan.kode_kondisi || "—"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Sifat Tunjangan:</span>
              <span className="text-slate-200">{detailTunjangan.sifat_tunjangan || "BULANAN"}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL DETAIL POTONGAN */}
      <Modal
        isOpen={!!detailPotongan}
        onClose={() => setDetailPotongan(null)}
        title={`Detail Master Potongan: ${detailPotongan?.nama_potongan ?? ""}`}
        footer={
          <Button onClick={() => setDetailPotongan(null)}>Tutup</Button>
        }
      >
        {detailPotongan && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">ID Komponen:</span>
              <span className="font-mono text-slate-200">#{detailPotongan.id_master_potongan}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Nama Potongan:</span>
              <span className="font-semibold text-slate-100">{detailPotongan.nama_potongan}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Kode Unik:</span>
              <span className="font-mono text-slate-200">{detailPotongan.kode_potongan}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Besaran Default:</span>
              <span className="font-semibold text-rose-300">
                {renderBesaran(detailPotongan.nilai, detailPotongan.jenis_potongan)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Sifat Potongan:</span>
              <span className="text-slate-200">{detailPotongan.sifat_potongan || "BULANAN"}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL KONFIRMASI HAPUS TUNJANGAN */}
      <Modal
        isOpen={!!deletingTunjangan}
        onClose={() => setDeletingTunjangan(null)}
        title="Konfirmasi Hapus Tunjangan"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingTunjangan(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              isLoading={loadingForm}
              onClick={handleDeleteTunjangan}
            >
              Hapus Sekarang
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Apakah Anda yakin ingin menghapus master tunjangan{" "}
          <strong>&quot;{deletingTunjangan?.nama_tunjangan}&quot;</strong>?
        </p>
      </Modal>

      {/* MODAL KONFIRMASI HAPUS POTONGAN */}
      <Modal
        isOpen={!!deletingPotongan}
        onClose={() => setDeletingPotongan(null)}
        title="Konfirmasi Hapus Potongan"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingPotongan(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              isLoading={loadingForm}
              onClick={handleDeletePotongan}
            >
              Hapus Sekarang
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Apakah Anda yakin ingin menghapus master potongan{" "}
          <strong>&quot;{deletingPotongan?.nama_potongan}&quot;</strong>?
        </p>
      </Modal>
    </PageContainer>
  );
}
