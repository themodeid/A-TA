"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { DashboardAlert } from "@/types";
import { Button } from "@/components/ui/Button";

interface QuickActionsProps {
  alerts: DashboardAlert[];
  onBukaPeriode?: () => void;
}

export function QuickActionsPanel({
  alerts,
  onBukaPeriode,
}: QuickActionsProps) {
  const { user } = useAuth();
  const role = user?.role;

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Aksi Cepat
        </h3>
        <div className="space-y-2.5">
          {(role === "Staf Gaji" || role === "Admin") && (
            <>
              <Link href="/transaksi/potongan" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  Input Potongan Bulk
                </Button>
              </Link>
              <Link href="/rekap-gaji" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  Proses Rekap Gaji
                </Button>
              </Link>
            </>
          )}

          {role === "Approver" && (
            <Link href="/approval" className="block">
              <Button
                variant="primary"
                className="w-full justify-start bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
              >
                Review & Approve Periode
              </Button>
            </Link>
          )}

          {(role === "Admin" || role === "Staf Gaji") && (
            <>
              <Link href="/transaksi/absensi" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  Lanjut ke Absensi
                </Button>
              </Link>
              {onBukaPeriode && (
                <Button
                  variant="secondary"
                  className="w-full justify-start border border-slate-700/60 bg-slate-800/80 text-slate-200 hover:bg-slate-700"
                  onClick={onBukaPeriode}
                >
                  Buka Periode Baru
                </Button>
              )}
            </>
          )}

          {role === "Petugas Absensi" && (
            <Link href="/transaksi/absensi" className="block">
              <Button
                variant="primary"
                className="w-full justify-start bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
              >
                Input Absensi
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* System Alerts */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Peringatan Sistem
        </h3>
        {alerts.length === 0 ? (
          <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3.5 py-2.5 text-xs font-medium text-emerald-400">
            ✓ Tidak ada peringatan aktif.
          </div>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert, i) => (
              <li
                key={i}
                className={`rounded-lg border px-3.5 py-2.5 text-xs font-medium ${
                  alert.type === "warning"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : alert.type === "error"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                      : "border-sky-500/30 bg-sky-500/10 text-sky-300"
                }`}
              >
                {alert.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
