import api from "@/services/api";
import { ApiResponse, AbsensiSummary, Pegawai } from "@/types";

export async function getAbsensiByPeriode(
  idPeriode: number,
): Promise<AbsensiSummary[]> {
  const res = await api.get<ApiResponse<AbsensiSummary[]>>(
    `/absensi/periode/${idPeriode}`,
  );
  return res.data.data ?? [];
}

export async function saveAbsensiBulk(
  idPeriode: number,
  dataAbsenList: Partial<AbsensiSummary>[],
): Promise<void> {
  await api.post(`/absensi/periode/${idPeriode}/bulk`, { dataAbsenList });
}

export async function getAllPegawai(): Promise<Pegawai[]> {
  const res = await api.get<ApiResponse<Pegawai[]>>("/master/pegawai");
  return res.data.data ?? [];
}
