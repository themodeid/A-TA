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
    <div className="flex items-center gap-2.5">
      <div className="w-48 sm:w-56">
        <Select
          value={selectedId ?? ""}
          disabled={isLoading}
          onChange={(e) => onChange(Number(e.target.value))}
          options={periodeList.map((p) => ({
            value: p.id_periode,
            label: p.bulan_gaji,
          }))}
          className="!py-1.5 !text-xs !bg-zinc-900 border-zinc-800 focus:border-zinc-500"
        />
      </div>
      {selected && <Badge status={selected.status} />}
      {isLoading && (
        <span className="text-xs text-zinc-500">Memuat...</span>
      )}
    </div>
  );
}
