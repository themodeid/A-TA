export type PeriodeStatus =
  | "Pengisian Absensi"
  | "Menunggu Approval"
  | "Disetujui"
  | "Ditolak"
  | "Diproses Gaji"
  | "Selesai";

export interface Periode {
  id_periode: number;
  bulan_gaji: string;
  tanggal_awal: string;
  tanggal_akhir: string;
  status: PeriodeStatus;
  created_at?: string;
}
