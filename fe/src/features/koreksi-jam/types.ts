export interface KoreksiJam {
  id_koreksi: number;
  id_periode: number;
  bulan_gaji?: string;
  status_periode?: string;
  id_pegawai: number;
  nama_pegawai?: string;
  nama_jabatan?: string;
  nama_golongan?: string;
  id_staf_gaji: number;
  nama_staf_gaji?: string;
  jam_awal: number | string;
  jam_koreksi: number | string;
  jam_akhir: number | string;
  jenis_koreksi: "ADD" | "SUBTRACT";
  keterangan: string;
  bukti_dokumen?: string;
  created_at: string;
}

export interface CreateKoreksiJamPayload {
  id_periode: number;
  id_pegawai: number;
  id_staf_gaji?: number;
  jam_koreksi: number;
  jenis_koreksi: "ADD" | "SUBTRACT";
  keterangan: string;
  bukti_dokumen?: string;
}
