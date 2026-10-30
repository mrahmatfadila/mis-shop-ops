"use client";

import type { FormEvent } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

/** Input pencarian dengan ikon Search, dibungkus form agar submit via Enter. */
export default function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Cari data...",
  className,
  inputClassName,
}: SearchInputProps) {
  return (
    <form onSubmit={onSubmit} className={cn("relative flex-1", className)}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition",
          inputClassName
        )}
      />
    </form>
  );
}
