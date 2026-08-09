"use client";

import { useEffect, useState } from "react";
import {
  getAllPegawai,
  deletePegawai,
} from "@/features/master/api/master.api";
import { Pegawai } from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/format";
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
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(p.id_pegawai)}
                    >
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </PageContainer>
  );
}
