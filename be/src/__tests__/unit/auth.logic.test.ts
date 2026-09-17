/**
 * Unit Test for Authentication & Role-Based Access Control (RBAC) Logic
 * Verifies permission rules, role matrix, and access security.
 */

interface UserRolePayload {
  userId: number;
  username: string;
  role: 'admin' | 'petugas_absen' | 'approver' | 'staf_gaji' | 'pegawai';
}

function hasPermission(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole.toLowerCase());
}

function canApprovePayroll(role: string): boolean {
  return role.toLowerCase() === 'approver';
}

function canInputAbsensi(role: string): boolean {
  return ['admin', 'petugas_absen'].includes(role.toLowerCase());
}

function canManageMasterData(role: string): boolean {
  return role.toLowerCase() === 'admin';
}

function canProcessPayrollDraft(role: string): boolean {
  return ['admin', 'staf_gaji'].includes(role.toLowerCase());
}

describe("RBAC Security & Role Permission Verification", () => {
  it("allows only 'approver' (Kepala Sekolah) to approve payroll requests", () => {
    expect(canApprovePayroll("approver")).toBe(true);
    expect(canApprovePayroll("staf_gaji")).toBe(false);
    expect(canApprovePayroll("petugas_absen")).toBe(false);
    expect(canApprovePayroll("pegawai")).toBe(false);
  });

  it("allows only 'petugas_absen' and 'admin' to input attendance & hours", () => {
    expect(canInputAbsensi("petugas_absen")).toBe(true);
    expect(canInputAbsensi("admin")).toBe(true);
    expect(canInputAbsensi("pegawai")).toBe(false);
    expect(canInputAbsensi("approver")).toBe(false);
  });

  it("restricts master salary data CRUD strictly to 'admin'", () => {
    expect(canManageMasterData("admin")).toBe(true);
    expect(canManageMasterData("staf_gaji")).toBe(false);
    expect(canManageMasterData("pegawai")).toBe(false);
  });

  it("allows 'staf_gaji' to process payroll drafts and generate payments", () => {
    expect(canProcessPayrollDraft("staf_gaji")).toBe(true);
    expect(canProcessPayrollDraft("admin")).toBe(true);
    expect(canProcessPayrollDraft("petugas_absen")).toBe(false);
  });

  it("correctly identifies generic permission matching across routes", () => {
    const managerRoles = ["admin", "approver", "staf_gaji"];
    expect(hasPermission("admin", managerRoles)).toBe(true);
    expect(hasPermission("staf_gaji", managerRoles)).toBe(true);
    expect(hasPermission("pegawai", managerRoles)).toBe(false);
  });
});
