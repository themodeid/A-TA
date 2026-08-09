"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";

/** Placeholder — endpoint audit koreksi jam belum tersedia di backend */
const MOCK_KOREKSI = [
  {
    id_koreksi: 1,
    nama_pegawai: "Siti Aminah S.Pd",
    jam_koreksi: 2.0,
    jenis_koreksi: "ADD",
    keterangan: "Lembur kegiatan rapat OSIS",
    created_at: "2026-08-05",
  },
];

export default function AuditKoreksiJamPage() {
  return (
    <PageContainer
      title="Audit Koreksi Jam"
      description="Histori & log koreksi jam mengajar/lembur (tb_koreksi_jam)"
    >
      <Card title="Log Koreksi Jam">
        <Table>
          <TableHead>
            <TableHeaderCell>Tanggal</TableHeaderCell>
            <TableHeaderCell>Pegawai</TableHeaderCell>
            <TableHeaderCell>Jam</TableHeaderCell>
            <TableHeaderCell>Jenis</TableHeaderCell>
            <TableHeaderCell>Keterangan</TableHeaderCell>
          </TableHead>
          <TableBody>
            {MOCK_KOREKSI.map((k) => (
              <TableRow key={k.id_koreksi}>
                <TableCell>{k.created_at}</TableCell>
                <TableCell>{k.nama_pegawai}</TableCell>
                <TableCell>{k.jam_koreksi}</TableCell>
                <TableCell>{k.jenis_koreksi}</TableCell>
                <TableCell>{k.keterangan}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-4 text-xs text-slate-400">
          Data akan terhubung ke API audit saat endpoint backend tersedia.
        </p>
      </Card>
    </PageContainer>
  );
}
