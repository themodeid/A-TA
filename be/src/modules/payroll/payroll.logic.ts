/**
 * Pure Domain Logic for Payroll Calculations (SMK PSKD 3 Jakarta)
 * 100% Deterministic & Unit Testable without Database Side-Effects
 */

export interface TunjanganKeluargaInput {
  gajiPokok: number;
  statusKawin: 'K' | 'TK' | string; // K = Kawin, TK = Tidak Kawin
  jumlahAnak: number;
}

export interface TunjanganKeluargaResult {
  tunjanganIstri: number;
  tunjanganAnak: number;
  totalTunjanganKeluarga: number;
}

export interface HonorJamLebihInput {
  jamWajib: number;
  jamRiil: number;
  tarifPerJam: number;
}

export interface TunjanganKehadiranInput {
  hariHadirWfo: number;
  tarifWfoPerHari: number;
  hariHadirWfh?: number;
  tarifWfhPerHari?: number;
}

export interface PotonganInput {
  simpananWajibKoperasi?: number;
  angsuranPinjamanKasbon?: number;
  potonganBpjsPelkes?: number;
  potonganLainnya?: number;
}

export interface PayrollSummaryInput {
  gajiPokok: number;
  tunjanganKeluarga: number;
  tunjanganJabatan: number;
  tunjanganKesra: number;
  tunjanganKehadiran: number;
  honorJamLebih: number;
  totalPotongan: number;
}

export interface PayrollSummaryResult {
  totalPendapatanBruto: number;
  totalPotongan: number;
  takeHomePayClean: number;
}

/**
 * 1. Kalkulasi Tunjangan Keluarga
 * - Tunjangan Istri: 10% dari Gaji Pokok jika status Kawin ('K')
 * - Tunjangan Anak: 2% dari Gaji Pokok per anak, MAKSIMAL 2 orang anak
 */
export function calculateTunjanganKeluarga(input: TunjanganKeluargaInput): TunjanganKeluargaResult {
  const { gajiPokok, statusKawin, jumlahAnak } = input;
  
  if (gajiPokok <= 0) {
    return { tunjanganIstri: 0, tunjanganAnak: 0, totalTunjanganKeluarga: 0 };
  }

  // Tunjangan Istri (10% jika K)
  const isKawin = statusKawin.toUpperCase() === 'K';
  const tunjanganIstri = isKawin ? Math.round(gajiPokok * 0.10) : 0;

  // Tunjangan Anak (2% per anak, maksimal 2 anak)
  const validJumlahAnak = Math.max(0, Math.min(Math.floor(jumlahAnak), 2));
  const tunjanganAnak = Math.round(gajiPokok * 0.02 * validJumlahAnak);

  return {
    tunjanganIstri,
    tunjanganAnak,
    totalTunjanganKeluarga: tunjanganIstri + tunjanganAnak
  };
}

/**
 * 2. Kalkulasi Honor Jam Lebih Mengajar (Guru)
 * - Selisih Jam = Jam Riil - Jam Wajib
 * - Jika Jam Riil <= Jam Wajib, honor = 0 (tidak ada nilai minus)
 * - Formula: Selisih Jam * Tarif Per Jam
 */
export function calculateHonorJamLebih(input: HonorJamLebihInput): { jamLebih: number; totalHonor: number } {
  const { jamWajib, jamRiil, tarifPerJam } = input;
  
  const selisih = jamRiil - jamWajib;
  if (selisih <= 0 || tarifPerJam <= 0) {
    return { jamLebih: 0, totalHonor: 0 };
  }

  const jamLebih = Number(selisih.toFixed(2));
  const totalHonor = Math.round(jamLebih * tarifPerJam);

  return { jamLebih, totalHonor };
}

/**
 * 3. Kalkulasi Tunjangan Kehadiran (Transport & Konsumsi WFO/WFH)
 */
export function calculateTunjanganKehadiran(input: TunjanganKehadiranInput): number {
  const { hariHadirWfo, tarifWfoPerHari, hariHadirWfh = 0, tarifWfhPerHari = 0 } = input;
  
  const wfoTotal = Math.max(0, hariHadirWfo) * Math.max(0, tarifWfoPerHari);
  const wfhTotal = Math.max(0, hariHadirWfh) * Math.max(0, tarifWfhPerHari);

  return Math.round(wfoTotal + wfhTotal);
}

/**
 * 4. Kalkulasi Akumulasi Potongan
 */
export function calculateTotalPotongan(input: PotonganInput): number {
  const {
    simpananWajibKoperasi = 0,
    angsuranPinjamanKasbon = 0,
    potonganBpjsPelkes = 0,
    potonganLainnya = 0
  } = input;

  return Math.round(
    Math.max(0, simpananWajibKoperasi) +
    Math.max(0, angsuranPinjamanKasbon) +
    Math.max(0, potonganBpjsPelkes) +
    Math.max(0, potonganLainnya)
  );
}

/**
 * 5. Kalkulasi Akhir: Total Penghasilan Bruto & Take Home Pay (Netto)
 */
export function calculatePayrollSummary(input: PayrollSummaryInput): PayrollSummaryResult {
  const {
    gajiPokok,
    tunjanganKeluarga,
    tunjanganJabatan,
    tunjanganKesra,
    tunjanganKehadiran,
    honorJamLebih,
    totalPotongan
  } = input;

  const totalPendapatanBruto = Math.round(
    Math.max(0, gajiPokok) +
    Math.max(0, tunjanganKeluarga) +
    Math.max(0, tunjanganJabatan) +
    Math.max(0, tunjanganKesra) +
    Math.max(0, tunjanganKehadiran) +
    Math.max(0, honorJamLebih)
  );

  const cleanPotongan = Math.max(0, totalPotongan);
  const takeHomePayClean = totalPendapatanBruto - cleanPotongan;

  return {
    totalPendapatanBruto,
    totalPotongan: cleanPotongan,
    takeHomePayClean
  };
}

/**
 * 6. Validasi Tanggal Cut-off Penggajian (Siklus Tgl 16 s.d. Tgl 15)
 */
export function isDateWithinCutoff(dateStr: string, cutoffStartStr: string, cutoffEndStr: string): boolean {
  const target = new Date(dateStr).getTime();
  const start = new Date(cutoffStartStr).getTime();
  const end = new Date(cutoffEndStr).getTime();

  if (isNaN(target) || isNaN(start) || isNaN(end)) {
    return false;
  }

  return target >= start && target <= end;
}

/**
 * 7. Kalkulasi Koreksi Jam Mengajar
 */
export function applyKoreksiJam(jamAwal: number, jamKoreksi: number, jenisKoreksi: 'ADD' | 'SUBTRACT'): number {
  if (jenisKoreksi === 'ADD') {
    return Number((jamAwal + Math.max(0, jamKoreksi)).toFixed(2));
  } else if (jenisKoreksi === 'SUBTRACT') {
    return Number(Math.max(0, jamAwal - Math.max(0, jamKoreksi)).toFixed(2));
  }
  return jamAwal;
}
