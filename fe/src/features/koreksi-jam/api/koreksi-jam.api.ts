import api from "@/services/api";
import { ApiResponse } from "@/types";
import { KoreksiJam, CreateKoreksiJamPayload } from "../types";

export async function getKoreksiJamList(
  idPeriode?: number,
  idPegawai?: number
): Promise<KoreksiJam[]> {
  const params: Record<string, any> = {};
  if (idPeriode) params.id_periode = idPeriode;
  if (idPegawai) params.id_pegawai = idPegawai;

  const res = await api.get<ApiResponse<KoreksiJam[]>>("/payroll/koreksi-jam", {
    params,
  });
  return res.data.data ?? [];
}

export async function createKoreksiJam(
  payload: CreateKoreksiJamPayload
): Promise<KoreksiJam> {
  const res = await api.post<ApiResponse<KoreksiJam>>(
    "/payroll/koreksi-jam",
    payload
  );
  return res.data.data;
}

export async function deleteKoreksiJam(idKoreksi: number): Promise<void> {
  await api.delete(`/payroll/koreksi-jam/${idKoreksi}`);
}
