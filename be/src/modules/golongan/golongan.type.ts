// Representasi data utuh dari tb_golongan di PostgreSQL
export interface Golongan {
  id_golongan: number;
  nama_golongan: string;
  gaji_pokok_standar: string | number; // pg biasanya mengembalikan NUMERIC dalam bentuk string
  deleted_at?: Date | null;
}

// Digunakan untuk validasi dan input saat CREATE (tanpa id dan deleted_at)
export type GolonganInput = Omit<Golongan, "id_golongan" | "deleted_at">;
