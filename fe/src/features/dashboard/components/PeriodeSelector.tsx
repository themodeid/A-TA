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
    <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="w-52">
        <Select
          value={selectedId ?? ""}
          disabled={isLoading}
          onChange={(e) => onChange(Number(e.target.value))}
          options={periodeList.map((p) => ({
            value: p.id_periode,
            label: p.bulan_gaji,
          }))}
          className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:ring-slate-500"
        />
      </div>
      {selected && <Badge status={selected.status} />}
      {isLoading && (
        <span className="text-xs text-slate-500">Memuat periode...</span>
      )}
    </div>
  );
}
