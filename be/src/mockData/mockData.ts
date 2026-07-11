// src/data/mockData.ts

export interface SlipGajiDetail {
  id_rekap: number;
  nama_pegawai: string;
  jabatan: string;
  golongan: string;
  gaji_pokok: number;
  total_bruto: number;
  total_potongan: number;
  gaji_netto: number;
  komponen: {
    jenis_komponen: "TUNJANGAN" | "POTONGAN";
    nama_komponen: string;
    nilai: number;
  }[];
}

export const mockSlipAdam: SlipGajiDetail = {
  id_rekap: 99,
  nama_pegawai: "Adam Wahyu Kurniawan",
  jabatan: "Guru Tetap / Staf TU",
  golongan: "Golongan III/a (Penata Muda)",
  gaji_pokok: 3000000,
  total_bruto: 4210000, // Hasil Auto-kalkulasi DB
  total_potongan: 100000,
  gaji_netto: 4110000,
  komponen: [
    {
      jenis_komponen: "TUNJANGAN",
      nama_komponen: "Tunjangan Istri",
      nilai: 300000,
    },
    {
      jenis_komponen: "TUNJANGAN",
      nama_komponen: "Uang Transport WFO (20 Hari)",
      nilai: 600000,
    },
    {
      jenis_komponen: "TUNJANGAN",
      nama_komponen: "Honor Lembur (10 Jam)",
      nilai: 250000,
    },
    {
      jenis_komponen: "TUNJANGAN",
      nama_komponen: "Tunjangan Anak (1 Anak)",
      nilai: 60000,
    },
    {
      jenis_komponen: "POTONGAN",
      nama_komponen: "Potongan Dana Wajib",
      nilai: 50000,
    },
    {
      jenis_komponen: "POTONGAN",
      nama_komponen: "Potongan Pelkes",
      nilai: 30000,
    },
    {
      jenis_komponen: "POTONGAN",
      nama_komponen: "Potongan S_PSKD",
      nilai: 20000,
    },
  ],
};
