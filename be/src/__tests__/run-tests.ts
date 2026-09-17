/**
 * Zero-Dependency Standalone Unit Test Runner for A-TA Backend
 * Runs directly via ts-node without needing external test packages.
 */

import {
  calculateTunjanganKeluarga,
  calculateHonorJamLebih,
  calculateTunjanganKehadiran,
  calculateTotalPotongan,
  calculatePayrollSummary,
  isDateWithinCutoff,
  applyKoreksiJam
} from "../modules/payroll/payroll.logic";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(description: string, condition: boolean, actual?: any, expected?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${description}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${description}`);
    if (actual !== undefined && expected !== undefined) {
      console.error(`     Expected: ${expected}, Got: ${actual}`);
    }
  }
}

console.log("\n=======================================================");
console.log("   A-TA PSKD 3 PAYROLL CALCULATION ENGINE - TEST SUITE ");
console.log("=======================================================\n");

// Suite 1: Tunjangan Keluarga
console.log("Suite 1: Tunjangan Keluarga (PP 85/97 & Kebijakan Yayasan)");
const tk1 = calculateTunjanganKeluarga({ gajiPokok: 1850000, statusKawin: "K", jumlahAnak: 2 });
assert("Bpk. Hendra (Kawin, 2 anak): Tunjangan Istri = 10% (Rp 185.000)", tk1.tunjanganIstri === 185000, tk1.tunjanganIstri, 185000);
assert("Bpk. Hendra (Kawin, 2 anak): Tunjangan Anak = 4% (Rp 74.000)", tk1.tunjanganAnak === 74000, tk1.tunjanganAnak, 74000);
assert("Bpk. Hendra: Total Tunjangan Keluarga = Rp 259.000", tk1.totalTunjanganKeluarga === 259000, tk1.totalTunjanganKeluarga, 259000);

const tk2 = calculateTunjanganKeluarga({ gajiPokok: 2000000, statusKawin: "K", jumlahAnak: 5 });
assert("Cap anak maksimal 2 (5 anak diinput -> hanya 2 anak dihitung)", tk2.tunjanganAnak === 80000, tk2.tunjanganAnak, 80000);

const tk3 = calculateTunjanganKeluarga({ gajiPokok: 1500000, statusKawin: "TK", jumlahAnak: 0 });
assert("Pegawai Belum Kawin (TK) -> Tunjangan Keluarga = 0", tk3.totalTunjanganKeluarga === 0, tk3.totalTunjanganKeluarga, 0);

// Suite 2: Honor Jam Lebih Mengajar
console.log("\nSuite 2: Honor Jam Lebih Mengajar");
const hj1 = calculateHonorJamLebih({ jamWajib: 72, jamRiil: 84, tarifPerJam: 35000 });
assert("Jam Riil 84 vs Wajib 72 -> 12 Jam Lebih", hj1.jamLebih === 12, hj1.jamLebih, 12);
assert("Honor Jam Lebih = 12 * Rp 35.000 = Rp 420.000", hj1.totalHonor === 420000, hj1.totalHonor, 420000);

const hj2 = calculateHonorJamLebih({ jamWajib: 72, jamRiil: 60, tarifPerJam: 35000 });
assert("Jam Riil di bawah Wajib (60 vs 72) -> 0 jam lebih (tidak minus)", hj2.jamLebih === 0 && hj2.totalHonor === 0);

// Suite 3: Kehadiran & Potongan
console.log("\nSuite 3: Tunjangan Kehadiran & Potongan Wajib");
const hadir = calculateTunjanganKehadiran({ hariHadirWfo: 20, tarifWfoPerHari: 25000 });
assert("Kehadiran WFO 20 hari @ Rp 25.000 = Rp 500.000", hadir === 500000, hadir, 500000);

const pot = calculateTotalPotongan({ simpananWajibKoperasi: 50000, angsuranPinjamanKasbon: 200000, potonganBpjsPelkes: 65000 });
assert("Total Potongan = Rp 315.000 (Koperasi 50k + Kasbon 200k + BPJS 65k)", pot === 315000, pot, 315000);

// Suite 4: End-to-End Netto / Take Home Pay
console.log("\nSuite 4: End-to-End Simulation Take Home Pay");
const sum1 = calculatePayrollSummary({
  gajiPokok: 1850000,
  tunjanganKeluarga: 259000,
  tunjanganJabatan: 250000,
  tunjanganKesra: 350000,
  tunjanganKehadiran: 500000,
  honorJamLebih: 420000,
  totalPotongan: 315000
});
assert("Kasus 1 GTY (Bpk. Hendra): Bruto = Rp 3.629.000", sum1.totalPendapatanBruto === 3629000, sum1.totalPendapatanBruto, 3629000);
assert("Kasus 1 GTY (Bpk. Hendra): Take Home Pay = Rp 3.314.000 (100% Match)", sum1.takeHomePayClean === 3314000, sum1.takeHomePayClean, 3314000);

const sum2 = calculatePayrollSummary({
  gajiPokok: 1500000,
  tunjanganKeluarga: 0,
  tunjanganJabatan: 150000,
  tunjanganKesra: 250000,
  tunjanganKehadiran: 550000,
  honorJamLebih: 150000,
  totalPotongan: 45000
});
assert("Kasus 2 PTY (Ibu Fitriani): Take Home Pay = Rp 2.555.000 (100% Match)", sum2.takeHomePayClean === 2555000, sum2.takeHomePayClean, 2555000);

// Suite 5: Cutoff & Koreksi Jam
console.log("\nSuite 5: Cutoff & Koreksi Jam Mengajar");
assert("Validasi Cut-off Tgl 20 Mei di antara 16 Mei - 15 Juni = TRUE", isDateWithinCutoff("2026-05-20", "2026-05-16", "2026-06-15") === true);
assert("Validasi Cut-off Tgl 15 Mei di luar periode = FALSE", isDateWithinCutoff("2026-05-15", "2026-05-16", "2026-06-15") === false);
assert("Koreksi jam ADD: 10 + 2.5 = 12.5", applyKoreksiJam(10, 2.5, "ADD") === 12.5);
assert("Koreksi jam SUBTRACT: 2 - 5 dikunci di 0 (clamp)", applyKoreksiJam(2, 5, "SUBTRACT") === 0);

console.log("\n=======================================================");
console.log(` HASIL: Total: ${totalTests} | Lulus: ${passedTests} | Gagal: ${failedTests}`);
console.log("=======================================================\n");

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log("🎉 SELURUH FORMULA MATEMATIS PENGGAJIAN TERBUKTI 100% VALID!\n");
}
