export interface Pegawai {
  id_pegawai: number;
  nama_dan_tanggal_lahir: string;
  nama_jabatan?: string;
  nama_golongan?: string;
  status_perkawinan: string;
  jumlah_anak?: number;
  gaji_pokok_dasar: number;
}

export interface MasterTunjangan {
  id_tunjangan: number;
  nama_tunjangan: string;
  formula_type?: string;
  nilai?: number;
  jenis_tunjangan?: string;
  sifat_tunjangan?: string;
  keterangan?: string;
  kode_kondisi?: string;
  is_active?: boolean;
}

export interface MasterPotongan {
  id_master_potongan: number;
  nama_potongan: string;
  kode_potongan?: string;
  nilai?: number;
  jenis_potongan?: string;
  sifat_potongan?: string;
  formula_type?: string;
  keterangan?: string;
  is_active?: boolean;
}
