"use client";

import { useEffect, useState } from "react";
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
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
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

export default function TunjanganPage() {
  const { selectedPeriodeId, selectedPeriode } = usePeriode();
  const [rows, setRows] = useState<TunjanganBulanan[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [koreksiModal, setKoreksiModal] = useState<{
    idx: number;
    oldJam: number;
    newJam: number;
  } | null>(null);
  const [keterangan, setKeterangan] = useState("");
  const locked = selectedPeriode
    ? isPeriodeLocked(selectedPeriode.status)
    : false;

  const load = () => {
    if (!selectedPeriodeId) return;
    setLoading(true);
    getTunjanganByPeriode(selectedPeriodeId)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [selectedPeriodeId]);

  const handleJamChange = (idx: number, newJam: number) => {
    const oldJam = rows[idx].total_jam_lebih;
    if (oldJam !== newJam && !locked) {
      setKoreksiModal({ idx, oldJam, newJam });
    } else {
      setRows((prev) =>
        prev.map((r, i) =>
          i === idx ? { ...r, total_jam_lebih: newJam } : r,
        ),
      );
    }
  };

  const confirmKoreksi = () => {
    if (!koreksiModal || !keterangan.trim()) return;
    setRows((prev) =>
      prev.map((r, i) =>
        i === koreksiModal.idx
          ? { ...r, total_jam_lebih: koreksiModal.newJam }
          : r,
      ),
    );
    setKoreksiModal(null);
    setKeterangan("");
  };

  const totalHonor = rows.reduce(
    (s, r) => s + Number(r.honor_bulan ?? 0),
    0,
  );

  const handleSave = async () => {
    if (!selectedPeriodeId) return;
    setSaving(true);
    try {
      await saveTunjanganBulk(
        selectedPeriodeId,
        rows.map((r) => ({
          id_pegawai: r.id_pegawai,
          total_jam_lebih: r.total_jam_lebih,
          honor_bulan: r.honor_bulan,
        })),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleInit = async () => {
    if (!selectedPeriodeId) return;
    await initTunjanganPeriode(selectedPeriodeId);
    load();
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
          {!locked && (
            <Button onClick={handleSave} isLoading={saving}>
              Simpan Bulk
            </Button>
          )}
        </div>
      }
    >
      <div className="mb-4 rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
        Total Honor Bulan: <strong>{formatRupiah(totalHonor)}</strong>
      </div>

      <Card title={`Tunjangan — ${selectedPeriode?.bulan_gaji ?? ""}`}>
        {loading ? (
          <p className="text-slate-500">Memuat...</p>
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
                  <TableCell>{row.nama_dan_tanggal_lahir}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      disabled={locked}
                      value={row.total_jam_lebih}
                      onChange={(e) =>
                        handleJamChange(idx, Number(e.target.value))
                      }
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      disabled={locked}
                      value={row.honor_bulan}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r, i) =>
                            i === idx
                              ? { ...r, honor_bulan: Number(e.target.value) }
                              : r,
                          ),
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

      <Modal
        isOpen={!!koreksiModal}
        onClose={() => setKoreksiModal(null)}
        title="Audit Log Koreksi Jam"
        footer={
          <>
            <Button variant="ghost" onClick={() => setKoreksiModal(null)}>
              Batal
            </Button>
            <Button onClick={confirmKoreksi} disabled={!keterangan.trim()}>
              Simpan Koreksi
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-slate-600">
          Mengubah jam lembur dari {koreksiModal?.oldJam} menjadi{" "}
          {koreksiModal?.newJam}. Wajib isi keterangan dan bukti.
        </p>
        <Input
          label="Keterangan"
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          placeholder="Alasan koreksi jam lembur"
        />
        <div className="mt-4">
          <Input label="Bukti Dokumen" type="file" accept=".pdf,.jpg,.png" />
        </div>
      </Modal>
    </PageContainer>
  );
}
