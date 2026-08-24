"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { UserRole } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30 mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Daftar Akun Baru</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sistem Informasi Payroll & Rekapitulasi Terpadu
          </p>
        </div>

        <Card className="shadow-2xl border-slate-800/80 bg-slate-900/90 backdrop-blur">
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
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Pilih Role / Hak Akses
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              >
                {AVAILABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value} className="bg-slate-900 text-white">
                    {r.label} - {r.desc}
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
              <div className="rounded-lg border border-red-800/50 bg-red-950/40 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={submitting}>
              Daftarkan Akun
            </Button>
          </form>

          <div className="mt-5 text-center border-t border-slate-800 pt-4">
            <p className="text-sm text-slate-400">
              Sudah memiliki akun?{" "}
              <Link
                href="/login"
                className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
              >
                Masuk di sini
              </Link>
            </p>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-500">
          Semua password dienkripsi secara aman dengan algoritma Bcrypt (10 rounds)
        </p>
      </div>
    </div>
  );
}
