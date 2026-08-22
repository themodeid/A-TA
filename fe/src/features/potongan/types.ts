export interface PotonganDetail {
  id_potongan_detail?: number;
  id_master_potongan: number;
  nama_potongan?: string;
  kode_potongan?: string;
  nilai_potongan: number;
}

export interface PotonganBulanan {
  id_potongan_bulanan?: number;
  id_periode?: number;
  id_pegawai: number;
  nama_dan_tanggal_lahir?: string;
  total_potongan_terhitung?: number;
  potongan_angsuran?: number;
  potongan_dana_wajib?: number;
  potongan_s_pskd?: number;
  potongan_pelkes?: number;
  potongan_lainnya?: number;
  details?: PotonganDetail[];
}
