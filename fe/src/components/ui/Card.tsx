import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}

export function Card({ children, className = "", title, action }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900 shadow-sm ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          {title && (
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          )}
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
