import { ReactNode } from "react";

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = "" }: TableProps) {
  return (
    <div
      className={`overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-900/30 print:border-none print:overflow-visible ${className}`}
    >
      <table className="min-w-full divide-y divide-zinc-800/80 text-sm print:divide-y-0 print:border-collapse">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-zinc-900/90 border-b border-zinc-800/80">
      <tr>{children}</tr>
    </thead>
  );
}

export function TableHeaderCell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-400 ${className}`}
    >
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-zinc-800/60 bg-transparent">{children}</tbody>;
}

export function TableRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={`hover:bg-zinc-850/50 transition-colors ${className}`}>{children}</tr>
  );
}

export function TableCell({
  children,
  className = "",
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`whitespace-nowrap px-4 py-2.5 text-zinc-200 text-xs ${className}`}
    >
      {children}
    </td>
  );
}
