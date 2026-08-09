"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { canAccessRoute } from "@/lib/permissions";
import { Sidebar } from "./Sidebar";
import { HeaderBar } from "./HeaderBar";
import { PeriodeProvider } from "@/hooks/usePeriodeContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && !canAccessRoute(user.role, pathname)) {
      router.replace("/dashboard");
    }
  }, [user, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <PeriodeProvider>
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <HeaderBar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </PeriodeProvider>
  );
}
