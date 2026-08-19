"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { usePeriode } from "@/hooks/usePeriodeContext";

import {
  getPotonganByPeriode,
  initPotonganPeriode,
  savePotonganBulk,
} from "@/features/potongan/api/potongan.api";

import { PotonganBulanan } from "@/types";

import { PageContainer } from "@/components/layout/PageContainer";

import { Card } from "@/components/ui/Card";

import { Button } from "@/components/ui/Button";

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

import { Input } from "@/components/ui/Input";

const POTONGAN_FIELDS = [
  { key: "potongan_angsuran" as const, label: "Angsuran" },

  { key: "potongan_dana_wajib" as const, label: "Dana Wajib" },

  { key: "potongan_s_pskd" as const, label: "S/PSKD" },

  { key: "potongan_pelkes" as const, label: "Pelkes" },

  { key: "potongan_lainnya" as const, label: "Lainnya" },
];

function parsePotonganValue(raw: string): number {
  const n = parseFloat(raw);

  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function normalizeRow(row: PotonganBulanan): PotonganBulanan {
  return {
    ...row,

    potongan_angsuran: Number(row.potongan_angsuran ?? 0),

    potongan_dana_wajib: Number(row.potongan_dana_wajib ?? 0),

    potongan_s_pskd: Number(row.potongan_s_pskd ?? 0),

    potongan_pelkes: Number(row.potongan_pelkes ?? 0),

    potongan_lainnya: Number(row.potongan_lainnya ?? 0),
  };
}

function rowTotal(row: PotonganBulanan): number {
  return POTONGAN_FIELDS.reduce(
    (s, f) => s + Number(row[f.key] ?? 0),

    0,
  );
}

export default function PotonganPage() {
  const { selectedPeriodeId, selectedPeriode } = usePeriode();

  const [rows, setRows] = useState<PotonganBulanan[]>([]);

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

    getPotonganByPeriode(selectedPeriodeId)
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
              "Gagal memuat data potongan.",
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

  const grandTotal = rows.reduce((s, r) => s + rowTotal(r), 0);

  const updateCell = (
    idx: number,

    field: (typeof POTONGAN_FIELDS)[number]["key"],

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
      const message = await savePotonganBulk(
        selectedPeriodeId,

        rows.map((r) => ({
          id_pegawai: r.id_pegawai,

          potongan_angsuran: Number(r.potongan_angsuran ?? 0),

          potongan_dana_wajib: Number(r.potongan_dana_wajib ?? 0),

          potongan_s_pskd: Number(r.potongan_s_pskd ?? 0),

          potongan_pelkes: Number(r.potongan_pelkes ?? 0),

          potongan_lainnya: Number(r.potongan_lainnya ?? 0),
        })),
      );

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
          "Gagal menyimpan data potongan.",
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
      await initPotonganPeriode(selectedPeriodeId);

      showSuccess("Data potongan berhasil diinisialisasi!");

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
      title="Transaksi Potongan"
      description="Input potongan bulanan — bulk matrix per pegawai"
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
          Periode terkunci — input potongan dalam mode read-only.
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
        Total Potongan Terkumpul: <strong>{formatRupiah(grandTotal)}</strong>
      </div>

      <Card title={`Potongan Bulk — ${selectedPeriode?.bulan_gaji ?? ""}`}>
        {loading ? (
          <p className="text-slate-500">Memuat...</p>
        ) : rows.length === 0 ? (
          <p className="text-slate-500">
            Belum ada data potongan. Klik &quot;Inisialisasi Data&quot; untuk
            memulai.
          </p>
        ) : (
          <Table>
            <TableHead>
              <TableHeaderCell>Nama</TableHeaderCell>

              {POTONGAN_FIELDS.map((f) => (
                <TableHeaderCell key={f.key}>{f.label}</TableHeaderCell>
              ))}

              <TableHeaderCell>Total</TableHeaderCell>
            </TableHead>

            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={row.id_pegawai}>
                  <TableCell className="max-w-[180px] truncate">
                    {row.nama_dan_tanggal_lahir}
                  </TableCell>

                  {POTONGAN_FIELDS.map((f) => (
                    <TableCell key={f.key}>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        disabled={locked}
                        value={row[f.key] ?? 0}
                        onChange={(e) =>
                          updateCell(
                            idx,
                            f.key,
                            parsePotonganValue(e.target.value),
                          )
                        }
                        className="w-24"
                      />
                    </TableCell>
                  ))}

                  <TableCell className="font-medium">
                    {formatRupiah(rowTotal(row))}
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
