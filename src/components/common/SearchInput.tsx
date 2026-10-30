"use client";

import type { FormEvent } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

/** Input pencarian dengan ikon Search, dibungkus form agar submit via Enter. */
export default function SearchInput({
  value,
  onChange,
  onSubmit,
  onClear,
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
      {onClear && value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Hapus pencarian"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </form>
  );
}
