export interface TunjanganDetail {
  id_tunjangan_detail?: number;
  id_tunjangan: number;
  nama_tunjangan?: string;
  kode_kondisi?: string;
  nilai_terhitung: number;
}

export interface TunjanganBulanan {
  id_tunjangan_bulanan?: number;
  id_periode?: number;
  id_pegawai: number;
  nama_dan_tanggal_lahir?: string;
  total_jam_lebih: number;
  honor_bulan: number;
  total_tunjangan_terhitung?: number;
  details?: TunjanganDetail[];
}
