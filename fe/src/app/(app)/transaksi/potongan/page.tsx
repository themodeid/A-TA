"use client";

import { useEffect, useState } from "react";
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
  const locked = selectedPeriode
    ? isPeriodeLocked(selectedPeriode.status)
    : false;

  const load = () => {
    if (!selectedPeriodeId) return;
    setLoading(true);
    getPotonganByPeriode(selectedPeriodeId)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [selectedPeriodeId]);

  const grandTotal = rows.reduce((s, r) => s + rowTotal(r), 0);

  const updateCell = (
    idx: number,
    field: (typeof POTONGAN_FIELDS)[number]["key"],
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
      await savePotonganBulk(
        selectedPeriodeId,
        rows.map((r) => ({
          id_pegawai: r.id_pegawai,
          potongan_angsuran: r.potongan_angsuran,
          potongan_dana_wajib: r.potongan_dana_wajib,
          potongan_s_pskd: r.potongan_s_pskd,
          potongan_pelkes: r.potongan_pelkes,
          potongan_lainnya: r.potongan_lainnya,
        })),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleInit = async () => {
    if (!selectedPeriodeId) return;
    await initPotonganPeriode(selectedPeriodeId);
    load();
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
          {!locked && (
            <Button onClick={handleSave} isLoading={saving}>
              Simpan Bulk
            </Button>
          )}
        </div>
      }
    >
      <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
        Total Potongan Terkumpul: <strong>{formatRupiah(grandTotal)}</strong>
      </div>

      <Card title={`Potongan Bulk — ${selectedPeriode?.bulan_gaji ?? ""}`}>
        {loading ? (
          <p className="text-slate-500">Memuat...</p>
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
                        disabled={locked}
                        value={row[f.key]}
                        onChange={(e) =>
                          updateCell(idx, f.key, Number(e.target.value))
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
