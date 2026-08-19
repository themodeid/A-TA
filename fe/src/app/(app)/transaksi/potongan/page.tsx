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

// 1. Definisikan pemetaan kolom potongan statis
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

// 2. Hitung total per baris
function rowTotal(row: PotonganBulanan): number {
  return POTONGAN_FIELDS.reduce(
    (sum, field) => sum + Number(row[field.key] ?? 0),
    0,
  );
}

export default function PotonganPage() {
  const { selectedPeriodeId, selectedPeriode } = usePeriode();

  // 3. Ubah state ke PotonganBulanan[] dan hapus masterList
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

  // 4. Ubah fungsi load (hanya panggil getPotonganByPeriode)
  const load = useCallback(async () => {
    if (!selectedPeriodeId) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const rawData = await getPotonganByPeriode(selectedPeriodeId);

      const normalizedRows: PotonganBulanan[] = rawData.map((item) => ({
        id_potongan_bulanan: item.id_potongan_bulanan,
        id_pegawai: item.id_pegawai,
        nama_dan_tanggal_lahir: item.nama_dan_tanggal_lahir,
        potongan_angsuran: Number(item.potongan_angsuran ?? 0),
        potongan_dana_wajib: Number(item.potongan_dana_wajib ?? 0),
        potongan_s_pskd: Number(item.potongan_s_pskd ?? 0),
        potongan_pelkes: Number(item.potongan_pelkes ?? 0),
        potongan_lainnya: Number(item.potongan_lainnya ?? 0),
      }));

      setRows(normalizedRows);
    } catch (err: any) {
      setRows([]);
      setErrorMsg(
        err.response?.data?.message ||
          err.message ||
          "Gagal memuat data potongan.",
      );
    } finally {
      setLoading(false);
    }
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

  // 5. Update cell berdasarkan nama key kolom
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

  // 6. Format payload simpan ke bentuk flat
  const handleSave = async () => {
    if (!selectedPeriodeId || rows.length === 0) return;

    setSaving(true);
    setErrorMsg(null);
    dismissSuccess();

    try {
      const payload = rows.map((r) => ({
        id_pegawai: r.id_pegawai,
        potongan_angsuran: Number(r.potongan_angsuran ?? 0),
        potongan_dana_wajib: Number(r.potongan_dana_wajib ?? 0),
        potongan_s_pskd: Number(r.potongan_s_pskd ?? 0),
        potongan_pelkes: Number(r.potongan_pelkes ?? 0),
        potongan_lainnya: Number(r.potongan_lainnya ?? 0),
      }));

      const message = await savePotonganBulk(selectedPeriodeId, payload);
      showSuccess(message);
      load();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          err.message ||
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
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          err.message ||
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

              {/* 7. Render Header Kolom dari POTONGAN_FIELDS */}
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

                  {/* 8. Render Cell Input dari POTONGAN_FIELDS */}
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
