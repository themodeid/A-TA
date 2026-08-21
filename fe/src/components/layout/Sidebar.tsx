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
  { href: "/master/komponen", label: "Master Komponen", icon: "⚙️", roles: ["Admin"] },
  { href: "/periode", label: "Periode Gaji", icon: "📅", roles: ["Admin", "Staf Gaji"] },
  { href: "/transaksi/absensi", label: "Absensi", icon: "✅", roles: ["Petugas Absensi", "Staf Gaji"] },
  { href: "/transaksi/tunjangan", label: "Tunjangan", icon: "💰", roles: ["Staf Gaji"] },
  { href: "/transaksi/potongan", label: "Potongan", icon: "📉", roles: ["Staf Gaji"] },
  { href: "/approval", label: "Approval", icon: "✔️", roles: ["Approver"] },
  { href: "/rekap-gaji", label: "Rekap Gaji", icon: "📋", roles: ["Staf Gaji", "Admin"] },
  { href: "/audit/koreksi-jam", label: "Audit Koreksi Jam", icon: "🔍", roles: ["Staf Gaji", "Admin"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role) && canAccessRoute(user.role, item.href),
  );

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900 text-white">
      <div className="border-b border-slate-800 px-6 py-5">
        <h1 className="text-lg font-bold tracking-tight">SIP Payroll</h1>
        <p className="text-xs text-slate-400">Sistem Informasi Penggajian</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 rounded-lg bg-slate-800 px-3 py-2">
          <p className="text-sm font-medium">{user?.nama}</p>
          <p className="text-xs text-slate-400">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
        >
          Keluar
        </button>
      </div>
    </aside>
  );
}
