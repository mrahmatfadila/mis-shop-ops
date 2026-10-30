import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Gabungkan className secara kondisional + merge konflik Tailwind.
 * Pure function, aman dipakai di server maupun client.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const rupiahFmt = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFmt = new Intl.NumberFormat("id-ID");

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type DateInput = string | number | Date | null | undefined;
type NumberInput = number | string | null | undefined;

function toNumber(value: NumberInput): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format angka menjadi rupiah (tanpa desimal), fallback aman untuk data kosong. */
export function formatRupiah(value: NumberInput): string {
  const n = toNumber(value);
  return n === null ? "Rp 0" : rupiahFmt.format(n);
}

/** Format angka ribuan locale Indonesia, fallback "0". */
export function formatNumber(value: NumberInput): string {
  const n = toNumber(value);
  return n === null ? "0" : numberFmt.format(n);
}

/** Format tanggal (contoh: 30 Oktober 2026), fallback "-". */
export function formatDate(value: DateInput): string {
  const d = toDate(value);
  return d === null ? "-" : dateFmt.format(d);
}

/** Format tanggal + jam (contoh: 30 Okt 2026, 23.36), fallback "-". */
export function formatDateTime(value: DateInput): string {
  const d = toDate(value);
  return d === null ? "-" : dateTimeFmt.format(d);
}

/**
 * Kelas badge status subdued sesuai AI_RULES:
 * emerald = normal/aktif, amber = menunggu, blue = info/proses, rose = rusak/darurat, slate = netral.
 */
export function statusBadgeClass(status?: string | null): string {
  switch ((status ?? "").trim().toUpperCase()) {
    case "OPERASIONAL":
    case "AKTIF":
    case "SELESAI":
    case "ONLINE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    case "MENUNGGU":
    case "PENDING":
    case "PERBAIKAN":
    case "STANDBY":
    case "WARNING":
      return "bg-amber-50 text-amber-700 border-amber-200/80";
    case "DIPROSES":
      return "bg-blue-50 text-blue-700 border-blue-200/80";
    case "RUSAK":
    case "DARURAT":
    case "OFFLINE":
      return "bg-rose-50 text-rose-700 border-rose-200/80";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200/80";
  }
}

/** Kelas badge tingkat urgensi tiket. */
export function urgencyBadgeClass(urgency?: string | null): string {
  switch ((urgency ?? "").trim().toUpperCase()) {
    case "DARURAT":
      return "bg-rose-50 text-rose-700 border-rose-200/80";
    case "TINGGI":
      return "bg-amber-50 text-amber-700 border-amber-200/80";
    case "SEDANG":
      return "bg-blue-50 text-blue-700 border-blue-200/80";
    case "RENDAH":
      return "bg-slate-50 text-slate-600 border-slate-200/80";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200/80";
  }
}

/** Kelas badge divisi (dipakai Direktori Extension / PABX). */
export function divisionBadgeClass(division?: string | null): string {
  switch ((division ?? "").trim().toUpperCase()) {
    case "ACC":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "BOD":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "FIN":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "GS":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "MCD":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "MIS":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "WHS":
      return "bg-cyan-50 text-cyan-800 border-cyan-300";
    case "HRD":
      return "bg-pink-50 text-pink-700 border-pink-200";
    case "FACILITY":
      return "bg-teal-50 text-teal-700 border-teal-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

/** Tampilkan nilai apa adanya, fallback "-" untuk null/undefined/string kosong. */
export function safeText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text.length > 0 ? text : "-";
}
