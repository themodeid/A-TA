import { PeriodeStatus, UserRole } from "@/types";

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/dashboard": ["Admin", "Petugas Absensi", "Approver", "Staf Gaji"],
  "/master/pegawai": ["Admin"],
  "/master/komponen": ["Admin"],
  "/periode": ["Admin", "Staf Gaji"],
  "/transaksi/absensi": ["Petugas Absensi", "Staf Gaji"],
  "/transaksi/tunjangan": ["Staf Gaji"],
  "/transaksi/potongan": ["Staf Gaji"],
  "/approval": ["Approver"],
  "/rekap-gaji": ["Staf Gaji", "Admin"],
  "/audit/koreksi-jam": ["Staf Gaji", "Admin"],
};

export function canAccessRoute(role: UserRole, path: string): boolean {
  const normalized = path.replace(/\/$/, "") || "/dashboard";
  const slipMatch = normalized.match(/^\/rekap-gaji\/slip\/\d+$/);
  if (slipMatch) {
    return ROUTE_PERMISSIONS["/rekap-gaji"].includes(role);
  }
  const allowed = ROUTE_PERMISSIONS[normalized];
  if (!allowed) return true;
  return allowed.includes(role);
}

export function isPeriodeLocked(status: PeriodeStatus): boolean {
  return (
    status === "Menunggu Approval" ||
    status === "Disetujui" ||
    status === "Diproses Gaji" ||
    status === "Selesai"
  );
}

export function getStatusBadgeColor(status: PeriodeStatus): string {
  switch (status) {
    case "Pengisian Absensi":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "Menunggu Approval":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "Disetujui":
    case "Diproses Gaji":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Selesai":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Ditolak":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
}
