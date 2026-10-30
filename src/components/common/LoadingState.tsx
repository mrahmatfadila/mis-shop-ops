import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

/** Indikator loading standar (spinner emerald + pesan). */
export default function LoadingState({
  message = "Memuat data...",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-12 text-xs text-slate-400",
        className
      )}
    >
      <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
      <span>{message}</span>
    </div>
  );
}
