"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePeriode } from "@/hooks/usePeriodeContext";
import {
  getPotonganByPeriode,
  initPotonganPeriode,
  savePotonganBulk,
} from "@/features/potongan/api/potongan.api";
import { getPotonganMaster } from "@/features/master/api/master.api";
import { MasterPotongan, PotonganBulanan } from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
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

function getRowTotal(row: PotonganBulanan): number {
  if (row.details && row.details.length > 0) {
    const sum = row.details.reduce(
      (s, d) => s + Number(d.nilai_potongan ?? 0),
      0,
    );
    if (sum > 0) return sum;
  }
  return Number(row.total_potongan_terhitung ?? 0);
}

export default function PotonganPage() {
  const { selectedPeriodeId, selectedPeriode } = usePeriode();

  const [rows, setRows] = useState<PotonganBulanan[]>([]);
  const [masterList, setMasterList] = useState<MasterPotongan[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyWithPotongan, setOnlyWithPotongan] = useState(false);

  // Dynamic Editing Modal State (Map of id_master_potongan -> nilai_potongan)
  const [editingRow, setEditingRow] = useState<PotonganBulanan | null>(null);
  const [dynamicForm, setDynamicForm] = useState<Record<number, number>>({});

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

  const load = useCallback(async () => {
    if (!selectedPeriodeId) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const [rawData, masters] = await Promise.all([
        getPotonganByPeriode(selectedPeriodeId),
        getPotonganMaster(),
      ]);

      setMasterList(masters);

      const normalizedRows: PotonganBulanan[] = rawData.map((item) => ({
        id_potongan_bulanan: item.id_potongan_bulanan,
        id_pegawai: item.id_pegawai,
        nama_dan_tanggal_lahir: item.nama_dan_tanggal_lahir,
        total_potongan_terhitung: Number(item.total_potongan_terhitung ?? 0),
        potongan_angsuran: Number(item.potongan_angsuran ?? 0),
        potongan_dana_wajib: Number(item.potongan_dana_wajib ?? 0),
        potongan_s_pskd: Number(item.potongan_s_pskd ?? 0),
        potongan_pelkes: Number(item.potongan_pelkes ?? 0),
        potongan_lainnya: Number(item.potongan_lainnya ?? 0),
        details: item.details ?? [],
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

  const grandTotal = rows.reduce((s, r) => s + getRowTotal(r), 0);
  const countWithPotongan = rows.filter((r) => getRowTotal(r) > 0).length;

  // Filtered rows for display
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch = (r.nama_dan_tanggal_lahir ?? "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchPotongan = onlyWithPotongan ? getRowTotal(r) > 0 : true;
      return matchSearch && matchPotongan;
    });
  }, [rows, searchQuery, onlyWithPotongan]);

  // Open Edit Modal - dynamically map existing values from master list
  const handleOpenEdit = (item: PotonganBulanan) => {
    setEditingRow(item);

    const initialMap: Record<number, number> = {};

    masterList.forEach((m) => {
      // Cari nilai dari item.details jika ada
      const matchDetail = item.details?.find(
        (d) => d.id_master_potongan === m.id_master_potongan,
      );

      if (matchDetail) {
        initialMap[m.id_master_potongan] = Number(matchDetail.nilai_potongan) || 0;
      } else {
        // Fallback ke field lama jika belum ada di details
        if (m.kode_potongan === "POT_ANGSURAN") {
          initialMap[m.id_master_potongan] = Number(item.potongan_angsuran) || 0;
        } else if (m.kode_potongan === "POT_DANA_WAJIB") {
          initialMap[m.id_master_potongan] = Number(item.potongan_dana_wajib) || 0;
        } else if (m.kode_potongan === "POT_S_PSKD") {
          initialMap[m.id_master_potongan] = Number(item.potongan_s_pskd) || 0;
        } else if (m.kode_potongan === "POT_PELKES") {
          initialMap[m.id_master_potongan] = Number(item.potongan_pelkes) || 0;
        } else if (m.kode_potongan === "POT_LAINNYA") {
          initialMap[m.id_master_potongan] = Number(item.potongan_lainnya) || 0;
        } else {
          initialMap[m.id_master_potongan] = 0;
        }
      }
    });

    setDynamicForm(initialMap);
  };

  // Save changes from modal dynamically
  const handleSaveModal = async () => {
    if (!selectedPeriodeId || !editingRow) return;

    setSaving(true);
    setErrorMsg(null);
    dismissSuccess();

    try {
      const detailsPayload = Object.entries(dynamicForm).map(
        ([idMaster, val]) => ({
          id_master_potongan: Number(idMaster),
          nilai_potongan: Number(val) || 0,
        }),
      );

      const payload = [
        {
          id_pegawai: editingRow.id_pegawai,
          details: detailsPayload,
        },
      ];

      const message = await savePotonganBulk(selectedPeriodeId, payload as any);
      showSuccess(message || "Potongan pegawai berhasil disimpan!");
      setEditingRow(null);
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
      showSuccess("Data wadah potongan berhasil diinisialisasi!");
      load();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          err.message ||
          "Gagal menginisialisasi data.",
      );
    }
  };

  const modalCurrentTotal = Object.values(dynamicForm).reduce(
    (sum, val) => sum + (Number(val) || 0),
    0,
  );

  return (
    <PageContainer
      title="Transaksi Potongan (Taken List)"
      description="Kelola daftar potongan bulanan / taken list kas & pinjaman pegawai secara dinamis"
      action={
        <div className="flex gap-2">
          {!locked && rows.length === 0 && (
            <Button variant="outline" onClick={handleInit}>
              Inisialisasi Data
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
          🔒 Periode terkunci — potongan dalam mode read-only.
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
          <span className="text-xs text-slate-400">Total Pegawai di Database:</span>
          <span className="text-lg font-bold text-slate-100 mt-0.5">
            👥 {rows.length} Pegawai
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col">
          <span className="text-xs text-slate-400">Pegawai dengan Potongan (Taken List):</span>
          <span className="text-lg font-bold text-amber-300 mt-0.5">
            📋 {countWithPotongan} Orang
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-950/80 to-slate-900 border border-rose-700/60 flex flex-col">
          <span className="text-xs text-rose-300">Total Keseluruhan Potongan:</span>
          <span className="text-lg font-bold text-rose-200 mt-0.5">
            📉 {formatRupiah(grandTotal)}
          </span>
        </div>
      </div>

      {/* SEARCH & FILTER CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="🔍 Cari nama pegawai..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyWithPotongan(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              !onlyWithPotongan
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            Semua Pegawai ({rows.length})
          </button>
          <button
            onClick={() => setOnlyWithPotongan(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              onlyWithPotongan
                ? "bg-rose-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            📋 Hanya Taken List ({countWithPotongan})
          </button>
        </div>
      </div>

      {/* TABEL POTONGAN / TAKEN LIST */}
      <Card title={`Daftar Potongan Pegawai — ${selectedPeriode?.bulan_gaji ?? ""}`}>
        {loading ? (
          <p className="text-slate-400 py-6 text-center">Memuat data potongan...</p>
        ) : rows.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-3">
              Belum ada data potongan untuk periode ini.
            </p>
            {!locked && (
              <Button onClick={handleInit} variant="secondary">
                ⚡ Inisialisasi Data Potongan
              </Button>
            )}
          </div>
        ) : filteredRows.length === 0 ? (
          <p className="text-slate-400 py-6 text-center">
            Tidak ada pegawai yang cocok dengan filter.
          </p>
        ) : (
          <Table>
            <TableHead>
              <TableHeaderCell>Nama Pegawai</TableHeaderCell>
              <TableHeaderCell>Rincian Item Potongan Aktif</TableHeaderCell>
              <TableHeaderCell>Total Potongan</TableHeaderCell>
              <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
            </TableHead>

            <TableBody>
              {filteredRows.map((row) => {
                const total = getRowTotal(row);

                // Kumpulkan item potongan yang bernilai > 0
                const activeItems: string[] = [];

                if (row.details && row.details.length > 0) {
                  row.details.forEach((d) => {
                    if (Number(d.nilai_potongan) > 0) {
                      activeItems.push(
                        `${d.nama_potongan || "Taken List"}: ${formatRupiah(Number(d.nilai_potongan))}`,
                      );
                    }
                  });
                }

                if (activeItems.length === 0 && total > 0) {
                  activeItems.push(`Taken List: ${formatRupiah(total)}`);
                }

                return (
                  <TableRow key={row.id_pegawai}>
                    <TableCell className="max-w-[220px] font-medium text-slate-100">
                      {row.nama_dan_tanggal_lahir}
                    </TableCell>

                    <TableCell>
                      {activeItems.length === 0 ? (
                        <span className="text-xs text-slate-500 italic">
                          Tidak ada potongan (Rp 0)
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {activeItems.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/70"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <span
                        className={`font-bold ${
                          total > 0 ? "text-rose-300" : "text-slate-500"
                        }`}
                      >
                        {formatRupiah(total)}
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={total > 0 ? "secondary" : "outline"}
                        disabled={locked}
                        onClick={() => handleOpenEdit(row)}
                        className="text-xs"
                      >
                        ✏️ {total > 0 ? "Ubah Potongan" : "+ Isi Potongan"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* MODAL INPUT / SESUAIKAN POTONGAN PEGAWAI (100% DINAMIS DARI MASTER POTONGAN) */}
      <Modal
        isOpen={!!editingRow}
        onClose={() => setEditingRow(null)}
        title={`Input Potongan (Taken List): ${editingRow?.nama_dan_tanggal_lahir ?? ""}`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingRow(null)}>
              Batal
            </Button>
            <Button
              isLoading={saving}
              onClick={handleSaveModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Simpan Potongan
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <p className="text-xs text-slate-400">
            Masukkan nominal potongan untuk pegawai ini pada periode{" "}
            <strong>{selectedPeriode?.bulan_gaji}</strong>. Komponen yang muncul di bawah mengikuti data di <strong>Master Komponen Potongan</strong>.
          </p>

          {masterList.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">
              Belum ada komponen master potongan aktif di Master Data.
            </p>
          ) : (
            masterList.map((m) => (
              <Input
                key={m.id_master_potongan}
                label={`${m.nama_potongan} (Rp)`}
                type="number"
                min={0}
                step={1000}
                value={dynamicForm[m.id_master_potongan] || ""}
                placeholder="0"
                onChange={(e) =>
                  setDynamicForm({
                    ...dynamicForm,
                    [m.id_master_potongan]: Number(e.target.value) || 0,
                  })
                }
              />
            ))
          )}

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">
              Total Potongan Pegawai:
            </span>
            <span className="text-base font-bold text-rose-300">
              {formatRupiah(modalCurrentTotal)}
            </span>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
