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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30 mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">SIP Payroll</h1>
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
              <div className="rounded-lg border border-red-800/50 bg-red-950/40 p-3 text-sm text-red-300">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" isLoading={submitting}>
              Masuk ke Sistem
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-slate-400">
              Belum memiliki akun?{" "}
              <Link
                href="/register"
                className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
              >
                Daftar Akun Baru
              </Link>
            </p>
          </div>

          <div className="mt-6 border-t border-slate-800 pt-4">
            <p className="mb-2 text-xs font-medium text-slate-400">
              Akun Demo Bawaan (Klik untuk coba):
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => fillDemo(u.username, u.password)}
                  className="rounded-lg border border-slate-700/80 bg-slate-800/50 px-2.5 py-2 text-left text-xs text-white transition hover:bg-indigo-900/30 hover:border-indigo-600/50"
                >
                  <span className="font-semibold text-indigo-300">{u.role}</span>
                  <br />
                  <span className="text-slate-400 font-mono text-[11px]">{u.username}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-500">
          Dilengkapi proteksi JWT Token, Bcrypt Hash, Rate Limiting & Helmet Headers
        </p>
      </div>
    </div>
  );
}
