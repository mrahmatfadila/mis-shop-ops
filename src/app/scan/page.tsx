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
      const res = await fetch(`/api/assets/${encodeURIComponent(codeToFetch.trim())}`);
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
      setRemoteToast(`AnyDesk diluncurkan ke target ${target}. Password: cupcake2020`);
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
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#006622] to-emerald-700 text-white flex items-center justify-center font-black text-sm shadow-2xs">
              PB
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">
                  PT PLAZA BALI PRIMA
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-[#006622] border border-emerald-200">
                  <BadgeCheck className="w-3 h-3" /> VERIFIED
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
                MIS SHOP OPS • PORTAL INSPEKSI ASET & BARCODE
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
        <div className="space-y-2">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Scan atau ketik kode aset / ID barang (misal: RAM-001, CGKT2DFD05-P04, PC-MIS...)"
              className="w-full pl-10 pr-24 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#006622]/20 focus:border-[#006622] transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-[#006622] hover:bg-[#00521b] text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95"
            >
              Cari Aset
            </button>
          </form>

          {/* Quick Suggestions Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] [scrollbar-width:none]">
            <span className="text-slate-400 font-bold shrink-0">Contoh Cepat:</span>
            {SAMPLE_CODES.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => handleSelectSample(s.code)}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold whitespace-nowrap transition-all border ${
                  activeCode.toUpperCase() === s.code.toUpperCase()
                    ? "bg-[#006622] text-white border-[#006622] shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
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
          <div className="space-y-4">
            {/* Header Hero Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/50 via-white to-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#006622] text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                    {assetData.itemType === "COMPONENT" ? (
                      <Cpu className="w-6 h-6" />
                    ) : (
                      <Laptop className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-slate-900 text-white tracking-wider">
                        {assetData.asset_code}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-[#006622] border border-emerald-200/80">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        {assetData.status || "OPERASIONAL"}
                      </span>
                      {assetData.itemType === "COMPONENT" && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          ID BARANG KOMPONEN
                        </span>
                      )}
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-1">
                      {assetData.name}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#006622] shrink-0" />
                      <span>{assetData.shop_location}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">{assetData.category}</span>
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
                        className="inline-flex items-center gap-1 ml-1.5 px-2.5 py-0.5 rounded-md text-[9px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer"
                        title="Remote via AnyDesk"
                      >
                        <ScreenShare className="w-2.5 h-2.5" />
                        <span>Remote</span>
                      </button>
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
                    <button
                      type="button"
                      onClick={() => handleCopy(assetData.serial_number || "", "sn")}
                      title="Salin SN"
                      className="text-slate-400 hover:text-slate-600 ml-0.5"
                    >
                      {copiedKey === "sn" ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-medium">
                  Model: <span className="font-mono font-bold text-slate-700">{assetData.brand_model || assetData.name}</span>
                </div>
              </div>
            </div>

            {/* Parent Unit Context Banner (Bila Scanned adalah Komponen Satuan ID Barang) */}
            {assetData.parentSet && (
              <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        Komponen Terpasang Pada Unit Induk
                      </span>
                      <span className="font-mono text-xs font-black text-slate-900 bg-white border border-blue-200 px-2 py-0.5 rounded">
                        {assetData.parentSet.code}
                      </span>
                    </div>
                    <p className="font-bold text-xs text-slate-800 mt-1">
                      {assetData.parentSet.name} • {assetData.parentSet.location}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectSample(assetData.parentSet!.code)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 whitespace-nowrap self-start sm:self-auto"
                >
                  <span>Lihat Seluruh Set Unit Ini</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 4 Kartu Metrik Pengadaan & Riwayat (Kapan Dibeli, Kapan Diganti, Toko, Harga) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Card 1: Tanggal Pembelian */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Kapan Dibeli
                  </span>
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                  {assetData.procurement?.purchase_date || "2 Maret 2026"}
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                  PO: {assetData.procurement?.po_number || "PO-AST-2026"}
                </p>
              </div>

              {/* Card 2: Toko Distributor / Vendor */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Toko / Vendor
                  </span>
                  <Store className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight truncate" title={assetData.procurement?.vendor || "Distributor Resmi IT Jakarta"}>
                  {assetData.procurement?.vendor || "Distributor Resmi IT"}
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                  {assetData.procurement?.warranty_status || "Garansi 1 Tahun"}
                </p>
              </div>

              {/* Card 3: Harga Pengadaan */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Harga Pengadaan
                  </span>
                  <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="text-xs sm:text-sm font-black text-[#006622] tracking-tight truncate">
                  {assetData.procurement?.price || "Rp 350.000"}
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Estimasi Nilai Perolehan
                </p>
              </div>

              {/* Card 4: Terakhir Diganti / Diperbarui */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Terakhir Diganti
                  </span>
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                  {assetData.procurement?.last_replaced_date || "2 Maret 2026"}
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Servis / Update Terakhir
                </p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="flex items-center border-b border-slate-200 px-3 pt-2 gap-1 bg-slate-50/70 overflow-x-auto [scrollbar-width:none]">
                {assetData.child_components && assetData.child_components.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("components")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === "components"
                        ? "border-[#006622] text-[#006622] bg-white shadow-2xs"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Komponen Set ({assetData.child_components.length})</span>
                  </button>
                )}

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
                  <span>Spesifikasi Hardware</span>
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

                <button
                  type="button"
                  onClick={() => setActiveTab("qrcode")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "qrcode"
                      ? "border-[#006622] text-[#006622] bg-white shadow-2xs"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR Code Aset</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-4 sm:p-5">
                {/* TAB: DAFTAR KOMPONEN ANAK (SET UNIT) */}
                {activeTab === "components" && assetData.child_components && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#006622]" />
                        <span>Komponen Terpasang Dalam Set Ini ({assetData.child_components.length} ID Barang):</span>
                      </h3>
                      <span className="text-[11px] text-slate-400">Klik komponen untuk inspeksi satuan</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {assetData.child_components.map((c, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectSample(c.sn)}
                          className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-[#006622] hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-emerald-50 group-hover:text-[#006622] text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 transition-colors">
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-xs text-slate-900 group-hover:text-[#006622] transition-colors truncate">
                                {c.name}
                              </p>
                              <p className="font-mono text-[11px] text-slate-600 truncate mt-0.5">
                                {c.model || "-"}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                <span>{c.price || "-"}</span>
                                <span>•</span>
                                <span>{c.store || "Vendor Resmi"}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded-md bg-slate-100 group-hover:bg-emerald-100 group-hover:text-[#006622] text-slate-700 border border-slate-200 transition-colors block">
                              {c.sn}
                            </span>
                            <span className="text-[9.5px] font-bold text-emerald-600 mt-1 inline-block">
                              Lihat Detail →
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {Object.entries(assetData.specs).map(([key, val]) => (
                          <div
                            key={key}
                            className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 flex items-center justify-between gap-3"
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
                      <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                        {assetData.notes || "Spesifikasi standar operasional terdaftar pada sistem inventaris."}
                      </div>
                    )}

                    {assetData.notes && (
                      <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
                        <span className="font-bold block text-[11px] uppercase tracking-wider text-amber-700">Catatan Perangkat:</span>
                        <p>{assetData.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: RIWAYAT PENGGANTIAN */}
                {activeTab === "history" && (
                  <div className="space-y-3">
                    {assetData.change_history && assetData.change_history.length > 0 ? (
                      assetData.change_history.map((hist, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-black text-slate-900 text-sm">
                              Penggantian {hist.component}
                            </span>
                            <span className="font-mono text-[11px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded">
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
                      <div className="py-10 text-center space-y-1 text-slate-400">
                        <CheckCheck className="w-10 h-10 mx-auto text-emerald-500 opacity-60" />
                        <p className="text-xs font-bold text-slate-700">Komponen Bawaan Asli</p>
                        <p className="text-[11px]">Belum ada riwayat penggantian part pada unit ini.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: TIKET KENDALA */}
                {activeTab === "tickets" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
                        Riwayat Tiket Kendala Terkait
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsTicketOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#006622] hover:bg-[#00521b] text-white rounded-xl text-xs font-bold shadow-2xs active:scale-95 cursor-pointer"
                      >
                        <LifeBuoy className="w-3.5 h-3.5" />
                        <span>+ Buka Tiket Baru</span>
                      </button>
                    </div>

                    {assetData.tickets && assetData.tickets.length > 0 ? (
                      assetData.tickets.map((t) => (
                        <div
                          key={t.ticket_number}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {t.ticket_number}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                                  t.status === "SELESAI"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                {t.status}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                Urgency: <strong className="text-slate-600">{t.urgency}</strong>
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-900 mt-1">{t.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{t.created_at}</p>
                          </div>
                          <Link
                            href={`/tickets?search=${encodeURIComponent(t.ticket_number)}`}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
                  <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
                    {qrDataUrl ? (
                      <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-md">
                        <img
                          src={qrDataUrl}
                          alt={`QR Code ${assetData.asset_code}`}
                          className="w-56 h-56 mx-auto rounded-lg"
                        />
                        <div className="mt-3 pt-3 border-t border-slate-100 font-mono text-center">
                          <p className="text-xs font-black text-slate-900">{assetData.asset_code}</p>
                          <p className="text-[10px] text-slate-500">{assetData.name}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-56 h-56 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                        <QrCode className="w-12 h-12 animate-pulse" />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsStickerOpen(true)}
                        className="px-4 py-2 bg-[#006622] hover:bg-[#00521b] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
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
