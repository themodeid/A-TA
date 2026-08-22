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
  auto_init?: boolean;
  copy_potongan_from_periode_id?: number;
}): Promise<Periode> {
  const res = await api.post<ApiResponse<Periode>>("/payroll/periode", payload);
  return res.data.data;
}

export async function autoInitPeriode(
  id: number,
  options?: {
    default_absensi?: boolean;
    copy_potongan_from_periode_id?: number;
  },
): Promise<{ message: string; idPeriode: number }> {
  const res = await api.post<
    ApiResponse<{ message: string; idPeriode: number }>
  >(`/payroll/periode/${id}/auto-init`, options ?? {});
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

export interface ApprovalLog {
  id_approval: number;
  id_periode: number;
  status: string;
  catatan: string;
  created_at: string;
}

export async function getApprovalLogs(idPeriode: number): Promise<ApprovalLog[]> {
  const res = await api.get<ApiResponse<ApprovalLog[]>>(
    `/payroll/periode/${idPeriode}/approval-logs`,
  );
  return res.data.data ?? [];
}
