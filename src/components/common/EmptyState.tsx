import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  className?: string;
}

/** Empty state ramah saat data dari database kosong / filter tidak cocok. */
export default function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  iconClassName,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-8 text-center text-xs text-slate-400",
        className
      )}
    >
      <Icon className={cn("w-8 h-8 text-slate-300", iconClassName)} />
      <span>{title}</span>
      {description && (
        <p className="text-[11px] text-slate-400">{description}</p>
      )}
    </div>
  );
}
