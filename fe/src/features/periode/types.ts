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
  catatan_approval?: string;
  status_approval_log?: string;
  tanggal_approval_log?: string;
}

export interface PeriodeReadiness {
  isReady: boolean;
  totalPegawai: number;
  absensi: {
    filledCount: number;
    totalCount: number;
    isComplete: boolean;
    missingPegawai: { id_pegawai: number; nama: string }[];
  };
  tunjangan: {
    filledCount: number;
    totalCount: number;
    isComplete: boolean;
    missingPegawai: { id_pegawai: number; nama: string }[];
  };
  potongan: {
    filledCount: number;
    totalCount: number;
    isComplete: boolean;
    missingPegawai: { id_pegawai: number; nama: string }[];
  };
  reasons: string[];
}

