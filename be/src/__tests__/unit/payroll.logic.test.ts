/**
 * Unit Test for SMK PSKD 3 Payroll Logic Engine
 * Verifies mathematical formulas, edge cases, allowance caps, and Netto/THP calculations.
 */

import {
  calculateTunjanganKeluarga,
  calculateHonorJamLebih,
  calculateTunjanganKehadiran,
  calculateTotalPotongan,
  calculatePayrollSummary,
  isDateWithinCutoff,
  applyKoreksiJam
} from "../../modules/payroll/payroll.logic";

describe("Payroll Calculation Engine — Tunjangan Keluarga", () => {
  it("calculates family allowance for married teacher with 2 children (Kasus Bpk. Hendra)", () => {
    const result = calculateTunjanganKeluarga({
      gajiPokok: 1850000,
      statusKawin: "K",
      jumlahAnak: 2
    });

    expect(result.tunjanganIstri).toBe(185000); // 10% of 1.850.000
    expect(result.tunjanganAnak).toBe(74000);   // 2% * 2 = 4% of 1.850.000
    expect(result.totalTunjanganKeluarga).toBe(259000);
  });

  it("strictly caps child allowance to maximum 2 children (Rule Yayasan & PP 85/97)", () => {
    const result = calculateTunjanganKeluarga({
      gajiPokok: 2000000,
      statusKawin: "K",
      jumlahAnak: 5 // 5 children, but max is 2
    });

    expect(result.tunjanganIstri).toBe(200000); // 10%
    expect(result.tunjanganAnak).toBe(80000);   // only 2 children counted (4%)
    expect(result.totalTunjanganKeluarga).toBe(280000);
  });

  it("returns zero allowance for unmarried employee (TK)", () => {
    const result = calculateTunjanganKeluarga({
      gajiPokok: 1500000,
      statusKawin: "TK",
      jumlahAnak: 0
    });

    expect(result.tunjanganIstri).toBe(0);
    expect(result.tunjanganAnak).toBe(0);
    expect(result.totalTunjanganKeluarga).toBe(0);
  });

  it("handles zero or negative base salary safely", () => {
    const result = calculateTunjanganKeluarga({
      gajiPokok: 0,
      statusKawin: "K",
      jumlahAnak: 2
    });

    expect(result.totalTunjanganKeluarga).toBe(0);
  });
});

describe("Payroll Calculation Engine — Honor Jam Lebih Mengajar", () => {
  it("calculates overtime teaching hours correctly (Kasus Bpk. Hendra: 84 riil vs 72 wajib)", () => {
    const result = calculateHonorJamLebih({
      jamWajib: 72,
      jamRiil: 84,
      tarifPerJam: 35000
    });

    expect(result.jamLebih).toBe(12);
    expect(result.totalHonor).toBe(420000); // 12 * 35.000
  });

  it("prevents negative overtime hours when actual hours are less than required hours", () => {
    const result = calculateHonorJamLebih({
      jamWajib: 72,
      jamRiil: 60, // Under required hours
      tarifPerJam: 35000
    });

    expect(result.jamLebih).toBe(0);
    expect(result.totalHonor).toBe(0);
  });

  it("returns 0 when actual hours equal required hours", () => {
    const result = calculateHonorJamLebih({
      jamWajib: 72,
      jamRiil: 72,
      tarifPerJam: 35000
    });

    expect(result.jamLebih).toBe(0);
    expect(result.totalHonor).toBe(0);
  });
});

describe("Payroll Calculation Engine — Kehadiran & Potongan", () => {
  it("calculates WFO presence incentive accurately (20 hari @ Rp 25.000)", () => {
    const total = calculateTunjanganKehadiran({
      hariHadirWfo: 20,
      tarifWfoPerHari: 25000
    });

    expect(total).toBe(500000);
  });

  it("calculates total deductions properly (Koperasi, Kasbon, BPJS)", () => {
    const total = calculateTotalPotongan({
      simpananWajibKoperasi: 50000,
      angsuranPinjamanKasbon: 200000,
      potonganBpjsPelkes: 65000
    });

    expect(total).toBe(315000);
  });
});

describe("Payroll Calculation Engine — End-to-End Netto / Take Home Pay", () => {
  it("validates 100% precision for GTY Kasus 1 (Bpk. Hendra Pratama -> THP Rp 3.314.000)", () => {
    const summary = calculatePayrollSummary({
      gajiPokok: 1850000,
      tunjanganKeluarga: 259000, // Istri 185.000 + Anak 74.000
      tunjanganJabatan: 250000,  // Wali Kelas
      tunjanganKesra: 350000,
      tunjanganKehadiran: 500000, // 20 hari WFO
      honorJamLebih: 420000,      // 12 jam lebih
      totalPotongan: 315000       // Koperasi 50k + Kasbon 200k + BPJS 65k
    });

    expect(summary.totalPendapatanBruto).toBe(3629000);
    expect(summary.totalPotongan).toBe(315000);
    expect(summary.takeHomePayClean).toBe(3314000); // Rp 3.314.000 MATCH!
  });

  it("validates 100% precision for PTY Kasus 2 (Ibu Fitriani -> THP Rp 2.555.000)", () => {
    const summary = calculatePayrollSummary({
      gajiPokok: 1500000,
      tunjanganKeluarga: 0,
      tunjanganJabatan: 150000,
      tunjanganKesra: 250000,
      tunjanganKehadiran: 550000, // 22 hari WFO
      honorJamLebih: 150000,      // 5 jam lembur TU
      totalPotongan: 45000        // BPJS
    });

    expect(summary.totalPendapatanBruto).toBe(2600000);
    expect(summary.totalPotongan).toBe(45000);
    expect(summary.takeHomePayClean).toBe(2555000); // Rp 2.555.000 MATCH!
  });
});

describe("Payroll Calculation Engine — Cut-off Date & Koreksi Jam Rules", () => {
  it("validates dates strictly within monthly cut-off period (16 Mei - 15 Juni 2026)", () => {
    const start = "2026-05-16";
    const end = "2026-06-15";

    expect(isDateWithinCutoff("2026-05-20", start, end)).toBe(true);
    expect(isDateWithinCutoff("2026-06-10", start, end)).toBe(true);
    expect(isDateWithinCutoff("2026-05-15", start, end)).toBe(false); // Before cutoff
    expect(isDateWithinCutoff("2026-06-16", start, end)).toBe(false); // After cutoff
  });

  it("applies koreksi jam addition (ADD) correctly", () => {
    const result = applyKoreksiJam(10, 2.5, "ADD");
    expect(result).toBe(12.5);
  });

  it("applies koreksi jam subtraction (SUBTRACT) and prevents negative values", () => {
    const result1 = applyKoreksiJam(10, 3, "SUBTRACT");
    expect(result1).toBe(7);

    const result2 = applyKoreksiJam(2, 5, "SUBTRACT");
    expect(result2).toBe(0); // Clamped at 0
  });
});
