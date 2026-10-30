"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check, X } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
  badge?: string | number;
  group?: string;
  icon?: React.ReactNode;
  dot?: string; // tailwind bg color class e.g. "bg-emerald-500"
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  dropdownWidth?: string;
  clearable?: boolean;
}

export default function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "Pilih opsi...",
  icon,
  disabled = false,
  className = "",
  dropdownWidth,
  clearable = false,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, close]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, close]);

  const selectedOption = options.find((o) => o.value === value);
  const hasValue = !!value;

  // Build grouped structure — sentinel ensures first group is always created
  const grouped: { group: string | null; items: DropdownOption[] }[] = [];
  const _SENTINEL = "\x00__sentinel__";
  let currentGroup: string = _SENTINEL;
  for (const opt of options) {
    const g = opt.group ?? null;
    const key = g ?? "";
    if (key !== currentGroup) {
      grouped.push({ group: g, items: [] });
      currentGroup = key;
    }
    grouped[grouped.length - 1].items.push(opt);
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* ── Trigger Button ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((v) => !v)}
        className={[
          "w-full flex items-center gap-2 px-3 py-[7px] rounded-xl text-[11px] font-semibold border transition-all duration-150 text-left outline-none select-none group",
          disabled
            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
            : isOpen
            ? "bg-white border-[#006622] ring-2 ring-[#006622]/10 text-slate-800 shadow-sm"
            : hasValue
            ? "bg-white border-slate-300 text-slate-800 hover:border-[#006622]/60 shadow-xs"
            : "bg-slate-50 hover:bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:shadow-xs",
        ].join(" ")}
      >
        {/* Left: icon + label */}
        <span
          className={[
            "flex-shrink-0 transition-colors",
            isOpen || hasValue ? "text-[#006622]" : "text-slate-400",
          ].join(" ")}
        >
          {icon}
        </span>

        <span className="flex-1 min-w-0 truncate">
          {selectedOption ? (
            <span className="flex items-center gap-1.5">
              {selectedOption.dot && (
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${selectedOption.dot}`}
                />
              )}
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-slate-400 font-medium">{placeholder}</span>
          )}
        </span>

        {/* Right: badge + clear + chevron */}
        <span className="flex items-center gap-1 flex-shrink-0">
          {selectedOption?.badge && (
            <span
              className={[
                "px-1.5 py-px rounded-md text-[9px] font-bold tracking-tight border",
                hasValue
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-500 border-slate-200",
              ].join(" ")}
            >
              {selectedOption.badge}
            </span>
          )}
          {clearable && hasValue && !disabled && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                close();
              }}
              className="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-slate-200 hover:bg-red-100 text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
            >
              <X className="w-2.5 h-2.5" />
            </span>
          )}
          <ChevronDown
            className={[
              "w-3.5 h-3.5 transition-all duration-200",
              isOpen ? "rotate-180 text-[#006622]" : "text-slate-400",
            ].join(" ")}
          />
        </span>
      </button>

      {/* ── Floating Menu ── */}
      {isOpen && (
        <div
          ref={menuRef}
          className={[
            "absolute left-0 top-[calc(100%+6px)] z-[9999] bg-white rounded-2xl",
            "border border-slate-200/80 shadow-2xl shadow-slate-900/10",
            "overflow-hidden",
            dropdownWidth ?? "w-full min-w-[200px]",
          ].join(" ")}
          style={{ minWidth: "100%" }}
        >
          {/* Thin accent bar on top */}
          <div className="h-[3px] w-full bg-gradient-to-r from-[#006622] via-emerald-400 to-[#006622]/30" />

          <div className="max-h-[280px] overflow-y-auto p-1.5">
            {grouped.map((section, si) => (
              <div key={si}>
                {/* Group header */}
                {section.group && (
                  <div
                    className={[
                      "flex items-center gap-2 px-2.5 pb-1 text-[9.5px] font-bold uppercase tracking-widest text-slate-400",
                      si === 0 ? "pt-1.5" : "pt-3 border-t border-slate-100 mt-1",
                    ].join(" ")}
                  >
                    <span className="h-px flex-1 bg-slate-100" />
                    {section.group}
                    <span className="h-px flex-1 bg-slate-100" />
                  </div>
                )}

                {/* Items */}
                {section.items.map((opt, oi) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={`${opt.value}-${oi}`}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        close();
                      }}
                      className={[
                        "w-full flex items-center gap-2 px-2.5 py-[7px] rounded-xl text-[11px] transition-all duration-100 text-left cursor-pointer",
                        isSelected
                          ? "bg-gradient-to-r from-emerald-50 to-green-50 text-[#006622] font-bold"
                          : "text-slate-700 hover:bg-slate-50 font-medium hover:text-slate-900",
                      ].join(" ")}
                    >
                      {/* Dot indicator */}
                      {opt.dot ? (
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${opt.dot} ${
                            isSelected ? "opacity-100" : "opacity-60"
                          }`}
                        />
                      ) : (
                        opt.icon && (
                          <span
                            className={
                              isSelected ? "text-[#006622]" : "text-slate-400"
                            }
                          >
                            {opt.icon}
                          </span>
                        )
                      )}

                      {/* Label */}
                      <span className="flex-1 min-w-0 truncate">{opt.label}</span>

                      {/* Badge + checkmark */}
                      <span className="flex items-center gap-1.5 flex-shrink-0">
                        {opt.badge && (
                          <span
                            className={[
                              "px-1.5 py-px rounded text-[9px] font-semibold",
                              isSelected
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-500",
                            ].join(" ")}
                          >
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <Check className="w-3 h-3 text-[#006622] flex-shrink-0" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50/60 flex items-center gap-1.5">
            <kbd className="px-1 py-px rounded text-[9px] font-mono bg-slate-200 text-slate-500 border border-slate-300">
              Esc
            </kbd>
            <span className="text-[9.5px] text-slate-400">untuk menutup</span>
          </div>
        </div>
      )}
    </div>
  );
}
