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
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Aksi Cepat
        </h3>
        <div className="space-y-2">
          {(role === "Staf Gaji" || role === "Admin") && (
            <>
              <Link href="/transaksi/potongan">
                <Button variant="outline" className="w-full justify-start">
                  Input Potongan Bulk
                </Button>
              </Link>
              <Link href="/rekap-gaji">
                <Button variant="outline" className="w-full justify-start">
                  Proses Rekap Gaji
                </Button>
              </Link>
            </>
          )}
          {role === "Approver" && (
            <Link href="/approval">
              <Button variant="primary" className="w-full justify-start">
                Review & Approve Periode
              </Button>
            </Link>
          )}
          {(role === "Admin" || role === "Staf Gaji") && (
            <>
              <Link href="/transaksi/absensi">
                <Button variant="outline" className="w-full justify-start">
                  Lanjut ke Absensi
                </Button>
              </Link>
              {onBukaPeriode && (
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={onBukaPeriode}
                >
                  Buka Periode Baru
                </Button>
              )}
            </>
          )}
          {role === "Petugas Absensi" && (
            <Link href="/transaksi/absensi">
              <Button variant="primary" className="w-full justify-start">
                Input Absensi
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Peringatan Sistem
        </h3>
        {alerts.length === 0 ? (
          <p className="rounded-lg bg-emerald-900/30 px-3 py-2 text-sm text-emerald-400">
            Tidak ada peringatan aktif.
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert, i) => (
              <li
                key={i}
                className={`rounded-lg px-3 py-2 text-sm ${
                  alert.type === "warning"
                    ? "bg-amber-900/30 text-amber-300"
                    : alert.type === "error"
                      ? "bg-red-900/30 text-red-300"
                      : "bg-blue-900/30 text-blue-300"
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
