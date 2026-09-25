import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function Card({
  children,
  className = "",
  title,
  subtitle,
  action,
}: CardProps) {
  return (
    <div
      className={`rounded-xl border border-zinc-800/80 bg-zinc-900/60 shadow-none ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 px-5 py-3.5 print:hidden">
          <div>
            {title && (
              <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
            )}
            {subtitle && (
              <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="p-5 print:p-0">{children}</div>
    </div>
  );
}
