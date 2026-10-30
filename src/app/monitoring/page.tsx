"use client";

import { useEffect, useState, useMemo } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import ScannerModal from "@/components/ScannerModal";
import { MonitoringItem } from "@/types";
import {
  Activity,
  Server,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Terminal,
  Copy,
  Check,
  Send,
  Zap,
  Clock,
  Wifi,
  Search,
  Laptop,
  Video,
  Layers,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Radio,
  SlidersHorizontal,
  ChevronDown,
  LayoutGrid,
  List
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import { getClientCache, setClientCache } from "@/lib/cache";

export default function MonitoringPage() {
  const { user, isAdmin, isMIS, isManager, userShopLocation } = useAuth();

  if (!isAdmin && !isMIS && !isManager) {
    return <AccessDenied moduleName="Monitoring Jaringan IP Kasir" />;
  }

  const [devices, setDevices] = useState<MonitoringItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanningAll, setIsScanningAll] = useState(false);
  const [isScanningTab, setIsScanningTab] = useState(false);
  const [singlePinging, setSinglePinging] = useState<Record<string, boolean>>({});
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Filters & Views
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ONLINE" | "OFFLINE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [lastScannedTime, setLastScannedTime] = useState<string | null>(null);

  // Custom IP Ping Tool
  const [customIp, setCustomIp] = useState("172.16.45.10");
  const [customPingResult, setCustomPingResult] = useState<any>(null);
  const [isCustomPinging, setIsCustomPinging] = useState(false);

  const fetchMonitoring = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const res = await fetch("/api/monitoring");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDevices(json.data);
        setClientCache("monitoring_devices_live", json.data);
        setLastScannedTime(new Date().toLocaleTimeString("id-ID"));
      }
    } catch (err) {
      console.error("Failed to load monitoring devices", err);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    const cached = getClientCache<MonitoringItem[]>("monitoring_devices_live");
    if (cached) {
      setDevices(cached);
      setIsLoading(false);
      fetchMonitoring(true);
    } else {
      fetchMonitoring(false);
    }
  }, []);

  // Bulk scan all devices via VPN
  const handleScanAll = async () => {
    setIsScanningAll(true);
    try {
      const res = await fetch("/api/monitoring/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.results)) {
        setDevices(json.results);
        setClientCache("monitoring_devices_live", json.results);
        setLastScannedTime(new Date().toLocaleTimeString("id-ID"));
      }
    } catch (err) {
      alert("Gagal melakukan scan jaringan. Pastikan VPN kantor telah aktif.");
    } finally {
      setIsScanningAll(false);
    }
  };

  // Bulk scan devices in current filtered location
  const handleScanLocation = async () => {
    if (!locationFilter) {
      return handleScanAll();
    }
    setIsScanningTab(true);
    try {
      const res = await fetch("/api/monitoring/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: locationFilter }),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.results)) {
        // Merge results into devices list
        setDevices((prev) => {
          const map = new Map<string, MonitoringItem>(json.results.map((r: any) => [r.asset_code, r as MonitoringItem]));
          const next: MonitoringItem[] = prev.map((item) => map.get(item.asset_code) || item);
          setClientCache("monitoring_devices_live", next);
          return next;
        });
        setLastScannedTime(new Date().toLocaleTimeString("id-ID"));
      }
    } catch (err) {
      alert("Gagal melakukan scan lokasi. Pastikan VPN kantor telah aktif.");
    } finally {
      setIsScanningTab(false);
    }
  };

  // Ping a single device instantly
  const handlePingSingle = async (asset_code: string, ip_address: string) => {
    setSinglePinging((prev) => ({ ...prev, [asset_code]: true }));
    try {
      const res = await fetch("/api/monitoring/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_code, ip_address }),
      });
      const json = await res.json();
      if (json.success && json.result) {
        setDevices((prev) =>
          prev.map((dev) =>
            dev.asset_code === asset_code
              ? {
                  ...dev,
                  status: json.result.status,
                  response_time_ms: json.result.latency || 0,
                  last_heartbeat: json.result.last_heartbeat,
                }
              : dev
          )
        );
      }
    } catch (e) {
      console.error("Single ping error", e);
    } finally {
      setSinglePinging((prev) => ({ ...prev, [asset_code]: false }));
    }
  };

  // Custom IP Ping Tool
  const handleCustomPing = async () => {
    if (!customIp) return;
    setIsCustomPinging(true);
    setCustomPingResult(null);
    try {
      const res = await fetch("/api/monitoring/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_code: "CUSTOM-TEST", ip_address: customIp }),
      });
      const json = await res.json();
      if (json.success && json.result) {
        setCustomPingResult(json.result);
      }
    } catch (err) {
      alert("Gagal melakukan ping");
    } finally {
      setIsCustomPinging(false);
    }
  };

  const copyToClipboard = (text: string, type: "ip" | "snippet") => {
    navigator.clipboard.writeText(text);
    if (type === "ip") {
      setCopiedIp(text);
      setTimeout(() => setCopiedIp(null), 2000);
    } else {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = devices.length;
    const online = devices.filter((d) => d.status === "ONLINE").length;
    const offline = total - online;
    const onlineWithLatency = devices.filter((d) => d.status === "ONLINE" && d.response_time_ms && d.response_time_ms > 0);
    const avgLatency =
      onlineWithLatency.length > 0
        ? Math.round(
            onlineWithLatency.reduce((acc, curr) => acc + (curr.response_time_ms || 0), 0) /
              onlineWithLatency.length
          )
        : 12;
    const onlinePercentage = total > 0 ? Math.round((online / total) * 100) : 0;
    return { total, online, offline, avgLatency, onlinePercentage };
  }, [devices]);

  // Filtered devices list
  const filteredDevices = useMemo(() => {
    return devices.filter((dev) => {
      // Status filter
      if (statusFilter === "ONLINE" && dev.status !== "ONLINE") return false;
      if (statusFilter === "OFFLINE" && dev.status === "ONLINE") return false;

      // Location filter
      if (locationFilter) {
        if (locationFilter === "MIS IT Support") {
          if (dev.shop_location !== "MIS IT Support" && dev.shop_location !== "MIS") return false;
        } else if (dev.shop_location !== locationFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mCode = dev.asset_code?.toLowerCase().includes(q);
        const mName = dev.asset_name?.toLowerCase().includes(q) || (dev as any).name?.toLowerCase().includes(q);
        const mIp = dev.ip_address?.toLowerCase().includes(q);
        const mDet = dev.details?.toLowerCase().includes(q);
        const mLoc = dev.shop_location?.toLowerCase().includes(q);
        if (!mCode && !mName && !mIp && !mDet && !mLoc) return false;
      }

      return true;
    });
  }, [devices, statusFilter, locationFilter, searchQuery]);

  // Location Tab definitions
  const locationTabs = [
    { label: "Semua Lokasi", value: "" },
    { label: "Head Office", value: "Head Office" },
    { label: "Plaza Bali", value: "Plaza Bali" },
    { label: "SAM", value: "SAM" },
    { label: "Warehouse (WHS)", value: "Warehouse (WHS)" },
    { label: "Office T2", value: "Office Terminal 2" },
    { label: "Office T3", value: "Office Terminal 3" },
    { label: "Surabaya", value: "Surabaya" },
    { label: "DVR CCTV Toko", value: "MIS IT Support" },
  ];

  const psSnippet = `# PowerShell Heartbeat Ping untuk Komputer Kasir POS
$ipServerIT = "172.16.45.10"  # Sesuaikan dengan IP Server MIS
$kodeAset   = "CGKT3DFA02-P01" # Kode Aset POS
$ipPOS      = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*"}).IPAddress[0]

$body = @{
    asset_code       = $kodeAset
    ip_address       = $ipPOS
    response_time_ms = 8
    details          = "Windows POS Terminal Aktif"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://$ipServerIT:3000/api/pos/heartbeat" -Method POST -Body $body -ContentType "application/json"`;

  return (
    <SidebarLayout onOpenScanner={() => setIsScannerOpen(true)}>
      <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* 1. Header & VPN Status Hero Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
          {/* Subtle Ambient Gradient */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="space-y-2 relative z-10">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-[#006622] border border-emerald-200/60 shadow-2xs">
                <Activity className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Monitoring Ping Jaringan & Perangkat POS
              </h1>

              {/* Dynamic Live VPN Badge */}
              {metrics.online > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100/80 text-emerald-800 border border-emerald-300/80 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Koneksi VPN Aktif ({metrics.online} Perangkat Merespon)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  VPN Belum Terbaca (0 Online)
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Pantau respon sinyal ICMP ping langsung ke seluruh unit Kasir POS, PC Office Head Office, DVR CCTV, dan switch jaringan toko secara real-time via VPN perusahaan.
            </p>

            {lastScannedTime && (
              <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Pembaruan Terakhir: <b>{lastScannedTime} WIB</b></span>
              </p>
            )}
          </div>

          {/* Action Buttons: Scan All & Scan Filter */}
          <div className="flex flex-wrap items-center gap-2.5 relative z-10 shrink-0">
            {locationFilter && (
              <button
                type="button"
                onClick={handleScanLocation}
                disabled={isScanningTab || isScanningAll}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-300/80 shadow-2xs active:scale-95 disabled:opacity-50"
                title={`Ping perangkat di ${locationFilter}`}
              >
                <Radio className={`w-3.5 h-3.5 text-[#006622] ${isScanningTab ? "animate-spin" : ""}`} />
                <span>{isScanningTab ? "Scanning..." : `Ping ${locationFilter}`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleScanAll}
              disabled={isScanningAll || isScanningTab}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#006622] hover:bg-[#00521b] text-white text-xs font-extrabold transition-all shadow-md shadow-emerald-900/10 active:scale-95 disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 text-amber-300 ${isScanningAll ? "animate-bounce" : ""}`} />
              <span>{isScanningAll ? "Scanning 166 IP via VPN..." : "Scan Ulang Semua (Live Ping)"}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchMonitoring(false)}
              disabled={isLoading || isScanningAll}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs transition-all active:scale-95"
              title="Refresh Data dari Server"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#006622]" : ""}`} />
            </button>
          </div>
        </div>

        {/* 2. Four Modern Metric KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Monitored */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Perangkat
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                {metrics.total} <span className="text-xs font-medium text-slate-400">Unit</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Semua node IP terdaftar</p>
            </div>
            <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
              <Server className="w-5 h-5" />
            </div>
          </div>

          {/* Devices Online */}
          <div className="bg-white rounded-2xl border border-emerald-200/90 p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                Online (Aktif)
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">
                {metrics.online} <span className="text-xs font-medium text-emerald-600">({metrics.onlinePercentage}%)</span>
              </h3>
              <p className="text-[10px] text-emerald-600/80 mt-0.5">Merespon sinyal VPN</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Devices Offline */}
          <div className="bg-white rounded-2xl border border-rose-200/90 p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
                Offline / Putus
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-rose-600 mt-0.5">
                {metrics.offline} <span className="text-xs font-medium text-rose-500">Unit</span>
              </h3>
              <p className="text-[10px] text-rose-500/80 mt-0.5">RTO / Mati daya</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <XCircle className="w-5 h-5" />
            </div>
          </div>

          {/* Average Latency */}
          <div className="bg-white rounded-2xl border border-sky-200/90 p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">
                Rata-Rata Latensi
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-sky-700 mt-0.5">
                {metrics.avgLatency} <span className="text-xs font-medium text-sky-600">ms</span>
              </h3>
              <p className="text-[10px] text-sky-600/80 mt-0.5">
                {metrics.avgLatency < 25 ? "⚡ Koneksi Ultra Cepat" : "Koneksi Stabil"}
              </p>
            </div>
            <div className="p-3 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
              <Zap className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 3. Filter Bar & Controls */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-sm space-y-3">
          {/* Top Row: Location Tabs & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Location Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {locationTabs.map((tab) => {
                const isActive = locationFilter === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setLocationFilter(tab.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-[#006622] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari IP (172.16...), kode aset, atau nama..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-[#006622] transition-all"
              />
            </div>
          </div>

          {/* Bottom Row: Status Filter & View Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
            {/* Status Pills */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Status:
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === "ALL"
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua ({metrics.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ONLINE")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  statusFilter === "ONLINE"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Online Saja ({metrics.online})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("OFFLINE")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  statusFilter === "OFFLINE"
                    ? "bg-rose-600 text-white"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Offline Saja ({metrics.offline})
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-slate-800 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kartu Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "table"
                    ? "bg-white text-slate-800 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Tabel Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Devices List (Grid Cards or Table View) */}
        {isLoading && devices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <RefreshCw className="w-8 h-8 text-[#006622] animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-800">Memuat status jaringan...</p>
            <p className="text-xs text-slate-400 mt-1">Mengambil data respon ICMP perangkat via VPN</p>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-800">Tidak ada perangkat yang cocok</p>
            <p className="text-xs text-slate-400 mt-1">
              Coba sesuaikan kata kunci pencarian atau ubah filter status/lokasi.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDevices.map((dev) => {
              const isOnline = dev.status === "ONLINE";
              const isPinging = !!singlePinging[dev.asset_code];
              const latency = dev.response_time_ms || 0;

              return (
                <div
                  key={dev.id || dev.asset_code}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs transition-all relative group hover:shadow-md ${
                    isOnline
                      ? "border-emerald-200/90 hover:border-emerald-400"
                      : "border-slate-200 hover:border-rose-300"
                  }`}
                >
                  {/* Card Header: Asset Code & Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                          {dev.asset_code}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200 truncate">
                          {dev.shop_location || "Toko"}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mt-1.5 leading-tight truncate">
                        {dev.asset_name || dev.name || dev.asset_code}
                      </h3>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold shrink-0 ${
                        isOnline
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300/80"
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                        }`}
                      />
                      {isOnline ? `ONLINE • ${latency}ms` : "OFFLINE • RTO"}
                    </span>
                  </div>

                  {/* Card Body: IP, Latency & Details */}
                  <div className="space-y-2 text-xs pt-3 border-t border-slate-100 text-slate-600">
                    {/* IP Row with 1-Click Copy */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">IP Address:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100">
                          {dev.ip_address}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(dev.ip_address, "ip")}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          title="Salin IP"
                        >
                          {copiedIp === dev.ip_address ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Latency Response */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Respon Latensi:</span>
                      <span className={`font-bold ${isOnline ? "text-slate-800" : "text-slate-400"}`}>
                        {isOnline ? `${latency} ms` : "Tidak ada respon"}
                      </span>
                    </div>

                    {/* Last Signal */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Ping Terakhir:</span>
                      <span className="text-[11px] text-slate-500">
                        {dev.last_heartbeat ? dev.last_heartbeat.substring(11, 19) + " WIB" : "-"}
                      </span>
                    </div>

                    {/* User / Department Details */}
                    {dev.details && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg truncate border border-slate-100">
                        {dev.details}
                      </div>
                    )}
                  </div>

                  {/* Card Footer: 1-Click Ping Target Button */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Protokol: ICMP Echo
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePingSingle(dev.asset_code, dev.ip_address)}
                      disabled={isPinging || isScanningAll}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-[#006622] hover:border-emerald-200 border border-slate-200 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Zap className={`w-3.5 h-3.5 text-amber-500 ${isPinging ? "animate-spin" : ""}`} />
                      <span>{isPinging ? "Pinging..." : "Ping Sekarang"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Kode Aset</th>
                    <th className="px-4 py-3">Nama Perangkat & Lokasi</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">Latensi</th>
                    <th className="px-4 py-3">Keterangan / User</th>
                    <th className="px-4 py-3 text-right">Aksi Ping</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDevices.map((dev) => {
                    const isOnline = dev.status === "ONLINE";
                    const isPinging = !!singlePinging[dev.asset_code];
                    return (
                      <tr key={dev.id || dev.asset_code} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isOnline
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-rose-100 text-rose-800 border border-rose-200"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isOnline ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            />
                            {dev.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {dev.asset_code}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{dev.asset_name || dev.name || dev.asset_code}</p>
                          <p className="text-[10px] text-slate-400">{dev.shop_location || "Toko"}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-blue-600">
                            <span>{dev.ip_address}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(dev.ip_address, "ip")}
                              className="text-slate-400 hover:text-slate-700"
                            >
                              {copiedIp === dev.ip_address ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isOnline ? (
                            <span className="font-bold text-slate-800">{dev.response_time_ms || 10} ms</span>
                          ) : (
                            <span className="text-slate-400 font-mono">RTO</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                          {dev.details || "-"}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handlePingSingle(dev.asset_code, dev.ip_address)}
                            disabled={isPinging || isScanningAll}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-[#006622] hover:border-emerald-200 border border-slate-200 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <Zap className={`w-3 h-3 text-amber-500 ${isPinging ? "animate-spin" : ""}`} />
                            <span>{isPinging ? "..." : "Ping"}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. Utility Section: Quick Custom IP Tester & Automation Script */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
          {/* Custom IP Ping Tester */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-[#006622] rounded-xl border border-emerald-200/60">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Tes Ping IP Mandiri (Diagnosa Jaringan)</h3>
                <p className="text-xs text-slate-500">Uji coba ping ke sembarang IP di jaringan VPN toko</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target IP Address:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    placeholder="Contoh: 172.16.45.10 atau 192.168.1.1"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-[#006622] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCustomPing}
                    disabled={isCustomPinging}
                    className="flex items-center gap-1.5 py-2 px-4 bg-[#006622] hover:bg-[#00521b] text-white font-bold rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    <Send className={`w-3.5 h-3.5 ${isCustomPinging ? "animate-spin" : ""}`} />
                    <span>{isCustomPinging ? "Pinging..." : "Kirim Ping"}</span>
                  </button>
                </div>
              </div>

              {customPingResult && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                    customPingResult.status === "ONLINE"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {customPingResult.status === "ONLINE" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <p className="font-bold">
                        Target {customPingResult.ip_address}: {customPingResult.status}
                      </p>
                      <p className="text-[11px] opacity-80">
                        {customPingResult.status === "ONLINE"
                          ? `Respon berhasil diterima dengan latensi ${customPingResult.latency} ms`
                          : "Tidak ada respon (Request Timed Out / Unreachable)"}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white/80 border">
                    {customPingResult.status === "ONLINE" ? `${customPingResult.latency}ms` : "RTO"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* PowerShell Automation Snippet */}
          <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl space-y-3 flex flex-col justify-between border border-slate-800">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs">Script Heartbeat Kasir POS (Windows Task)</span>
                </div>
                <button
                  onClick={() => copyToClipboard(psSnippet, "snippet")}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 transition-colors"
                >
                  {copiedSnippet ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Salin Script
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Selain ICMP Ping via VPN, kasir POS juga dapat mengirim heartbeat otomatis tiap 5 menit menggunakan Windows Task Scheduler agar terhubung dua arah ke server MIS:
              </p>

              <pre className="mt-2.5 p-3 bg-black/60 rounded-xl text-[10px] font-mono text-emerald-400 overflow-x-auto leading-relaxed border border-slate-800">
                {psSnippet}
              </pre>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-2 border-t border-slate-800">
              <Server className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Dengan integrasi VPN & ICMP aktif, IT Support dapat mendeteksi kasir mati sebelum toko mengajukan tiket perbaikan.
              </span>
            </div>
          </div>
        </div>

        <ScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
        />
      </div>
    </SidebarLayout>
  );
}
