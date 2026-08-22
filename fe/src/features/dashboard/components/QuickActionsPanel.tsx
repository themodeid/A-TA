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
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">👤</span>
          <div>
            <p className="text-[10px] text-slate-400 font-medium">Logged In Role:</p>
            <p className="text-xs font-bold text-indigo-300">{role ?? "Pengguna"}</p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300">
          SMK PSKD 3
        </span>
      </div>

      {/* Alur Penggajian Cepat (Step-by-Step Payroll Workflow) */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Alur Proses Penggajian</span>
          <span className="text-[10px] lowercase text-indigo-400 font-normal">6 langkah</span>
        </h3>

        <div className="space-y-2">
          {/* LANGKAH 1: PERIODE */}
          <Link href="/periode" className="group block">
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-2.5 transition-all hover:border-indigo-500/60 hover:bg-slate-800/70">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-bold">
                  1
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-white">
                    Kelola Periode Gaji
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Buka cut-off 16-15 & inisialisasi
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-500 group-hover:text-indigo-400">➔</span>
            </div>
          </Link>

          {/* LANGKAH 2: ABSENSI */}
          <Link href="/transaksi/absensi" className="group block">
            <div className={`flex items-center justify-between rounded-xl border p-2.5 transition-all ${
              role === "Petugas Absensi" 
                ? "border-indigo-500/80 bg-indigo-950/30 hover:bg-indigo-900/40" 
                : "border-slate-800 bg-slate-900/50 hover:border-indigo-500/60 hover:bg-slate-800/70"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 text-xs font-bold">
                  2
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-white">
                      Rekap Absensi
                    </p>
                    {role === "Petugas Absensi" && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-600 text-white font-medium">Tugas Anda</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Input WFO, WFH, Izin & Sakit
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-500 group-hover:text-indigo-400">➔</span>
            </div>
          </Link>

          {/* LANGKAH 3: TUNJANGAN & LEMBUR */}
          <Link href="/transaksi/tunjangan" className="group block">
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-2.5 transition-all hover:border-indigo-500/60 hover:bg-slate-800/70">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-950/80 border border-amber-700/50 text-amber-300 text-xs font-bold">
                  3
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-white">
                    Tunjangan & Lembur
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Input jam lebih, honor & tunjangan
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-500 group-hover:text-indigo-400">➔</span>
            </div>
          </Link>

          {/* LANGKAH 4: POTONGAN BULANAN */}
          <Link href="/transaksi/potongan" className="group block">
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-2.5 transition-all hover:border-indigo-500/60 hover:bg-slate-800/70">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-950/80 border border-rose-700/50 text-rose-300 text-xs font-bold">
                  4
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-white">
                    Potongan Bulanan
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Angsuran pinjaman & iuran rutin
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-500 group-hover:text-indigo-400">➔</span>
            </div>
          </Link>

          {/* LANGKAH 5: APPROVAL KEPSEK */}
          <Link href="/approval" className="group block">
            <div className={`flex items-center justify-between rounded-xl border p-2.5 transition-all ${
              role === "Approver" 
                ? "border-indigo-500/80 bg-indigo-950/40 hover:bg-indigo-900/50" 
                : "border-slate-800 bg-slate-900/50 hover:border-indigo-500/60 hover:bg-slate-800/70"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-950/80 border border-purple-700/50 text-purple-300 text-xs font-bold">
                  5
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-white">
                      Verifikasi & Approval
                    </p>
                    {role === "Approver" && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-600 text-white font-medium">Tugas Anda</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Pemeriksaan & pengesahan Kepsek
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-500 group-hover:text-indigo-400">➔</span>
            </div>
          </Link>

          {/* LANGKAH 6: REKAP GAJI & SLIP */}
          <Link href="/rekap-gaji" className="group block">
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-2.5 transition-all hover:border-indigo-500/60 hover:bg-slate-800/70">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-950/80 border border-teal-700/50 text-teal-300 text-xs font-bold">
                  6
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-white">
                    Rekapitulasi & Slip Gaji
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Kalkulasi final & cetak slip
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-500 group-hover:text-indigo-400">➔</span>
            </div>
          </Link>
        </div>
      </div>

      {/* System Alerts */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Peringatan & Status Sistem
        </h3>
        {alerts.length === 0 ? (
          <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3.5 py-2.5 text-xs font-medium text-emerald-400">
            ✓ Data penggajian periode berjalan teratur & siap diproses.
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
