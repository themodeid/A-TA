"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { UserRole } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const AVAILABLE_ROLES: { value: UserRole; label: string; desc: string }[] = [
  {
    value: "Staf Gaji",
    label: "Staf Gaji",
    desc: "Mengelola komponen tunjangan, potongan, dan rekap gaji",
  },
  {
    value: "Petugas Absensi",
    label: "Petugas Absensi",
    desc: "Menginput dan mengelola rekapitulasi data absensi pegawai",
  },
  {
    value: "Approver",
    label: "Approver",
    desc: "Menyetujui atau menolak finalisasi penggajian",
  },
  {
    value: "Admin",
    label: "Administrator",
    desc: "Akses penuh ke master data dan konfigurasi sistem",
  },
];

export default function RegisterPage() {
  const { user, register, isLoading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("Staf Gaji");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validasi frontend
    if (username.trim().length < 3) {
      setError("Username minimal 3 karakter.");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setSubmitting(true);
    const res = await register(username.trim(), password, role);
    setSubmitting(false);

    if (res.success) {
      router.push("/dashboard");
    } else {
      setError(res.message || "Pendaftaran gagal. Silakan coba lagi.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-850 border border-zinc-750 text-zinc-200 mb-3 shadow-none">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Daftar Akun Baru</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Sistem Informasi Payroll & Rekapitulasi Terpadu — SMK PSKD 3
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-none">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Contoh: staf_gaji1"
              required
              autoFocus
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Pilih Role / Hak Akses
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-850 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition"
              >
                {AVAILABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value} className="bg-zinc-900 text-zinc-100">
                    {r.label} — {r.desc}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              required
            />

            <Input
              label="Konfirmasi Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password di atas"
              required
            />

            {error && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={submitting}>
              Daftarkan Akun
            </Button>
          </form>

          <div className="mt-5 text-center border-t border-zinc-800/80 pt-4">
            <p className="text-xs text-zinc-400">
              Sudah memiliki akun?{" "}
              <Link
                href="/login"
                className="font-medium text-zinc-200 hover:text-white underline underline-offset-4"
              >
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-zinc-500 font-mono">
          Semua password dienkripsi dengan standar Bcrypt (10 salt rounds)
        </p>
      </div>
    </div>
  );
}
