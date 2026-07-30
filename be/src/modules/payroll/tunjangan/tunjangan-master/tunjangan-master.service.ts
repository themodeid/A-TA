import * as TunjanganMasterModel from "./tunjangan-master.model";

/**
 * Get semua data master tunjangan aktif
 */
export const getAllMaster = async () => {
  return await TunjanganMasterModel.getAllTunjanganMaster();
};

/**
 * Get detail 1 master tunjangan by ID
 */
export const getMasterById = async (id: number) => {
  const data = await TunjanganMasterModel.getTunjanganMasterById(id);
  if (!data) {
    throw new Error("NOT_FOUND: Master tunjangan tidak ditemukan");
  }
  return data;
};

/**
 * Tambah master tunjangan baru
 */
export const createMaster = async (
  payload: TunjanganMasterModel.CreateTunjanganMasterInput,
) => {
  return await TunjanganMasterModel.createTunjanganMaster(payload);
};

/**
 * Update master tunjangan
 */
export const updateMaster = async (
  id: number,
  payload: Partial<TunjanganMasterModel.CreateTunjanganMasterInput>,
) => {
  // Cek eksistensi data dulu
  await getMasterById(id);
  return await TunjanganMasterModel.updateTunjanganMaster(id, payload);
};

/**
 * Soft delete master tunjangan
 */
export const deleteMaster = async (id: number) => {
  await getMasterById(id);
  return await TunjanganMasterModel.softDeleteTunjanganMaster(id);
};
