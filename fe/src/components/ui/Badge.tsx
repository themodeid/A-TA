import { PeriodeStatus } from "@/types";
import { getStatusBadgeColor } from "@/lib/permissions";

interface BadgeProps {
  status: PeriodeStatus | string;
  className?: string;
}

export function Badge({ status, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-tight ${getStatusBadgeColor(status as PeriodeStatus)} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 shrink-0" />
      {status}
    </span>
  );
}
