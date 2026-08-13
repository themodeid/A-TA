interface StatCardProps {
  title: string;
  value: string | number | undefined;
  unit?: string;
  icon?: string;
  badge?: boolean;
}

export function StatCard({ title, value, unit, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm shadow-black/20">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">
            {value ?? "—"}
            {unit && (
              <span className="ml-1 text-sm font-normal text-slate-400">
                {unit}
              </span>
            )}
          </p>
        </div>
        {icon && (
          <span className="rounded-lg bg-indigo-900/40 p-2 text-xl">
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}
