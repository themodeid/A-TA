"use client";

import { useState } from "react";
import { usePeriode } from "@/hooks/usePeriodeContext";
import {
  createPeriode,
  submitApproval,
} from "@/features/periode/api/periode.api";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { WorkflowStepper } from "@/features/dashboard/components/WorkflowStepper";
import { isPeriodeLocked } from "@/lib/permissions";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";

export default function PeriodePage() {
  const { periodeList, refreshPeriodeList, selectedPeriode } = usePeriode();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    bulan_gaji: "",
    tanggal_awal: "",
    tanggal_akhir: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleCreate = async () => {
    setLoading(true);
    setMessage("");
    try {
      console.log("payload yang mau dikirim:", form);
      await createPeriode(form);
      await refreshPeriodeList();
      setModalOpen(false);
      setForm({ bulan_gaji: "", tanggal_awal: "", tanggal_akhir: "" });
      setMessage("Periode baru berhasil dibuka.");
    } catch (err: unknown) {
      setMessage(
        err instanceof Error ? err.message : "Gagal membuka periode baru.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApproval = async (id: number) => {
    setLoading(true);
    try {
      await submitApproval(id);
      await refreshPeriodeList();
      setMessage("Periode berhasil diajukan untuk approval.");
    } catch (err: unknown) {
      setMessage(
        err instanceof Error ? err.message : "Gagal mengajukan approval.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Periode Gaji"
      description="Kelola siklus penggajian — buka periode baru dan pantau status"
      action={
        <Button onClick={() => setModalOpen(true)}>+ Buka Periode Baru</Button>
      }
    >
      {message && (
        <div className="rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          {message}
        </div>
      )}

      {selectedPeriode && (
        <Card title={`Periode Aktif: ${selectedPeriode.bulan_gaji}`}>
          <div className="mb-4 flex items-center gap-3">
            <Badge status={selectedPeriode.status} />
            <span className="text-sm text-slate-500">
              {selectedPeriode.tanggal_awal} — {selectedPeriode.tanggal_akhir}
            </span>
            {isPeriodeLocked(selectedPeriode.status) && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                Transaksi Terkunci
              </span>
            )}
          </div>
          <WorkflowStepper currentStatus={selectedPeriode.status} />
          {selectedPeriode.status === "Pengisian Absensi" && (
            <div className="mt-4">
              <Button
                onClick={() => handleSubmitApproval(selectedPeriode.id_periode)}
                isLoading={loading}
              >
                Ajukan Approval
              </Button>
            </div>
          )}
        </Card>
      )}

      <Card title="Daftar Periode" className="mt-6">
        <Table>
          <TableHead>
            <TableHeaderCell>Bulan Gaji</TableHeaderCell>
            <TableHeaderCell>Tanggal Awal</TableHeaderCell>
            <TableHeaderCell>Tanggal Akhir</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableHead>
          <TableBody>
            {periodeList.map((p) => (
              <TableRow key={p.id_periode}>
                <TableCell>{p.bulan_gaji}</TableCell>
                <TableCell>{p.tanggal_awal}</TableCell>
                <TableCell>{p.tanggal_akhir}</TableCell>
                <TableCell>
                  <Badge status={p.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Buka Periode Baru"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreate} isLoading={loading}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Bulan Gaji"
            placeholder="Agustus 2026"
            value={form.bulan_gaji}
            onChange={(e) => setForm({ ...form, bulan_gaji: e.target.value })}
          />
          <Input
            label="Tanggal Awal"
            type="date"
            value={form.tanggal_awal}
            onChange={(e) => setForm({ ...form, tanggal_awal: e.target.value })}
          />
          <Input
            label="Tanggal Akhir"
            type="date"
            value={form.tanggal_akhir}
            onChange={(e) =>
              setForm({ ...form, tanggal_akhir: e.target.value })
            }
          />
        </div>
      </Modal>
    </PageContainer>
  );
}
