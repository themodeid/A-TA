"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation"; // PENTING: Gunakan next/navigation, BUKAN next/router

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return null;
}
