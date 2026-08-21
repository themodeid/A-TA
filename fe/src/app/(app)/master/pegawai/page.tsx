"use client";

import { useEffect, useState } from "react";
import {
  getAllPegawai,
  deletePegawai,
  getPegawaiById,
} from "@/features/master/api/master.api";
import { Pegawai } from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";

export default function MasterPegawaiPage() {
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Detail State
  const [selectedPegawai, setSelectedPegawai] = useState<Pegawai | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = () => {
    setLoading(true);
    getAllPegawai()
      .then(setPegawai)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus pegawai ini?")) return;
    await deletePegawai(id);
    load();
  };

  const openDetail = async (id: number) => {
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

  const closeDetail = () => {
    setIsDetailOpen(false);
    setTimeout(() => setSelectedPegawai(null), 200);
  };

  return (
    <PageContainer
      title="Master Pegawai"
      description="CRUD data pegawai, jabatan, golongan, status perkawinan"
      action={<Button>+ Tambah Pegawai</Button>}
    >
      <Card>
        {loading ? (
          <p className="text-slate-500">Memuat...</p>
        ) : (
          <Table>
            <TableHead>
              <TableHeaderCell>Nama</TableHeaderCell>
              <TableHeaderCell>Jabatan</TableHeaderCell>
              <TableHeaderCell>Golongan</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Gaji Pokok</TableHeaderCell>
              <TableHeaderCell>Aksi</TableHeaderCell>
            </TableHead>
            <TableBody>
              {pegawai.map((p) => (
                <TableRow key={p.id_pegawai}>
                  <TableCell>{p.nama_dan_tanggal_lahir}</TableCell>
                  <TableCell>{p.nama_jabatan}</TableCell>
                  <TableCell>{p.nama_golongan}</TableCell>
                  <TableCell>{p.status_perkawinan}</TableCell>
                  <TableCell>{formatRupiah(p.gaji_pokok_dasar)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openDetail(p.id_pegawai)}
                      >
                        Detail
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(p.id_pegawai)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal
        isOpen={isDetailOpen}
        onClose={closeDetail}
        title="Detail Pegawai"
        size="md"
        footer={
          <Button variant="secondary" onClick={closeDetail}>
            Tutup
          </Button>
        }
      >
        {detailLoading ? (
          <p className="text-slate-400">Memuat detail...</p>
        ) : selectedPegawai ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 border-b border-slate-800 pb-2">
              <span className="text-slate-400">ID Pegawai</span>
              <span className="col-span-2 font-medium text-slate-200">
                {selectedPegawai.id_pegawai}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-800 pb-2">
              <span className="text-slate-400">Nama Lengkap & TTL</span>
              <span className="col-span-2 font-medium text-slate-200">
                {selectedPegawai.nama_dan_tanggal_lahir}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-800 pb-2">
              <span className="text-slate-400">Jabatan</span>
              <span className="col-span-2 font-medium text-slate-200">
                {selectedPegawai.nama_jabatan || "—"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-800 pb-2">
              <span className="text-slate-400">Golongan</span>
              <span className="col-span-2 font-medium text-slate-200">
                {selectedPegawai.nama_golongan || "—"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-800 pb-2">
              <span className="text-slate-400">Status Kawin</span>
              <span className="col-span-2 font-medium text-slate-200">
                {selectedPegawai.status_perkawinan || "—"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-800 pb-2">
              <span className="text-slate-400">Jumlah Anak</span>
              <span className="col-span-2 font-medium text-slate-200">
                {selectedPegawai.jumlah_anak ?? 0}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400">Gaji Pokok Dasar</span>
              <span className="col-span-2 font-medium text-slate-200">
                {formatRupiah(selectedPegawai.gaji_pokok_dasar)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-red-400">Pegawai tidak ditemukan.</p>
        )}
      </Modal>
    </PageContainer>
  );
}
