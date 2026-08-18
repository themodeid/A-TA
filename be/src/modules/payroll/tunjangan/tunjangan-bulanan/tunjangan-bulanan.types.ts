export interface TunjanganDetailInput {
  id_tunjangan: number;
  nilai_terhitung: number;
}

export interface TunjanganPegawaiInput {
  id_pegawai: number;
  total_jam_lebih?: number;
  honor_bulan?: number;
  details?: TunjanganDetailInput[];
}