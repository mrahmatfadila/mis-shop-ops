"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalSize = "sm" | "md" | "lg";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  size?: ModalSize;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

const sizeClass: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-3xl",
};

/** Modal standar: overlay blur, header ikon + judul, body scrollable. */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  iconClassName,
  size = "md",
  className,
  bodyClassName,
  children,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div
        className={cn(
          "bg-white rounded-2xl w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[95vh]",
          sizeClass[size],
          className
        )}
      >
        {(title || Icon) && (
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              {Icon && (
                <div
                  className={cn(
                    "p-2 rounded-xl bg-emerald-50 text-emerald-600",
                    iconClassName
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
              )}
              <div>
                {title && (
                  <h3 className="font-bold text-slate-800 text-base">{title}</h3>
                )}
                {description && (
                  <p className="text-xs text-slate-500">{description}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className={cn("p-5 overflow-y-auto", bodyClassName)}>{children}</div>
      </div>
    </div>
  );
}
