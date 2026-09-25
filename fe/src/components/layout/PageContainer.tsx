import { ReactNode } from "react";

interface PageContainerProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
}

export function PageContainer({
  title,
  description,
  action,
  children,
  className = "",
  headerClassName = "",
}: PageContainerProps) {
  return (
    <div className={`space-y-6 p-6 ${className}`}>
      <div className={`flex flex-wrap items-start justify-between gap-4 ${headerClassName}`}>
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
