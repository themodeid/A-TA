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
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "Menunggu Approval":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "Disetujui":
    case "Diproses Gaji":
      return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    case "Selesai":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "Ditolak":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    default:
      return "bg-zinc-800/60 text-zinc-400 border-zinc-700/50";
  }
}
