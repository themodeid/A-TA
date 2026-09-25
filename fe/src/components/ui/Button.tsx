import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline" | "success";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-zinc-100 text-zinc-950 hover:bg-white focus:ring-zinc-400 font-medium tracking-tight shadow-none",
  secondary:
    "bg-zinc-900 text-zinc-200 hover:bg-zinc-800 focus:ring-zinc-600 border border-zinc-800 hover:border-zinc-700 shadow-none",
  danger:
    "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 focus:ring-rose-500/30 border border-rose-500/20 shadow-none",
  success:
    "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 focus:ring-emerald-500/30 border border-emerald-500/20 shadow-none",
  ghost:
    "bg-transparent text-zinc-400 hover:bg-zinc-850 hover:text-zinc-100",
  outline:
    "border border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-850 hover:text-zinc-100 hover:border-zinc-700",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-xs font-medium",
  md: "px-3.5 py-2 text-xs font-medium",
  lg: "px-5 py-2.5 text-sm font-medium",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading,
      className = "",
      disabled,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500/30 focus:ring-offset-1 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
