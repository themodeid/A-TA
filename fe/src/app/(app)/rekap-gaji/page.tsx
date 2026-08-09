"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePeriode } from "@/hooks/usePeriodeContext";
import {
  getRekapByPeriode,
  processPayroll,
  exportRekapCsv,
} from "@/features/rekap/api/rekap.api";
import { RekapGaji } from "@/types";
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

export default function RekapGajiPage() {
  const { selectedPeriodeId, selectedPeriode, refreshPeriodeList } =
    usePeriode();
  const [rekap, setRekap] = useState<RekapGaji[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const load = () => {
    if (!selectedPeriodeId) return;
    setLoading(true);
    getRekapByPeriode(selectedPeriodeId)
      .then(setRekap)
      .catch(() => setRekap([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [selectedPeriodeId]);

  const handleProcess = async () => {
    if (!selectedPeriodeId) return;
    setProcessing(true);
    try {
      await processPayroll(selectedPeriodeId);
      await refreshPeriodeList();
      load();
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = () => {
    exportRekapCsv(
      rekap,
      `rekap-gaji-${selectedPeriode?.bulan_gaji ?? "export"}.csv`,
    );
  };

  return (
    <PageContainer
      title="Rekap Gaji"
      description="Kalkulasi massal, tabel rekapitulasi & detail slip"
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={rekap.length === 0}>
            Export CSV
          </Button>
          <Button onClick={handleProcess} isLoading={processing}>
            Proses & Lock Rekap Gaji
          </Button>
        </div>
      }
    >
      <Card title={`Rekap — ${selectedPeriode?.bulan_gaji ?? ""}`}>
        {loading ? (
          <p className="text-slate-500">Memuat...</p>
        ) : rekap.length === 0 ? (
          <p className="text-slate-500">
            Belum ada rekap. Klik &quot;Proses & Lock Rekap Gaji&quot; untuk
            menghitung.
          </p>
        ) : (
          <Table>
            <TableHead>
              <TableHeaderCell>Nama</TableHeaderCell>
              <TableHeaderCell>Jabatan</TableHeaderCell>
              <TableHeaderCell>Golongan</TableHeaderCell>
              <TableHeaderCell>Gaji Pokok</TableHeaderCell>
              <TableHeaderCell>Total Bruto</TableHeaderCell>
              <TableHeaderCell>Total Potongan</TableHeaderCell>
              <TableHeaderCell>Netto</TableHeaderCell>
              <TableHeaderCell>Aksi</TableHeaderCell>
            </TableHead>
            <TableBody>
              {rekap.map((r) => (
                <TableRow key={r.id_rekap}>
                  <TableCell>{r.nama_dan_tanggal_lahir}</TableCell>
                  <TableCell>{r.jabatan_snapshot}</TableCell>
                  <TableCell>{r.golongan_snapshot}</TableCell>
                  <TableCell>{formatRupiah(r.gaji_pokok_snapshot)}</TableCell>
                  <TableCell>{formatRupiah(r.total_penerimaan_clean)}</TableCell>
                  <TableCell>{formatRupiah(r.total_potongan_clean)}</TableCell>
                  <TableCell className="font-semibold">
                    {formatRupiah(r.netto_clean)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/rekap-gaji/slip/${r.id_rekap}`}>
                      <Button variant="ghost" size="sm">
                        Slip
                      </Button>
                    </Link>
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
