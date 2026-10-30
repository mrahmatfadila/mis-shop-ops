import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  hint?: ReactNode;
  hintClassName?: string;
  valueClassName?: string;
  className?: string;
}

/** Kartu statistik ringkas (label, nilai besar, ikon, hint). */
export default function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  hint,
  hintClassName,
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-white p-4 rounded-2xl border border-slate-200 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
        <span>{label}</span>
        {Icon && <Icon className={cn("w-4 h-4", iconClassName)} />}
      </div>
      <div className={cn("text-2xl font-black text-slate-800", valueClassName)}>
        {value}
      </div>
      {hint && (
        <div className={cn("text-[11px] text-slate-400 mt-1", hintClassName)}>
          {hint}
        </div>
      )}
    </div>
  );
}
