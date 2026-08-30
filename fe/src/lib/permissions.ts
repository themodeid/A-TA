import { PeriodeStatus, UserRole } from "@/types";

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/dashboard": ["Admin", "Petugas Absensi", "Approver", "Staf Gaji"],
  "/master/pegawai": ["Admin"],
  "/master/jabatan": ["Admin"],
  "/master/golongan": ["Admin"],
  "/master/komponen": ["Admin"],
  "/periode": ["Admin", "Staf Gaji"],
  "/transaksi/absensi": ["Admin", "Petugas Absensi", "Staf Gaji"],
  "/transaksi/tunjangan": ["Admin", "Staf Gaji"],
  "/transaksi/potongan": ["Admin", "Staf Gaji"],
  "/approval": ["Admin", "Approver"],
  "/rekap-gaji": ["Admin", "Staf Gaji"],
  "/audit/koreksi-jam": ["Admin", "Staf Gaji"],
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
      return "bg-amber-950/40 text-amber-300 border-amber-800/60";
    case "Menunggu Approval":
      return "bg-orange-950/40 text-orange-300 border-orange-800/60";
    case "Disetujui":
    case "Diproses Gaji":
      return "bg-blue-950/40 text-blue-300 border-blue-800/60";
    case "Selesai":
      return "bg-emerald-950/40 text-emerald-300 border-emerald-800/60";
    case "Ditolak":
      return "bg-red-950/40 text-red-300 border-red-800/60";
    default:
      return "bg-zinc-800 text-zinc-300 border-zinc-700";
  }
}
