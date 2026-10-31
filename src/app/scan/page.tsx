"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Laptop,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Calendar,
  Store,
  DollarSign,
  Clock,
  ShieldCheck,
  Zap,
  RefreshCw,
  Printer,
  LifeBuoy,
  ChevronRight,
  ExternalLink,
  Search,
  ArrowLeft,
  Server,
  Layers,
  Cpu,
  Monitor,
  HardDrive,
  Copy,
  Check,
  Building2,
  MapPin,
  CheckCheck
} from "lucide-react";
import TicketModal from "@/components/TicketModal";
import BarcodeGeneratorModal from "@/components/BarcodeGeneratorModal";
import ScannerModal from "@/components/ScannerModal";
import { Asset } from "@/types";

interface AssetDetailData {
  asset_code: string;
  name: string;
  category: string;
  shop_location: string;
  brand_model?: string;
  serial_number?: string;
  ip_address?: string | null;
  status?: string;
  notes?: string;
  procurement?: {
    price?: string;
    purchase_date?: string;
    vendor?: string;
    last_replaced_date?: string;
    warranty_status?: string;
  };
  specs?: Record<string, string>;
  child_components?: Array<{
    name: string;
    type: string;
    model: string;
    sn: string;
    status: string;
  }>;
  tickets?: Array<{
    ticket_number: string;
    title: string;
    status: string;
    created_at: string;
    urgency: string;
  }>;
  change_history?: Array<{
    component: string;
    newModel: string;
    price: string;
    store: string;
    date: string;
    notes: string;
  }>;
}

function ScanDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCode = searchParams.get("code") || "";

  const [inputCode, setInputCode] = useState(initialCode);
  const [activeCode, setActiveCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetData, setAssetData] = useState<AssetDetailData | null>(null);

  // Ping state
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ status: "ONLINE" | "OFFLINE"; latency?: number | null } | null>(null);

  // Modals
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [isStickerOpen, setIsStickerOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"specs" | "history" | "tickets">("specs");

  // Fetch asset details
  const fetchAssetDetail = async (codeToFetch: string) => {
    if (!codeToFetch.trim()) return;
    setLoading(true);
    setError(null);
    setPingResult(null);

    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(codeToFetch.trim())}`);
      const json = await res.json();
      if (json.success && json.data) {
        setAssetData(json.data);
      } else {
        setError(json.message || `Perangkat dengan kode "${codeToFetch}" tidak ditemukan di database.`);
        setAssetData(null);
      }
    } catch (err: any) {
      setError(err?.message || "Gagal memuat rincian aset dari server.");
      setAssetData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCode) {
      fetchAssetDetail(activeCode);
    }
  }, [activeCode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setActiveCode(inputCode.trim());
    router.replace(`/scan?code=${encodeURIComponent(inputCode.trim())}`);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Test Ping single IP
  const handleTestPing = async (ip: string) => {
    if (!ip || ip === "-") return;
    setIsPinging(true);
    try {
      const res = await fetch("/api/office/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, status: assetData?.status }),
      });
      const json = await res.json();
      if (json.success) {
        setPingResult({ status: json.status, latency: json.latency });
      } else {
        setPingResult({ status: "OFFLINE", latency: null });
      }
    } catch {
      setPingResult({ status: "OFFLINE", latency: null });
    } finally {
      setIsPinging(false);
    }
  };

  // Helper convert to Asset object for modal
  const assetModalObject: Asset | null = assetData
    ? {
        asset_code: assetData.asset_code,
        name: assetData.name,
        category: assetData.category as any,
        shop_location: assetData.shop_location,
        brand_model: assetData.brand_model || "-",
        serial_number: assetData.serial_number || "-",
        ip_address: assetData.ip_address || null,
        status: assetData.status === "CADANGAN" ? "CADANGAN" : "OPERASIONAL",
        notes: assetData.notes || "",
      }
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col pb-12 font-sans selection:bg-[#006622] selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#006622] to-emerald-700 text-white flex items-center justify-center font-black text-sm shadow-2xs">
              PB
            </div>
            <div>
              <h1 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">
                PT PLAZA BALI PRIMA
              </h1>
              <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
                MIS SHOP OPS • PORTAL INSPEKSI ASET
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCameraScannerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#006622] border border-emerald-200/80 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scan Kamera</span>
            </button>
            <Link
              href="/"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 text-xs font-bold transition-all"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 pt-4 space-y-4">
        {/* Search Bar (Quick Switch Asset) */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Scan atau ketik kode aset / ID barang (misal: CGKT3DFA02-P01, MON-..., PC-MIS...)"
            className="w-full pl-10 pr-24 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#006622]/20 focus:border-[#006622]"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 bg-[#006622] hover:bg-[#00521b] text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95"
          >
            Cari
          </button>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center space-y-3 shadow-2xs">
            <RefreshCw className="w-8 h-8 text-[#006622] animate-spin mx-auto" />
            <p className="font-bold text-sm text-slate-700">Mengambil data detail aset...</p>
            <p className="text-xs text-slate-400">Sinkronisasi data pengadaan, riwayat perbaikan, & spesifikasi hardware</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="font-extrabold text-slate-900 text-sm sm:text-base">Aset Tidak Ditemukan</h2>
            <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsCameraScannerOpen(true)}
                className="px-4 py-2 bg-[#006622] text-white rounded-xl text-xs font-bold shadow-2xs active:scale-95"
              >
                Scan Ulang Kamera
              </button>
              <Link
                href="/"
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Ke Beranda
              </Link>
            </div>
          </div>
        )}

        {/* Asset Details View */}
        {!loading && assetData && (
          <div className="space-y-4">
            {/* Header Hero Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/50 via-white to-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#006622] text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                    <Laptop className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-slate-900 text-white tracking-wider">
                        {assetData.asset_code}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-[#006622] border border-emerald-200/80">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        {assetData.status || "OPERASIONAL"}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-1">
                      {assetData.name}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#006622] shrink-0" />
                      <span>{assetData.shop_location}</span>
                      <span>•</span>
                      <span>{assetData.category}</span>
                    </p>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsTicketOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    <LifeBuoy className="w-3.5 h-3.5" />
                    <span>Lapor Kendala</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsStickerOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Cetak Stiker</span>
                  </button>
                </div>
              </div>

              {/* Network Status & Quick Info Bar */}
              <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* IP Address & Live Ping */}
                  {assetData.ip_address && assetData.ip_address !== "-" ? (
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200/90 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-400">IP:</span>
                      <span className="font-mono font-bold text-blue-700 text-xs">
                        {assetData.ip_address}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(assetData.ip_address!, "ip")}
                        title="Salin IP"
                        className="text-slate-400 hover:text-slate-600 ml-0.5"
                      >
                        {copiedKey === "ip" ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>

                      {/* Ping Status Pill */}
                      {isPinging ? (
                        <span className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          <span>Pinging...</span>
                        </span>
                      ) : pingResult ? (
                        <span
                          onClick={() => handleTestPing(assetData.ip_address!)}
                          className={`inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full text-[9px] font-bold cursor-pointer border ${
                            pingResult.status === "ONLINE"
                              ? "bg-emerald-50 text-[#006622] border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                          title="Klik untuk uji ulang ping"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              pingResult.status === "ONLINE" ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          <span>
                            {pingResult.status === "ONLINE"
                              ? `Online (${pingResult.latency || 2}ms)`
                              : "Offline"}
                          </span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTestPing(assetData.ip_address!)}
                          className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-all cursor-pointer"
                        >
                          <Zap className="w-2.5 h-2.5 fill-sky-600 text-sky-600" />
                          <span>Tes Ping</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-slate-400">
                      <span>IP Address:</span>
                      <span className="font-mono font-bold">—</span>
                    </div>
                  )}

                  {/* Serial Number */}
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200/90 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-400">SN:</span>
                    <span className="font-mono font-bold text-slate-700 text-xs">
                      {assetData.serial_number || "ASET-PB-DEFAULT"}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-medium">
                  ID: <span className="font-mono text-slate-600">{assetData.brand_model || assetData.name}</span>
                </div>
              </div>
            </div>

            {/* 4 Kartu Metrik Pengadaan & Riwayat (Kapan Dibeli, Kapan Diganti, Toko, Harga) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Card 1: Tanggal Pembelian */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Kapan Dibeli
                  </span>
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                  {assetData.procurement?.purchase_date || "30 Apr 2026"}
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Tanggal Pengadaan Awal
                </p>
              </div>

              {/* Card 2: Toko Distributor / Vendor */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Toko / Vendor
                  </span>
                  <Store className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight truncate" title={assetData.procurement?.vendor || "Distributor Resmi IT"}>
                  {assetData.procurement?.vendor || "Distributor Resmi IT"}
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Distributor & Garansi Resmi
                </p>
              </div>

              {/* Card 3: Harga Pengadaan */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Harga Pengadaan
                  </span>
                  <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="text-xs sm:text-sm font-black text-[#006622] tracking-tight">
                  {assetData.procurement?.price || "Rp 350.000"}
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Estimasi Nilai Perolehan
                </p>
              </div>

              {/* Card 4: Terakhir Diganti / Diperbarui */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Terakhir Diganti
                  </span>
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                  {assetData.procurement?.last_replaced_date || "30 Okt 2026"}
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Servis / Update Terakhir
                </p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="flex items-center border-b border-slate-200 px-3 pt-2 gap-1 bg-slate-50/60 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("specs")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "specs"
                      ? "border-[#006622] text-[#006622] bg-white shadow-2xs"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Spesifikasi Lengkap</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "history"
                      ? "border-[#006622] text-[#006622] bg-white shadow-2xs"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Riwayat Penggantian ({assetData.change_history?.length || 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("tickets")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "tickets"
                      ? "border-[#006622] text-[#006622] bg-white shadow-2xs"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <LifeBuoy className="w-3.5 h-3.5" />
                  <span>Tiket Kendala ({assetData.tickets?.length || 0})</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-4">
                {/* TAB 1: SPESIFIKASI */}
                {activeTab === "specs" && (
                  <div className="space-y-4">
                    {/* If Set Asset with Child Components */}
                    {assetData.child_components && assetData.child_components.length > 0 ? (
                      <div className="space-y-2.5">
                        <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
                          Daftar Komponen Hardware Terpasang ({assetData.child_components.length} Perangkat):
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {assetData.child_components.map((c, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                  {idx + 1}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-extrabold text-xs text-slate-900 truncate">
                                    {c.name}
                                  </p>
                                  <p className="font-mono text-[11px] text-blue-700 font-semibold truncate">
                                    {c.model || "-"}
                                  </p>
                                </div>
                              </div>
                              <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 shrink-0">
                                {c.sn}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : assetData.specs && Object.keys(assetData.specs).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {Object.entries(assetData.specs).map(([key, val]) => (
                          <div
                            key={key}
                            className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between"
                          >
                            <span className="text-xs font-bold text-slate-500 capitalize">
                              {key.replace(/_/g, " ")}:
                            </span>
                            <span className="font-mono font-extrabold text-xs text-slate-900">
                              {val || "-"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-center text-xs text-slate-500">
                        {assetData.notes || "Spesifikasi standar operasional terdaftar pada sistem inventaris."}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: RIWAYAT PENGGANTIAN */}
                {activeTab === "history" && (
                  <div className="space-y-3">
                    {assetData.change_history && assetData.change_history.length > 0 ? (
                      assetData.change_history.map((hist, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-slate-900">
                              Penggantian {hist.component}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                              {hist.date}
                            </span>
                          </div>
                          <p className="text-xs text-blue-700 font-bold font-mono">
                            Unit Baru: {hist.newModel}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                            <span>Toko: <strong className="text-slate-700">{hist.store}</strong></span>
                            <span>•</span>
                            <span>Biaya: <strong className="text-[#006622]">{hist.price}</strong></span>
                            {hist.notes && (
                              <>
                                <span>•</span>
                                <span>Ket: <em>{hist.notes}</em></span>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center space-y-1 text-slate-400">
                        <CheckCheck className="w-8 h-8 mx-auto text-emerald-500 opacity-60" />
                        <p className="text-xs font-bold text-slate-600">Belum Ada Riwayat Pergantian Part</p>
                        <p className="text-[11px]">Seluruh komponen hardware masih dalam kondisi asli bawaan unit.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: TIKET KENDALA */}
                {activeTab === "tickets" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
                        Riwayat Laporan Kendala IT
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsTicketOpen(true)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-[#006622] hover:bg-[#00521b] text-white rounded-lg text-xs font-bold shadow-2xs active:scale-95 cursor-pointer"
                      >
                        <LifeBuoy className="w-3 h-3" />
                        <span>+ Buat Tiket Baru</span>
                      </button>
                    </div>

                    {assetData.tickets && assetData.tickets.length > 0 ? (
                      assetData.tickets.map((t) => (
                        <div
                          key={t.ticket_number}
                          className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-800">
                                {t.ticket_number}
                              </span>
                              <span
                                className={`px-2 py-0.2 rounded-full text-[9px] font-black border ${
                                  t.status === "SELESAI"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                {t.status}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-900 mt-0.5">{t.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{t.created_at}</p>
                          </div>
                          <Link
                            href={`/tickets?search=${encodeURIComponent(t.ticket_number)}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            title="Buka Tiket"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center space-y-1 text-slate-400">
                        <CheckCheck className="w-8 h-8 mx-auto text-emerald-500 opacity-60" />
                        <p className="text-xs font-bold text-slate-600">Tidak Ada Kendala Terbuka</p>
                        <p className="text-[11px]">Perangkat ini dalam kondisi prima dan siap digunakan transaksi.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Ticket Modal */}
      {assetModalObject && (
        <TicketModal
          isOpen={isTicketOpen}
          asset={assetModalObject}
          onClose={() => setIsTicketOpen(false)}
          onSuccess={() => {
            setIsTicketOpen(false);
            if (activeCode) fetchAssetDetail(activeCode);
          }}
        />
      )}

      {/* Barcode Sticker Modal */}
      {assetModalObject && (
        <BarcodeGeneratorModal
          isOpen={isStickerOpen}
          asset={assetModalObject}
          onClose={() => setIsStickerOpen(false)}
        />
      )}

      {/* Camera Barcode Scanner Modal */}
      <ScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onSelectAsset={(asset) => {
          setIsCameraScannerOpen(false);
          if (asset && asset.asset_code) {
            setInputCode(asset.asset_code);
            setActiveCode(asset.asset_code);
            router.replace(`/scan?code=${encodeURIComponent(asset.asset_code)}`);
          }
        }}
      />
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Memuat Portal Inspeksi Aset...</div>}>
      <ScanDetailContent />
    </Suspense>
  );
}
