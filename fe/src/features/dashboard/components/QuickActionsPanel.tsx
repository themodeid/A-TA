"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { DashboardAlert } from "@/types";

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
      {/* Role Badge Indicator */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 border border-zinc-750 text-xs text-zinc-300">
            👤
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Peran Pengguna</p>
            <p className="text-xs font-semibold text-zinc-200">{role ?? "Pengguna"}</p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 font-medium">
          SMK PSKD 3
        </span>
      </div>

      {/* Alur Penggajian Cepat (Step-by-Step Payroll Workflow) */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400 flex items-center justify-between">
          <span>Alur Siklus Penggajian</span>
          <span className="text-[11px] text-zinc-500 font-mono">6 Tahapan</span>
        </h3>

        <div className="space-y-1.5">
          {/* LANGKAH 1: PERIODE */}
          <Link href="/periode" className="group block">
            <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5 transition-colors hover:border-zinc-700 hover:bg-zinc-850/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono font-medium">
                  1
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-200 group-hover:text-zinc-100">
                    Kelola Periode Gaji
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    Buka cut-off 16-15 & inisialisasi
                  </p>
                </div>
              </div>
              <span className="text-xs text-zinc-500 group-hover:text-zinc-300">➔</span>
            </div>
          </Link>

          {/* LANGKAH 2: ABSENSI */}
          <Link href="/transaksi/absensi" className="group block">
            <div className={`flex items-center justify-between rounded-xl border p-2.5 transition-colors ${
              role === "Petugas Absensi" 
                ? "border-zinc-600 bg-zinc-850/70 hover:bg-zinc-800/80" 
                : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-850/50"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono font-medium">
                  2
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-zinc-200 group-hover:text-zinc-100">
                      Rekap Absensi
                    </p>
                    {role === "Petugas Absensi" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-medium border border-zinc-700">Tugas Anda</span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Input WFO, WFH, Izin & Sakit
                  </p>
                </div>
              </div>
              <span className="text-xs text-zinc-500 group-hover:text-zinc-300">➔</span>
            </div>
          </Link>

          {/* LANGKAH 3: TUNJANGAN & LEMBUR */}
          <Link href="/transaksi/tunjangan" className="group block">
            <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5 transition-colors hover:border-zinc-700 hover:bg-zinc-850/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono font-medium">
                  3
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-200 group-hover:text-zinc-100">
                    Tunjangan & Lembur
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    Input jam lebih, honor & tunjangan
                  </p>
                </div>
              </div>
              <span className="text-xs text-zinc-500 group-hover:text-zinc-300">➔</span>
            </div>
          </Link>

          {/* LANGKAH 4: POTONGAN BULANAN */}
          <Link href="/transaksi/potongan" className="group block">
            <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5 transition-colors hover:border-zinc-700 hover:bg-zinc-850/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono font-medium">
                  4
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-200 group-hover:text-zinc-100">
                    Potongan Bulanan
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    Angsuran pinjaman & iuran rutin
                  </p>
                </div>
              </div>
              <span className="text-xs text-zinc-500 group-hover:text-zinc-300">➔</span>
            </div>
          </Link>

          {/* LANGKAH 5: APPROVAL KEPSEK */}
          <Link href="/approval" className="group block">
            <div className={`flex items-center justify-between rounded-xl border p-2.5 transition-colors ${
              role === "Approver" 
                ? "border-zinc-600 bg-zinc-850/70 hover:bg-zinc-800/80" 
                : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-850/50"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono font-medium">
                  5
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-zinc-200 group-hover:text-zinc-100">
                      Verifikasi & Approval
                    </p>
                    {role === "Approver" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-medium border border-zinc-700">Tugas Anda</span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Pemeriksaan & pengesahan Kepsek
                  </p>
                </div>
              </div>
              <span className="text-xs text-zinc-500 group-hover:text-zinc-300">➔</span>
            </div>
          </Link>

          {/* LANGKAH 6: REKAP GAJI & SLIP */}
          <Link href="/rekap-gaji" className="group block">
            <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5 transition-colors hover:border-zinc-700 hover:bg-zinc-850/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono font-medium">
                  6
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-200 group-hover:text-zinc-100">
                    Rekapitulasi & Slip Gaji
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    Kalkulasi final & cetak slip
                  </p>
                </div>
              </div>
              <span className="text-xs text-zinc-500 group-hover:text-zinc-300">➔</span>
            </div>
          </Link>
        </div>
      </div>

      {/* System Alerts */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
          Status & Integritas Data
        </h3>
        {alerts.length === 0 ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-medium text-emerald-400 flex items-center gap-2">
            <span>✓</span>
            <span>Seluruh data payroll periode aktif konsisten & siap diproses.</span>
          </div>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert, i) => (
              <li
                key={i}
                className={`rounded-lg border px-3.5 py-2.5 text-xs font-medium ${
                  alert.type === "warning"
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                    : alert.type === "error"
                      ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                      : "border-sky-500/20 bg-sky-500/10 text-sky-300"
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
