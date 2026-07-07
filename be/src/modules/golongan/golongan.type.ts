export interface Golongan {
  id_golongan: number;
  nama_golongan: string;
  gaji_pokok_standar: number | string;
  deleted_at?: Date | null;
}

export interface GolonganInput {
  nama_golongan: string;
  gaji_pokok_standar?: number;
}
