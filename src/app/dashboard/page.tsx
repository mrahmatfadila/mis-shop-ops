"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import ScannerModal from "@/components/ScannerModal";
import TicketModal from "@/components/TicketModal";
import { Asset, Ticket, MonitoringItem } from "@/types";
import {
  Laptop,
  QrCode,
  LifeBuoy,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Server,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Video,
  CreditCard,
  Building2,
  ShoppingCart,
  Layers,
  PhoneCall,
  Database,
  Sparkles,
  Check,
  ChevronRight,
  Wifi,
  HardDrive,
  Store,
  Lock,
  Shield,
  HelpCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getClientCache, setClientCache } from "@/lib/cache";

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading: isLoadingAuth, isAdmin, isMIS, isManager, isProcurement, isSPVPlazaBali, isSPVSam, userShopLocation, switchRole } = useAuth();
  const isGlobalUser = isAdmin || isMIS || isManager || isProcurement;

  const [stats, setStats] = useState({
    totalAssets: 0,
    operationalAssets: 0,
    brokenAssets: 0,
    repairAssets: 0,
    pendingTickets: 0,
    onlineDevices: 0,
    totalMonitoredDevices: 0,
    totalOfficeAssets: 0,
    posCount: 0,
    edcCount: 0,
    t3Count: 0,
    dvrCount: 0,
    rackPortCount: 0,
  });

  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [monitoredDevices, setMonitoredDevices] = useState<MonitoringItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedAssetForTicket, setSelectedAssetForTicket] = useState<Asset | null>(null);

  const fetchData = async () => {
    const cacheKey = `dashboard_data_${isGlobalUser ? (isMIS ? 'mis' : isManager ? 'mgr' : 'proc') : userShopLocation}`;
    const cached = getClientCache<any>(cacheKey);
    if (cached) {
      if (cached.stats) setStats(cached.stats);
      if (cached.tickets) setRecentTickets(cached.tickets);
      if (cached.monitored) setMonitoredDevices(cached.monitored);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    try {
      const ticketsUrl = isGlobalUser
        ? "/api/tickets?status=MENUNGGU"
        : `/api/tickets?shop=${encodeURIComponent(userShopLocation)}`;

      const [statsRes, ticketsRes, monRes] = await Promise.all([
        fetch("/api/stats"),
        fetch(ticketsUrl),
        fetch("/api/monitoring"),
      ]);

      const [statsJson, ticketsJson, monJson] = await Promise.all([
        statsRes.json(),
        ticketsRes.json(),
        monRes.json(),
      ]);

      let ticketsData = [];
      let monitoredData = [];

      if (statsJson.success) setStats(statsJson.stats);
      if (ticketsJson.success) {
        ticketsData = ticketsJson.data.slice(0, 5);
        setRecentTickets(ticketsData);
      }
      if (monJson.success) {
        monitoredData = isGlobalUser
          ? monJson.data.slice(0, 5)
          : monJson.data
              .filter((d: MonitoringItem) => d.shop_location === userShopLocation)
              .slice(0, 5);
        setMonitoredDevices(monitoredData);
      }

      setClientCache(cacheKey, {
        stats: statsJson.stats,
        tickets: ticketsData,
        monitored: monitoredData
      });
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      router.push("/");
    }
  }, [isLoadingAuth, user, router]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user, isMIS, userShopLocation]);

  const handleOpenTicketForAsset = (asset: Asset) => {
    setSelectedAssetForTicket(asset);
    setIsTicketModalOpen(true);
  };

  return (
    <SidebarLayout onOpenScanner={() => setIsScannerOpen(true)}>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* CLEAN EXECUTIVE HERO HEADER */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2 max-w-3xl">
              {/* Badges Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#006622] border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isAdmin
                    ? "Administrator Sistem (Superadmin)"
                    : isMIS
                    ? "MIS OPS (Akses Operasional Master)"
                    : isManager
                    ? "MIS MANAGER (Supervisi Manajemen)"
                    : isProcurement
                    ? "MIS PROCUREMENT SUPPORT (Pengadaan & Logistik)"
                    : `SPV Toko ${userShopLocation}`}
                </span>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600">
                  <Database className="w-3 h-3 text-emerald-600" />
                  <span>SQLite 3 WAL Online</span>
                </span>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  {isAdmin
                    ? "Pusat Kontrol Administrator & Manajemen Sistem"
                    : isMIS
                    ? "Pusat Kontrol Operasional & Inventaris Aset IT"
                    : isManager
                    ? "Pusat Kontrol Eksekutif & Supervisi Operasional MIS"
                    : isProcurement
                    ? "Pusat Pengadaan & Logistik Hardware Kasir IT"
                    : `Portal Operasional Kasir Toko ${userShopLocation}`}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
                  {isAdmin
                    ? "Kelola hak akses role pengguna, konfigurasi permission menu, inventaris master aset, infrastruktur jaringan, dan log operasional."
                    : isMIS
                    ? "Kelola 68 kasir POS, 53 mesin EDC bank, 77 unit PC kantor & WHS, serta infrastruktur rak server 32U & 6U."
                    : isManager
                    ? "Supervisi seluruh aset kasir bandara, mesin EDC, monitoring live IP, serta audit log pengadaan & tiket kendala."
                    : isProcurement
                    ? "Manajemen pencatatan pengadaan pembelian hardware kasir, peripheral, sparepart, dan sinkronisasi instalasi IT Support."
                    : `Pantau kelancaran kasir toko ${userShopLocation} dan sampaikan laporan kendala teknis langsung ke meja IT Support.`}
                </p>
              </div>

              {/* Quick Actions in Hero */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors active:scale-98"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{isGlobalUser ? "Scan Barcode Aset" : "Scan Kasir Toko"}</span>
                </button>

                <button
                  onClick={() => setIsTicketModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors active:scale-98"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat Tiket Kendala</span>
                </button>

                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Ganti Akun Demo</span>
                </Link>
              </div>
            </div>

            {/* Quick Status Pill on the Right */}
            <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 text-xs space-y-2 min-w-[220px] lg:max-w-xs flex-shrink-0">
              <div className="flex items-center justify-between text-slate-500 font-semibold border-b border-slate-200 pb-1.5 text-[11px]">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-[#006622]" />
                  <span>Status Sesi</span>
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {isAdmin ? "Superadmin (Full)" : isMIS ? "MIS OPS" : isManager ? "MIS MANAGER" : isProcurement ? "MIS PROCUREMENT SUPPORT" : "SPV Operasional"}
                </span>
              </div>

              <div className="space-y-1 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Pengguna:</span>
                  <span className="text-slate-800 font-semibold">{user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lokasi:</span>
                  <span className="text-slate-800 font-semibold">{isGlobalUser ? "Semua Toko" : userShopLocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Master Aset:</span>
                  <span className={isGlobalUser ? "text-[#006622] font-semibold" : "text-amber-700 font-semibold"}>
                    {isAdmin ? "Superadmin (Semua Akses)" : isMIS ? "Akses Penuh (CRUD)" : isManager ? "Supervisi Eksekutif" : isProcurement ? "Pengadaan & Alokasi" : "Terkunci (Khusus IT)"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TAMPILAN BERDASARKAN ROLE PERMISSION */}
        {isGlobalUser ? (
          /* ============================================================== */
          /* 1. TAMPILAN KHUSUS ROLE MIS (IT SUPPORT) - AKSES MASTER ASET */
          /* ============================================================== */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 4 PRIMARY KPI METRIC CARDS (CLEAN MONOCHROME & EMERALD) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <Link
                href="/assets"
                className="group p-4 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors shadow-2xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Perangkat POS</span>
                  <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/50 flex items-center justify-center">
                    <Laptop className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">{stats.posCount || 68} <span className="text-xs font-normal text-slate-400">Unit</span></div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Terminal 2, Terminal 3 & Surabaya
                </p>
              </Link>

              <Link
                href="/edc"
                className="group p-4 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors shadow-2xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Mesin EDC Bank</span>
                  <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/50 flex items-center justify-center">
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">{stats.edcCount || 53} <span className="text-xs font-normal text-slate-400">POS</span></div>
                <p className="text-[11px] text-slate-500 mt-1">
                  BCA, BNI, Mandiri & BRI
                </p>
              </Link>

              <Link
                href="/office"
                className="group p-4 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors shadow-2xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Hardware Kantor & DVR</span>
                  <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/50 flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">{(stats.totalOfficeAssets || 77) + (stats.dvrCount || 27)} <span className="text-xs font-normal text-slate-400">Unit</span></div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {stats.totalOfficeAssets || 77} PC HO & {stats.dvrCount || 27} DVR CCTV
                </p>
              </Link>

              <Link
                href="/monitoring"
                className="group p-4 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors shadow-2xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status Jaringan</span>
                  <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/50 flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">{stats.onlineDevices || 0}/{stats.totalMonitoredDevices || 0} <span className="text-xs font-normal text-emerald-600">Online</span></div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Heartbeat Kasir & Server Normal
                </p>
              </Link>
            </div>

            {/* GROUPED FAST ACCESS NAVIGATION (ASET, INFRA, OPERASIONAL) */}
            <div className="space-y-6">
              {/* SECTION 1: ASET KASIR & TOKO */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Store className="w-4 h-4 text-purple-600" />
                    <span>Inventaris Aset & Kasir Toko</span>
                  </h2>
                  <span className="text-xs text-slate-400">Plaza Bali, SAM, Surabaya</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <Link
                    href="/assets"
                    className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-400 hover:shadow-sm transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                          Perangkat Kasir POS
                        </h3>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800">
                          68 POS
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        NCR & New POS Toko Plaza Bali (38), SAM (17), Surabaya (13).
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/edc"
                    className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-sm transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                          Mesin EDC Kasir
                        </h3>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                          53 Unit
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        EDC BCA, BNI, BRI, Mandiri terhubung ke tiap titik kasir POS.
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/t3-assets"
                    className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-sm transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          Aset Tetap T3 (DF1-DF7)
                        </h3>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-800">
                          35 Unit
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Aktiva inventaris Toko Duty Free 1 sampai 7 Terminal 3.
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/dvr"
                    className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          Aset DVR & CCTV
                        </h3>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800">
                          27 DVR
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Kamera toko, IP address perekam & retensi hari rekaman CCTV.
                      </p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* SECTION 2: INFRASTRUKTUR IT & JARINGAN */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-600" />
                    <span>Infrastruktur IT, Server & Cabling</span>
                  </h2>
                  <span className="text-xs text-slate-400">Pusat, Gudang WHS, SPV</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  <Link
                    href="/office"
                    className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          Aset PC Office & WHS
                        </h3>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800">
                          77 PC
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        PC Kantor Pusat (47), Gudang WHS (10), T2/T3 (15), Surabaya (5).
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/server-rack"
                    className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-800 hover:shadow-sm transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-slate-900 group-hover:text-slate-800 transition-colors">
                          Rak Server 32U & 6U Wallmount
                        </h3>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-800">
                          135 Port
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Manajemen kabel patch panel, port switch VOIP & PC, router Ruijie, Mikrotik.
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/extensions"
                    className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-sm transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <PhoneCall className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                          Direktori Ekstensi Telepon
                        </h3>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-teal-100 text-teal-800">
                          47 Ext
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Nomor interkom PABX internal Divisi Kantor Pusat, Gudang WHS & Meja IT.
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* 2. TAMPILAN KHUSUS ROLE SPV TOKO (KOSONG / DITANGGUHKAN)       */
          /* ============================================================== */
          <div className="py-12 px-4 max-w-xl mx-auto text-center space-y-6 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Menu Role SPV Sedang Dikosongkan
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Fokus Modul: IT Support (MIS)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Akses dan izin menu untuk SPV Plaza Bali & SPV SAM dikosongkan terlebih dahulu karena pengembangan sistem saat ini sedang diprioritaskan penuh pada <strong>Inventaris & Master Aset IT Support (MIS)</strong>.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-left text-xs space-y-2.5">
              <p className="font-extrabold text-slate-900 text-xs">
                Modul Master Aset yang Sedang Aktif di Role IT Support:
              </p>
              <ul className="space-y-1.5 text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Master Perangkat Kasir POS ({stats.posCount || 68} unit Terminal 2, 3 & Surabaya)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Master Mesin EDC Kasir Bank ({stats.edcCount || 53} POS BCA, BNI, Mandiri, BRI)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Master Aset Tetap T3 DF1-DF7 ({stats.t3Count || 35} Unit) & DVR CCTV Toko ({stats.dvrCount || 27} Unit)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>PC Office Head Office & Gudang WHS ({stats.totalOfficeAssets || 77} Unit - 6 Divisi)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Dokumentasi Port Cabling Rak Server 32U & 6U Wallmount ({stats.rackPortCount || 158} Port)</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => switchRole("MIS")}
              className="w-full py-3 px-4 bg-[#006622] hover:bg-[#00521b] text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Masuk / Beralih ke Role IT Support (MIS)</span>
            </button>
          </div>
        )}

        {/* LIVE OPERATIONS DUAL PANEL: RECENT TICKETS & REALTIME HEARTBEAT (KHUSUS ROLE IT & PENGADAAN) */}
        {isGlobalUser && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Panel 1: Recent Trouble Tickets */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <LifeBuoy className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                      {isMIS ? "Tiket Kendala Kasir Terkini" : `Antrean Tiket Toko ${userShopLocation}`}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {isMIS ? "Antrean komplain dari SPV toko yang perlu ditindaklanjuti" : "Status penanganan kendala toko Anda oleh tim teknisi IT"}
                    </p>
                  </div>
                </div>

                <Link
                  href="/tickets"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
                >
                  <span>Lihat Semua</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {recentTickets.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                    <span>Tidak ada tiket kendala aktif saat ini. Semua kasir normal.</span>
                  </div>
                ) : (
                  recentTickets.map((ticket) => (
                    <div key={ticket.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {ticket.ticket_number}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                              ticket.urgency === "DARURAT"
                                ? "bg-rose-100 text-rose-700 animate-pulse"
                                : ticket.urgency === "TINGGI"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {ticket.urgency}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{ticket.problem_title}</h4>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          <span>{ticket.shop_location}</span>
                          <span>•</span>
                          <span>Pelapor: <strong className="text-slate-600">{ticket.reporter_name}</strong></span>
                        </div>
                      </div>

                      <Link
                        href={`/tickets?id=${ticket.id}`}
                        className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold whitespace-nowrap self-center"
                      >
                        {isMIS ? "Respon" : "Detail"}
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px]">Tiket aktif: <strong className="text-rose-600">{recentTickets.length}</strong></span>
              <button
                onClick={() => setIsTicketModalOpen(true)}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Buat Tiket Baru
              </button>
            </div>
          </div>

          {/* Panel 2: Realtime POS & Network Heartbeat */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                      {isMIS ? "Status Jaringan Kasir & Server" : `Status Ping Kasir Toko ${userShopLocation}`}
                    </h3>
                    <p className="text-[10px] text-slate-400">Pantauan konektivitas perangkat kasir di lokasi toko</p>
                  </div>
                </div>

                {(isMIS || isManager) && (
                  <Link
                    href="/monitoring"
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
                  >
                    <span>Detail Monitor</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
              </div>

              <div className="divide-y divide-slate-100">
                {monitoredDevices.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Belum ada data perangkat yang terdaftar di monitoring.
                  </div>
                ) : (
                  monitoredDevices.map((dev) => (
                    <div key={dev.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <h4 className="text-xs font-bold text-slate-800">{dev.asset_name || dev.asset_code}</h4>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {dev.shop_location} • IP: <span className="font-mono text-slate-700 font-medium">{dev.ip_address}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ONLINE ({dev.response_time_ms || 12} ms)
                        </span>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          Heartbeat aktif
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px] text-slate-400">Auto-refresh setiap 30 detik</span>
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
          </div>
        </div>
        )}

        {/* SQLITE DATABASE TRANSPARENCY CARD */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Database className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Data Terhubung Penuh ke Database SQLite (<code className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-xs">shop_ops.db</code>)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Aktif & Cepat
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
                Seluruh 648 data aset, 13 tabel relasional, akun login multi-role, dan konfigurasi rak server tersimpan aman di disk lokal SQLite via engine LibSQL WAL mode. Hak akses master aset dikelola oleh tim MIS OPS.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-blue-600 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Ganti Akun Demo</span>
            </Link>
          </div>
        </div>
      </main>

        {/* Barcode & QR Scanner Modal */}
        <ScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onRequestTicket={handleOpenTicketForAsset}
        />

        {/* Trouble Ticket Modal */}
        <TicketModal
          isOpen={isTicketModalOpen}
          asset={selectedAssetForTicket}
          onClose={() => setIsTicketModalOpen(false)}
          onSuccess={fetchData}
        />
      </SidebarLayout>
    );
  }
