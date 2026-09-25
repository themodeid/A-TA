"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { DEMO_USERS } from "@/features/auth/auth.constants";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    setSubmitting(true);
    const res = await login(username, password);
    setSubmitting(false);
    if (res.success) {
      router.push("/dashboard");
    } else {
      setError(res.message || "Username atau password salah.");
    }
  };

  const fillDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-850 border border-zinc-750 text-zinc-200 mb-3 shadow-none">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">SIP Payroll</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Sistem Informasi Penggajian & Presensi — SMK PSKD 3 Jakarta
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-none">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              required
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
            />
            {error && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full mt-2" isLoading={submitting}>
              Masuk ke Sistem
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-zinc-400">
              Belum memiliki akun?{" "}
              <Link
                href="/register"
                className="font-medium text-zinc-200 hover:text-white underline underline-offset-4"
              >
                Daftar Akun Baru
              </Link>
            </p>
          </div>

          <div className="mt-6 border-t border-zinc-800/80 pt-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Akun Demo Bawaan (Klik untuk coba):
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => fillDemo(u.username, u.password)}
                  className="rounded-lg border border-zinc-800 bg-zinc-850/60 px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-800 hover:border-zinc-700"
                >
                  <span className="font-medium text-zinc-200">{u.role}</span>
                  <br />
                  <span className="text-zinc-500 font-mono text-[11px]">{u.username}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-zinc-500 font-mono">
          SMK PSKD 3 Jakarta • Enterprise Payroll Security
        </p>
      </div>
    </div>
  );
}
