"use client";

import { usePeriode } from "@/hooks/usePeriodeContext";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";

interface PeriodeSelectorProps {
  selectedId: number | null;
  onChange: (id: number) => void;
}

export function PeriodeSelector({
  selectedId,
  onChange,
}: PeriodeSelectorProps) {
  const { periodeList, isLoading } = usePeriode();
  const selected = periodeList.find((p) => p.id_periode === selectedId);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-800/80 bg-slate-950/60 px-3.5 py-2 backdrop-blur-md">
      <div className="w-48 sm:w-56">
        <Select
          value={selectedId ?? ""}
          disabled={isLoading}
          onChange={(e) => onChange(Number(e.target.value))}
          options={periodeList.map((p) => ({
            value: p.id_periode,
            label: p.bulan_gaji,
          }))}
          className="h-9 border-slate-700/80 bg-slate-900/90 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      {selected && <Badge status={selected.status} />}
      {isLoading && (
        <span className="animate-pulse text-xs text-slate-500">Memuat...</span>
      )}
    </div>
  );
}
