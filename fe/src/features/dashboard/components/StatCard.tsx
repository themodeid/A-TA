interface StatCardProps {
  title: string;
  value: string | number | undefined;
  unit?: string;
  icon?: string;
  badge?: boolean;
}

export function StatCard({ title, value, unit, icon }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/50 p-5 backdrop-blur-sm transition-all hover:border-slate-700/80">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400">{title}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-100">
              {value ?? "—"}
            </span>
            {unit && (
              <span className="text-xs font-normal text-slate-400">{unit}</span>
            )}
          </div>
        </div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/60 text-lg shadow-inner">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
