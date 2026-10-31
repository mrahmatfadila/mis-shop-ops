"use client";

import React, { useState, useEffect, Suspense, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Monitor,
  Cpu,
  Printer,
  CreditCard,
  Scan,
  Fingerprint,
  Keyboard,
  Mouse,
  ShoppingCart,
  Wifi,
  X,
  CheckCircle,
  AlertCircle,
  Store,
  Copy,
  Check,
  Sparkles,
  Plane,
  HardDrive,
  MemoryStick,
  Globe,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ShieldCheck,
  Cable,
  Server,
  Zap,
  ZapOff,
  WifiOff,
  Activity,
  RefreshCw,
  Edit3,
  Save,
  Radio,
  Tv,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import SidebarLayout from "@/components/SidebarLayout";
import { PosHardwareAsset } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & PRECISION-ALIGNED STORE MAPPING TERMINAL 3 SOEKARNO-HATTA
// ─────────────────────────────────────────────────────────────────────────────

type TerminalKey = "Terminal 3" | "Terminal 2" | "Surabaya";

interface StoreNode {
  id: string;
  roofTitle: string;
  dfdLabel: string;
  fullName: string;
  gateLabel: string;
  wing: string;
  x: number;
  y: number;
  w: number;
  h: number;
  roofColor: string;
  wallColor: string;
  posFilter: (pos: PosHardwareAsset) => boolean;
}

const T3_STORES: StoreNode[] = [
  {
    id: "DF1",
    roofTitle: "DF 1 • DFD1",
    dfdLabel: "DFD1",
    fullName: "Toko Duty Free 1 (DFD1)",
    gateLabel: "GATE 10",
    wing: "Concourse Timur — Depan Gate 10",
    x: 744,
    y: 356,
    w: 100,
    h: 66,
    roofColor: "#006622",
    wallColor: "#ecfdf5",
    posFilter: (p) =>
      p.terminal === "Terminal 3" &&
      ["DFD01", "DFD1", "DF1"].includes((p.counter_zone || "").toUpperCase()),
  },
  {
    id: "DF2",
    roofTitle: "DF 2 • DFD2",
    dfdLabel: "DFD2",
    fullName: "Toko Duty Free 2 (DFD2)",
    gateLabel: "GATE 9",
    wing: "Concourse Timur — Depan Gate 9",
    x: 630,
    y: 356,
    w: 100,
    h: 66,
    roofColor: "#059669",
    wallColor: "#ecfdf5",
    posFilter: (p) =>
      p.terminal === "Terminal 3" &&
      ["DFD02", "DFD2", "DF2"].includes((p.counter_zone || "").toUpperCase()),
  },
  {
    id: "DF3",
    roofTitle: "DF 3 • DFD3",
    dfdLabel: "DFD3",
    fullName: "Toko Duty Free 3 (DFD3)",
    gateLabel: "GATE 8",
    wing: "Concourse Tengah — Depan Gate 8",
    x: 516,
    y: 356,
    w: 100,
    h: 66,
    roofColor: "#0d9488",
    wallColor: "#f0fdfa",
    posFilter: (p) =>
      p.terminal === "Terminal 3" &&
      ["DFD03", "DFD3", "DF3"].includes((p.counter_zone || "").toUpperCase()),
  },
  {
    id: "DF4",
    roofTitle: "DF 4 • DFD4",
    dfdLabel: "DFD4",
    fullName: "Toko Duty Free 4 (DFD4)",
    gateLabel: "GATE 7",
    wing: "Concourse Tengah — Depan Gate 7",
    x: 402,
    y: 356,
    w: 100,
    h: 66,
    roofColor: "#006622",
    wallColor: "#ecfdf5",
    posFilter: (p) => {
      const z = (p.counter_zone || "").toUpperCase();
      return (
        p.terminal === "Terminal 3" &&
        (z === "DFD4" ||
          z === "DF4" ||
          (z === "DFD04" && (p.pos_number <= 5 || /P0[1-5]$/i.test(p.pos_code))))
      );
    },
  },
  {
    id: "DF5",
    roofTitle: "DF 5 • DFD5",
    dfdLabel: "DFD5",
    fullName: "Toko Duty Free 5 (DFD5)",
    gateLabel: "GATE 6",
    wing: "Concourse Barat — Depan Gate 6",
    x: 288,
    y: 356,
    w: 100,
    h: 66,
    roofColor: "#16a34a",
    wallColor: "#f0fdf4",
    posFilter: (p) => {
      const z = (p.counter_zone || "").toUpperCase();
      return (
        p.terminal === "Terminal 3" &&
        (z === "DFD05" ||
          z === "DFD5" ||
          z === "DF5" ||
          (z === "DFD04" && !(p.pos_number <= 5 || /P0[1-5]$/i.test(p.pos_code))))
      );
    },
  },
  {
    id: "DF6",
    roofTitle: "DF 6 • DFD6",
    dfdLabel: "DFD6",
    fullName: "Toko Duty Free 6 (DFD6 — Tikungan Kanan)",
    gateLabel: "TIKUNGAN KANAN",
    wing: "Tikungan Kanan (Antara Gate 5 – Gate 4)",
    x: 174,
    y: 356,
    w: 100,
    h: 66,
    roofColor: "#0284c7",
    wallColor: "#f0f9ff",
    posFilter: (p) =>
      p.terminal === "Terminal 3" &&
      ["DFA02", "DFD06", "DFD6", "DF6"].includes((p.counter_zone || "").toUpperCase()),
  },
  {
    id: "DF7",
    roofTitle: "DF 7 • DFD7",
    dfdLabel: "DFD7",
    fullName: "Toko Duty Free 7 (DFD7 — Tikungan Kiri)",
    gateLabel: "TIKUNGAN KIRI",
    wing: "Tikungan Kiri (Antara Gate 5 – Gate 4)",
    x: 60,
    y: 356,
    w: 100,
    h: 66,
    roofColor: "#2563eb",
    wallColor: "#eff6ff",
    posFilter: (p) =>
      p.terminal === "Terminal 3" &&
      ["MMH01", "GGO02", "DFD07", "DFD7", "DF7", "BBV01"].includes(
        (p.counter_zone || "").toUpperCase()
      ),
  },
  {
    id: "GGO01",
    roofTitle: "GGO01 • SAM",
    dfdLabel: "GGO01 (SAM)",
    fullName: "Toko SAM Garuda Go 01 — Gate 3",
    gateLabel: "GATE 3",
    wing: "Pier Barat — Depan Gate 3",
    x: 60,
    y: 140,
    w: 100,
    h: 66,
    roofColor: "#d97706",
    wallColor: "#fffbeb",
    posFilter: (p) =>
      p.terminal === "Terminal 3" &&
      ["GGO01", "GGO04"].includes((p.counter_zone || "").toUpperCase()),
  },
];

const T2_STORES: StoreNode[] = [
  {
    id: "T2-DPD03",
    roofTitle: "DPD 03",
    dfdLabel: "DPD03",
    fullName: "Toko Plaza Bali Departure D03",
    gateLabel: "CONCOURSE D",
    wing: "Terminal 2 Concourse D",
    x: 52,
    y: 115,
    w: 142,
    h: 72,
    roofColor: "#006622",
    wallColor: "#ecfdf5",
    posFilter: (p) => p.terminal === "Terminal 2" && p.counter_zone === "DPD03",
  },
  {
    id: "T2-DFD05",
    roofTitle: "DFD 05",
    dfdLabel: "DFD05",
    fullName: "Toko Plaza Bali Duty Free D05",
    gateLabel: "INTL HALL T2",
    wing: "Terminal 2 International Hall",
    x: 212,
    y: 115,
    w: 142,
    h: 72,
    roofColor: "#059669",
    wallColor: "#ecfdf5",
    posFilter: (p) => p.terminal === "Terminal 2" && p.counter_zone === "DFD05",
  },
  {
    id: "T2-DPD06",
    roofTitle: "DPD 06",
    dfdLabel: "DPD06",
    fullName: "Toko Plaza Bali Departure D06",
    gateLabel: "CONCOURSE E",
    wing: "Terminal 2 Concourse E",
    x: 372,
    y: 115,
    w: 142,
    h: 72,
    roofColor: "#0d9488",
    wallColor: "#f0fdfa",
    posFilter: (p) => p.terminal === "Terminal 2" && p.counter_zone === "DPD06",
  },
  {
    id: "T2-SAM-WEST",
    roofTitle: "SAM BARAT",
    dfdLabel: "BBV / SSR / OLR",
    fullName: "Toko SAM (BBV01, SSR01, OLR01)",
    gateLabel: "DOMESTIK F1",
    wing: "Terminal 2 Domestic Wing",
    x: 532,
    y: 115,
    w: 142,
    h: 72,
    roofColor: "#d97706",
    wallColor: "#fffbeb",
    posFilter: (p) =>
      p.terminal === "Terminal 2" &&
      ["BBV01", "SSR01", "OLR01"].includes(p.counter_zone),
  },
  {
    id: "T2-SAM-EAST",
    roofTitle: "SAM TIMUR",
    dfdLabel: "EAD / DDD / WSD",
    fullName: "Toko SAM (EAD01, DDD01, WSD01, GGO03)",
    gateLabel: "DOMESTIK F2",
    wing: "Terminal 2 East Wing",
    x: 692,
    y: 115,
    w: 142,
    h: 72,
    roofColor: "#ea580c",
    wallColor: "#fff7ed",
    posFilter: (p) =>
      p.terminal === "Terminal 2" &&
      ["EAD01", "DDD01", "WSD01", "GGO03"].includes(p.counter_zone),
  },
];

const SBY_STORES: StoreNode[] = [
  {
    id: "SBY-T1-BBV",
    roofTitle: "T1 BBV LT.1",
    dfdLabel: "SUBDPD01–02",
    fullName: "Juanda T1 — BBV Lt.1 & Booth",
    gateLabel: "JUANDA T1 LT.1",
    wing: "Juanda Terminal 1 Lt. 1",
    x: 60,
    y: 115,
    w: 175,
    h: 72,
    roofColor: "#7c3aed",
    wallColor: "#f5f3ff",
    posFilter: (p) =>
      p.terminal?.includes("Surabaya") &&
      ["SUBDPD01", "SUBDPD02"].includes(p.counter_zone),
  },
  {
    id: "SBY-T1-UPPER",
    roofTitle: "T1 LT.2 & HAJJ",
    dfdLabel: "SUBDPD03–04",
    fullName: "Juanda T1 — BBV Lt.2 & Azzaria Hajj",
    gateLabel: "JUANDA T1 LT.2",
    wing: "Juanda Terminal 1 Lt. 2",
    x: 255,
    y: 115,
    w: 175,
    h: 72,
    roofColor: "#6d28d9",
    wallColor: "#f5f3ff",
    posFilter: (p) =>
      p.terminal?.includes("Surabaya") &&
      ["SUBDPD03", "SUBDPD04"].includes(p.counter_zone),
  },
  {
    id: "SBY-T2-DF12",
    roofTitle: "T2 DF01 & DF02",
    dfdLabel: "SUBDF01–02",
    fullName: "Juanda T2 — Duty Free 01 & 02",
    gateLabel: "JUANDA T2 INTL",
    wing: "Juanda Terminal 2 International",
    x: 450,
    y: 115,
    w: 175,
    h: 72,
    roofColor: "#006622",
    wallColor: "#ecfdf5",
    posFilter: (p) =>
      p.terminal?.includes("Surabaya") &&
      ["SUBDF01", "SUBDF02"].includes(p.counter_zone),
  },
  {
    id: "SBY-T2-DF3A",
    roofTitle: "T2 DF03 & ARR",
    dfdLabel: "SUBDF03 & ARR",
    fullName: "Juanda T2 — Duty Free 03 & Arrival",
    gateLabel: "JUANDA T2 ARR",
    wing: "Juanda Terminal 2 Timur & Arrival",
    x: 645,
    y: 115,
    w: 175,
    h: 72,
    roofColor: "#059669",
    wallColor: "#ecfdf5",
    posFilter: (p) =>
      p.terminal?.includes("Surabaya") &&
      ["SUBDF03", "SUBDFA01"].includes(p.counter_zone),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function hasVal(v?: string | null): boolean {
  return Boolean(v && v.trim() !== "" && v.trim() !== "-");
}

function deriveGateway(ip?: string | null): string {
  if (!ip || !ip.includes(".")) return "172.19.20.1";
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.1`;
  }
  return "172.19.20.1";
}

function getEdcList(pos: PosHardwareAsset) {
  const anyPos = pos as any;
  return [
    {
      bank: "BCA",
      fullName: "Bank Central Asia (BCA)",
      tid: pos.bca_tid,
      mid: anyPos.bca_mid,
      credit: anyPos.bca_credit || "Y",
      debit: anyPos.bca_debit || "Y",
      qr: anyPos.bca_qr || "Y",
      bg: "#eff6ff",
      border: "#93c5fd",
      text: "#1d4ed8",
      headerBg: "#1d4ed8",
    },
    {
      bank: "BNI",
      fullName: "Bank Negara Indonesia (BNI)",
      tid: pos.bni_tid,
      mid: anyPos.bni_mid,
      credit: anyPos.bni_credit || "Y",
      debit: anyPos.bni_debit || "Y",
      qr: anyPos.bni_qr || "N",
      bg: "#fff7ed",
      border: "#fdba74",
      text: "#c2410c",
      headerBg: "#ea580c",
    },
    {
      bank: "MANDIRI",
      fullName: "Bank Mandiri",
      tid: pos.mandiri_tid,
      mid: anyPos.mandiri_mid,
      credit: anyPos.mandiri_credit || "Y",
      debit: anyPos.mandiri_debit || "Y",
      qr: anyPos.mandiri_qr || "Y",
      bg: "#fefce8",
      border: "#fde047",
      text: "#a16207",
      headerBg: "#ca8a04",
    },
    {
      bank: "BRI",
      fullName: "Bank Rakyat Indonesia (BRI)",
      tid: pos.bri_tid,
      mid: anyPos.bri_mid,
      credit: anyPos.bri_credit || "Y",
      debit: anyPos.bri_debit || "Y",
      qr: anyPos.bri_qr || "Y",
      bg: "#f0f9ff",
      border: "#7dd3fc",
      text: "#0369a1",
      headerBg: "#0284c7",
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG 3D STOREFRONT BUILDING ON FLOOR PLAN
// ─────────────────────────────────────────────────────────────────────────────

function SvgStoreBuilding({
  store,
  posCount,
  edcCount,
  isSelected,
  onSelect,
  hasPower = true,
  hasInternet = true,
  onTogglePower,
}: {
  store: StoreNode;
  posCount: number;
  edcCount: number;
  isSelected: boolean;
  onSelect: () => void;
  hasPower?: boolean;
  hasInternet?: boolean;
  onTogglePower?: () => void;
}) {
  const { x, y, w, h, roofColor, wallColor } = store;
  const awningCount = 5;
  const stripeW = (w - 10) / awningCount;

  // Power and network outage visual themes
  const isDarkOutage = !hasPower;
  const isNoInternet = hasPower && !hasInternet;

  const displayRoof = isDarkOutage ? "#334155" : roofColor;
  const displayWall = isDarkOutage ? "#1e293b" : isSelected ? "#ffffff" : wallColor;

  return (
    <g onClick={onSelect} className="cursor-pointer">
      {isSelected && (
        <rect
          x={x - 3.5}
          y={y - 3.5}
          width={w + 9}
          height={h + 9}
          rx="10"
          fill="none"
          stroke={displayRoof}
          strokeWidth="2.4"
          strokeDasharray="5 2.5"
        />
      )}

      {/* 3D Side & Bottom Extrusion */}
      <polygon
        points={`${x + 4},${y + h} ${x + w},${y + h} ${x + w + 4},${y + h + 4} ${x + 8},${y + h + 4}`}
        fill="#64748b"
        opacity="0.3"
      />
      <polygon
        points={`${x + w},${y + 5} ${x + w + 4},${y + 9} ${x + w + 4},${y + h + 4} ${x + w},${y + h}`}
        fill="#475569"
        opacity="0.35"
      />

      {/* Store Building Box */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="7"
        fill={displayWall}
        stroke={isDarkOutage ? "#ef4444" : isNoInternet ? "#f59e0b" : displayRoof}
        strokeWidth={isSelected ? "2.6" : "1.6"}
      />

      {/* Store Roof Header */}
      <rect x={x} y={y} width={w} height="18" rx="6" fill={displayRoof} />

      {/* Striped Store Awning */}
      {Array.from({ length: awningCount }).map((_, i) => (
        <rect
          key={i}
          x={x + 5 + i * stripeW}
          y={y + 16}
          width={stripeW - 1}
          height="5"
          rx="1.5"
          fill={i % 2 === 0 ? displayRoof : isDarkOutage ? "#475569" : "#ffffff"}
          stroke={displayRoof}
          strokeWidth="0.5"
        />
      ))}

      {/* Store Title on Roof */}
      <text
        x={x + (w - 18) / 2}
        y={y + 12}
        textAnchor="middle"
        fill="#ffffff"
        fontSize="8.5"
        fontWeight="900"
      >
        {store.roofTitle}
      </text>

      {/* Interactive Power Switch on Roof (Click to toggle power) */}
      <g
        onClick={(e) => {
          e.stopPropagation();
          onTogglePower?.();
        }}
        className="cursor-pointer"
      >
        <title>{hasPower ? "Klik untuk simulasi Mati Lampu (Power Outage)" : "Klik untuk Menyalakan Listrik Toko"}</title>
        <rect
          x={x + w - 18}
          y={y + 2.5}
          width="15"
          height="13"
          rx="3.5"
          fill={hasPower ? "#10b981" : "#ef4444"}
          stroke="#ffffff"
          strokeWidth="0.8"
        />
        <text
          x={x + w - 10.5}
          y={y + 11.5}
          textAnchor="middle"
          fill="#ffffff"
          fontSize="7.5"
          fontWeight="bold"
        >
          ⚡
        </text>
      </g>

      {/* Store Window Display */}
      <rect
        x={x + 6}
        y={y + 23.5}
        width={w - 12}
        height="23.5"
        rx="4"
        fill={isDarkOutage ? "#0f172a" : "#ffffff"}
        stroke={isDarkOutage ? "#ef4444" : isNoInternet ? "#f59e0b" : "#cbd5e1"}
        strokeWidth="0.8"
      />

      {isDarkOutage ? (
        <>
          <rect x={x + 10} y={y + 26.5} width={w - 20} height="17.5" rx="3" fill="#ef4444" opacity="0.95" />
          <text
            x={x + w / 2}
            y={y + 34}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="6.8"
            fontWeight="900"
          >
            ⚡ MATI LAMPU
          </text>
          <text
            x={x + w / 2}
            y={y + 41.5}
            textAnchor="middle"
            fill="#fecaca"
            fontSize="6"
            fontWeight="bold"
          >
            OFFLINE
          </text>
        </>
      ) : isNoInternet ? (
        <>
          <rect x={x + 10} y={y + 26.5} width={w - 20} height="17.5" rx="3" fill="#f59e0b" opacity="0.95" />
          <text
            x={x + w / 2}
            y={y + 34}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="6.8"
            fontWeight="900"
          >
            ⚠️ INET PUTUS
          </text>
          <text
            x={x + w / 2}
            y={y + 41.5}
            textAnchor="middle"
            fill="#fef3c7"
            fontSize="5.8"
            fontWeight="bold"
          >
            (Downstream)
          </text>
        </>
      ) : (
        <>
          <text
            x={x + w / 2}
            y={y + 33.5}
            textAnchor="middle"
            fill="#0f172a"
            fontSize="8.2"
            fontWeight="900"
          >
            {store.dfdLabel}
          </text>
          <text
            x={x + w / 2}
            y={y + 43}
            textAnchor="middle"
            fill={roofColor}
            fontSize="7.8"
            fontWeight="800"
          >
            {posCount} POS • {edcCount} EDC
          </text>
        </>
      )}

      {/* Gate Footer Tag */}
      <rect
        x={x + 7}
        y={y + h - 14.5}
        width={w - 14}
        height="11"
        rx="3"
        fill={isDarkOutage ? "#ef4444" : isNoInternet ? "#f59e0b" : isSelected ? roofColor : "#e2e8f0"}
      />
      <text
        x={x + w / 2}
        y={y + h - 6.8}
        textAnchor="middle"
        fill={isDarkOutage || isNoInternet || isSelected ? "#ffffff" : "#334155"}
        fontSize="6.8"
        fontWeight="900"
      >
        {isDarkOutage ? "⚡ POWER OFF" : isNoInternet ? "NO NETWORK" : store.gateLabel}
      </text>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL POS MACHINE ILLUSTRATION (UNTUK KARTU DI SEBELAH KANAN)
// ─────────────────────────────────────────────────────────────────────────────

function PosMachineIllustration({
  brand,
  posNumber,
  accentColor,
  isOperational,
}: {
  brand: string;
  posNumber: number;
  accentColor: string;
  isOperational: boolean;
}) {
  return (
    <svg viewBox="0 0 140 96" className="w-24 h-18 mx-auto select-none">
      <ellipse cx="70" cy="88" rx="54" ry="4.5" fill="#cbd5e1" opacity="0.55" />

      {/* Left Mini Thermal Printer */}
      <rect x="12" y="50" width="22" height="20" rx="3" fill="#334155" />
      <rect x="15" y="43" width="16" height="9" rx="1.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
      <line x1="17" y1="46" x2="29" y2="46" stroke="#94a3b8" strokeWidth="1" />
      <line x1="17" y1="49" x2="26" y2="49" stroke="#94a3b8" strokeWidth="1" />

      {/* Cash Drawer */}
      <rect
        x="34"
        y="66"
        width="72"
        height="18"
        rx="3.5"
        fill="#475569"
        stroke="#1e293b"
        strokeWidth="1.5"
      />
      <rect x="38" y="72" width="64" height="8" rx="2" fill="#94a3b8" />
      <circle cx="70" cy="76" r="2" fill="#1e293b" />

      {/* Monitor Stand */}
      <path d="M 63 54 L 77 54 L 81 66 L 59 66 Z" fill="#334155" />

      {/* Monitor Frame */}
      <rect
        x="38"
        y="12"
        width="64"
        height="44"
        rx="6"
        fill="#0f172a"
        stroke="#334155"
        strokeWidth="2"
      />
      <rect x="42" y="16" width="56" height="34" rx="3.5" fill={accentColor} />
      <rect x="45" y="19" width="32" height="18" rx="2" fill="#ffffff" opacity="0.92" />
      <rect x="80" y="19" width="15" height="8" rx="1.5" fill="#ffffff" opacity="0.3" />
      <rect x="80" y="29" width="15" height="8" rx="1.5" fill="#ffffff" opacity="0.3" />

      <text x="61" y="27" textAnchor="middle" fill="#0f172a" fontSize="6.5" fontWeight="900">
        {brand}
      </text>
      <text x="61" y="34" textAnchor="middle" fill={accentColor} fontSize="6" fontWeight="900">
        POS #{posNumber}
      </text>

      <rect x="45" y="40" width="50" height="7" rx="1.5" fill="rgba(0,0,0,0.3)" />
      <circle cx="49.5" cy="43.5" r="2" fill={isOperational ? "#4ade80" : "#fb7185"} />
      <text x="72" y="45.5" textAnchor="middle" fill="#ffffff" fontSize="5.2" fontWeight="800">
        {isOperational ? "ONLINE" : "CHECK"}
      </text>

      {/* Right Mini EDC */}
      <rect
        x="108"
        y="46"
        width="18"
        height="24"
        rx="3.5"
        fill="#1e293b"
        stroke="#475569"
        strokeWidth="1.2"
      />
      <rect x="111" y="49" width="12" height="8" rx="1.5" fill="#38bdf8" />
      <circle cx="113.5" cy="61" r="1.2" fill="#94a3b8" />
      <circle cx="117" cy="61" r="1.2" fill="#94a3b8" />
      <circle cx="120.5" cy="61" r="1.2" fill="#94a3b8" />
      <circle cx="113.5" cy="65" r="1.2" fill="#4ade80" />
      <circle cx="117" cy="65" r="1.2" fill="#94a3b8" />
      <circle cx="120.5" cy="65" r="1.2" fill="#f87171" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 3 MODAL: DETAIL SUPER LENGKAP 1 SET KASIR POS + TOPOLOGI + EDC + EDIT SATU DATA
// ─────────────────────────────────────────────────────────────────────────────

function getEffectiveSpecs(pos: PosHardwareAsset) {
  const brandUpper = (pos.pos_brand || "").toUpperCase();
  const isNcr = brandUpper.includes("NCR");
  const isToshiba = brandUpper.includes("TOSHIBA");
  const isKassen = brandUpper.includes("KASSEN");
  const isIware = brandUpper.includes("IWARE");

  const defaultProc = isNcr
    ? "Intel Core i3-4130 @ 3.40 GHz"
    : isToshiba
    ? "Intel Celeron 3965U @ 2.20 GHz"
    : isKassen || isIware
    ? "Intel Celeron J1900 Quad-Core"
    : "Intel Core i3 Dual-Core";

  const defaultRam = isToshiba || isKassen ? "8 GB DDR4" : "4 GB DDR3";
  const defaultSsd = isToshiba ? "256 GB SSD NVMe" : "128 GB SSD SATA";
  const defaultPatch = isToshiba
    ? "Tsigunta POS v4.14"
    : isKassen
    ? "Tsigunta POS v4.15"
    : "Tsigunta POS v4.12";
  const defaultOs = isNcr
    ? "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT"
    : isToshiba
    ? "WINDOWS 10 IOT ENTERPRISE LTSC"
    : "WINDOWS 10 PRO 64BIT";
  const defaultMonitor = hasVal(pos.monitor)
    ? pos.monitor!
    : `Touchscreen 15" Integrated ${pos.pos_brand || "POS"}`;

  return {
    processor: hasVal(pos.processor) ? pos.processor! : defaultProc,
    ram: hasVal(pos.ram) ? pos.ram! : defaultRam,
    ssd: hasVal(pos.ssd) ? pos.ssd! : defaultSsd,
    tsigunta_version: hasVal(pos.tsigunta_version) ? pos.tsigunta_version! : defaultPatch,
    os_version: hasVal(pos.os_version) ? pos.os_version! : defaultOs,
    monitor: defaultMonitor,
  };
}

function PosCompleteSetModal({
  pos,
  store,
  storePosList,
  onSelectPos,
  onClose,
  onUpdatePos,
}: {
  pos: PosHardwareAsset;
  store: StoreNode;
  storePosList: PosHardwareAsset[];
  onSelectPos: (p: PosHardwareAsset) => void;
  onClose: () => void;
  onUpdatePos?: (updated: PosHardwareAsset) => void;
}) {
  const { isAdmin, isMIS } = useAuth();
  const canEdit = isAdmin || isMIS;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Quick Ping Testing State
  const [pingState, setPingState] = useState<{
    testing: boolean;
    result: { status: string; latency?: number } | null;
  }>({ testing: false, result: null });

  const effective = useMemo(() => getEffectiveSpecs(pos), [pos]);
  const edcList = getEdcList(pos);
  const activeEdcs = edcList.filter((e) => hasVal(e.tid));

  const currentIndex = storePosList.findIndex((item) => item.pos_code === pos.pos_code);
  const gatewayIp = deriveGateway(pos.ip_address);

  // Form State for In-Modal Editing
  const [formData, setFormData] = useState({
    pos_brand: pos.pos_brand || "NCR",
    pos_sn: hasVal(pos.pos_sn) ? pos.pos_sn! : "",
    ip_address: pos.ip_address || "",
    os_version: effective.os_version,
    processor: effective.processor,
    ram: effective.ram,
    ssd: effective.ssd,
    tsigunta_version: effective.tsigunta_version,
    status: pos.status || "OPERASIONAL",
    passport_scanner: hasVal(pos.passport_scanner) ? pos.passport_scanner! : "3M",
    barcode_scanner: hasVal(pos.barcode_scanner) ? pos.barcode_scanner! : "HONEYWELL",
    printer: hasVal(pos.printer) ? pos.printer! : "EPSON TM-U220D",
    cash_drawer: hasVal(pos.cash_drawer) ? pos.cash_drawer! : "PANDA",
    fingerprint_scanner: hasVal(pos.fingerprint_scanner) ? pos.fingerprint_scanner! : "OK",
    keyboard: hasVal(pos.keyboard) ? pos.keyboard! : "LOGITECH (PS2)",
    mouse: hasVal(pos.mouse) ? pos.mouse! : "LOGITECH",
    monitor: effective.monitor,
    notes: pos.notes || "",
    anydesk_id: (pos as any).anydesk_id || "",
    anydesk_password: (pos as any).anydesk_password || "",
    // EDC Bank Fields
    bca_tid: hasVal((pos as any).bca_tid) ? (pos as any).bca_tid : "",
    bca_mid: hasVal((pos as any).bca_mid) ? (pos as any).bca_mid : "",
    mandiri_tid: hasVal((pos as any).mandiri_tid) ? (pos as any).mandiri_tid : "",
    mandiri_mid: hasVal((pos as any).mandiri_mid) ? (pos as any).mandiri_mid : "",
    bni_tid: hasVal((pos as any).bni_tid) ? (pos as any).bni_tid : "",
    bni_mid: hasVal((pos as any).bni_mid) ? (pos as any).bni_mid : "",
    bri_tid: hasVal((pos as any).bri_tid) ? (pos as any).bri_tid : "",
    bri_mid: hasVal((pos as any).bri_mid) ? (pos as any).bri_mid : "",
  });

  // Reset form when switching POS
  useEffect(() => {
    setIsEditing(false);
    setSaveSuccess(false);
    setSaveError(null);
    setPingState({ testing: false, result: null });

    const eff = getEffectiveSpecs(pos);
    setFormData({
      pos_brand: pos.pos_brand || "NCR",
      pos_sn: hasVal(pos.pos_sn) ? pos.pos_sn! : "",
      ip_address: pos.ip_address || "",
      os_version: eff.os_version,
      processor: eff.processor,
      ram: eff.ram,
      ssd: eff.ssd,
      tsigunta_version: eff.tsigunta_version,
      status: pos.status || "OPERASIONAL",
      passport_scanner: hasVal(pos.passport_scanner) ? pos.passport_scanner! : "3M",
      barcode_scanner: hasVal(pos.barcode_scanner) ? pos.barcode_scanner! : "HONEYWELL",
      printer: hasVal(pos.printer) ? pos.printer! : "EPSON TM-U220D",
      cash_drawer: hasVal(pos.cash_drawer) ? pos.cash_drawer! : "PANDA",
      fingerprint_scanner: hasVal(pos.fingerprint_scanner) ? pos.fingerprint_scanner! : "OK",
      keyboard: hasVal(pos.keyboard) ? pos.keyboard! : "LOGITECH (PS2)",
      mouse: hasVal(pos.mouse) ? pos.mouse! : "LOGITECH",
      monitor: eff.monitor,
      notes: pos.notes || "",
      anydesk_id: (pos as any).anydesk_id || "",
      anydesk_password: (pos as any).anydesk_password || "",
      bca_tid: hasVal((pos as any).bca_tid) ? (pos as any).bca_tid : "",
      bca_mid: hasVal((pos as any).bca_mid) ? (pos as any).bca_mid : "",
      mandiri_tid: hasVal((pos as any).mandiri_tid) ? (pos as any).mandiri_tid : "",
      mandiri_mid: hasVal((pos as any).mandiri_mid) ? (pos as any).mandiri_mid : "",
      bni_tid: hasVal((pos as any).bni_tid) ? (pos as any).bni_tid : "",
      bni_mid: hasVal((pos as any).bni_mid) ? (pos as any).bni_mid : "",
      bri_tid: hasVal((pos as any).bri_tid) ? (pos as any).bri_tid : "",
      bri_mid: hasVal((pos as any).bri_mid) ? (pos as any).bri_mid : "",
    });
  }, [pos.pos_code]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const runQuickPing = async () => {
    setPingState({ testing: true, result: null });
    try {
      const res = await fetch("/api/monitoring/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip_address: pos.ip_address, asset_code: pos.pos_code }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPingState({ testing: false, result: data.data });
      } else {
        setPingState({ testing: false, result: { status: "OFFLINE", latency: 0 } });
      }
    } catch {
      setPingState({ testing: false, result: { status: "OFFLINE", latency: 0 } });
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      const targetId = pos.id || pos.pos_code;
      const payload = {
        ...pos,
        ...formData,
      };

      const res = await fetch(`/api/pos-hardware/${targetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (resJson.success) {
        setSaveSuccess(true);
        const updatedPos: PosHardwareAsset = {
          ...pos,
          ...formData,
        };
        if (onUpdatePos) {
          onUpdatePos(updatedPos);
        }
        setTimeout(() => {
          setIsEditing(false);
          setSaveSuccess(false);
        }, 1200);
      } else {
        setSaveError(resJson.message || "Gagal menyimpan perubahan.");
      }
    } catch (err: any) {
      setSaveError(err?.message || "Terjadi kendala koneksi ke server saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyFullReport = () => {
    const edcSummary =
      activeEdcs.length > 0
        ? activeEdcs.map((e) => `- EDC ${e.bank}: TID ${e.tid} (MID: ${e.mid || "-"})`).join("\n")
        : "- Tidak ada EDC Bank terhubung";

    const reportText = [
      `=== DETAIL 1 SET KASIR POS (${pos.pos_code}) ===`,
      `Toko / Lokasi : ${pos.shop_name} — ${store.fullName} (${store.gateLabel})`,
      `Terminal / Zona: ${pos.terminal} / Counter ${pos.counter_zone} (Meja #${pos.pos_number})`,
      `Status Unit   : ${formData.status}`,
      ``,
      `[SPESIFIKASI UNIT & JARINGAN]`,
      `- Brand Unit POS : ${formData.pos_brand} (SN: ${formData.pos_sn || "-"})`,
      `- IP Address LAN : ${formData.ip_address} (Gateway: ${gatewayIp})`,
      `- Sistem Operasi : ${formData.os_version}`,
      `- Processor (Proc): ${formData.processor}`,
      `- RAM / Storage  : ${formData.ram} / ${formData.ssd}`,
      `- Patch Tsigunta : ${formData.tsigunta_version}`,
      `- Monitor        : ${formData.monitor}`,
      `- AnyDesk ID     : ${formData.anydesk_id || "-"}`,
      ``,
      `[PERIFERAL KASIR TERPASANG]`,
      `- Passport Reader: ${formData.passport_scanner || "-"}`,
      `- Barcode Scanner: ${formData.barcode_scanner || "-"}`,
      `- Printer Struk  : ${formData.printer || "-"}`,
      `- Laci Kasir     : ${formData.cash_drawer || "-"}`,
      `- Fingerprint    : ${formData.fingerprint_scanner || "-"}`,
      `- Keyboard/Mouse : ${formData.keyboard || "-"} / ${formData.mouse || "-"}`,
      ``,
      `[MESIN EDC BANK TERHUBUNG]`,
      edcSummary,
    ].join("\n");

    handleCopy(reportText, "FULL_REPORT");
  };

  const peripheralItems = [
    {
      id: "passport",
      name: "Passport Scanner",
      model: hasVal(formData.passport_scanner) ? formData.passport_scanner : "Tidak Terpasang",
      installed: hasVal(formData.passport_scanner),
      port: "USB 2.0 High-Speed Optical",
      desc: "Pembaca MRZ Paspor & Boarding Pass Penumpang",
      icon: <Scan className="w-4 h-4" />,
    },
    {
      id: "barcode",
      name: "Barcode Scanner",
      model: hasVal(formData.barcode_scanner) ? formData.barcode_scanner : "Tidak Terpasang",
      installed: hasVal(formData.barcode_scanner),
      port: "USB HID 1D/2D Imager",
      desc: "Pemindai Barcode SKU Produk Duty Free",
      icon: <Scan className="w-4 h-4" />,
    },
    {
      id: "printer",
      name: "Receipt Printer Struk",
      model: hasVal(formData.printer) ? formData.printer : "Tidak Terpasang",
      installed: hasVal(formData.printer),
      port: "USB / Serial Virtual COM",
      desc: "Pencetak Struk Transaksi & Bukti Kasir",
      icon: <Printer className="w-4 h-4" />,
    },
    {
      id: "drawer",
      name: "Cash Drawer (Laci Uang)",
      model: hasVal(formData.cash_drawer) ? formData.cash_drawer : "Tidak Terpasang",
      installed: hasVal(formData.cash_drawer),
      port: "RJ11 Solenoid Kick (via Printer)",
      desc: "Laci Penyimpanan Uang Tunai Multi-Mata Uang",
      icon: <ShoppingCart className="w-4 h-4" />,
    },
    {
      id: "fingerprint",
      name: "Fingerprint Scanner",
      model: hasVal(formData.fingerprint_scanner) ? formData.fingerprint_scanner : "Tidak Terpasang",
      installed: hasVal(formData.fingerprint_scanner),
      port: "USB Biometric Auth",
      desc: "Otentikasi Sidik Jari Kasir & Otorisasi Void/Diskon SPV",
      icon: <Fingerprint className="w-4 h-4" />,
    },
    {
      id: "keyboard",
      name: "Keyboard Kasir",
      model: hasVal(formData.keyboard) ? formData.keyboard : "Tidak Terpasang",
      installed: hasVal(formData.keyboard),
      port: "USB / PS2 StandardPort",
      desc: "Papan Ketik Input Manual Kasir",
      icon: <Keyboard className="w-4 h-4" />,
    },
    {
      id: "mouse",
      name: "Mouse Optical",
      model: hasVal(formData.mouse) ? formData.mouse : "Tidak Terpasang",
      installed: hasVal(formData.mouse),
      port: "USB Optical Sensor",
      desc: "Navigasi Kursor Pendamping Layar Sentuh",
      icon: <Mouse className="w-4 h-4" />,
    },
    {
      id: "monitor",
      name: "Layar Monitor Utama",
      model: formData.monitor || `Integrated Touch ${formData.pos_brand}`,
      installed: true,
      port: "LVDS / VGA / HDMI Display",
      desc: "Layar Utama Aplikasi Kasir POS",
      icon: <Monitor className="w-4 h-4" />,
    },
  ];

  const installedPeripheralsCount = peripheralItems.filter((p) => p.installed).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2.5 sm:p-5 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* ── 1. HEADER UTAMA MODAL + NAVIGASI ANTAR POS ── */}
        <div className="bg-slate-900 text-white px-5 py-4 border-b border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-white font-black shadow-md border border-white/20 flex-shrink-0"
                style={{ backgroundColor: store.roofColor }}
              >
                <span className="text-[10px] leading-none">{store.dfdLabel}</span>
                <span className="text-xs mt-0.5">#{currentIndex + 1}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    SPESIFIKASI LENGKAP 1 SET KASIR POS
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-slate-200 text-[10px] font-bold">
                    📍 {store.gateLabel} • {store.fullName}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-bold">
                    🔄 Satu Data Terpusat
                  </span>
                </div>
                <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white font-mono">
                    {pos.pos_code}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    {formData.ip_address}
                    <button
                      type="button"
                      onClick={() => handleCopy(formData.ip_address, "HEADER_IP")}
                      className="text-slate-400 hover:text-white ml-0.5"
                      title="Salin IP Address"
                    >
                      {copiedKey === "HEADER_IP" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                      formData.status === "OPERASIONAL"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                        : "bg-rose-500/20 text-rose-300 border-rose-400/40"
                    }`}
                  >
                    ● {formData.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Tombol Aksi Cepat di Kanan Atas */}
            <div className="flex items-center gap-2 flex-wrap">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                    isEditing
                      ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white"
                  }`}
                  title={isEditing ? "Batalkan Edit" : "Edit Spesifikasi & Periferal 1 Set POS"}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? "Tutup Mode Edit" : "✏️ Edit 1 Set Kasir"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyFullReport}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                title="Salin Seluruh Ringkasan Spesifikasi"
              >
                {copiedKey === "FULL_REPORT" ? (
                  <>
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Salin Ringkasan</span>
                  </>
                )}
              </button>

              <Link
                href={`/assets?search=${encodeURIComponent(pos.pos_code)}`}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1.5"
                title="Buka pada Master Data Kasir POS"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Buka di Master POS</span>
              </Link>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bar Navigasi Pindah Cepat Antar POS di Toko Ini */}
          {storePosList.length > 1 && (
            <div className="mt-3 pt-3 border-t border-slate-800/90 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                  Pindah Unit POS ({store.dfdLabel}):
                </span>
                {storePosList.map((item, i) => {
                  const isCurrent = item.pos_code === pos.pos_code;
                  const shortCode = item.pos_code.split("-").pop() || `P0${i + 1}`;
                  return (
                    <button
                      key={item.pos_code}
                      type="button"
                      onClick={() => onSelectPos(item)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        isCurrent
                          ? "bg-emerald-500 text-slate-950 font-black shadow-xs"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      }`}
                    >
                      #{i + 1} ({shortCode})
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentIndex <= 0}
                  onClick={() => currentIndex > 0 && onSelectPos(storePosList[currentIndex - 1])}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-200 flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <button
                  type="button"
                  disabled={currentIndex >= storePosList.length - 1}
                  onClick={() =>
                    currentIndex < storePosList.length - 1 &&
                    onSelectPos(storePosList[currentIndex + 1])
                  }
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-200 flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 2. BODY MODAL (MODE EDIT ATAU MODE DETAIL LENGKAP) ── */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto bg-slate-50">
          {/* JIKA DALAM MODE EDIT: FORM INPUT SATU DATA TERINTEGRASI */}
          {isEditing ? (
            <form onSubmit={handleSaveForm} className="space-y-5">
              {/* Notifikasi Sistem Satu Data */}
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex items-start gap-3 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Save className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <h4 className="font-black text-indigo-900 text-sm">
                    Mode Pengeditan 1 Set POS — Sinkronisasi Sistem Satu Data
                  </h4>
                  <p className="text-indigo-700 mt-0.5 leading-relaxed">
                    Setiap perubahan spesifikasi hardware, IP address, periferal, atau EDC bank yang Anda simpan di sini akan otomatis terupdate di <strong>Database Master</strong>, <strong>Topologi Denah Toko</strong>, <strong>Monitoring Ping Jaringan</strong>, dan <strong>Master EDC Bank</strong> secara real-time.
                  </p>
                </div>
              </div>

              {saveSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>Data 1 Set Kasir & EDC berhasil disimpan dan tersinkronisasi ke seluruh sistem!</span>
                </div>
              )}

              {saveError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* CARD 1: IDENTITAS HARDWARE PC & JARINGAN */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    1. Identitas Hardware PC Kasir & Konfigurasi Jaringan
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Merek / Brand Unit POS:
                    </label>
                    <select
                      value={formData.pos_brand}
                      onChange={(e) => setFormData({ ...formData, pos_brand: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="NCR">NCR RealPOS</option>
                      <option value="TOSHIBA">TOSHIBA TCxWave</option>
                      <option value="KASSEN">KASSEN All-in-One</option>
                      <option value="IWARE">IWARE Touchscreen</option>
                      <option value="NEW POS">NEW POS Terminal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Nomor Seri (Serial Number):
                    </label>
                    <input
                      type="text"
                      value={formData.pos_sn}
                      onChange={(e) => setFormData({ ...formData, pos_sn: e.target.value })}
                      placeholder="Contoh: NCR-7842-88912"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Status Operasional Unit:
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="OPERASIONAL">● OPERASIONAL (Aktif di Meja Kasir)</option>
                      <option value="PERBAIKAN">● PERBAIKAN (Sedang Ditangani MIS)</option>
                      <option value="RUSAK">● RUSAK (Kendala Hardware / Butuh Sparepart)</option>
                      <option value="CADANGAN">● CADANGAN (Ready Standby di Gudang)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Alamat IP Statis (LAN Kasir):
                    </label>
                    <input
                      type="text"
                      value={formData.ip_address}
                      onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                      placeholder="Contoh: 172.19.20.11"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-blue-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Sistem Operasi (OS):
                    </label>
                    <input
                      type="text"
                      value={formData.os_version}
                      onChange={(e) => setFormData({ ...formData, os_version: e.target.value })}
                      placeholder="Contoh: WINDOWS 7 EMBEDDED STANDARD SP1 64BIT"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Processor (CPU):
                    </label>
                    <input
                      type="text"
                      value={formData.processor}
                      onChange={(e) => setFormData({ ...formData, processor: e.target.value })}
                      placeholder="Contoh: Intel Core i3-4130 @ 3.40 GHz"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Kapasitas RAM:
                    </label>
                    <input
                      type="text"
                      value={formData.ram}
                      onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                      placeholder="Contoh: 4 GB DDR3 / 8 GB DDR4"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Penyimpanan (Storage SSD/HDD):
                    </label>
                    <input
                      type="text"
                      value={formData.ssd}
                      onChange={(e) => setFormData({ ...formData, ssd: e.target.value })}
                      placeholder="Contoh: 128 GB SSD SATA"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Versi Patch Tsigunta:
                    </label>
                    <input
                      type="text"
                      value={formData.tsigunta_version}
                      onChange={(e) => setFormData({ ...formData, tsigunta_version: e.target.value })}
                      placeholder="Contoh: Tsigunta POS v4.12"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-emerald-700 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      AnyDesk ID Remote Kasir:
                    </label>
                    <input
                      type="text"
                      value={formData.anydesk_id}
                      onChange={(e) => setFormData({ ...formData, anydesk_id: e.target.value })}
                      placeholder="Contoh: 1 458 920 112"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Layar Monitor Utama:
                    </label>
                    <input
                      type="text"
                      value={formData.monitor}
                      onChange={(e) => setFormData({ ...formData, monitor: e.target.value })}
                      placeholder="Contoh: Touchscreen 15 inch Integrated NCR"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 2: PERIFERAL KASIR LENGKAP (8 PERANGKAT) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    2. Rincian 8 Periferal Terpasang di Meja Kasir
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Passport Scanner:
                    </label>
                    <input
                      type="text"
                      value={formData.passport_scanner}
                      onChange={(e) => setFormData({ ...formData, passport_scanner: e.target.value })}
                      placeholder="3M / GEMALTO / -"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Barcode Scanner:
                    </label>
                    <input
                      type="text"
                      value={formData.barcode_scanner}
                      onChange={(e) => setFormData({ ...formData, barcode_scanner: e.target.value })}
                      placeholder="HONEYWELL / DATALOGIC / -"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Printer Struk Kasir:
                    </label>
                    <input
                      type="text"
                      value={formData.printer}
                      onChange={(e) => setFormData({ ...formData, printer: e.target.value })}
                      placeholder="EPSON TM-U220D / TM-T82 / -"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Cash Drawer (Laci Uang):
                    </label>
                    <input
                      type="text"
                      value={formData.cash_drawer}
                      onChange={(e) => setFormData({ ...formData, cash_drawer: e.target.value })}
                      placeholder="PANDA / NCR / -"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Fingerprint Scanner:
                    </label>
                    <input
                      type="text"
                      value={formData.fingerprint_scanner}
                      onChange={(e) => setFormData({ ...formData, fingerprint_scanner: e.target.value })}
                      placeholder="OK / DIGITAL PERSONA / -"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Keyboard Kasir:
                    </label>
                    <input
                      type="text"
                      value={formData.keyboard}
                      onChange={(e) => setFormData({ ...formData, keyboard: e.target.value })}
                      placeholder="LOGITECH (PS2) / USB / -"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Mouse Kasir:
                    </label>
                    <input
                      type="text"
                      value={formData.mouse}
                      onChange={(e) => setFormData({ ...formData, mouse: e.target.value })}
                      placeholder="LOGITECH / -"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Perangkat Lain / UPS:
                    </label>
                    <input
                      type="text"
                      defaultValue={(pos as any).ups || "ICA 1200VA Online"}
                      placeholder="UPS / Stabilizer"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 3: MESIN EDC BANK TERHUBUNG */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    3. Integrasi Mesin EDC Bank (TID & MID)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* BCA */}
                  <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
                    <span className="font-black text-blue-900 block text-xs">EDC Bank BCA</span>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">TID BCA:</label>
                      <input
                        type="text"
                        value={formData.bca_tid}
                        onChange={(e) => setFormData({ ...formData, bca_tid: e.target.value })}
                        placeholder="Contoh: C2356748"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">MID BCA:</label>
                      <input
                        type="text"
                        value={formData.bca_mid}
                        onChange={(e) => setFormData({ ...formData, bca_mid: e.target.value })}
                        placeholder="00049170"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Mandiri */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                    <span className="font-black text-amber-900 block text-xs">EDC Bank Mandiri</span>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">TID Mandiri:</label>
                      <input
                        type="text"
                        value={formData.mandiri_tid}
                        onChange={(e) => setFormData({ ...formData, mandiri_tid: e.target.value })}
                        placeholder="Contoh: 14088514"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">MID Mandiri:</label>
                      <input
                        type="text"
                        value={formData.mandiri_mid}
                        onChange={(e) => setFormData({ ...formData, mandiri_mid: e.target.value })}
                        placeholder="01921869"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  {/* BNI */}
                  <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-2">
                    <span className="font-black text-teal-900 block text-xs">EDC Bank BNI</span>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">TID BNI:</label>
                      <input
                        type="text"
                        value={formData.bni_tid}
                        onChange={(e) => setFormData({ ...formData, bni_tid: e.target.value })}
                        placeholder="Contoh: 10447371"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">MID BNI:</label>
                      <input
                        type="text"
                        value={formData.bni_mid}
                        onChange={(e) => setFormData({ ...formData, bni_mid: e.target.value })}
                        placeholder="BNI-MID-01"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  {/* BRI */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                    <span className="font-black text-indigo-900 block text-xs">EDC Bank BRI</span>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">TID BRI:</label>
                      <input
                        type="text"
                        value={formData.bri_tid}
                        onChange={(e) => setFormData({ ...formData, bri_tid: e.target.value })}
                        placeholder="Contoh: 15301686"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">MID BRI:</label>
                      <input
                        type="text"
                        value={formData.bri_mid}
                        onChange={(e) => setFormData({ ...formData, bri_mid: e.target.value })}
                        placeholder="BRI-MID-01"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 4: CATATAN TEKNISI MIS */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2">
                <label className="block text-xs font-black uppercase text-slate-700">
                  Catatan Khusus Teknisi MIS (Troubleshoot, Port Switch, History Servis):
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan kondisi perangkat, histori penggantian sparepart, atau port switch..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* ACTION BAR SIMPAN / BATAL */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors"
                >
                  Batal
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-emerald-600/20"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan & Mensinkronisasi...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Simpan Perubahan (Satu Data Terintegrasi)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* MODE DETAIL DAN BLUEPRINT LENGKAP */
            <>
              {/* BAGIAN A: RINGKASAN 4 KARTU INDIKATOR UTAMA */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center flex-shrink-0">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Model Unit POS</p>
                    <p className="text-sm font-black text-slate-900 truncate">{formData.pos_brand}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      SN: {hasVal(formData.pos_sn) ? formData.pos_sn : "Terdaftar Resmi"}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[#006622] flex items-center justify-center flex-shrink-0">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">IP Address & GW</p>
                      <button
                        type="button"
                        onClick={runQuickPing}
                        disabled={pingState.testing}
                        className="text-[9px] font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-0.5"
                        title="Uji Ping ke IP Kasir Ini"
                      >
                        {pingState.testing ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Radio className="w-2.5 h-2.5" />
                        )}
                        <span>{pingState.testing ? "Ping..." : "Test Ping"}</span>
                      </button>
                    </div>
                    <p className="text-sm font-mono font-black text-slate-900 truncate">
                      {formData.ip_address}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] truncate">
                      <span className="font-mono text-slate-500">GW: {gatewayIp}</span>
                      {pingState.result && (
                        <span
                          className={`px-1 rounded text-[9px] font-bold ${
                            pingState.result.status === "ONLINE"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {pingState.result.status} {pingState.result.latency ? `(${pingState.result.latency}ms)` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0">
                    <Cable className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Periferal Terpasang</p>
                    <p className="text-sm font-black text-slate-900">
                      {installedPeripheralsCount} / 8 Perangkat
                    </p>
                    <p className="text-[10px] text-emerald-700 font-semibold truncate">
                      Passport • Printer • Drawer
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Koneksi Mesin EDC</p>
                    <p className="text-sm font-black text-slate-900">
                      {activeEdcs.length} dari 4 Bank
                    </p>
                    <p className="text-[10px] text-blue-700 font-semibold truncate">
                      {activeEdcs.length > 0
                        ? activeEdcs.map((e) => e.bank).join(", ")
                        : "Tanpa EDC Bank"}
                    </p>
                  </div>
                </div>
              </div>

              {/* BAGIAN B: SKEMA VISUAL ARSITEKTUR 1 SET MEJA KASIR + SPESIFIKASI INTI */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Kiri (7 Col): Ilustrasi Blueprint Meja Kasir 1 Set Lengkap */}
                <div className="lg:col-span-7 bg-slate-900 rounded-2xl p-4 sm:p-5 text-white border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                        Blueprint Topologi Meja Kasir ({pos.pos_code})
                      </h3>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Counter {pos.counter_zone} • Meja #{pos.pos_number}
                    </span>
                  </div>

                  {/* SVG Diagram Interaktif 1 Set Meja Kasir */}
                  <svg viewBox="0 0 600 230" className="w-full h-auto select-none my-auto">
                    {/* Garis Kabel Koneksi dari Main POS ke semua periferal */}
                    <g stroke="#10b981" strokeWidth="1.8" strokeDasharray="4 3" fill="none" opacity="0.75">
                      {/* Ke Passport Reader (Kiri Atas) */}
                      <path d="M 235 95 L 145 52" />
                      {/* Ke Barcode Scanner (Kiri Tengah) */}
                      <path d="M 235 112 L 145 115" />
                      {/* Ke Fingerprint (Kiri Bawah) */}
                      <path d="M 235 130 L 145 178" />
                      {/* Ke Printer Struk (Kanan Atas) */}
                      <path d="M 365 95 L 455 52" />
                      {/* Ke Cash Drawer (Kanan Tengah) */}
                      <path d="M 365 112 L 455 115" />
                      {/* Ke Keyboard & Mouse (Kanan Bawah) */}
                      <path d="M 365 130 L 455 178" />
                    </g>

                    {/* NODE KIRI 1: PASSPORT READER */}
                    <g>
                      <rect
                        x="12"
                        y="24"
                        width="135"
                        height="50"
                        rx="9"
                        fill="#1e293b"
                        stroke={hasVal(formData.passport_scanner) ? "#10b981" : "#475569"}
                        strokeWidth="1.8"
                      />
                      <circle
                        cx="26"
                        cy="38"
                        r="4"
                        fill={hasVal(formData.passport_scanner) ? "#4ade80" : "#64748b"}
                      />
                      <text x="36" y="41" fill="#94a3b8" fontSize="8.5" fontWeight="800">
                        PASSPORT READER
                      </text>
                      <text x="24" y="58" fill="#ffffff" fontSize="10.5" fontWeight="900">
                        {hasVal(formData.passport_scanner) ? formData.passport_scanner : "TIDAK ADA"}
                      </text>
                    </g>

                    {/* NODE KIRI 2: BARCODE SCANNER */}
                    <g>
                      <rect
                        x="12"
                        y="88"
                        width="135"
                        height="50"
                        rx="9"
                        fill="#1e293b"
                        stroke={hasVal(formData.barcode_scanner) ? "#10b981" : "#475569"}
                        strokeWidth="1.8"
                      />
                      <circle
                        cx="26"
                        cy="102"
                        r="4"
                        fill={hasVal(formData.barcode_scanner) ? "#4ade80" : "#64748b"}
                      />
                      <text x="36" y="105" fill="#94a3b8" fontSize="8.5" fontWeight="800">
                        BARCODE SCANNER
                      </text>
                      <text x="24" y="122" fill="#ffffff" fontSize="10.5" fontWeight="900">
                        {hasVal(formData.barcode_scanner) ? formData.barcode_scanner : "TIDAK ADA"}
                      </text>
                    </g>

                    {/* NODE KIRI 3: FINGERPRINT */}
                    <g>
                      <rect
                        x="12"
                        y="152"
                        width="135"
                        height="50"
                        rx="9"
                        fill="#1e293b"
                        stroke={hasVal(formData.fingerprint_scanner) ? "#10b981" : "#475569"}
                        strokeWidth="1.8"
                      />
                      <circle
                        cx="26"
                        cy="166"
                        r="4"
                        fill={hasVal(formData.fingerprint_scanner) ? "#4ade80" : "#64748b"}
                      />
                      <text x="36" y="169" fill="#94a3b8" fontSize="8.5" fontWeight="800">
                        FINGERPRINT AUTH
                      </text>
                      <text x="24" y="186" fill="#ffffff" fontSize="10.5" fontWeight="900">
                        {hasVal(formData.fingerprint_scanner) ? formData.fingerprint_scanner : "STANDAR / -"}
                      </text>
                    </g>

                    {/* CENTER NODE: MAIN POS TERMINAL WORKSTATION */}
                    <g>
                      <rect
                        x="212"
                        y="32"
                        width="176"
                        height="162"
                        rx="16"
                        fill="#064e3b"
                        stroke="#34d399"
                        strokeWidth="2.5"
                      />
                      <rect x="232" y="44" width="136" height="18" rx="5" fill="#10b981" />
                      <text
                        x="300"
                        y="56"
                        textAnchor="middle"
                        fill="#022c22"
                        fontSize="9"
                        fontWeight="900"
                      >
                        UNIT UTAMA KASIR POS
                      </text>

                      {/* Layar Monitor Tengah */}
                      <rect
                        x="236"
                        y="70"
                        width="128"
                        height="66"
                        rx="7"
                        fill="#0f172a"
                        stroke="#6ee7b7"
                        strokeWidth="1.5"
                      />
                      <text
                        x="300"
                        y="92"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="14"
                        fontWeight="900"
                      >
                        {formData.pos_brand}
                      </text>
                      <text
                        x="300"
                        y="108"
                        textAnchor="middle"
                        fill="#34d399"
                        fontSize="9.5"
                        fontWeight="800"
                        fontFamily="monospace"
                      >
                        {pos.pos_code}
                      </text>
                      <text
                        x="300"
                        y="124"
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="8.5"
                        fontFamily="monospace"
                      >
                        IP: {formData.ip_address}
                      </text>

                      {/* Base / Stand */}
                      <rect x="244" y="146" width="112" height="34" rx="5" fill="#022c22" />
                      <text
                        x="300"
                        y="160"
                        textAnchor="middle"
                        fill="#a7f3d0"
                        fontSize="8"
                        fontWeight="800"
                      >
                        RAM {formData.ram} • SSD {formData.ssd}
                      </text>
                      <text
                        x="300"
                        y="172"
                        textAnchor="middle"
                        fill="#6ee7b7"
                        fontSize="7.5"
                        fontWeight="700"
                      >
                        {activeEdcs.length} EDC Bank Terhubung
                      </text>
                    </g>

                    {/* NODE KANAN 1: RECEIPT PRINTER */}
                    <g>
                      <rect
                        x="453"
                        y="24"
                        width="135"
                        height="50"
                        rx="9"
                        fill="#1e293b"
                        stroke={hasVal(formData.printer) ? "#10b981" : "#475569"}
                        strokeWidth="1.8"
                      />
                      <circle
                        cx="467"
                        cy="38"
                        r="4"
                        fill={hasVal(formData.printer) ? "#4ade80" : "#64748b"}
                      />
                      <text x="477" y="41" fill="#94a3b8" fontSize="8.5" fontWeight="800">
                        PRINTER STRUK
                      </text>
                      <text x="465" y="58" fill="#ffffff" fontSize="9.5" fontWeight="900">
                        {hasVal(formData.printer) ? formData.printer.slice(0, 17) : "TIDAK ADA"}
                      </text>
                    </g>

                    {/* NODE KANAN 2: CASH DRAWER */}
                    <g>
                      <rect
                        x="453"
                        y="88"
                        width="135"
                        height="50"
                        rx="9"
                        fill="#1e293b"
                        stroke={hasVal(formData.cash_drawer) ? "#10b981" : "#475569"}
                        strokeWidth="1.8"
                      />
                      <circle
                        cx="467"
                        cy="102"
                        r="4"
                        fill={hasVal(formData.cash_drawer) ? "#4ade80" : "#64748b"}
                      />
                      <text x="477" y="105" fill="#94a3b8" fontSize="8.5" fontWeight="800">
                        CASH DRAWER (LACI)
                      </text>
                      <text x="465" y="122" fill="#ffffff" fontSize="10.5" fontWeight="900">
                        {hasVal(formData.cash_drawer) ? formData.cash_drawer : "TIDAK ADA"}
                      </text>
                    </g>

                    {/* NODE KANAN 3: KEYBOARD & MOUSE */}
                    <g>
                      <rect
                        x="453"
                        y="152"
                        width="135"
                        height="50"
                        rx="9"
                        fill="#1e293b"
                        stroke={hasVal(formData.keyboard) ? "#10b981" : "#475569"}
                        strokeWidth="1.8"
                      />
                      <circle
                        cx="467"
                        cy="166"
                        r="4"
                        fill={hasVal(formData.keyboard) ? "#4ade80" : "#64748b"}
                      />
                      <text x="477" y="169" fill="#94a3b8" fontSize="8.5" fontWeight="800">
                        KEYBOARD & MOUSE
                      </text>
                      <text x="465" y="186" fill="#ffffff" fontSize="9.5" fontWeight="900">
                        {formData.keyboard || "LOGITECH"} / {formData.mouse || "LOGITECH"}
                      </text>
                    </g>
                  </svg>

                  <div className="mt-2 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
                    <span className="truncate max-w-[320px]">
                      OS: <strong className="text-slate-200">{formData.os_version}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      {formData.anydesk_id && (
                        <button
                          type="button"
                          onClick={() => handleCopy(formData.anydesk_id, "ANYDESK_BLUEPRINT")}
                          className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-400/30 text-[10px] font-mono font-bold flex items-center gap-1 hover:bg-rose-500/30"
                          title="Salin AnyDesk ID"
                        >
                          <Tv className="w-3 h-3" />
                          <span>AnyDesk: {formData.anydesk_id}</span>
                        </button>
                      )}
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Seluruh Port Aktif
                      </span>
                    </div>
                  </div>
                </div>

                {/* Kanan (5 Col): Spesifikasi Detail Hardware & Konfigurasi Jaringan */}
                <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-[#006622]" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Identitas Sistem & Jaringan Kasir
                        </h3>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                      )}
                    </div>

                    <div className="divide-y divide-slate-100 text-xs">
                      <div className="py-2 flex items-center justify-between gap-2">
                        <span className="text-slate-500">Kode Titik Kasir</span>
                        <span className="font-mono font-black text-slate-900">{pos.pos_code}</span>
                      </div>
                      <div className="py-2 flex items-center justify-between gap-2">
                        <span className="text-slate-500">Toko & Terminal</span>
                        <span className="font-bold text-slate-800">
                          {pos.shop_name} • {pos.terminal}
                        </span>
                      </div>
                      <div className="py-2 flex items-center justify-between gap-2">
                        <span className="text-slate-500">Area Counter / Gate</span>
                        <span className="font-bold text-[#006622]">
                          {store.dfdLabel} ({store.gateLabel})
                        </span>
                      </div>
                      <div className="py-2 flex items-center justify-between gap-2">
                        <span className="text-slate-500">Alamat IP Statis</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {formData.ip_address}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(formData.ip_address, "SPEC_IP")}
                            className="text-slate-400 hover:text-slate-700"
                            title="Salin IP"
                          >
                            {copiedKey === "SPEC_IP" ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="py-2 flex items-center justify-between gap-2">
                        <span className="text-slate-500">Gateway / Subnet</span>
                        <span className="font-mono text-slate-700 font-semibold">
                          {gatewayIp} / 24
                        </span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-slate-500">Merek / Tipe PC POS</span>
                        <span className="font-black text-slate-900">{formData.pos_brand}</span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-slate-500">Sistem Operasi (OS)</span>
                        <span
                          className="font-mono font-semibold text-slate-800 text-right max-w-[210px] truncate"
                          title={formData.os_version}
                        >
                          {formData.os_version}
                        </span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-slate-500">Processor (Proc)</span>
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {formData.processor}
                        </span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-slate-500">RAM</span>
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {formData.ram}
                        </span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-slate-500">Storage (SSD/HDD)</span>
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {formData.ssd}
                        </span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-slate-500">Patch</span>
                        <span className="font-mono font-bold text-[#006622] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {formData.tsigunta_version}
                        </span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-slate-500">Keyboard Kasir</span>
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {formData.keyboard || "LOGITECH"}
                        </span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-slate-500">Mouse Kasir</span>
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {formData.mouse || "LOGITECH"}
                        </span>
                      </div>
                      {formData.anydesk_id && (
                        <div className="py-1.5 flex items-center justify-between gap-2">
                          <span className="text-slate-500">AnyDesk ID</span>
                          <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            {formData.anydesk_id}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {hasVal(formData.notes) && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                      <span className="font-black uppercase text-[10px] text-amber-700 block mb-0.5">
                        Catatan Teknisi MIS:
                      </span>
                      {formData.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* BAGIAN C: DAFTAR LENGKAP 8 PERIFERAL 1 SET KASIR */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-[#006622] flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Rincian Periferal 1 Set Kasir ({installedPeripheralsCount} dari 8 Komponen Terpasang)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Daftar perangkat keras pendamping yang menempel langsung pada unit kasir {pos.pos_code}
                      </p>
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Ubah Periferal</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {peripheralItems.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl p-3.5 border transition-all flex flex-col justify-between ${
                        item.installed
                          ? "bg-slate-50/70 border-slate-200/90"
                          : "bg-slate-50/30 border-slate-200/50 opacity-55"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              item.installed
                                ? "bg-emerald-100/80 text-[#006622]"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {item.icon}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                              item.installed
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            {item.installed ? "✓ Terpasang" : "Kosong"}
                          </span>
                        </div>

                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {item.name}
                        </p>
                        <p className="text-xs font-black text-slate-900 mt-0.5 truncate">
                          {item.model}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                          {item.desc}
                        </p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[9.5px] font-mono text-slate-500">
                        <span>Port:</span>
                        <span className="font-semibold text-slate-700">{item.port}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BAGIAN D: MESIN EDC BANK TERHUBUNG */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Mesin EDC Bank Terhubung ({activeEdcs.length} dari 4 Bank)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Data Terminal ID (TID), Merchant ID (MID), serta fitur Credit, Debit & QRIS di meja kasir {pos.pos_code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit EDC</span>
                      </button>
                    )}
                    <Link
                      href={`/edc?search=${encodeURIComponent(pos.pos_code)}`}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <span>Lihat di Master EDC</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {edcList.map((edc) => {
                    const isConnected = hasVal(edc.tid);
                    return (
                      <div
                        key={edc.bank}
                        className={`rounded-2xl border overflow-hidden flex flex-col justify-between ${
                          isConnected ? "shadow-2xs" : "opacity-55 bg-slate-50 border-slate-200"
                        }`}
                        style={
                          isConnected
                            ? { backgroundColor: edc.bg, borderColor: edc.border }
                            : undefined
                        }
                      >
                        {/* Header Kartu Bank */}
                        <div
                          className="px-3.5 py-2.5 flex items-center justify-between text-white"
                          style={{
                            backgroundColor: isConnected ? edc.headerBg : "#64748b",
                          }}
                        >
                          <div>
                            <span className="text-xs font-black tracking-wider block leading-none">
                              EDC {edc.bank}
                            </span>
                            <span className="text-[9px] text-white/80 font-medium">
                              {edc.fullName}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-black">
                            {isConnected ? "● AKTIF" : "KOSONG"}
                          </span>
                        </div>

                        {isConnected ? (
                          <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                            <div className="space-y-2">
                              {/* Box TID */}
                              <div className="bg-white rounded-xl p-2.5 border border-slate-200/80">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-bold uppercase text-slate-400">
                                    TERMINAL ID (TID)
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(edc.tid!, `TID_${edc.bank}`)}
                                    className="text-slate-400 hover:text-slate-800 flex items-center gap-0.5 text-[9px] font-bold"
                                  >
                                    {copiedKey === `TID_${edc.bank}` ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        <span className="text-emerald-600">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <p className="text-sm font-mono font-black text-slate-900 mt-0.5">
                                  {edc.tid}
                                </p>
                              </div>

                              {/* Box MID */}
                              <div className="bg-white/80 rounded-xl px-2.5 py-1.5 border border-slate-200/60 flex items-center justify-between">
                                <span className="text-[9px] font-bold uppercase text-slate-400">
                                  MID:
                                </span>
                                <span className="text-[11px] font-mono font-bold text-slate-700">
                                  {hasVal(edc.mid) ? edc.mid : "Terdaftar"}
                                </span>
                              </div>
                            </div>

                            {/* Fitur Pembayaran: Credit / Debit / QRIS */}
                            <div className="pt-2 border-t border-slate-200/60">
                              <span className="text-[8.5px] font-bold uppercase text-slate-400 block mb-1">
                                FITUR TRANSAKSI AKTIF:
                              </span>
                              <div className="grid grid-cols-3 gap-1 text-center">
                                {[
                                  { label: "CREDIT", val: edc.credit },
                                  { label: "DEBIT", val: edc.debit },
                                  { label: "QRIS", val: edc.qr },
                                ].map((feat) => {
                                  const active = feat.val === "Y" || feat.val === "OK";
                                  return (
                                    <span
                                      key={feat.label}
                                      className={`py-0.5 rounded text-[8.5px] font-black border ${
                                        active
                                          ? "bg-white text-emerald-700 border-emerald-200"
                                          : "bg-slate-100 text-slate-400 border-slate-200"
                                      }`}
                                    >
                                      {active ? "✓ " : "– "}
                                      {feat.label}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 text-center my-auto">
                            <p className="text-xs text-slate-400 italic">
                              Tidak ada mesin EDC {edc.bank} pada titik kasir ini
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE: PRECISION ALIGNED LEFT FLOORPLAN + RIGHT POS MODEL GRID
// ─────────────────────────────────────────────────────────────────────────────

function PosTopologyContent() {
  const { user, isAdmin, isMIS, isManager } = useAuth();

  const [selectedTerminal, setSelectedTerminal] = useState<TerminalKey>("Terminal 3");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("DF1");
  const [selectedPos, setSelectedPos] = useState<PosHardwareAsset | null>(null);

  // Power state for daisy-chain network simulation (DF1 to DF7)
  const [storePower, setStorePower] = useState<Record<string, boolean>>({
    DF1: true,
    DF2: true,
    DF3: true,
    DF4: true,
    DF5: true,
    DF6: true,
    DF7: true,
    GGO01: true,
  });

  const CHAIN_ORDER = useMemo(() => ["DF1", "DF2", "DF3", "DF4", "DF5", "DF6", "DF7"], []);

  // Compute internet connectivity for each store along the daisy chain:
  // DF1 -> DF2 -> DF3 -> DF4 -> DF5 -> DF6 -> DF7
  // Jika salah satu toko mati lampu (misal DF3), maka DF3 s/d DF7 otomatis mati internetnya!
  const storeInternet = useMemo(() => {
    const inetMap: Record<string, boolean> = {};
    let linkAlive = true;

    for (const storeId of CHAIN_ORDER) {
      if (!storePower[storeId]) {
        linkAlive = false;
      }
      inetMap[storeId] = linkAlive;
    }
    inetMap["GGO01"] = storePower["GGO01"] ?? true;
    return inetMap;
  }, [storePower, CHAIN_ORDER]);

  const toggleStorePower = (storeId: string) => {
    setStorePower((prev) => ({
      ...prev,
      [storeId]: !prev[storeId],
    }));
  };

  const resetAllPower = () => {
    setStorePower({
      DF1: true,
      DF2: true,
      DF3: true,
      DF4: true,
      DF5: true,
      DF6: true,
      DF7: true,
      GGO01: true,
    });
  };

  const [allPos, setAllPos] = useState<PosHardwareAsset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const posRes = await fetch("/api/pos-hardware", { cache: "no-store" });
      const posJson = await posRes.json();
      if (posJson.success && Array.isArray(posJson.data)) {
        setAllPos(posJson.data);
        setSelectedPos((prev) =>
          prev
            ? posJson.data.find((p: PosHardwareAsset) => p.pos_code === prev.pos_code) || null
            : null
        );
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const handleFocus = () => fetchAllData();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchAllData]);

  const activeStores: StoreNode[] = useMemo(() => {
    if (selectedTerminal === "Terminal 3") return T3_STORES;
    if (selectedTerminal === "Terminal 2") return T2_STORES;
    return SBY_STORES;
  }, [selectedTerminal]);

  useEffect(() => {
    if (activeStores.length > 0 && !activeStores.some((s) => s.id === selectedStoreId)) {
      setSelectedStoreId(activeStores[0].id);
    }
  }, [activeStores, selectedStoreId]);

  const currentStore = useMemo(
    () => activeStores.find((s) => s.id === selectedStoreId) || activeStores[0],
    [activeStores, selectedStoreId]
  );

  const getStorePosList = useCallback(
    (store: StoreNode): PosHardwareAsset[] => {
      return allPos.filter(store.posFilter);
    },
    [allPos]
  );

  if (!user) {
    return <AccessDenied moduleName="Topologi & Denah Kasir POS" />;
  }

  const currentStorePos = currentStore ? getStorePosList(currentStore) : [];

  return (
    <SidebarLayout
      title="Topologi & Denah Toko Kasir"
      subtitle="Gate 10: DF1 (DFD1) s/d Tikungan Kanan DF6 (DFD6) & Kiri DF7 (DFD7) + Gate 3: GGO01 (SAM)"
    >
      <div className="px-2.5 sm:px-4 py-3 space-y-3 w-full max-w-[1720px] mx-auto">
        {/* ── TOP HEADER & TERMINAL PILLS ── */}
        <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#006622] text-white flex items-center justify-center flex-shrink-0">
              <Store className="w-4.5 h-4.5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                Denah Lokasi Toko & Unit Kasir POS
              </h1>
              <p className="text-[11px] text-slate-500">
                Klik toko pada denah di kiri ➔ klik unit POS di sebelah kanan untuk membuka detail 1 set lengkap
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: "Terminal 3", label: "Terminal 3", count: 34 },
                { key: "Terminal 2", label: "Terminal 2", count: 21 },
                { key: "Surabaya", label: "Surabaya", count: 13 },
              ] as { key: TerminalKey; label: string; count: number }[]
            ).map((tab) => {
              const active = selectedTerminal === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedTerminal(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? "bg-[#006622] text-white shadow-2xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <Plane className="w-3 h-3" />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                      active ? "bg-white/20 text-white" : "bg-white text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SIMULASI DAYA LISTRIK & KABEL JARINGAN BERANTAI (DAISY-CHAIN BUS) ── */}
        {selectedTerminal === "Terminal 3" && (
          <div className="bg-slate-900 text-white rounded-2xl p-3.5 border border-slate-700/80 shadow-md space-y-2.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                  <Activity className="w-4.5 h-4.5 animate-pulse" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm font-black tracking-wide text-white">
                      SIMULASI KABEL JARINGAN INTERNET BERANTAI (DAISY-CHAIN BUS)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                      DF1 ➔ DF2 ➔ DF3 ➔ DF4 ➔ DF5 ➔ DF6 ➔ DF7
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Sinyal internet mengalir berantai dari <b>DF1 s/d DF7</b>. Jika salah satu toko mati lampu (misal DF3), internet di toko tersebut dan toko setelahnya (DF4–DF7) otomatis padam, serta animasi aliran kabel akan berhenti di DF3.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => toggleStorePower("DF3")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                    !storePower["DF3"]
                      ? "bg-amber-500 hover:bg-amber-600 text-slate-950 ring-2 ring-amber-400/30"
                      : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{!storePower["DF3"] ? "⚡ Nyalakan DF3" : "⚡ Tes: Matikan DF3"}</span>
                </button>

                <button
                  type="button"
                  onClick={resetAllPower}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Nyalakan seluruh listrik toko"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Semua ON</span>
                </button>
              </div>
            </div>

            {/* Grid 7 Pills Toko Terminal 3 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1 border-t border-slate-800">
              {CHAIN_ORDER.map((storeId) => {
                const isPowerOn = storePower[storeId] ?? true;
                const isInetOn = storeInternet[storeId] ?? true;

                return (
                  <div
                    key={storeId}
                    className={`p-2 rounded-xl border transition-all flex flex-col justify-between ${
                      !isPowerOn
                        ? "bg-rose-950/40 border-rose-700 text-rose-200"
                        : !isInetOn
                        ? "bg-amber-950/40 border-amber-700 text-amber-200"
                        : "bg-slate-800/80 border-slate-700 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs text-white">
                        {storeId}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleStorePower(storeId)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black cursor-pointer transition-colors ${
                          isPowerOn
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                            : "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                        }`}
                        title={`Klik untuk matikan / nyalakan listrik ${storeId}`}
                      >
                        {isPowerOn ? "⚡ ON" : "⚡ MATI"}
                      </button>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[9px]">
                      <span className="text-slate-400">Net Flow:</span>
                      <span
                        className={`font-bold flex items-center gap-1 ${
                          isInetOn ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isInetOn ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
                        {isInetOn ? "ONLINE" : "PUTUS"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MAIN SPLIT VIEW: SEJAJAR TINGGI ATAS & BAWAH (items-stretch) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* ══════════════════════════════════════════════════════════════════
              KOLOM KIRI (7 COL): DENAH RAPI & SEJAJAR PRESISI
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
            <div className="h-14 px-4 bg-slate-900 text-white flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wide">
                  {selectedTerminal === "Terminal 3"
                    ? "Denah L-Concourse Terminal 3 (Gate 10 s/d Gate 1)"
                    : `Denah Concourse ${selectedTerminal}`}
                </span>
              </div>
              <span className="text-[11px] text-emerald-300 font-bold">
                Klik Toko di Denah ➔
              </span>
            </div>

            <div className="h-9 px-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] flex-shrink-0">
              <span className="font-bold text-slate-600">
                Peta Garbarata & Posisi Toko Duty Free
              </span>
              <span className="text-slate-500 font-semibold">
                Aktif: <strong className="text-[#006622]">{currentStore?.roofTitle}</strong> ({currentStore?.gateLabel})
              </span>
            </div>

            <div className="p-3 bg-slate-100/60 flex-1 flex items-center justify-center">
              {selectedTerminal === "Terminal 3" ? (
                <svg viewBox="0 0 880 460" className="w-full h-auto select-none">
                  {/* STYLE TAG FOR ANIMATED CABLE DATA PACKETS FLOWING LEFT (DF1 -> DF2 -> ... -> DF7) */}
                  <defs>
                    <style>{`
                      @keyframes cableFlowLeft {
                        from { stroke-dashoffset: 24; }
                        to { stroke-dashoffset: 0; }
                      }
                      .active-cable-flow {
                        animation: cableFlowLeft 0.75s linear infinite;
                      }
                    `}</style>
                  </defs>

                  <path
                    d="M 40 20 L 180 20 L 180 336 L 860 336 L 860 454 L 96 454 Q 40 454 40 380 Z"
                    fill="#cbd5e1"
                    transform="translate(4, 5)"
                  />
                  <path
                    d="M 40 20 L 180 20 L 180 336 L 860 336 L 860 454 L 96 454 Q 40 454 40 380 Z"
                    fill="#f8fafc"
                    stroke="#334155"
                    strokeWidth="2.5"
                  />

                  <rect x="180" y="336" width="680" height="7" fill="#334155" />

                  <path
                    d="M 110 38 L 110 350 L 844 350"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                  />

                  {/* VERTICAL PIER GATES: GATE 1, GATE 2, GATE 3, GATE 4 */}
                  {[
                    { gate: "GATE 1", y: 48 },
                    { gate: "GATE 2", y: 104 },
                    { gate: "GATE 3", y: 168, color: "#d97706" },
                    { gate: "GATE 4", y: 232, color: "#2563eb" },
                  ].map((g) => (
                    <g key={g.gate}>
                      <path
                        d={`M 180 ${g.y} L 216 ${g.y} L 216 ${g.y - 14} L 226 ${g.y - 14} L 226 ${g.y + 10} L 180 ${g.y + 10} Z`}
                        fill={g.color ? "#fef3c7" : "#e2e8f0"}
                        stroke={g.color || "#475569"}
                        strokeWidth="1.5"
                      />
                      <rect
                        x="232"
                        y={g.y - 10}
                        width="86"
                        height="20"
                        rx="5"
                        fill={g.color || "#334155"}
                      />
                      <text
                        x="275"
                        y={g.y + 3}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="8.5"
                        fontWeight="900"
                      >
                        ✈ {g.gate}
                      </text>
                    </g>
                  ))}

                  {/* HORIZONTAL CONCOURSE GATES: GATE 5 S/D GATE 10 */}
                  {[
                    { gate: "GATE 5", hint: "Tikungan DF6/DF7", cx: 224, color: "#0284c7" },
                    { gate: "GATE 6", hint: "DF5 (DFD5)", cx: 338, color: "#16a34a" },
                    { gate: "GATE 7", hint: "DF4 (DFD4)", cx: 452, color: "#006622" },
                    { gate: "GATE 8", hint: "DF3 (DFD3)", cx: 566, color: "#0d9488" },
                    { gate: "GATE 9", hint: "DF2 (DFD2)", cx: 680, color: "#059669" },
                    { gate: "GATE 10", hint: "DF1 (DFD1)", cx: 794, color: "#006622" },
                  ].map((g) => (
                    <g key={g.gate}>
                      <path
                        d={`M ${g.cx - 6} 336 L ${g.cx - 6} 296 L ${g.cx - 14} 296 L ${g.cx - 14} 286 L ${g.cx + 8} 286 L ${g.cx + 8} 336 Z`}
                        fill="#e2e8f0"
                        stroke={g.color}
                        strokeWidth="1.5"
                      />
                      <rect
                        x={g.cx - 45}
                        y="252"
                        width="90"
                        height="30"
                        rx="6"
                        fill={g.color}
                      />
                      <text
                        x={g.cx}
                        y="265"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="8.5"
                        fontWeight="900"
                      >
                        ✈ {g.gate}
                      </text>
                      <text
                        x={g.cx}
                        y="276"
                        textAnchor="middle"
                        fill="#ecfdf5"
                        fontSize="7.2"
                        fontWeight="700"
                      >
                        {g.hint}
                      </text>
                    </g>
                  ))}

                  {/* Banner Tikungan Kiri DF7 & Kanan DF6 */}
                  <rect
                    x="60"
                    y="336"
                    width="214"
                    height="15"
                    rx="4"
                    fill="#dbeafe"
                    stroke="#93c5fd"
                    strokeWidth="1"
                  />
                  <text
                    x="167"
                    y="346"
                    textAnchor="middle"
                    fill="#1e40af"
                    fontSize="7.5"
                    fontWeight="900"
                  >
                    TIKUNGAN GATE 4–5: KIRI DF7 • KANAN DF6
                  </text>

                  {/* ────────────────────────────────────────────────────────── */}
                  {/* KABEL JARINGAN BERANTAI ANIMASI: DF1 ➔ DF2 ➔ DF3 ➔ DF7    */}
                  {/* ────────────────────────────────────────────────────────── */}
                  {/* Conduit Cable Tray Base */}
                  <rect x="52" y="424" width="804" height="18" rx="9" fill="#0f172a" stroke="#334155" strokeWidth="1.2" />
                  <text x="66" y="436" fill="#64748b" fontSize="6.8" fontWeight="900" letterSpacing="0.4">
                    KABEL JARINGAN BERANTAI: DF1 ➔ DF2 ➔ DF3 ➔ DF4 ➔ DF5 ➔ DF6 ➔ DF7
                  </text>
                  <text x="844" y="436" textAnchor="end" fill="#10b981" fontSize="6.8" fontWeight="900">
                    ⚡ SERVER / ISP ➔
                  </text>

                  {/* MAIN FEED: SERVER TO DF1 (x=844 to x=794) */}
                  {storePower["DF1"] ? (
                    <path
                      d="M 844 433 L 794 433"
                      stroke="#10b981"
                      strokeWidth="3.5"
                      strokeDasharray="6 3"
                      className="active-cable-flow"
                      strokeLinecap="round"
                    />
                  ) : (
                    <path
                      d="M 844 433 L 794 433"
                      stroke="#ef4444"
                      strokeWidth="2.2"
                      strokeDasharray="4 3"
                      opacity="0.45"
                      strokeLinecap="round"
                    />
                  )}

                  {/* 6 CABLE SEGMENTS (DF1 -> DF2 -> DF3 -> DF4 -> DF5 -> DF6 -> DF7) */}
                  {[
                    { from: "DF1", to: "DF2", fromX: 794, toX: 680 },
                    { from: "DF2", to: "DF3", fromX: 680, toX: 566 },
                    { from: "DF3", to: "DF4", fromX: 566, toX: 452 },
                    { from: "DF4", to: "DF5", fromX: 452, toX: 338 },
                    { from: "DF5", to: "DF6", fromX: 338, toX: 224 },
                    { from: "DF6", to: "DF7", fromX: 224, toX: 110 },
                  ].map((seg) => {
                    // Segment is active only if the upstream store has power AND internet!
                    const isSegActive = (storePower[seg.from] ?? true) && (storeInternet[seg.from] ?? true);

                    return (
                      <g key={`${seg.from}-${seg.to}`}>
                        {isSegActive ? (
                          <>
                            <path
                              d={`M ${seg.fromX} 433 L ${seg.toX} 433`}
                              stroke="#10b981"
                              strokeWidth="3.5"
                              strokeDasharray="6 3"
                              className="active-cable-flow"
                              strokeLinecap="round"
                            />
                            {/* Glowing packet particle indicator */}
                            <circle cx={(seg.fromX + seg.toX) / 2} cy="433" r="2.2" fill="#a7f3d0" />
                          </>
                        ) : (
                          <path
                            d={`M ${seg.fromX} 433 L ${seg.toX} 433`}
                            stroke="#ef4444"
                            strokeWidth="2.2"
                            strokeDasharray="4 3"
                            opacity="0.45"
                            strokeLinecap="round"
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* DROP CABLES & SWITCH NODES FOR EACH STORE */}
                  {[
                    { id: "DF1", x: 794 },
                    { id: "DF2", x: 680 },
                    { id: "DF3", x: 566 },
                    { id: "DF4", x: 452 },
                    { id: "DF5", x: 338 },
                    { id: "DF6", x: 224 },
                    { id: "DF7", x: 110 },
                  ].map((node) => {
                    const isPowerOn = storePower[node.id] ?? true;
                    const isInetOn = storeInternet[node.id] ?? true;

                    return (
                      <g key={node.id}>
                        {/* Vertical patch drop cable from store (y=422) down to backbone (y=433) */}
                        <line
                          x1={node.x}
                          y1="422"
                          x2={node.x}
                          y2="433"
                          stroke={isPowerOn && isInetOn ? "#10b981" : "#ef4444"}
                          strokeWidth="2"
                          strokeDasharray={isPowerOn && isInetOn ? "3 2" : "2 2"}
                        />

                        {/* Node LED switch icon */}
                        {isPowerOn && isInetOn ? (
                          <>
                            <circle cx={node.x} cy="433" r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.2" />
                            <circle cx={node.x} cy="433" r="7.5" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.7" className="animate-ping" />
                          </>
                        ) : !isPowerOn ? (
                          <>
                            <circle cx={node.x} cy="433" r="4.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.2" />
                            <text x={node.x} y="446" textAnchor="middle" fill="#ef4444" fontSize="6" fontWeight="900">
                              ⚡ MATI
                            </text>
                          </>
                        ) : (
                          <>
                            <circle cx={node.x} cy="433" r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.2" />
                            <text x={node.x} y="446" textAnchor="middle" fill="#f59e0b" fontSize="5.8" fontWeight="900">
                              NO INET
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}

                  {/* RENDER TOKO BUILDINGS */}
                  {T3_STORES.map((store) => {
                    const storePos = getStorePosList(store);
                    const edcCount = storePos.filter((p) =>
                      getEdcList(p).some((e) => hasVal(e.tid))
                    ).length;
                    const isSelected = currentStore?.id === store.id;

                    return (
                      <SvgStoreBuilding
                        key={store.id}
                        store={store}
                        posCount={storePos.length}
                        edcCount={edcCount}
                        isSelected={isSelected}
                        onSelect={() => setSelectedStoreId(store.id)}
                        hasPower={storePower[store.id] ?? true}
                        hasInternet={storeInternet[store.id] ?? true}
                        onTogglePower={() => toggleStorePower(store.id)}
                      />
                    );
                  })}
                </svg>
              ) : (
                <svg viewBox="0 0 880 230" className="w-full h-auto select-none">
                  <rect
                    x="30"
                    y="40"
                    width="825"
                    height="165"
                    rx="20"
                    fill="#cbd5e1"
                    transform="translate(4, 6)"
                  />
                  <rect
                    x="30"
                    y="40"
                    width="825"
                    height="165"
                    rx="20"
                    fill="#f8fafc"
                    stroke="#334155"
                    strokeWidth="2.5"
                  />
                  <text
                    x="440"
                    y="78"
                    textAnchor="middle"
                    fill="#1e293b"
                    fontSize="12"
                    fontWeight="900"
                  >
                    DENAH CONCOURSE {selectedTerminal.toUpperCase()} — KLIK TOKO DI BAWAH
                  </text>

                  {activeStores.map((store) => {
                    const storePos = getStorePosList(store);
                    const edcCount = storePos.filter((p) =>
                      getEdcList(p).some((e) => hasVal(e.tid))
                    ).length;
                    const isSelected = currentStore?.id === store.id;

                    return (
                      <SvgStoreBuilding
                        key={store.id}
                        store={store}
                        posCount={storePos.length}
                        edcCount={edcCount}
                        isSelected={isSelected}
                        onSelect={() => setSelectedStoreId(store.id)}
                      />
                    );
                  })}
                </svg>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              KOLOM KANAN (5 COL): SEJAJAR TINGGI DENGAN DENAH KIRI
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
            {currentStore && (
              <>
                <div
                  className="h-14 px-4 text-white flex items-center justify-between gap-3 flex-shrink-0"
                  style={{
                    backgroundColor:
                      (storePower[currentStore.id] ?? true)
                        ? currentStore.roofColor
                        : "#334155",
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="px-2.5 py-1 rounded-lg bg-white/15 border border-white/25 text-center flex-shrink-0">
                      <span className="text-xs font-black block leading-none">
                        {currentStore.dfdLabel}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-white truncate leading-tight">
                          {currentStore.fullName}
                        </h3>
                        {!(storePower[currentStore.id] ?? true) && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white text-[9px] font-black uppercase">
                            Mati Lampu
                          </span>
                        )}
                        {(storePower[currentStore.id] ?? true) && !(storeInternet[currentStore.id] ?? true) && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-black uppercase">
                            Inet Putus
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/85 font-semibold truncate">
                        📍 {currentStore.gateLabel} • {currentStore.wing}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleStorePower(currentStore.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-2xs ${
                        (storePower[currentStore.id] ?? true)
                          ? "bg-white/20 hover:bg-white/30 text-white border border-white/30"
                          : "bg-rose-500 hover:bg-rose-600 text-white"
                      }`}
                      title="Klik untuk matikan / nyalakan listrik toko ini"
                    >
                      {(storePower[currentStore.id] ?? true) ? "⚡ Matikan" : "⚡ Nyalakan"}
                    </button>

                    <div className="text-right flex-shrink-0 bg-black/25 px-2.5 py-1 rounded-xl">
                      <span className="text-xs font-black block leading-none">
                        {currentStorePos.length} POS
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-9 px-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] flex-shrink-0">
                  <span className="font-bold text-slate-700">
                    Unit Kasir POS ({currentStore.dfdLabel})
                  </span>
                  <span className="text-[#006622] font-bold">
                    Klik POS untuk buka detail
                  </span>
                </div>

                {/* ALERT CALLOUT IF POWER OR INTERNET DOWN */}
                {!(storePower[currentStore.id] ?? true) ? (
                  <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 text-rose-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <ZapOff className="w-5 h-5 text-rose-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-black leading-tight">Toko Sedang Mati Lampu (Power Off)</p>
                        <p className="text-[10.5px] text-rose-600 leading-snug mt-0.5">
                          Seluruh unit kasir POS di toko ini padam dan tidak menerima daya listrik.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleStorePower(currentStore.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-2xs cursor-pointer shrink-0"
                    >
                      Nyalakan
                    </button>
                  </div>
                ) : !(storeInternet[currentStore.id] ?? true) ? (
                  <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-amber-900">
                    <div className="flex items-center gap-2 min-w-0">
                      <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-black leading-tight">Koneksi Internet Terputus</p>
                        <p className="text-[10.5px] text-amber-700 leading-snug mt-0.5">
                          Toko ini memiliki listrik normal, tetapi jaringan internet padam karena toko sebelumnya di jalur berantai mati lampu.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="p-4 bg-slate-50/40 flex-1 flex flex-col justify-center">
                  {isLoading ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Memuat unit POS...
                    </div>
                  ) : currentStorePos.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Tidak ada unit POS pada toko ini.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-auto">
                      {currentStorePos.map((pos, idx) => {
                        const isStorePowered = storePower[currentStore.id] ?? true;
                        const isStoreNet = storeInternet[currentStore.id] ?? true;
                        const isOp = pos.status === "OPERASIONAL" && isStorePowered && isStoreNet;

                        return (
                          <button
                            key={pos.pos_code}
                            type="button"
                            onClick={() => setSelectedPos(pos)}
                            className={`group bg-white rounded-2xl p-3 border-2 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col items-center justify-between text-center cursor-pointer ${
                              !isStorePowered
                                ? "border-rose-200 hover:border-rose-400 bg-rose-50/20"
                                : !isStoreNet
                                ? "border-amber-200 hover:border-amber-400 bg-amber-50/20"
                                : "border-slate-200 hover:border-[#006622] hover:bg-emerald-50/50"
                            }`}
                          >
                            <div className="w-full py-0.5 group-hover:scale-105 transition-transform">
                              <PosMachineIllustration
                                brand={pos.pos_brand}
                                posNumber={idx + 1}
                                accentColor={
                                  !isStorePowered
                                    ? "#ef4444"
                                    : !isStoreNet
                                    ? "#f59e0b"
                                    : currentStore.roofColor
                                }
                                isOperational={isOp}
                              />
                            </div>

                            <div className="w-full mt-1">
                              <p className="text-[11px] font-black text-slate-900 group-hover:text-[#006622] tracking-tight truncate w-full">
                                {pos.pos_code}
                              </p>
                              <span
                                className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-bold ${
                                  !isStorePowered
                                    ? "bg-rose-100 text-rose-700"
                                    : !isStoreNet
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-100 group-hover:bg-emerald-100/80 text-slate-600 group-hover:text-[#006622]"
                                }`}
                              >
                                {!isStorePowered ? "PADAM" : !isStoreNet ? "NO INET" : `${pos.pos_brand} • Detail`}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL DETAIL SUPER LENGKAP 1 SET KASIR POS + EDC + EDIT SATU DATA ── */}
      {selectedPos && currentStore && (
        <PosCompleteSetModal
          pos={selectedPos}
          store={currentStore}
          storePosList={currentStorePos}
          onSelectPos={(nextPos) => setSelectedPos(nextPos)}
          onClose={() => setSelectedPos(null)}
          onUpdatePos={async (updated) => {
            setSelectedPos(updated);
            await fetchAllData();
          }}
        />
      )}
    </SidebarLayout>
  );
}

export default function PosTopologyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
            <span className="text-sm font-medium">Memuat Denah Toko Terminal 3…</span>
          </div>
        </div>
      }
    >
      <PosTopologyContent />
    </Suspense>
  );
}
