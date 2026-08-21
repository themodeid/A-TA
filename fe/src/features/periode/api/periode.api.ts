import api from "@/services/api";
import { ApiResponse, Periode, PeriodeReadiness } from "@/types";

export async function getAllPeriode(): Promise<Periode[]> {
  const res = await api.get<ApiResponse<Periode[]>>("/payroll/periode");
  return res.data.data ?? [];
}

export async function getPeriodeById(id: number): Promise<Periode> {
  const res = await api.get<ApiResponse<Periode>>(`/payroll/periode/${id}`);
  return res.data.data;
}

export async function createPeriode(payload: {
  bulan_gaji: string;
  tanggal_awal: string;
  tanggal_akhir: string;
}): Promise<Periode> {
  const res = await api.post<ApiResponse<Periode>>("/payroll/periode", payload);
  return res.data.data;
}

export async function getPeriodeReadiness(
  id: number,
): Promise<PeriodeReadiness> {
  const res = await api.get<ApiResponse<PeriodeReadiness>>(
    `/payroll/periode/${id}/readiness`,
  );
  return res.data.data;
}

export async function submitApproval(id: number): Promise<Periode> {
  const res = await api.post<ApiResponse<Periode>>(
    `/payroll/periode/${id}/submit-approval`,
  );
  return res.data.data;
}

export async function approvePeriode(
  id: number,
  catatan?: string,
): Promise<Periode> {
  const res = await api.post<ApiResponse<Periode>>(
    `/payroll/periode/${id}/approve`,
    { catatan },
  );
  return res.data.data;
}

export async function rejectPeriode(
  id: number,
  catatan?: string,
): Promise<Periode> {
  const res = await api.post<ApiResponse<Periode>>(
    `/payroll/periode/${id}/reject`,
    { catatan, approver_id: 1 },
  );
  return res.data.data;
}
