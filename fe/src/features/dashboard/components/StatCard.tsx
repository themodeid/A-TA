interface StatCardProps {
  title: string;
  value: string | number | undefined;
  unit?: string;
  icon?: string;
  badge?: boolean;
}

export function StatCard({ title, value, unit, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 transition-colors hover:border-zinc-700/80">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          {title}
        </p>
        {icon && <span className="text-base opacity-60">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-zinc-100 tabular-nums font-mono">
          {value ?? "—"}
        </span>
        {unit && (
          <span className="text-xs font-normal text-zinc-500">{unit}</span>
        )}
      </div>
    </div>
  );
}
