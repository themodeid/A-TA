"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { canAccessRoute } from "@/lib/permissions";
import { UserRole } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📊", roles: ["Admin", "Petugas Absensi", "Approver", "Staf Gaji"] },
  { href: "/master/pegawai", label: "Master Pegawai", icon: "👥", roles: ["Admin"] },
  { href: "/master/jabatan", label: "Master Jabatan", icon: "💼", roles: ["Admin"] },
  { href: "/master/golongan", label: "Master Golongan", icon: "🎖️", roles: ["Admin"] },
  { href: "/master/komponen", label: "Master Komponen", icon: "⚙️", roles: ["Admin"] },
  { href: "/periode", label: "Periode Gaji", icon: "📅", roles: ["Admin", "Staf Gaji"] },
  { href: "/transaksi/absensi", label: "Absensi", icon: "✅", roles: ["Admin", "Petugas Absensi", "Staf Gaji"] },
  { href: "/transaksi/tunjangan", label: "Tunjangan", icon: "💰", roles: ["Admin", "Staf Gaji"] },
  { href: "/transaksi/potongan", label: "Potongan", icon: "📉", roles: ["Admin", "Staf Gaji"] },
  { href: "/approval", label: "Approval", icon: "✔️", roles: ["Admin", "Approver"] },
  { href: "/rekap-gaji", label: "Rekap Gaji", icon: "📋", roles: ["Admin", "Staf Gaji"] },
  { href: "/audit/koreksi-jam", label: "Audit Koreksi Jam", icon: "🔍", roles: ["Admin", "Staf Gaji"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role) && canAccessRoute(user.role, item.href),
  );

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-zinc-800/80 bg-zinc-950 text-zinc-100 shrink-0 print:hidden">
      <div className="border-b border-zinc-800/80 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-850 border border-zinc-750 font-semibold text-zinc-100 text-xs tracking-tight">
            SIP
          </div>
          <div>
            <h1 className="text-xs font-semibold tracking-tight text-zinc-100">SIP Payroll</h1>
            <p className="text-[10px] text-zinc-500">SMK PSKD 3 Jakarta</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-2">
          Menu Utama
        </p>
        {visibleItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                active
                  ? "bg-zinc-900 text-zinc-100 border border-zinc-800 font-medium"
                  : "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
              }`}
            >
              <span className="text-sm opacity-70">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800/80 p-3">
        <div className="mb-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80 px-3 py-2">
          <p className="text-xs font-medium text-zinc-200 truncate">{user?.nama || user?.username}</p>
          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/20"
        >
          <span>🚪</span> Keluar
        </button>
      </div>
    </aside>
  );
}
