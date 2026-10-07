"use client";

import { ReactNode, useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* GitHub Primer Backdrop */}
      <div
        className="fixed inset-0 bg-[#0d1117]/80 transition-opacity"
        onClick={onClose}
      />

      {/* GitHub Primer Dialog Box */}
      <div
        className={`relative w-full ${sizeClasses[size]} rounded-md bg-[#161b22] border border-[#30363d] shadow-2xl flex flex-col overflow-hidden text-[#f0f6fc]`}
      >
        {/* GitHub Primer Header */}
        <div className="flex items-center justify-between bg-[#21262d] border-b border-[#30363d] px-4 py-3">
          <h3 className="text-sm font-semibold text-[#f0f6fc] tracking-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="inline-flex items-center justify-center rounded-md p-1 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#30363d] transition-colors focus:outline-none"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>

        {/* Dialog Content */}
        <div className="max-h-[75vh] overflow-y-auto px-4 py-4 text-xs">{children}</div>

        {/* GitHub Primer Footer */}
        {footer && (
          <div className="flex justify-end gap-2 bg-[#161b22] border-t border-[#30363d] px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
