"use client";

import { usePeriode } from "@/hooks/usePeriodeContext";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";

export function HeaderBar() {
  const {
    periodeList,
    selectedPeriode,
    selectedPeriodeId,
    setSelectedPeriodeId,
    isLoading,
  } = usePeriode();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-900 px-6 py-4">
      <div>
        <h2 className="text-xl font-semibold text-white">
          Periode Aktif
        </h2>
        <p className="text-sm text-slate-400">
          Pilih periode untuk melihat dan mengelola data
        </p>
      </div>
      <div className="flex items-center gap-4">
        {selectedPeriode && (
          <Badge status={selectedPeriode.status} />
        )}
        <div className="w-56">
          <Select
            label=""
            value={selectedPeriodeId ?? ""}
            disabled={isLoading || periodeList.length === 0}
            onChange={(e) => setSelectedPeriodeId(Number(e.target.value))}
            options={
              periodeList.length > 0
                ? periodeList.map((p) => ({
                    value: p.id_periode,
                    label: `${p.bulan_gaji}${p.status !== "Selesai" ? " (Aktif)" : ""}`,
                  }))
                : [{ value: "", label: "Tidak ada periode" }]
            }
          />
        </div>
      </div>
    </header>
  );
}
