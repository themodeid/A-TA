export interface RekapGajiDetail {
  id_detail: number;
  id_rekap: number;
  nama_komponen: string;
  jenis_komponen: "TUNJANGAN" | "POTONGAN";
  nilai: number;
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

export interface SlipGaji extends RekapGaji {
  details: RekapGajiDetail[];
}
