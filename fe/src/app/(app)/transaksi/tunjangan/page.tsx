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
import { Modal } from "@/components/ui/Modal";
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
    total_tunjangan_terhitung: Number(row.total_tunjangan_terhitung ?? 0),
  };
}

function getDetailsSum(row: TunjanganBulanan): number {
  if (!row.details || row.details.length === 0) return 0;
  return row.details.reduce((sum, d) => sum + Number(d.nilai_terhitung ?? 0), 0);
}

function getCalculatedRowTotal(row: TunjanganBulanan): number {
  const honor = Number(row.honor_bulan ?? 0);
  const detailsSum = getDetailsSum(row);
  return honor + detailsSum;
}

export default function TunjanganPage() {
  const { selectedPeriodeId, selectedPeriode } = usePeriode();

  const [rows, setRows] = useState<TunjanganBulanan[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<TunjanganBulanan | null>(null);

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

  const totalJamLembur = rows.reduce(
    (s, r) => s + Number(r.total_jam_lebih ?? 0),
    0,
  );
  const totalHonor = rows.reduce((s, r) => s + Number(r.honor_bulan ?? 0), 0);
  const totalMasterLainnya = rows.reduce((s, r) => s + getDetailsSum(r), 0);
  const grandTotalTunjangan = totalHonor + totalMasterLainnya;

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
      description="Input jam lembur & honor bulanan — pantau hasil kalkulasi tunjangan otomatis"
      action={
        <div className="flex gap-2">
          {!locked && rows.length === 0 && (
            <Button variant="outline" onClick={handleInit}>
              Inisialisasi Data
            </Button>
          )}

          {!locked && rows.length > 0 && (
            <Button onClick={handleSave} isLoading={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              💾 Simpan Perubahan
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
        <div className="mb-4 rounded-lg bg-amber-950/60 border border-amber-800/80 px-4 py-3 text-sm text-amber-300">
          🔒 Periode terkunci — input tunjangan dalam mode read-only.
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-300">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* STAT SUMMARY BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col">
          <span className="text-xs text-slate-400">Total Jam Lembur:</span>
          <span className="text-lg font-bold text-slate-100 mt-0.5">
            ⏱️ {totalJamLembur} Jam
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col">
          <span className="text-xs text-slate-400">Total Honor Lembur:</span>
          <span className="text-lg font-bold text-amber-300 mt-0.5">
            💵 {formatRupiah(totalHonor)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-700/60 flex flex-col">
          <span className="text-xs text-indigo-300">Total Seluruh Tunjangan (Grand Total):</span>
          <span className="text-lg font-bold text-emerald-300 mt-0.5">
            💰 {formatRupiah(grandTotalTunjangan)}
          </span>
        </div>
      </div>

      <Card title={`Daftar Tunjangan Pegawai — ${selectedPeriode?.bulan_gaji ?? ""}`}>
        {loading ? (
          <p className="text-slate-400 py-6 text-center">Memuat data tunjangan...</p>
        ) : rows.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-3">
              Belum ada data tunjangan untuk periode ini.
            </p>
            {!locked && (
              <Button onClick={handleInit} variant="secondary">
                ⚡ Inisialisasi Data Tunjangan
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableHeaderCell>Nama Pegawai</TableHeaderCell>
              <TableHeaderCell>Jam Lembur (Jam)</TableHeaderCell>
              <TableHeaderCell>Honor Bulan (Rp)</TableHeaderCell>
              <TableHeaderCell>Tunjangan Otomatis Lainnya</TableHeaderCell>
              <TableHeaderCell>Total Tunjangan Terhitung</TableHeaderCell>
              <TableHeaderCell className="text-right">Rincian</TableHeaderCell>
            </TableHead>

            <TableBody>
              {rows.map((row, idx) => {
                const detailsSum = getDetailsSum(row);
                const finalRowTotal = getCalculatedRowTotal(row);

                return (
                  <TableRow key={row.id_pegawai}>
                    <TableCell className="max-w-[200px] font-medium text-slate-100">
                      {row.nama_dan_tanggal_lahir}
                    </TableCell>

                    {/* Input Jam Lembur */}
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

                    {/* Input Honor Bulan */}
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

                    {/* Hasil GET: Tunjangan Master Lainnya (Transport, Istri, Anak, dll) */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200">
                          {formatRupiah(detailsSum)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {row.details?.length ?? 0} komponen aktif
                        </span>
                      </div>
                    </TableCell>

                    {/* Hasil GET / Total Akhir yang Akan Masuk ke Slip */}
                    <TableCell>
                      <span className="font-bold text-emerald-300">
                        {formatRupiah(finalRowTotal)}
                      </span>
                    </TableCell>

                    {/* Tombol Lihat Rincian Detail per Pegawai */}
                    <TableCell className="text-right">
                      <button
                        onClick={() => setDetailRow(row)}
                        className="px-2.5 py-1 rounded text-xs font-medium bg-slate-800 text-indigo-300 hover:bg-slate-700 border border-slate-700 transition-colors"
                        title="Lihat rincian komponen tunjangan"
                      >
                        👁️ Rincian
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* MODAL RINCIAN DETAIL KOMPONEN TUNJANGAN */}
      <Modal
        isOpen={!!detailRow}
        onClose={() => setDetailRow(null)}
        title={`Rincian Tunjangan: ${detailRow?.nama_dan_tanggal_lahir ?? ""}`}
        size="md"
        footer={<Button onClick={() => setDetailRow(null)}>Tutup</Button>}
      >
        {detailRow && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Berikut adalah rincian seluruh komponen tunjangan yang diterima oleh pegawai ini pada periode{" "}
              <strong>{selectedPeriode?.bulan_gaji}</strong>:
            </p>

            <div className="space-y-2 border border-slate-800 rounded-xl p-3 bg-slate-900/50">
              {/* Baris Honor Bulan / Lembur */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800 text-sm">
                <div>
                  <span className="font-medium text-slate-200 block">Honor Bulanan & Lembur</span>
                  <span className="text-[11px] text-slate-400">
                    {detailRow.total_jam_lebih ?? 0} Jam Kerja Lebih
                  </span>
                </div>
                <span className="font-semibold text-amber-300">
                  {formatRupiah(Number(detailRow.honor_bulan ?? 0))}
                </span>
              </div>

              {/* Rincian Komponen Master dari Database */}
              {detailRow.details && detailRow.details.length > 0 ? (
                detailRow.details.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 border-b border-slate-800/60 text-sm"
                  >
                    <div>
                      <span className="font-medium text-slate-200 block">
                        {d.nama_tunjangan || `Tunjangan #${d.id_tunjangan}`}
                      </span>
                      {d.kode_kondisi && (
                        <span className="text-[10px] font-mono text-indigo-400">
                          {d.kode_kondisi}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-slate-100">
                      {formatRupiah(Number(d.nilai_terhitung ?? 0))}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-2">
                  Tidak ada komponen tunjangan master variabel lainnya.
                </p>
              )}

              {/* Total Final */}
              <div className="flex items-center justify-between pt-3 text-sm font-bold">
                <span className="text-slate-100">Total Tunjangan Terhitung:</span>
                <span className="text-emerald-300 text-base">
                  {formatRupiah(getCalculatedRowTotal(detailRow))}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
