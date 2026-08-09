"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSlipById } from "@/features/rekap/api/rekap.api";
import { SlipGaji } from "@/types";
import { SlipGajiView } from "@/features/rekap/components/SlipGajiView";
import { Button } from "@/components/ui/Button";

export default function SlipPage() {
  const params = useParams();
  const id = Number(params.id);
  const [slip, setSlip] = useState<SlipGaji | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getSlipById(id)
      .then(setSlip)
      .catch(() => setSlip(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!slip) {
    return (
      <div className="p-6 text-center text-slate-500">
        Slip gaji tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-end print:hidden">
        <Button onClick={handlePrint}>Cetak / Print PDF</Button>
      </div>
      <SlipGajiView slip={slip} />
    </div>
  );
}
