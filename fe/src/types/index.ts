export type UserRole =
  | "Admin"
  | "Petugas Absensi"
  | "Approver"
  | "Staf Gaji";

export type PeriodeStatus =
  | "Pengisian Absensi"
  | "Menunggu Approval"
  | "Disetujui"
  | "Ditolak"
  | "Diproses Gaji"
  | "Selesai";

export interface User {
  id: number;
  username: string;
  nama: string;
  role: UserRole;
}

export interface Periode {
  id_periode: number;
  bulan_gaji: string;
  tanggal_awal: string;
  tanggal_akhir: string;
  status: PeriodeStatus;
  created_at?: string;
}

export interface Pegawai {
  id_pegawai: number;
  nama_dan_tanggal_lahir: string;
  nama_jabatan?: string;
  nama_golongan?: string;
  status_perkawinan: string;
  jumlah_anak?: number;
  gaji_pokok_dasar: number;
}

export interface AbsensiSummary {
  id_summary?: number;
  id_pegawai: number;
  id_periode?: number;
  nama_dan_tanggal_lahir?: string;
  bulan_gaji?: string;
  total_hadir_ops_wfo: number;
  total_hadir_ops_wfh: number;
  total_izin: number;
  total_sakit: number;
  total_alpha: number;
}

export interface TunjanganBulanan {
  id_tunjangan_bulanan?: number;
  id_pegawai: number;
  nama_dan_tanggal_lahir?: string;
  total_jam_lebih: number;
  honor_bulan: number;
  details?: TunjanganDetail[];
}

export interface TunjanganDetail {
  id_tunjangan: number;
  nama_tunjangan?: string;
  nilai_terhitung: number;
}

export interface PotonganBulanan {
  id_potongan_bulanan?: number;
  id_pegawai: number;
  nama_dan_tanggal_lahir?: string;
  potongan_angsuran: number;
  potongan_dana_wajib: number;
  potongan_s_pskd: number;
  potongan_pelkes: number;
  potongan_lainnya: number;
}

export interface RekapGaji {
  id_rekap: number;
  id_periode: number;
  id_pegawai: number;
  nama_dan_tanggal_lahir?: string;
  jabatan_snapshot?: string;
  golongan_snapshot?: string;
  gaji_pokok_snapshot?: number;
  total_penerimaan_clean?: number;
  total_potongan_clean?: number;
  netto_clean?: number;
}

export interface RekapGajiDetail {
  id_detail: number;
  id_rekap: number;
  nama_komponen: string;
  jenis_komponen: "TUNJANGAN" | "POTONGAN";
  nilai: number;
}

export interface SlipGaji extends RekapGaji {
  details: RekapGajiDetail[];
}

export interface MasterTunjangan {
  id_tunjangan: number;
  nama_tunjangan: string;
  formula?: string;
  is_active?: boolean;
}

export interface MasterPotongan {
  id_potongan: number;
  nama_potongan: string;
  is_active?: boolean;
}

export interface KoreksiJam {
  id_koreksi: number;
  id_pegawai: number;
  nama_pegawai?: string;
  jam_koreksi: number;
  jenis_koreksi: "ADD" | "SUBTRACT";
  keterangan: string;
  created_at?: string;
}

export interface DashboardAlert {
  type: "warning" | "info" | "error";
  message: string;
}

export interface DashboardSummary {
  periode: Periode;
  metrics: {
    total_pegawai: number;
    persentase_kehadiran: number;
    estimasi_pengeluaran_gaji: number;
    total_potongan_terkumpul: number;
  };
  alerts: DashboardAlert[];
  recent_koreksi_jam: KoreksiJam[];
}

export interface ApiResponse<T> {
  status: string;
  message?: string;
  data: T;
  count?: number;
}
