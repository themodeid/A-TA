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
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 bg-zinc-950 px-6 py-3 print:hidden">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
          Periode Payroll
        </h2>
        <p className="text-[11px] text-zinc-500">
          Konteks data transaksi & laporan aktif
        </p>
      </div>
      <div className="flex items-center gap-3">
        {selectedPeriode && (
          <Badge status={selectedPeriode.status} />
        )}
        <div className="w-52">
          <Select
            label=""
            value={selectedPeriodeId ?? ""}
            disabled={isLoading || periodeList.length === 0}
            onChange={(e) => setSelectedPeriodeId(Number(e.target.value))}
            className="!py-1.5 !text-xs !bg-zinc-900 border-zinc-800"
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
