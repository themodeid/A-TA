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
