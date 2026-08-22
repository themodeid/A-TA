import api from "@/services/api";
import { ApiResponse, MasterPotongan, MasterTunjangan, Pegawai } from "@/types";

export async function getAllPegawai(): Promise<Pegawai[]> {
  const res = await api.get<ApiResponse<Pegawai[]>>("/master/pegawai");
  return res.data.data ?? [];
}

export async function getPegawaiById(id: number): Promise<Pegawai> {
  const res = await api.get<ApiResponse<Pegawai>>(`/master/pegawai/${id}`);
  return res.data.data;
}

export async function createPegawai(data: Partial<Pegawai>): Promise<Pegawai> {
  const res = await api.post<ApiResponse<Pegawai>>("/master/pegawai", data);
  return res.data.data;
}

export async function updatePegawai(
  id: number,
  data: Partial<Pegawai>,
): Promise<Pegawai> {
  const res = await api.put<ApiResponse<Pegawai>>(
    `/master/pegawai/${id}`,
    data,
  );
  return res.data.data;
}

export async function deletePegawai(id: number): Promise<void> {
  await api.delete(`/master/pegawai/${id}`);
}

export async function getTunjanganMaster(): Promise<MasterTunjangan[]> {
  const res = await api.get<ApiResponse<MasterTunjangan[]>>(
    "/payroll/tunjangan-master",
  );
  return res.data.data ?? [];
}

export async function getPotonganMaster(): Promise<MasterPotongan[]> {
  const res = await api.get<ApiResponse<MasterPotongan[]>>(
    "/payroll/potongan-master",
  );
  return res.data.data ?? [];
}
export async function createTunjanganMaster(
  data: Partial<MasterTunjangan>,
): Promise<MasterTunjangan> {
  const res = await api.post<ApiResponse<MasterTunjangan>>(
    "/payroll/tunjangan-master",
    data,
  );
  return res.data.data;
}

export async function updateTunjanganMaster(
  id: number,
  data: Partial<MasterTunjangan>,
): Promise<MasterTunjangan> {
  const res = await api.put<ApiResponse<MasterTunjangan>>(
    `/payroll/tunjangan-master/${id}`,
    data,
  );
  return res.data.data;
}

export async function deleteTunjanganMaster(id: number): Promise<void> {
  await api.delete(`/payroll/tunjangan-master/${id}`);
}

export async function createPotonganMaster(
  data: Partial<MasterPotongan>,
): Promise<MasterPotongan> {
  const res = await api.post<ApiResponse<MasterPotongan>>(
    "/payroll/potongan-master",
    data,
  );
  return res.data.data;
}

export async function updatePotonganMaster(
  id: number,
  data: Partial<MasterPotongan>,
): Promise<MasterPotongan> {
  const res = await api.put<ApiResponse<MasterPotongan>>(
    `/payroll/potongan-master/${id}`,
    data,
  );
  return res.data.data;
}

export async function deletePotonganMaster(id: number): Promise<void> {
  await api.delete(`/payroll/potongan-master/${id}`);
}
