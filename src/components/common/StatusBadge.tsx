import type { ReactNode } from "react";
import { cn, divisionBadgeClass, safeText, statusBadgeClass, urgencyBadgeClass } from "@/lib/utils";

type BadgeVariant = "status" | "urgency" | "division";

interface StatusBadgeProps {
  status?: string | null;
  variant?: BadgeVariant;
  label?: ReactNode;
  className?: string;
}

const toneByVariant: Record<BadgeVariant, (value?: string | null) => string> = {
  status: statusBadgeClass,
  urgency: urgencyBadgeClass,
  division: divisionBadgeClass,
};

/** Badge subdued terpusat untuk status aset, status tiket, urgensi, dan divisi. */
export default function StatusBadge({
  status,
  variant = "status",
  label,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold",
        toneByVariant[variant](status),
        className
      )}
    >
      {label ?? safeText(status)}
    </span>
  );
}
