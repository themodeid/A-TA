interface StatCardProps {
  title: string;
  value: string | number | undefined;
  unit?: string;
  icon?: string;
  badge?: boolean;
}

export function StatCard({ title, value, unit, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value ?? "—"}
            {unit && (
              <span className="ml-1 text-sm font-normal text-slate-500">
                {unit}
              </span>
            )}
          </p>
        </div>
        {icon && (
          <span className="rounded-lg bg-indigo-50 p-2 text-xl">{icon}</span>
        )}
      </div>
    </div>
  );
}
