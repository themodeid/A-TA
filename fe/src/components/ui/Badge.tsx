import { PeriodeStatus } from "@/types";
import { getStatusBadgeColor } from "@/lib/permissions";

interface BadgeProps {
  status: PeriodeStatus | string;
  className?: string;
}

export function Badge({ status, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(status as PeriodeStatus)} ${className}`}
    >
      {status}
    </span>
  );
}
