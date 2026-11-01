"use client";

import { useEffect, useState, useId, Suspense } from "react";
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
  CheckCheck,
  ScreenShare,
  X,
  FileText,
  BadgeCheck,
  SlidersHorizontal
} from "lucide-react";
import TicketModal from "@/components/TicketModal";
import BarcodeGeneratorModal from "@/components/BarcodeGeneratorModal";
import ScannerModal from "@/components/ScannerModal";
import { Asset } from "@/types";
import QRCode from "qrcode";

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
  itemType?: string;
  parentSet?: {
    code: string;
    name: string;
    type: string;
    location: string;
  };
  procurement?: {
    price?: string;
    purchase_date?: string;
    vendor?: string;
    last_replaced_date?: string;
    warranty_status?: string;
    po_number?: string;
  };
  specs?: Record<string, string>;
  child_components?: Array<{
    name: string;
    type: string;
    model: string;
    sn: string;
    status: string;
    price?: string;
    store?: string;
  }>;
  tickets?: Array<{
    ticket_number: string;
    title: string;
    status: string;
    created_at: string;
    urgency: string;
    problem_desc?: string;
    reporter_name?: string;
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

const SAMPLE_CODES = [
  { label: "RAM-001 (RAM Internal)", code: "RAM-001" },
  { label: "CGKT2DFD05-P04 (Kasir POS)", code: "CGKT2DFD05-P04" },
  { label: "CGKT3DFA01-P01 (Kasir T3)", code: "CGKT3DFA01-P01" },
  { label: "PC-HRD-26-002-0 (PC HRD)", code: "PC-HRD-26-002-0" },
  { label: "PC-MIS-26-002-0 (PC Office)", code: "PC-MIS-26-002-0" },
  { label: "SSD-002 (Storage)", code: "SSD-002" },
  { label: "CPU-001 (Processor)", code: "CPU-001" },
];

function ScanDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCode = searchParams.get("code") || "";

  const [inputCode, setInputCode] = useState(initialCode);
  const [activeCode, setActiveCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetData, setAssetData] = useState<AssetDetailData | null>(null);

  // Ping & Network
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ status: "ONLINE" | "OFFLINE"; latency?: number | null } | null>(null);

  // Remote AnyDesk
  const [confirmRemote, setConfirmRemote] = useState<boolean>(false);
  const [remoteLaunching, setRemoteLaunching] = useState<boolean>(false);
  const [remoteToast, setRemoteToast] = useState<string | null>(null);

  // Modals
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [isStickerOpen, setIsStickerOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"specs" | "components" | "history" | "tickets" | "qrcode">("specs");

  // QR Code Image
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Fetch asset details
  const fetchAssetDetail = async (codeToFetch: string) => {
    if (!codeToFetch.trim()) return;
    setLoading(true);
    setError(null);
    setPingResult(null);

    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(codeToFetch.trim())}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setAssetData(json.data);
        // Default tab: if child components exist, show components or specs
        if (json.data.child_components && json.data.child_components.length > 0) {
          setActiveTab("components");
        } else {
          setActiveTab("specs");
        }

        // Generate QR code
        try {
          const currentUrl = typeof window !== "undefined" ? window.location.href : `https://mis-shop-ops.local/scan?code=${encodeURIComponent(codeToFetch.trim())}`;
          const qr = await QRCode.toDataURL(currentUrl, {
            width: 260,
            margin: 2,
            color: { dark: "#0f172a", light: "#ffffff" },
          });
          setQrDataUrl(qr);
        } catch (e) {}
      } else {
        setError(json.message || `Perangkat dengan kode "${codeToFetch}" tidak ditemukan di database.`);
        setAssetData(null);
      }
    } catch (err: any) {
      setError(err?.message || "Gagal menghubungi server database.");
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
    const clean = inputCode.trim();
    setActiveCode(clean);
    router.replace(`/scan?code=${encodeURIComponent(clean)}`);
  };

  const handleSelectSample = (code: string) => {
    setInputCode(code);
    setActiveCode(code);
    router.replace(`/scan?code=${encodeURIComponent(code)}`);
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

  // Remote AnyDesk Handler
  const handleExecuteRemote = async () => {
    if (!assetData) return;
    const target = assetData.ip_address?.trim() || "";
    if (!target || target === "-") {
      alert("Alamat IP tidak terdaftar pada aset ini.");
      setConfirmRemote(false);
      return;
    }

    setConfirmRemote(false);
    setRemoteLaunching(true);

    try {
      const pwd = "cupcake2020";
      try {
        navigator.clipboard.writeText(pwd);
      } catch (e) {}

      const res = await fetch("/api/anydesk/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          password: pwd,
          posCode: assetData.asset_code,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        window.location.href = `anydesk:${target}`;
      }
      setRemoteToast(`AnyDesk dibuka ke target ${target}. Password (${pwd}) tersalin di clipboard! Tekan Ctrl+V jika diminta.`);
      setTimeout(() => setRemoteToast(null), 6000);
    } catch (e) {
      window.location.href = `anydesk:${target}`;
    } finally {
      setRemoteLaunching(false);
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col pb-16 font-sans selection:bg-[#006622] selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#006622] to-emerald-700 text-white flex items-center justify-center font-black text-sm sm:text-base shadow-sm ring-2 ring-emerald-500/20 shrink-0">
              PB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-xs sm:text-base text-slate-900 leading-tight tracking-tight">
                  PT PLAZA BALI PRIMA
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100/90 text-[#006622] border border-emerald-200">
                  <BadgeCheck className="w-3 h-3 text-[#006622]" /> VERIFIED
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold tracking-wider uppercase">
                MIS SHOP OPS • PORTAL INSPEKSI ASET & BARCODE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setIsCameraScannerOpen(true)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#006622] border border-emerald-200/90 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scan Kamera</span>
            </button>
            <Link
              href="/"
              className="p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 text-xs font-bold transition-all shadow-2xs"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-5 pb-12 space-y-5">
        {/* Search Bar (Quick Switch Asset) */}
        <div className="space-y-2.5">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center shadow-xs hover:shadow-md transition-shadow rounded-2xl bg-white border border-slate-200/90 focus-within:ring-4 focus-within:ring-[#006622]/15 focus-within:border-[#006622]">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 sm:left-4 pointer-events-none" />
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Scan atau ketik kode aset / ID barang (misal: RAM-001, CGKT2DFD05-P04, PC-MIS...)"
              className="w-full pl-11 sm:pl-12 pr-28 sm:pr-32 py-3 sm:py-3.5 bg-transparent rounded-2xl text-xs sm:text-sm font-semibold placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="absolute right-1.5 sm:right-2 px-3.5 sm:px-5 py-2 bg-[#006622] hover:bg-[#00521b] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>Cari Aset</span>
            </button>
          </form>

          {/* Quick Suggestions Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] [scrollbar-width:none]">
            <span className="text-slate-400 font-bold shrink-0 flex items-center gap-1">
              <span>Contoh:</span>
            </span>
            {SAMPLE_CODES.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => handleSelectSample(s.code)}
                className={`px-3 py-1 rounded-xl font-mono text-[11px] font-bold whitespace-nowrap transition-all border ${
                  activeCode.toUpperCase() === s.code.toUpperCase()
                    ? "bg-[#006622] text-white border-[#006622] shadow-xs scale-102"
                    : "bg-white text-slate-600 border-slate-200/90 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {s.code}
              </button>
            ))}
          </div>
        </div>

        {/* Remote Toast Banner */}
        {remoteToast && (
          <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-3 text-xs shadow-lg animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <ScreenShare className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>{remoteToast}</span>
            </div>
            <button
              onClick={() => setRemoteToast(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center space-y-3 shadow-2xs">
            <div className="inline-block w-8 h-8 border-3 border-[#006622] border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold text-sm text-slate-800">Mengambil data detail aset...</p>
            <p className="text-xs text-slate-400">Sinkronisasi data spesifikasi, pengadaan, dan status perangkat</p>
          </div>
        )}

        {/* Error / Not Found State */}
        {!loading && error && (
          <div className="bg-white border border-rose-200/90 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto shadow-2xs">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base sm:text-lg">Aset Tidak Ditemukan</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Kode <strong className="font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">{activeCode}</strong> tidak terdaftar pada master kasir POS, office, maupun inventaris komponen.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left max-w-md mx-auto text-xs space-y-1">
              <span className="font-bold text-slate-700 block">Saran Pencarian:</span>
              <ul className="list-disc pl-4 text-slate-500 text-[11px] space-y-0.5">
                <li>Pastikan format ID Barang sesuai (contoh: <code className="font-mono font-bold text-slate-700">RAM-001</code>, <code className="font-mono font-bold text-slate-700">SSD-002</code>, <code className="font-mono font-bold text-slate-700">CPU-001</code>)</li>
                <li>Atau gunakan Kode Kasir POS (contoh: <code className="font-mono font-bold text-slate-700">CGKT2DFD05-P04</code>)</li>
                <li>Atau gunakan Kode PC Office (contoh: <code className="font-mono font-bold text-slate-700">PC-MIS-26-002-0</code>)</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsCameraScannerOpen(true)}
                className="px-4 py-2 bg-[#006622] hover:bg-[#00521b] text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 flex items-center gap-1.5"
              >
                <QrCode className="w-4 h-4" />
                <span>Scan Ulang Kamera</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectSample("RAM-001")}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Coba RAM-001
              </button>
              <Link
                href="/"
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
              >
                Ke Beranda
              </Link>
            </div>
          </div>
        )}

        {/* Asset Details View */}
        {!loading && assetData && (
          <div className="space-y-4 sm:space-y-5">
            {/* Header Hero Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-50/70 via-white to-slate-50/80 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#006622] to-emerald-700 text-white flex items-center justify-center shadow-md ring-4 ring-emerald-500/10 shrink-0 mt-0.5">
                    {assetData.itemType === "COMPONENT" ? (
                      <Cpu className="w-6 h-6 sm:w-7 sm:h-7" />
                    ) : (
                      <Laptop className="w-6 h-6 sm:w-7 sm:h-7" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-lg bg-slate-900 text-white tracking-wider shadow-2xs">
                        {assetData.asset_code}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-[#006622] border border-emerald-200/80 shadow-2xs">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        {assetData.status || "OPERASIONAL"}
                      </span>
                      {assetData.itemType === "COMPONENT" && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                          ID BARANG KOMPONEN
                        </span>
                      )}
                    </div>
                    <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight mt-1.5">
                      {assetData.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#006622] shrink-0" />
                      <span>{assetData.shop_location}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">{assetData.category}</span>
                    </p>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                  <button
                    type="button"
                    onClick={() => setIsTicketOpen(true)}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    <LifeBuoy className="w-3.5 h-3.5" />
                    <span>Lapor Kendala</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsStickerOpen(true)}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Cetak Stiker</span>
                  </button>
                </div>
              </div>

              {/* Network Status & Quick Info Bar */}
              <div className="px-4 sm:px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                  {/* IP Address & Live Ping */}
                  {assetData.ip_address && assetData.ip_address !== "-" ? (
                    <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-400">IP:</span>
                      <span className="font-mono font-bold text-blue-700 text-xs">
                        {assetData.ip_address}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(assetData.ip_address!, "ip")}
                        title="Salin IP"
                        className="text-slate-400 hover:text-slate-600 ml-0.5 p-0.5 rounded hover:bg-slate-100 cursor-pointer"
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
                          title="Klik untuk tes ulang ping"
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

                      {/* Remote AnyDesk Button */}
                      <button
                        type="button"
                        onClick={() => setConfirmRemote(true)}
                        className="inline-flex items-center gap-1 ml-1 px-2.5 py-0.5 rounded-md text-[9px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer"
                        title="Remote via AnyDesk"
                      >
                        <ScreenShare className="w-2.5 h-2.5" />
                        <span>Remote</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-slate-400">
                      <span>IP Address:</span>
                      <span className="font-mono font-bold">—</span>
                    </div>
                  )}

                  {/* Serial Number */}
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-400">SN:</span>
                    <span className="font-mono font-bold text-slate-700 text-xs">
                      {assetData.serial_number || "ASET-PB-DEFAULT"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(assetData.serial_number || "", "sn")}
                      title="Salin SN"
                      className="text-slate-400 hover:text-slate-600 ml-0.5 p-0.5 rounded hover:bg-slate-100 cursor-pointer"
                    >
                      {copiedKey === "sn" ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs self-start md:self-auto text-[11px] text-slate-500 font-medium">
                  <span>Model:</span>
                  <span className="font-mono font-bold text-slate-800">{assetData.brand_model || assetData.name}</span>
                </div>
              </div>
            </div>

            {/* Parent Unit Context Banner (Bila Scanned adalah Komponen Satuan ID Barang) */}
            {assetData.parentSet && (
              <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white border border-blue-200/90 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-xs shrink-0 ring-4 ring-blue-500/10">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                        Komponen Terpasang Pada Unit Induk
                      </span>
                      <span className="font-mono text-xs font-black text-slate-900 bg-white border border-blue-200 px-2 py-0.5 rounded-md shadow-2xs">
                        {assetData.parentSet.code}
                      </span>
                    </div>
                    <p className="font-bold text-xs sm:text-sm text-slate-800 mt-1">
                      {assetData.parentSet.name} • {assetData.parentSet.location}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectSample(assetData.parentSet!.code)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 whitespace-nowrap self-start sm:self-auto cursor-pointer"
                >
                  <span>Lihat Seluruh Set Unit Ini</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 4 Kartu Metrik Pengadaan & Riwayat (Kapan Dibeli, Kapan Diganti, Toko, Harga) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Tanggal Pembelian */}
              <div className="bg-gradient-to-br from-blue-50/60 via-white to-white p-4 rounded-2xl border border-blue-100/90 shadow-2xs hover:shadow-xs hover:border-blue-300 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700/80">
                    Kapan Dibeli
                  </span>
                  <div className="p-1.5 rounded-lg bg-blue-100/70 text-blue-600">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                  {assetData.procurement?.purchase_date || "30 Oktober 2026"}
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-1 truncate" title={assetData.procurement?.po_number || "PO-NCR-T3"}>
                  PO: {assetData.procurement?.po_number || "PO-NCR-T3"}
                </p>
              </div>

              {/* Card 2: Toko Distributor / Vendor */}
              <div className="bg-gradient-to-br from-emerald-50/60 via-white to-white p-4 rounded-2xl border border-emerald-100/90 shadow-2xs hover:shadow-xs hover:border-emerald-300 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80">
                    Toko / Vendor
                  </span>
                  <div className="p-1.5 rounded-lg bg-emerald-100/70 text-[#006622]">
                    <Store className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight truncate" title={assetData.procurement?.vendor || "Distributor Resmi NCR Indonesia"}>
                  {assetData.procurement?.vendor || "Distributor Resmi NCR"}
                </div>
                <p className="text-[10px] text-emerald-600/90 font-medium mt-1 truncate" title={assetData.procurement?.warranty_status || "Garansi Pemeliharaan IT Vendor Aktif"}>
                  {assetData.procurement?.warranty_status || "Garansi Pemeliharaan IT Aktif"}
                </p>
              </div>

              {/* Card 3: Harga Pengadaan */}
              <div className="bg-gradient-to-br from-amber-50/60 via-white to-white p-4 rounded-2xl border border-amber-100/90 shadow-2xs hover:shadow-xs hover:border-amber-300 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700/80">
                    Harga Pengadaan
                  </span>
                  <div className="p-1.5 rounded-lg bg-amber-100/70 text-amber-600">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xs sm:text-sm font-black text-[#006622] tracking-tight truncate" title={assetData.procurement?.price || "Rp 24.500.000 (1 Set Lengkap)"}>
                  {assetData.procurement?.price || "Rp 24.500.000 (1 Set)"}
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  Estimasi Nilai Perolehan
                </p>
              </div>

              {/* Card 4: Terakhir Diganti / Diperbarui */}
              <div className="bg-gradient-to-br from-indigo-50/60 via-white to-white p-4 rounded-2xl border border-indigo-100/90 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700/80">
                    Terakhir Diganti
                  </span>
                  <div className="p-1.5 rounded-lg bg-indigo-100/70 text-indigo-600">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                  {assetData.procurement?.last_replaced_date || "30 Oktober 2026"}
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  Servis / Update Terakhir
                </p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="flex items-center border-b border-slate-200 px-3 sm:px-6 pt-2.5 gap-1.5 sm:gap-2 bg-slate-50/80 overflow-x-auto [scrollbar-width:none]">
                {assetData.child_components && assetData.child_components.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("components")}
                    className={`flex items-center gap-2 px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-t-2xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === "components"
                        ? "border-[#006622] text-[#006622] bg-white shadow-2xs font-extrabold"
                        : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Komponen Set ({assetData.child_components.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab("specs")}
                  className={`flex items-center gap-2 px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-t-2xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "specs"
                      ? "border-[#006622] text-[#006622] bg-white shadow-2xs font-extrabold"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                  }`}
                >
                  <Cpu className="w-4 h-4" />
                  <span>Spesifikasi Hardware</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`flex items-center gap-2 px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-t-2xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "history"
                      ? "border-[#006622] text-[#006622] bg-white shadow-2xs font-extrabold"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Riwayat Penggantian ({assetData.change_history?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("tickets")}
                  className={`flex items-center gap-2 px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-t-2xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "tickets"
                      ? "border-[#006622] text-[#006622] bg-white shadow-2xs font-extrabold"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                  }`}
                >
                  <LifeBuoy className="w-4 h-4" />
                  <span>Tiket Kendala ({assetData.tickets?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("qrcode")}
                  className={`flex items-center gap-2 px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-t-2xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "qrcode"
                      ? "border-[#006622] text-[#006622] bg-white shadow-2xs font-extrabold"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>QR Code Aset</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-4 sm:p-6">
                {/* TAB: DAFTAR KOMPONEN ANAK (SET UNIT) */}
                {activeTab === "components" && assetData.child_components && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#006622]" />
                        <span>Komponen Terpasang Dalam Set Ini ({assetData.child_components.length} ID Barang):</span>
                      </h3>
                      <span className="text-[11px] text-slate-400">Klik komponen untuk inspeksi satuan</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
                      {assetData.child_components.map((c, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectSample(c.sn)}
                          className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-[#006622]/60 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3.5 group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 group-hover:bg-emerald-50 group-hover:text-[#006622] text-slate-700 flex items-center justify-center font-black text-xs shrink-0 transition-colors shadow-2xs">
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-[#006622] transition-colors truncate">
                                {c.name}
                              </p>
                              <p className="font-mono text-[11px] sm:text-xs text-slate-600 truncate mt-0.5">
                                {c.model || "-"}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] sm:text-[11px] text-slate-400 font-medium">
                                <span>{c.price || "-"}</span>
                                <span>•</span>
                                <span className="truncate">{c.store || "Vendor Resmi"}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono text-[11px] font-black px-2.5 py-1 rounded-lg bg-slate-100 group-hover:bg-emerald-100 group-hover:text-[#006622] text-slate-700 border border-slate-200 transition-colors block text-center shadow-2xs">
                              {c.sn}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 mt-1.5 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                              <span>Lihat Detail</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB: SPESIFIKASI */}
                {activeTab === "specs" && (
                  <div className="space-y-4">
                    {assetData.specs && Object.keys(assetData.specs).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(assetData.specs).map(([key, val]) => (
                          <div
                            key={key}
                            className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-2xs transition-all flex items-center justify-between gap-3"
                          >
                            <span className="text-xs font-bold text-slate-500 capitalize shrink-0">
                              {key}:
                            </span>
                            <span className="font-mono font-bold text-xs text-slate-900 text-right truncate">
                              {val || "-"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                        {assetData.notes || "Spesifikasi standar operasional terdaftar pada sistem inventaris."}
                      </div>
                    )}

                    {assetData.notes && (
                      <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl text-xs text-amber-900 space-y-1.5 shadow-2xs">
                        <span className="font-bold block text-[11px] uppercase tracking-wider text-amber-800">Catatan Perangkat:</span>
                        <p className="leading-relaxed">{assetData.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: RIWAYAT PENGGANTIAN */}
                {activeTab === "history" && (
                  <div className="space-y-3.5">
                    {assetData.change_history && assetData.change_history.length > 0 ? (
                      assetData.change_history.map((hist, idx) => (
                        <div
                          key={idx}
                          className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white space-y-2.5 shadow-2xs hover:shadow-xs transition-shadow"
                        >
                          <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-sm">
                              Penggantian {hist.component}
                            </span>
                            <span className="font-mono text-[11px] text-slate-600 font-bold bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/70">
                              {hist.date}
                            </span>
                          </div>
                          <p className="text-xs text-blue-700 font-bold font-mono">
                            Part Baru: {hist.newModel}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                            <span>Toko Pembelian: <strong className="text-slate-800">{hist.store}</strong></span>
                            <span>•</span>
                            <span>Biaya Pengadaan: <strong className="text-[#006622]">{hist.price}</strong></span>
                            {hist.notes && (
                              <>
                                <span>•</span>
                                <span>Keterangan: <em>{hist.notes}</em></span>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center space-y-1.5 text-slate-400">
                        <CheckCheck className="w-10 h-10 mx-auto text-emerald-500 opacity-70" />
                        <p className="text-sm font-bold text-slate-800">Komponen Bawaan Asli</p>
                        <p className="text-xs text-slate-500">Belum ada riwayat penggantian part pada unit ini.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: TIKET KENDALA */}
                {activeTab === "tickets" && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 uppercase tracking-wider">
                        Riwayat Tiket Kendala Terkait
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsTicketOpen(true)}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#006622] hover:bg-[#00521b] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 cursor-pointer self-start sm:self-auto"
                      >
                        <LifeBuoy className="w-3.5 h-3.5" />
                        <span>+ Buka Tiket Baru</span>
                      </button>
                    </div>

                    {assetData.tickets && assetData.tickets.length > 0 ? (
                      assetData.tickets.map((t) => (
                        <div
                          key={t.ticket_number}
                          className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/80">
                                {t.ticket_number}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                  t.status === "SELESAI"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                {t.status}
                              </span>
                              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                                Urgency: <strong className="text-slate-600">{t.urgency}</strong>
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm font-bold text-slate-900 mt-1.5">{t.title}</p>
                            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">{t.created_at}</p>
                          </div>
                          <Link
                            href={`/tickets?search=${encodeURIComponent(t.ticket_number)}`}
                            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors self-end sm:self-center"
                            title="Buka Tiket"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center space-y-1 text-slate-400">
                        <CheckCheck className="w-10 h-10 mx-auto text-emerald-500 opacity-60" />
                        <p className="text-xs font-bold text-slate-700">Tidak Ada Laporan Kendala</p>
                        <p className="text-[11px]">Tidak ada tiket perbaikan yang tertunda untuk unit ini.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: QR CODE */}
                {activeTab === "qrcode" && (
                  <div className="py-8 flex flex-col items-center justify-center space-y-5 text-center">
                    {qrDataUrl ? (
                      <div className="p-6 bg-white rounded-3xl border-2 border-slate-200/90 shadow-md">
                        <img
                          src={qrDataUrl}
                          alt={`QR Code ${assetData.asset_code}`}
                          className="w-56 h-56 sm:w-64 sm:h-64 mx-auto rounded-xl shadow-2xs"
                        />
                        <div className="mt-4 pt-3.5 border-t border-slate-100 font-mono text-center">
                          <p className="text-sm font-black text-slate-900 tracking-wider">{assetData.asset_code}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{assetData.name}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-56 h-56 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
                        <QrCode className="w-12 h-12 animate-pulse text-slate-400" />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsStickerOpen(true)}
                        className="px-5 py-2.5 bg-[#006622] hover:bg-[#00521b] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Cetak Stiker Label Barcode</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal for Remote AnyDesk */}
      {confirmRemote && assetData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 bg-gradient-to-r from-rose-50 to-orange-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs">
                  <ScreenShare className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Konfirmasi Remote AnyDesk
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Verifikasi sebelum membuka sesi remote control
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmRemote(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="text-center py-1">
                <p className="text-sm font-black text-slate-800">
                  Apakah Anda yakin ingin me-remote perangkat ini?
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Sistem akan meluncurkan AnyDesk dan otomatis mengisikan password akses.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">Kode Aset:</span>
                  <span className="font-bold text-slate-900 px-2 py-0.5 bg-white border border-slate-200 rounded font-mono">
                    {assetData.asset_code}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">Target IP:</span>
                  <span className="font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-mono">
                    {assetData.ip_address}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">Lokasi:</span>
                  <span className="font-bold text-slate-800">
                    {assetData.shop_location}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmRemote(false)}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Tidak / Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRemote}
                  disabled={remoteLaunching}
                  className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <ScreenShare className="w-4 h-4" />
                  <span>{remoteLaunching ? "Menghubungkan..." : "Ya, Remote Sekarang"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
