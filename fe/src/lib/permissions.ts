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
      return "bg-amber-900/30 text-amber-400 border-amber-800";
    case "Menunggu Approval":
      return "bg-orange-900/30 text-orange-400 border-orange-800";
    case "Disetujui":
    case "Diproses Gaji":
      return "bg-blue-900/30 text-blue-400 border-blue-800";
    case "Selesai":
      return "bg-emerald-900/30 text-emerald-400 border-emerald-800";
    case "Ditolak":
      return "bg-red-900/30 text-red-400 border-red-800";
    default:
      return "bg-slate-800 text-slate-300 border-slate-700";
  }
}
