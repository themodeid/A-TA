export interface TunjanganDetail {
  id_tunjangan: number;
  nama_tunjangan?: string;
  nilai_terhitung: number;
}

export interface TunjanganBulanan {
  id_tunjangan_bulanan?: number;
  id_pegawai: number;
  nama_dan_tanggal_lahir?: string;
  total_jam_lebih: number;
  honor_bulan: number;
  details?: TunjanganDetail[];
}
