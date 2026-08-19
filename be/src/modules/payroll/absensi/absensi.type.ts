export interface BarisAbsensiMentah {
  id_pegawai?: string;
  tanggal?: string | number;
  status_kehadiran?: string;
  keterangan?: string;
}

export interface BarisGagal {
  baris: number;
  alasan: string;
  data: BarisAbsensiMentah | any;
}

export interface BarisValid {
  id_pegawai: string;
  tanggal: string;
  status_kehadiran: string;
  keterangan: string;
}
