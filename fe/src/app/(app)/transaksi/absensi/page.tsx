"use client";

import { useEffect, useState } from "react";
import { usePeriode } from "@/hooks/usePeriodeContext";
import {
  getAbsensiByPeriode,
  saveAbsensiBulk,
} from "@/features/absensi/api/absensi.api";
import { AbsensiSummary } from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { isPeriodeLocked } from "@/lib/permissions";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";

export default function AbsensiPage() {
  const { selectedPeriodeId, selectedPeriode } = usePeriode();
  const [rows, setRows] = useState<AbsensiSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const locked = selectedPeriode
    ? isPeriodeLocked(selectedPeriode.status)
    : false;

  useEffect(() => {
    if (!selectedPeriodeId) return;
    setLoading(true);
    getAbsensiByPeriode(selectedPeriodeId)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [selectedPeriodeId]);

  const updateRow = (
    idx: number,
    field: keyof AbsensiSummary,
    value: number,
  ) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );
  };

  const handleSave = async () => {
    if (!selectedPeriodeId) return;
    setSaving(true);
    try {
      await saveAbsensiBulk(selectedPeriodeId, rows);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title="Transaksi Absensi"
      description="Input & rekap absensi pegawai per periode"
      action={
        !locked && (
          <Button onClick={handleSave} isLoading={saving}>
            Simpan Bulk
          </Button>
        )
      }
    >
      {locked && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Periode terkunci — input absensi dalam mode read-only.
        </div>
      )}

      <Card title={`Absensi — ${selectedPeriode?.bulan_gaji ?? ""}`}>
        {loading ? (
          <p className="text-slate-500">Memuat data...</p>
        ) : rows.length === 0 ? (
          <p className="text-slate-500">Belum ada data absensi.</p>
        ) : (
          <Table>
            <TableHead>
              <TableHeaderCell>Nama Pegawai</TableHeaderCell>
              <TableHeaderCell>Hadir WFO</TableHeaderCell>
              <TableHeaderCell>Hadir WFH</TableHeaderCell>
              <TableHeaderCell>Izin</TableHeaderCell>
              <TableHeaderCell>Sakit</TableHeaderCell>
              <TableHeaderCell>Alpha</TableHeaderCell>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={row.id_pegawai}>
                  <TableCell>{row.nama_dan_tanggal_lahir}</TableCell>
                  {(
                    [
                      "total_hadir_ops_wfo",
                      "total_hadir_ops_wfh",
                      "total_izin",
                      "total_sakit",
                      "total_alpha",
                    ] as const
                  ).map((field) => (
                    <TableCell key={field}>
                      <Input
                        type="number"
                        min={0}
                        disabled={locked}
                        value={row[field]}
                        onChange={(e) =>
                          updateRow(idx, field, Number(e.target.value))
                        }
                        className="w-20"
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </PageContainer>
  );
}
