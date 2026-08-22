export interface RekapGajiDetail {
  id_rekap_detail?: number;
  id_detail?: number;
  id_rekap: number;
  nama_komponen_snapshot?: string;
  nama_komponen?: string;
  jenis_komponen: "TUNJANGAN" | "POTONGAN";
  nilai_snapshot?: number | string;
  nilai?: number | string;
  kode_kondisi_snapshot?: string;
}

export interface RekapGaji {
  id_rekap: number;
  id_periode: number;
  id_pegawai: number;
  nama_dan_tanggal_lahir?: string;
  jabatan_snapshot?: string;
  pangkat_golongan_snapshot?: string;
  golongan_snapshot?: string;
  gaji_pokok_snapshot?: number | string;
  total_penghasilan_bruto?: number | string;
  total_penerimaan_clean?: number | string;
  total_potongan?: number | string;
  total_potongan_clean?: number | string;
  netto_clean?: number | string;
  total_hadir_wfo?: number;
  total_hadir_wfh?: number;
  transport_uang_makan?: number | string;
  tunjangan_jabatan_dll?: number | string;
  created_at?: string;
}

export interface SlipGaji extends RekapGaji {
  details: RekapGajiDetail[];
}
