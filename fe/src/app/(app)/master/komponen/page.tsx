"use client";

import { useEffect, useState } from "react";
import {
  getTunjanganMaster,
  getPotonganMaster,
  createTunjanganMaster,
  createPotonganMaster,
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
  
  // Form Tunjangan
  const [formTunjangan, setFormTunjangan] = useState({
    nama_tunjangan: "",
    nilai: 0,
    jenis_tunjangan: "NOMINAL",
    kode_kondisi: "UMUM",
  });

  // Form Potongan
  const [formPotongan, setFormPotongan] = useState({
    nama_potongan: "",
    kode_potongan: "",
    nilai: 0,
    jenis_potongan: "NOMINAL",
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
    if (jenis === "PERSEN") return `${nilai}%`;
    return formatRupiah(nilai);
  };

  const handleCreateTunjangan = async () => {
    setLoadingForm(true);
    try {
      // Pastikan kode_kondisi unik jika UMUM
      let finalKode = formTunjangan.kode_kondisi;
      if (finalKode === "UMUM") {
        finalKode = `UMUM_${Math.floor(Math.random() * 10000)}`;
      }

      await createTunjanganMaster({ ...formTunjangan, kode_kondisi: finalKode });
      setOpenTunjangan(false);
      setFormTunjangan({ nama_tunjangan: "", nilai: 0, jenis_tunjangan: "NOMINAL", kode_kondisi: "UMUM" });
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal menyimpan tunjangan baru. (Pastikan Kondisi/Kode unik).");
    } finally {
      setLoadingForm(false);
    }
  };

  const handleCreatePotongan = async () => {
    setLoadingForm(true);
    try {
      await createPotonganMaster(formPotongan);
      setOpenPotongan(false);
      setFormPotongan({ nama_potongan: "", kode_potongan: "", nilai: 0, jenis_potongan: "NOMINAL" });
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal menyimpan potongan baru.");
    } finally {
      setLoadingForm(false);
    }
  };

  return (
    <PageContainer
      title="Master Komponen"
      description="Kelola formula/master tunjangan & potongan"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card 
          title="Master Tunjangan" 
          action={<Button size="sm" onClick={() => setOpenTunjangan(true)}>+ Tambah</Button>}
        >
          <Table>
            <TableHead>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>Nama Tunjangan</TableHeaderCell>
              <TableHeaderCell>Besaran / Jenis</TableHeaderCell>
              <TableHeaderCell>Kondisi</TableHeaderCell>
            </TableHead>
            <TableBody>
              {tunjangan.map((t) => (
                <TableRow key={t.id_tunjangan}>
                  <TableCell>{t.id_tunjangan}</TableCell>
                  <TableCell>{t.nama_tunjangan}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-200">
                        {renderBesaran(t.nilai, t.jenis_tunjangan)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {t.sifat_tunjangan}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {t.kode_kondisi ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card 
          title="Master Potongan"
          action={<Button size="sm" onClick={() => setOpenPotongan(true)}>+ Tambah</Button>}
        >
          <Table>
            <TableHead>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>Nama Potongan</TableHeaderCell>
              <TableHeaderCell>Besaran / Jenis</TableHeaderCell>
              <TableHeaderCell>Kode</TableHeaderCell>
            </TableHead>
            <TableBody>
              {potongan.map((p) => (
                <TableRow key={p.id_master_potongan}>
                  <TableCell>{p.id_master_potongan}</TableCell>
                  <TableCell>{p.nama_potongan}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-200">
                        {renderBesaran(p.nilai, p.jenis_potongan)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {p.sifat_potongan}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {p.kode_potongan ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Modal Tambah Tunjangan */}
      <Modal
        isOpen={openTunjangan}
        onClose={() => setOpenTunjangan(false)}
        title="Tambah Tunjangan Baru"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpenTunjangan(false)}>Batal</Button>
            <Button isLoading={loadingForm} onClick={handleCreateTunjangan}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input 
            label="Nama Tunjangan" 
            placeholder="Tunjangan Makan"
            value={formTunjangan.nama_tunjangan}
            onChange={(e) => setFormTunjangan({...formTunjangan, nama_tunjangan: e.target.value})}
          />
          <Select 
            label="Jenis Nilai" 
            value={formTunjangan.jenis_tunjangan}
            onChange={(e) => setFormTunjangan({...formTunjangan, jenis_tunjangan: e.target.value})}
            options={[
              { label: "Nominal (Rupiah)", value: "NOMINAL" },
              { label: "Persentase (%) dari Gaji", value: "PERSEN" },
            ]}
          />
          <Input 
            label="Nilai / Besaran" 
            type="number"
            placeholder="50000 atau 10"
            value={formTunjangan.nilai || ""}
            onChange={(e) => setFormTunjangan({...formTunjangan, nilai: Number(e.target.value)})}
          />
          <Select 
            label="Kondisi Khusus" 
            value={formTunjangan.kode_kondisi}
            onChange={(e) => setFormTunjangan({...formTunjangan, kode_kondisi: e.target.value})}
            options={[
              { label: "Tanpa Syarat (Umum)", value: "UMUM" },
              { label: "Hanya Jika Masuk (WFO)", value: "TRN_WFO" },
              { label: "Hanya Jika Punya Istri", value: "TUNJ_ISTRI" },
              { label: "Dikali Jumlah Anak", value: "TUNJ_ANAK" },
            ]}
          />
        </div>
      </Modal>

      {/* Modal Tambah Potongan */}
      <Modal
        isOpen={openPotongan}
        onClose={() => setOpenPotongan(false)}
        title="Tambah Potongan Baru"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpenPotongan(false)}>Batal</Button>
            <Button isLoading={loadingForm} onClick={handleCreatePotongan}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input 
            label="Nama Potongan" 
            placeholder="Potongan BPJS"
            value={formPotongan.nama_potongan}
            onChange={(e) => setFormPotongan({...formPotongan, nama_potongan: e.target.value})}
          />
          <Input 
            label="Kode Unik Potongan" 
            placeholder="POT_BPJS"
            value={formPotongan.kode_potongan}
            onChange={(e) => setFormPotongan({...formPotongan, kode_potongan: e.target.value.toUpperCase()})}
          />
          <Select 
            label="Jenis Nilai Default" 
            value={formPotongan.jenis_potongan}
            onChange={(e) => setFormPotongan({...formPotongan, jenis_potongan: e.target.value})}
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
            onChange={(e) => setFormPotongan({...formPotongan, nilai: Number(e.target.value)})}
          />
          <div className="text-xs text-slate-400 mt-2">
            Catatan: Nilai potongan ini nantinya tetap dapat diisi manual pada form Transaksi per-pegawai.
          </div>
        </div>
      </Modal>

    </PageContainer>
  );
}
