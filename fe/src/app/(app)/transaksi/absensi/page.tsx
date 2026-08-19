"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { usePeriode } from "@/hooks/usePeriodeContext";
import {
  getAbsensiByPeriode,
  saveAbsensiBulk,
} from "@/features/absensi/api/absensi.api";
import { AbsensiSummary } from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UploadSuccessToast } from "@/components/ui/UploadSuccessToast";
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

const ABSENSI_FIELDS = [
  { key: "total_hadir_ops_wfo" as const, label: "Hadir WFO" },
  { key: "total_hadir_ops_wfh" as const, label: "Hadir WFH" },
  { key: "total_izin" as const, label: "Izin" },
  { key: "total_sakit" as const, label: "Sakit" },
  { key: "total_alpha" as const, label: "Alpha" },
];

function parseAbsensiValue(raw: string): number {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function normalizeRow(row: AbsensiSummary): AbsensiSummary {
  return {
    ...row,
    total_hadir_ops_wfo: Number(row.total_hadir_ops_wfo ?? 0),
    total_hadir_ops_wfh: Number(row.total_hadir_ops_wfh ?? 0),
    total_izin: Number(row.total_izin ?? 0),
    total_sakit: Number(row.total_sakit ?? 0),
    total_alpha: Number(row.total_alpha ?? 0),
  };
}

function rowTotalDays(row: AbsensiSummary): number {
  return ABSENSI_FIELDS.reduce((s, f) => s + Number(row[f.key] ?? 0), 0);
}

export default function AbsensiPage() {
  const { selectedPeriodeId, selectedPeriode } = usePeriode();

  const [rows, setRows] = useState<AbsensiSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const locked = selectedPeriode
    ? isPeriodeLocked(selectedPeriode.status)
    : false;

  const maxDaysInPeriode = useMemo(() => {
    if (!selectedPeriode?.tanggal_awal || !selectedPeriode?.tanggal_akhir) {
      return 31;
    }
    const start = new Date(selectedPeriode.tanggal_awal);
    const end = new Date(selectedPeriode.tanggal_akhir);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [selectedPeriode]);

  const dismissSuccess = useCallback(() => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setSuccessMsg(null);
  }, []);

  const showSuccess = useCallback(
    (message: string) => {
      dismissSuccess();
      setSuccessMsg(message);
      successTimerRef.current = setTimeout(() => {
        setSuccessMsg(null);
        successTimerRef.current = null;
      }, 4000);
    },
    [dismissSuccess],
  );

  const load = useCallback(() => {
    if (!selectedPeriodeId) return;

    setLoading(true);
    setErrorMsg(null);

    getAbsensiByPeriode(selectedPeriodeId)
      .then((data) => setRows(data.map(normalizeRow)))
      .catch(
        (err: {
          response?: { data?: { message?: string } };
          message?: string;
        }) => {
          setRows([]);
          setErrorMsg(
            err.response?.data?.message ||
              err.message ||
              "Gagal memuat data absensi.",
          );
        },
      )
      .finally(() => setLoading(false));
  }, [selectedPeriodeId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const updateCell = (
    idx: number,
    field: (typeof ABSENSI_FIELDS)[number]["key"],
    value: number,
  ) => {
    setErrorMsg(null);

    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;

        const tempUpdatedRow = { ...r, [field]: value };
        const total = rowTotalDays(tempUpdatedRow);

        if (total > maxDaysInPeriode) {
          setErrorMsg(
            `Total absensi untuk ${r.nama_dan_tanggal_lahir || "pegawai"} tidak boleh melebihi ${maxDaysInPeriode} hari.`,
          );
          return r;
        }

        return tempUpdatedRow;
      }),
    );
  };

  const handleSave = async () => {
    if (!selectedPeriodeId || rows.length === 0) return;

    const invalidRow = rows.find((r) => rowTotalDays(r) > maxDaysInPeriode);
    if (invalidRow) {
      setErrorMsg(
        `Gagal menyimpan: Ada total hari pegawai yang melebihi ${maxDaysInPeriode} hari.`,
      );
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    dismissSuccess();

    try {
      const response = await saveAbsensiBulk(selectedPeriodeId, rows);
      const message =
        typeof response === "string"
          ? response
          : "Data absensi berhasil disimpan!";

      showSuccess(message);
      load();
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };

      setErrorMsg(
        apiErr.response?.data?.message ||
          apiErr.message ||
          "Gagal menyimpan data absensi.",
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
        <div className="flex gap-2">
          {!locked && rows.length > 0 && (
            <Button onClick={handleSave} isLoading={saving}>
              Simpan Bulk
            </Button>
          )}
        </div>
      }
    >
      <UploadSuccessToast
        show={!!successMsg}
        message={successMsg ?? ""}
        onDismiss={dismissSuccess}
      />

      {locked && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Periode terkunci — input absensi dalam mode read-only.
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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

              {ABSENSI_FIELDS.map((f) => (
                <TableHeaderCell key={f.key}>{f.label}</TableHeaderCell>
              ))}

              <TableHeaderCell>Total Hari</TableHeaderCell>
            </TableHead>

            <TableBody>
              {rows.map((row, idx) => {
                const total = rowTotalDays(row);

                return (
                  <TableRow key={row.id_pegawai}>
                    <TableCell className="max-w-[180px] truncate">
                      {row.nama_dan_tanggal_lahir}
                    </TableCell>

                    {ABSENSI_FIELDS.map((f) => (
                      <TableCell key={f.key}>
                        <Input
                          type="number"
                          min={0}
                          max={maxDaysInPeriode}
                          disabled={locked}
                          value={row[f.key] ?? 0}
                          onChange={(e) =>
                            updateCell(
                              idx,
                              f.key,
                              parseAbsensiValue(e.target.value),
                            )
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
