export interface PotonganBulanan {
  id_potongan_bulanan: number;
  id_periode: number;
  id_pegawai: number;
  potongan_angsuran: string | number;
  potongan_dana_wajib: string | number;
  potongan_s_pskd: string | number;
  potongan_pelkes: string | number;
  potongan_lainnya: string | number;
}

// Digunakan saat input data baru (CREATE)
export type PotonganInput = Omit<PotonganBulanan, "id_potongan_bulanan">;
