import api from "@/services/api";
import { ApiResponse, PotonganBulanan } from "@/types";

// 1. Ambil potongan bulanan per periode
export async function getPotonganByPeriode(
  idPeriode: number,
): Promise<PotonganBulanan[]> {
  const res = await api.get<ApiResponse<PotonganBulanan[]>>(
    `/payroll/potongan-bulanan/periode/${idPeriode}`,
  );
  return res.data.data ?? [];
}

// 2. Inisialisasi potongan
export async function initPotonganPeriode(idPeriode: number): Promise<void> {
  await api.post("/payroll/potongan-bulanan/init", { id_periode: idPeriode });
}

// 3. Save bulk dengan struktur flat
export async function savePotonganBulk(
  idPeriode: number,
  dataInput: Array<{
    id_pegawai: number;
    potongan_angsuran: number;
    potongan_dana_wajib: number;
    potongan_s_pskd: number;
    potongan_pelkes: number;
    potongan_lainnya: number;
  }>,
): Promise<string> {
  const res = await api.post<ApiResponse<null>>(
    "/payroll/potongan-bulanan/bulk-save",
    {
      id_periode: idPeriode,
      data_input: dataInput,
    },
  );
  return res.data.message ?? "Data potongan berhasil disimpan!";
}
