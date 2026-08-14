"use client";

import { useEffect, useState, useMemo } from "react";
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const locked = selectedPeriode
    ? isPeriodeLocked(selectedPeriode.status)
    : false;

  // Hitung jumlah hari maksimal dalam periode terpilih
  const maxDaysInPeriode = useMemo(() => {
    if (!selectedPeriode?.tanggal_awal || !selectedPeriode?.tanggal_akhir) {
      return 31; // fallback default
    }
    const start = new Date(selectedPeriode.tanggal_awal);
    const end = new Date(selectedPeriode.tanggal_akhir);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [selectedPeriode]);

  useEffect(() => {
    if (!selectedPeriodeId) return;
    setLoading(true);
    setErrorMsg(null);
    getAbsensiByPeriode(selectedPeriodeId)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [selectedPeriodeId]);

  // Helper hitung total akumulasi hari per pegawai
  const getTotalDays = (row: AbsensiSummary) => {
    return (
      Number(row.total_hadir_ops_wfo || 0) +
      Number(row.total_hadir_ops_wfh || 0) +
      Number(row.total_izin || 0) +
      Number(row.total_sakit || 0) +
      Number(row.total_alpha || 0)
    );
  };

  const updateRow = (
    idx: number,
    field: keyof AbsensiSummary,
    value: number,
  ) => {
    setErrorMsg(null);
    const numValue = Math.max(0, value); // Cegah nilai minus

    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;

        const tempUpdatedRow = { ...r, [field]: numValue };
        const total = getTotalDays(tempUpdatedRow);

        // Validasi: Cegah jika total melampaui jumlah hari periode
        if (total > maxDaysInPeriode) {
          setErrorMsg(
            `Total absensi untuk ${r.nama_dan_tanggal_lahir || "pegawai"} tidak boleh melebihi ${maxDaysInPeriode} hari.`,
          );
          return r; // Abaikan perubahan
        }

        return tempUpdatedRow;
      }),
    );
  };

  const handleSave = async () => {
    if (!selectedPeriodeId) return;

    // Double check sebelum kirim payload
    const invalidRow = rows.find((r) => getTotalDays(r) > maxDaysInPeriode);
    if (invalidRow) {
      setErrorMsg(
        `Gagal menyimpan: Ada total hari pegawai yang melebihi ${maxDaysInPeriode} hari.`,
      );
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await saveAbsensiBulk(selectedPeriodeId, rows);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || err.message || "Gagal menyimpan data.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title="Transaksi Absensi"
      description={`Input & rekap absensi pegawai per periode (Maksimal: ${maxDaysInPeriode} hari)`}
      action={
        !locked && (
          <Button onClick={handleSave} isLoading={saving}>
            Simpan Bulk
          </Button>
        )
      }
    >
      {locked && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Periode terkunci — input absensi dalam mode read-only.
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
          {errorMsg}
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
              <TableHeaderCell>Total Hari</TableHeaderCell>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => {
                const total = getTotalDays(row);

                return (
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
                          max={maxDaysInPeriode}
                          disabled={locked}
                          value={row[field] ?? 0}
                          onChange={(e) =>
                            updateRow(idx, field, Number(e.target.value))
                          }
                          className="w-20"
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <span className="font-semibold text-slate-700">
                        {total} / {maxDaysInPeriode} Hari
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </PageContainer>
  );
}
