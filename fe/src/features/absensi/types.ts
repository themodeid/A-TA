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

export interface KoreksiJam {
  id_koreksi: number;
  id_pegawai: number;
  nama_pegawai?: string;
  jam_koreksi: number;
  jenis_koreksi: "ADD" | "SUBTRACT";
  keterangan: string;
  created_at?: string;
}
