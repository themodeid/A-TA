import api from "@/services/api";
import { ApiResponse, RekapGaji, SlipGaji } from "@/types";

export async function getRekapByPeriode(idPeriode: number): Promise<RekapGaji[]> {
  const res = await api.get<ApiResponse<RekapGaji[]>>(
    `/payroll/gaji/periode/${idPeriode}`,
  );
  return res.data.data ?? [];
}

export async function getSlipById(idRekap: number): Promise<SlipGaji> {
  const res = await api.get<ApiResponse<SlipGaji>>(
    `/payroll/gaji/rekap/${idRekap}`,
  );
  return res.data.data;
}

export async function processPayroll(idPeriode: number): Promise<void> {
  await api.post(`/payroll/gaji/process/periode/${idPeriode}`);
}

export function exportRekapCsv(rekap: RekapGaji[], filename: string): void {
  const headers = [
    "Nama",
    "Jabatan",
    "Golongan",
    "Gaji Pokok",
    "Total Bruto",
    "Total Potongan",
    "Netto",
  ];
  const rows = rekap.map((r) => [
    r.nama_dan_tanggal_lahir ?? "",
    r.jabatan_snapshot ?? "",
    r.golongan_snapshot ?? "",
    r.gaji_pokok_snapshot ?? 0,
    r.total_penerimaan_clean ?? 0,
    r.total_potongan_clean ?? 0,
    r.netto_clean ?? 0,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${c}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
