import api from "@/services/api";
import { ApiResponse, TunjanganBulanan } from "@/types";

export async function getTunjanganByPeriode(
  idPeriode: number,
): Promise<TunjanganBulanan[]> {
  const res = await api.get<ApiResponse<TunjanganBulanan[]>>(
    `/payroll/tunjangan-bulanan/periode/${idPeriode}`,
  );
  return res.data.data ?? [];
}

export async function initTunjanganPeriode(idPeriode: number): Promise<void> {
  await api.post("/payroll/tunjangan-bulanan/initialize", {
    id_periode: idPeriode,
  });
}

export async function saveTunjanganBulk(
  idPeriode: number,
  dataInput: Array<{
    id_pegawai: number;
    total_jam_lebih?: number;
    honor_bulan?: number;
    details?: Array<{ id_tunjangan: number; nilai_terhitung: number }>;
  }>,
): Promise<void> {
  await api.post("/payroll/tunjangan-bulanan/bulk-save", {
    id_periode: idPeriode,
    data_input: dataInput,
  });
}
