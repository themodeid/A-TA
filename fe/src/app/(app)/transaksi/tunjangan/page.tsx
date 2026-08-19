"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePeriode } from "@/hooks/usePeriodeContext";
import {
  getTunjanganByPeriode,
  initTunjanganPeriode,
  saveTunjanganBulk,
} from "@/features/tunjangan/api/tunjangan.api";
import { TunjanganBulanan } from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UploadSuccessToast } from "@/components/ui/UploadSuccessToast";
import { isPeriodeLocked } from "@/lib/permissions";
import { formatRupiah } from "@/lib/format";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";

function parseNumberValue(raw: string): number {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function normalizeRow(row: TunjanganBulanan): TunjanganBulanan {
  return {
    ...row,
    total_jam_lebih: Number(row.total_jam_lebih ?? 0),
    honor_bulan: Number(row.honor_bulan ?? 0),
  };
}

export default function TunjanganPage() {
  const { selectedPeriodeId, selectedPeriode } = usePeriode();

  const [rows, setRows] = useState<TunjanganBulanan[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const locked = selectedPeriode
    ? isPeriodeLocked(selectedPeriode.status)
    : false;

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

    getTunjanganByPeriode(selectedPeriodeId)
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
              "Gagal memuat data tunjangan.",
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

  const totalHonor = rows.reduce((s, r) => s + Number(r.honor_bulan ?? 0), 0);

  const updateCell = (
    idx: number,
    field: keyof Pick<TunjanganBulanan, "total_jam_lebih" | "honor_bulan">,
    value: number,
  ) => {
    setErrorMsg(null);
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );
  };

  const handleSave = async () => {
    if (!selectedPeriodeId || rows.length === 0) return;

    setSaving(true);
    setErrorMsg(null);
    dismissSuccess();

    try {
      const response = await saveTunjanganBulk(
        selectedPeriodeId,
        rows.map((r) => ({
          id_pegawai: r.id_pegawai,
          total_jam_lebih: Number(r.total_jam_lebih ?? 0),
          honor_bulan: Number(r.honor_bulan ?? 0),
        })),
      );

      const message =
        typeof response === "string"
          ? response
          : "Data tunjangan berhasil disimpan!";

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
          "Gagal menyimpan data tunjangan.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleInit = async () => {
    if (!selectedPeriodeId) return;

    setErrorMsg(null);
    dismissSuccess();

    try {
      await initTunjanganPeriode(selectedPeriodeId);
      showSuccess("Data tunjangan berhasil diinisialisasi!");
      load();
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };

      setErrorMsg(
        apiErr.response?.data?.message ||
          apiErr.message ||
          "Gagal menginisialisasi data.",
      );
    }
  };

  return (
    <PageContainer
      title="Transaksi Tunjangan"
      description="Input jam lembur & honor manual"
      action={
        <div className="flex gap-2">
          {!locked && rows.length === 0 && (
            <Button variant="outline" onClick={handleInit}>
              Inisialisasi Data
            </Button>
          )}

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
          Periode terkunci — input tunjangan dalam mode read-only.
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="mb-4 rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-800 border border-indigo-100">
        Total Honor Bulan: <strong>{formatRupiah(totalHonor)}</strong>
      </div>

      <Card title={`Tunjangan — ${selectedPeriode?.bulan_gaji ?? ""}`}>
        {loading ? (
          <p className="text-slate-500">Memuat...</p>
        ) : rows.length === 0 ? (
          <p className="text-slate-500">
            Belum ada data tunjangan. Klik &quot;Inisialisasi Data&quot; untuk
            memulai.
          </p>
        ) : (
          <Table>
            <TableHead>
              <TableHeaderCell>Nama</TableHeaderCell>
              <TableHeaderCell>Jam Lembur</TableHeaderCell>
              <TableHeaderCell>Honor Bulan</TableHeaderCell>
            </TableHead>

            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={row.id_pegawai}>
                  <TableCell className="max-w-[180px] truncate">
                    {row.nama_dan_tanggal_lahir}
                  </TableCell>

                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      disabled={locked}
                      value={row.total_jam_lebih ?? 0}
                      onChange={(e) =>
                        updateCell(
                          idx,
                          "total_jam_lebih",
                          parseNumberValue(e.target.value),
                        )
                      }
                      className="w-24"
                    />
                  </TableCell>

                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      disabled={locked}
                      value={row.honor_bulan ?? 0}
                      onChange={(e) =>
                        updateCell(
                          idx,
                          "honor_bulan",
                          parseNumberValue(e.target.value),
                        )
                      }
                      className="w-32"
                    />
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
