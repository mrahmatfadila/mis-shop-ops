"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Laptop,
  CreditCard,
  Layers,
  Video,
  Building2,
  Server,
  Activity,
  LifeBuoy,
  PhoneCall,
  ShoppingCart,
  QrCode,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  LogOut,
  Shield,
  Sparkles,
  Check,
  Lock,
  Cpu,
  Store,
  ExternalLink,
  Search,
  Bell,
  HardDrive,
  RefreshCw,
  Home,
  Map,
  SlidersHorizontal,
  ShieldCheck,
  Fingerprint,
  MapPin,
  User,
  Users,
  BookOpen
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types";
import { getClientCache, setClientCache } from "@/lib/cache";

interface SidebarLayoutProps {
  children: React.ReactNode;
  onOpenScanner?: () => void;
  title?: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
}

export default function SidebarLayout({
  children,
  onOpenScanner,
  title,
  subtitle,
  badge,
  actions,
}: SidebarLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, switchRole, logout, isAdmin, isMIS, isManager, isProcurement, isSPVPlazaBali, isSPVSam, userShopLocation } = useAuth();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [roleToast, setRoleToast] = useState<{ title: string; subtitle: string; role: string } | null>(null);

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch live counts for badges with instantaneous client cache
  useEffect(() => {
    const cachedStats = getClientCache<any>("app_stats");
    if (cachedStats) {
      setStats(cachedStats);
      return; // Gunakan cache memori yang sudah ada, jangan blocking fetch berulang
    }

    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.stats) {
          setStats(data.stats);
          setClientCache("app_stats", data.stats);
        }
      })
      .catch(() => {});
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
    setIsRoleDropdownOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  // Roles definition for 1-Click Switcher (Khusus Admin Dev)
  const rolesList: { role: UserRole; title: string; subtitle: string; color: string; ringColor: string }[] = [
    {
      role: "ADMIN",
      title: "Administrator Sistem",
      subtitle: "Superuser: Kontrol Penuh Hak Akses & Seluruh Menu",
      color: "bg-purple-50 text-purple-700 border-purple-200",
      ringColor: "ring-purple-500",
    },
    {
      role: "MIS",
      title: "MIS OPS",
      subtitle: "Teknis Kasir, Hardware, Jaringan & AnyDesk",
      color: "bg-emerald-50 text-[#006622] border-emerald-200",
      ringColor: "ring-emerald-500",
    },
    {
      role: "MANAGER",
      title: "MIS MANAGER",
      subtitle: "Supervisi Eksekutif, Seluruh Modul & KPI",
      color: "bg-amber-50 text-amber-700 border-amber-200",
      ringColor: "ring-amber-500",
    },
    {
      role: "IT_PROCUREMENT",
      title: "MIS PROCUREMENT SUPPORT",
      subtitle: "Pengajuan Barang IT & Pengadaan",
      color: "bg-blue-50 text-blue-700 border-blue-200",
      ringColor: "ring-blue-500",
    },
    {
      role: "SPV_PLAZABALI_T3",
      title: "SPV Plaza Bali (Terminal 3)",
      subtitle: "Operasional Toko Plaza Bali Bandara T3",
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
      ringColor: "ring-emerald-500",
    },
    {
      role: "SPV_PLAZABALI_T2",
      title: "SPV Plaza Bali (Terminal 2)",
      subtitle: "Operasional Toko Plaza Bali Bandara T2",
      color: "bg-teal-50 text-teal-800 border-teal-200",
      ringColor: "ring-teal-500",
    },
    {
      role: "SPV_SAM_T3",
      title: "SPV SAM (Terminal 3)",
      subtitle: "Operasional Toko SAM Bandara Terminal 3",
      color: "bg-indigo-50 text-indigo-800 border-indigo-200",
      ringColor: "ring-indigo-500",
    },
    {
      role: "SPV_SAM_T2",
      title: "SPV SAM (Terminal 2)",
      subtitle: "Operasional Toko SAM Bandara Terminal 2",
      color: "bg-sky-50 text-sky-800 border-sky-200",
      ringColor: "ring-sky-500",
    },
  ];

  const isSPV = isSPVPlazaBali || isSPVSam;
  const userInitials = isAdmin
    ? "ADM"
    : isMIS
    ? "OPS"
    : isManager
    ? "MGR"
    : isProcurement
    ? "PRC"
    : user?.role === "SPV_PLAZABALI_T3"
    ? "PB3"
    : user?.role === "SPV_PLAZABALI_T2"
    ? "PB2"
    : user?.role === "SPV_SAM_T3"
    ? "SM3"
    : user?.role === "SPV_SAM_T2"
    ? "SM2"
    : isSPVPlazaBali
    ? "PB"
    : "SAM";

  const roleShortBadge = isAdmin
    ? "ADMIN"
    : isMIS
    ? "MIS OPS"
    : isManager
    ? "MGR"
    : isProcurement
    ? "PROC"
    : user?.role === "SPV_PLAZABALI_T3"
    ? "SPV PB T3"
    : user?.role === "SPV_PLAZABALI_T2"
    ? "SPV PB T2"
    : user?.role === "SPV_SAM_T3"
    ? "SPV SAM T3"
    : user?.role === "SPV_SAM_T2"
    ? "SPV SAM T2"
    : "SPV";

  const roleDisplayLabel = isAdmin
    ? "Administrator Sistem"
    : isMIS
    ? "MIS OPS"
    : isManager
    ? "MIS MANAGER"
    : isProcurement
    ? "MIS PROCUREMENT SUPPORT"
    : user?.role === "SPV_PLAZABALI_T3"
    ? "SPV Plaza Bali (Terminal 3)"
    : user?.role === "SPV_PLAZABALI_T2"
    ? "SPV Plaza Bali (Terminal 2)"
    : user?.role === "SPV_SAM_T3"
    ? "SPV SAM (Terminal 3)"
    : user?.role === "SPV_SAM_T2"
    ? "SPV SAM (Terminal 2)"
    : `SPV ${userShopLocation}`;
  const roleColorBg = isAdmin
    ? "bg-purple-700"
    : isMIS
    ? "bg-[#006622]"
    : isManager
    ? "bg-amber-600"
    : isProcurement
    ? "bg-blue-600"
    : "bg-slate-600";

  // Initials based on real user full name
  const nameInitials = (() => {
    if (!user?.name) return "US";
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const avatarGradient = isAdmin
    ? "bg-gradient-to-br from-purple-600 to-indigo-800"
    : isMIS
    ? "bg-gradient-to-br from-[#006622] to-emerald-800"
    : isManager
    ? "bg-gradient-to-br from-amber-600 to-orange-700"
    : isProcurement
    ? "bg-gradient-to-br from-blue-600 to-cyan-800"
    : "bg-gradient-to-br from-teal-700 to-emerald-900";

  const roleBadgeStyle = isAdmin
    ? "bg-purple-50 text-purple-700 border-purple-200"
    : isMIS
    ? "bg-emerald-50 text-[#006622] border-emerald-200"
    : isManager
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : isProcurement
    ? "bg-blue-50 text-blue-700 border-blue-200"
    : "bg-teal-50 text-teal-800 border-teal-200";

  // Full Enterprise Mapping (Pemetaan Bersih & Rapi)
  const navGroups = [
    {
      groupTitle: "Ringkasan",
      items: [
        {
          href: "/dashboard",
          label: isAdmin || isMIS || isManager
            ? "Dashboard Kontrol"
            : isProcurement
            ? "Dashboard Pengadaan"
            : `Portal SPV ${userShopLocation || "Toko"}`,
          sub: isAdmin || isMIS || isManager
            ? "Ringkasan KPI Master"
            : isProcurement
            ? "Statistik Aset & PO"
            : `Operasional Toko ${userShopLocation || "Toko"}`,
          icon: LayoutDashboard,
          badge: "Live",
          badgeColor: "bg-emerald-50 text-[#006622] border-emerald-200/60",
          requiresMIS: false,
        },
      ],
    },
    {
      groupTitle: "Master Aset",
      groupNotice: isMIS ? undefined : "Khusus MIS",
      items: [
        {
          href: "/assets",
          label: "Kasir POS",
          sub: "Terminal 2, 3 & Surabaya",
          icon: Laptop,
          badge: stats?.posCount ? `${stats.posCount}` : "68",
          badgeColor: "bg-slate-100 text-slate-600 border-slate-200/60",
          requiresMIS: true,
        },
        {
          href: "/pos-topology",
          label: "Topologi Kasir",
          sub: "Denah & Detail 1 Set POS",
          icon: Map,
          badge: "Denah",
          badgeColor: "bg-emerald-50 text-[#006622] border-emerald-200/60",
          requiresMIS: true,
        },
        {
          href: "/edc",
          label: "Mesin EDC Bank",
          sub: "BCA, BNI, Mandiri & BRI",
          icon: CreditCard,
          badge: stats?.edcCount ? `${stats.edcCount}` : "53",
          badgeColor: "bg-slate-100 text-slate-600 border-slate-200/60",
          requiresMIS: true,
        },
        {
          href: "/office",
          label: "PC Office & WHS",
          sub: "Head Office & Gudang",
          icon: Building2,
          badge: stats?.totalOfficeAssets ? `${stats.totalOfficeAssets}` : "77",
          badgeColor: "bg-slate-100 text-slate-600 border-slate-200/60",
          requiresMIS: true,
        },
        {
          href: "/t3-assets",
          label: "Aset Tetap T3",
          sub: "DF1 - DF7 Bandara",
          icon: Layers,
          badge: stats?.t3Count ? `${stats.t3Count}` : "35",
          badgeColor: "bg-slate-100 text-slate-600 border-slate-200/60",
          requiresMIS: true,
        },
        {
          href: "/dvr",
          label: "DVR CCTV Toko",
          sub: "Kamera & Rekaman",
          icon: Video,
          badge: stats?.dvrCount ? `${stats.dvrCount}` : "27",
          badgeColor: "bg-slate-100 text-slate-600 border-slate-200/60",
          requiresMIS: true,
        },
      ],
    },
    {
      groupTitle: "Infrastruktur",
      groupNotice: isMIS ? undefined : "Khusus MIS",
      items: [
        {
          href: "/server-rack",
          label: "Rak Server",
          sub: "Port Switch 32U & 6U",
          icon: Server,
          badge: stats?.rackPortCount ? `${stats.rackPortCount}` : "158",
          badgeColor: "bg-slate-100 text-slate-600 border-slate-200/60",
          requiresMIS: true,
        },
        {
          href: "/monitoring",
          label: "Monitoring Ping",
          sub: "Live Ping Kasir",
          icon: Activity,
          badge: stats?.onlineDevices !== undefined ? `${stats.onlineDevices}/${stats.totalMonitoredDevices || 0}` : "Online",
          badgeColor: "bg-emerald-50 text-[#006622] border-emerald-200/60",
          requiresMIS: true,
        },
      ],
    },
    {
      groupTitle: "Operasional",
      items: [
        {
          href: "/tickets",
          label: "Tiket Kendala",
          sub: isMIS ? "Antrean Penanganan" : "Lapor Kendala Kasir",
          icon: LifeBuoy,
          badge: stats?.pendingTickets ? `${stats.pendingTickets}` : "0",
          badgeColor: stats?.pendingTickets ? "bg-rose-50 text-rose-700 border-rose-200 font-bold" : "bg-slate-100 text-slate-600 border-slate-200/60",
          requiresMIS: false,
        },
        {
          href: "/extensions",
          label: "Interkom IT",
          sub: "Direktori Kontak PABX",
          icon: PhoneCall,
          badge: stats?.extensionCount ? `${stats.extensionCount}` : "47",
          badgeColor: "bg-slate-100 text-slate-600 border-slate-200/60",
          requiresMIS: false,
        },
        {
          href: "/purchases",
          label: "Pengajuan Barang IT",
          sub: "Workflow Pengadaan MIS OPS & Proc",
          icon: ShoppingCart,
          badge: stats?.purchaseCount ? `${stats.purchaseCount}` : "0",
          badgeColor: "bg-slate-100 text-slate-600 border-slate-200/60",
          requiresMIS: false,
        },
        {
          href: "/knowledge-base",
          label: "Knowledge Base",
          sub: isMIS ? "Kelola SOP & Troubleshooting" : "Pusat Panduan & Solusi Toko",
          icon: BookOpen,
          badge: stats?.knowledgeCount ? `${stats.knowledgeCount}` : "SOP",
          badgeColor: "bg-emerald-50 text-[#006622] border-emerald-200/60 font-semibold",
          requiresMIS: false,
        },
      ],
    },
    {
      groupTitle: "Administrasi",
      items: [
        {
          href: "/users",
          label: "Manajemen User",
          sub: "Data Akun & NIK Pengguna",
          icon: Users,
          badge: "User",
          badgeColor: "bg-purple-100 text-purple-800 border-purple-200 font-bold",
          requiresAdmin: true,
        },
        {
          href: "/permissions",
          label: "Hak Akses & Role",
          sub: "Atur Permission Menu & Role",
          icon: SlidersHorizontal,
          badge: "Admin",
          badgeColor: "bg-purple-100 text-purple-800 border-purple-200 font-bold",
          requiresAdmin: true,
        },
      ],
    },
  ];

  // Helper to check if a specific route is allowed for a given role
  const isRouteAllowedForRole = (href: string, role: UserRole): boolean => {
    // 1. ADMIN memiliki akses penuh ke 100% menu sistem termasuk permission & user management
    if (role === "ADMIN") return true;

    // 2. MIS & MANAGER memiliki akses ke seluruh modul operasional teknis (kecuali menu admin: permission & users)
    if (role === "MIS" || role === "MANAGER") {
      return href !== "/permissions" && href !== "/users";
    }

    // 3. PROCUREMENT SUPPORT: difokuskan pada pengadaan, pembelian, kasir POS & PC Office
    if (role === "IT_PROCUREMENT") {
      return ["/dashboard", "/assets", "/office", "/purchases", "/tickets", "/extensions", "/knowledge-base"].some(
        (p) => href === p || href.startsWith(p + "/")
      );
    }

    // 4. SPV TOKO (Plaza Bali T2/T3 & SAM T2/T3): Portal SPV, Kasir POS Toko, Topologi, EDC Bank, Tiket Kendala, Interkom & Knowledge Base SOP
    if (
      role === "SPV_PLAZABALI_T3" ||
      role === "SPV_PLAZABALI_T2" ||
      role === "SPV_SAM_T3" ||
      role === "SPV_SAM_T2" ||
      role === "SPV_PLAZABALI" ||
      role === "SPV_SAM"
    ) {
      return ["/dashboard", "/assets", "/pos-topology", "/edc", "/tickets", "/extensions", "/knowledge-base"].some(
        (p) => href === p || href.startsWith(p + "/")
      );
    }

    return href === "/dashboard";
  };

  // Switch role handler with automatic route protection & toast feedback
  const handleSwitchRole = async (targetRole: UserRole) => {
    const roleObj = rolesList.find((r) => r.role === targetRole);
    await switchRole(targetRole);
    setIsRoleDropdownOpen(false);
    setIsUserMenuOpen(false);

    if (roleObj) {
      setRoleToast({
        title: roleObj.title,
        subtitle: roleObj.subtitle,
        role: roleObj.role,
      });
      setTimeout(() => setRoleToast(null), 3500);
    }

    // Jika halaman saat ini tidak diizinkan untuk role baru, otomatis redirect ke /dashboard
    if (!isRouteAllowedForRole(pathname, targetRole)) {
      router.push("/dashboard");
    }
  };

  const currentRole: UserRole = user?.role || "MIS";

  // Filter nav groups strictly by role permissions
  const allowedNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item: any) => {
        return isRouteAllowedForRole(item.href, currentRole);
      }),
    }))
    .filter((group) => group.items.length > 0);

  // Dynamic Page Title & Breadcrumb calculation
  const getPageInfo = () => {
    for (const group of navGroups) {
      for (const item of group.items) {
        if (pathname === item.href) {
          return {
            title: item.label,
            category: group.groupTitle,
            sub: item.sub,
          };
        }
      }
    }
    return {
      title: title || "MIS Shop Ops",
      category: "Aplikasi Operasional",
      sub: subtitle || "Sistem Manajemen Inventaris & Dukungan Kasir",
    };
  };

  const pageInfo = getPageInfo();

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans text-slate-800 flex flex-col">
      {/* 1. Backdrop for Mobile Drawer */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 2. SIDEBAR (Fixed Desktop, Slide-over Mobile) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200/90 shadow-xl lg:shadow-none flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
          <Link href="/dashboard" className="flex items-center gap-2.5 group min-w-0">
            <img
              src="/logo-plazabali.png"
              alt="Plaza Bali"
              className="h-8.5 w-auto object-contain transition-transform group-hover:scale-102 flex-shrink-0"
              style={{ height: "34px", width: "auto", display: "block" }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1 leading-none">
                <span className="text-[#006622] font-black tracking-tight text-xs">MIS</span>
                <span className="tracking-tight text-slate-900 font-extrabold text-xs">SHOP OPS</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5 truncate">
                PT Plaza Bali Prima
              </p>
            </div>
          </Link>

          {/* Close Button on Mobile */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Scope / Role Row (Clean Minimalist Single Row) */}
        <div className="px-3 py-2 mx-3 mt-2.5 bg-slate-50/80 rounded-lg border border-slate-200/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-6 h-6 rounded-md ${roleColorBg} flex items-center justify-center font-bold text-[10px] text-white flex-shrink-0 shadow-2xs`}>
              {userInitials}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                {user?.name || roleDisplayLabel}
              </p>
              <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                {isMIS ? "Superadmin IT" : isManager ? "Supervisi Eksekutif" : isProcurement ? "Pengadaan & Logistik" : `Lokasi: ${userShopLocation}`}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${
            isMIS ? "text-[#006622] bg-emerald-50 border-emerald-200/60" :
            isManager ? "text-amber-800 bg-amber-50 border-amber-200" :
            isProcurement ? "text-blue-800 bg-blue-50 border-blue-200" :
            "text-slate-700 bg-slate-50 border-slate-200"
          }`}>
            {roleShortBadge}
          </span>
        </div>

        {/* Navigation Groups (Pemetaan Rapi - Single Line per Item) */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
          {/* Seluruh Menu Inventaris & Infrastruktur Sesuai Wewenang Role yang Aktif */}
          {allowedNavGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-0.5">
              {/* Group Title */}
              <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>{group.groupTitle}</span>
              </div>

              {/* Group Nav Items (Single Clean Line per Item - No Truncation) */}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors ${
                        isActive
                          ? "bg-emerald-50/80 text-[#006622] font-bold border-l-2 border-[#006622]"
                          : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 transition-colors ${
                            isActive
                              ? "text-[#006622]"
                              : "text-slate-400 group-hover:text-slate-600"
                          }`}
                        />
                        <span className="truncate">
                          {item.label}
                        </span>
                      </div>

                      {/* Clean Compact Badge */}
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-medium border flex-shrink-0 ml-1.5 ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick Action: Scan Barcode (Clean Flat Button) */}
          {(isAdmin || isMIS) && onOpenScanner && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onOpenScanner}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors shadow-2xs group"
              >
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#006622]" />
                  <span>Scan Barcode Kasir</span>
                </div>
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-medium">
                  Kamera
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Footer: Role Switcher (Khusus Admin) & Logout */}
        <div className="p-2.5 border-t border-slate-100 bg-white space-y-1.5 flex-shrink-0">
          {/* 1-Click Role Switcher - Hanya muncul jika login sebagai Administrator */}
          {isAdmin && (
            <div className="relative" ref={roleMenuRef}>
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Ganti Role (Admin Dev)</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isRoleDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl border border-slate-200/80 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pilih Role Pengguna (Demo)
                  </div>
                  {rolesList.map((r) => {
                    const isCurrent = user?.role === r.role;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => handleSwitchRole(r.role)}
                        className={`w-full flex items-start gap-2 p-2 rounded-lg text-left transition-colors ${
                          isCurrent ? `${r.color} font-bold ring-1 ring-emerald-500/30` : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="mt-0.5">
                          {isCurrent ? (
                            <Check className="w-3.5 h-3.5 text-[#006622]" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight">{r.title}</p>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">
                            {r.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Logout Shortcut */}
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar / Ganti Akun</span>
          </button>
        </div>
      </aside>

      {/* 3. MAIN WRAPPER (Offset by sidebar width on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all duration-300">
        {/* Sticky Top Header Bar (Clean Minimalist Enterprise) */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 bg-white border-b border-slate-200/80 shadow-2xs">
          {/* Left: Mobile Toggle & Unified Clean Breadcrumb */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Clean Breadcrumb Hierarchy (Single Crisp Line - No Duplicate Text) */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs sm:text-sm truncate">
              <Link
                href="/dashboard"
                className="text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1 font-medium"
              >
                <Home className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Shop Ops</span>
              </Link>
              <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <span className="text-slate-400 font-medium truncate hidden md:inline">
                {pageInfo.category}
              </span>
              <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0 hidden md:inline" />
              <h1 className="text-slate-900 font-bold truncate text-xs sm:text-sm">
                {title || pageInfo.title}
              </h1>
            </nav>
          </div>

          {/* Right: Custom Page Actions, Barcode Scanner & User Profile */}
          <div className="flex items-center gap-2">
            {/* Custom Page Actions if any */}
            {actions}

            {/* Refined Quick Barcode Scanner Button */}
            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all shadow-2xs active:scale-95"
              >
                <QrCode className="w-3.5 h-3.5 text-[#006622]" />
                <span>Scan Barcode</span>
              </button>
            )}

            {/* Modern User Profile Pill Button & Popover */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`flex items-center gap-2 sm:gap-2.5 pl-1.5 pr-2.5 sm:pr-3 py-1 rounded-xl bg-white hover:bg-slate-50 border transition-all duration-150 shadow-2xs group ${
                  isUserMenuOpen ? "border-slate-300 ring-2 ring-emerald-500/10 bg-slate-50" : "border-slate-200/90 hover:border-slate-300"
                }`}
                title="Profil Pengguna & Sesi"
              >
                {/* User Avatar with Online Dot */}
                <div className="relative shrink-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black text-white shadow-xs ${avatarGradient}`}
                  >
                    {nameInitials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-500/30" />
                </div>

                {/* User Info Text */}
                <div className="text-left hidden sm:block max-w-[130px] md:max-w-[170px]">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate group-hover:text-[#006622] transition-colors">
                    {user?.name || "Pengguna"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium truncate leading-tight mt-0.5">
                    {roleDisplayLabel}
                  </p>
                </div>

                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${
                    isUserMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Modern User Profile Dropdown Card */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2.5 w-76 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden divide-y divide-slate-100">
                  {/* Card Header: User Bio */}
                  <div className="p-4 bg-gradient-to-b from-slate-50/90 to-white">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-md shrink-0 ${avatarGradient}`}
                      >
                        {nameInitials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {user?.name || "Pengguna"}
                          </h4>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                          <Fingerprint className="w-3 h-3 text-slate-400" />
                          <span>NIK / Akun: <b>{user?.username || "admin"}</b></span>
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${roleBadgeStyle}`}>
                            {roleDisplayLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Location Pill */}
                    <div className="mt-3 px-2.5 py-1.5 bg-slate-100/80 rounded-lg flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">Penempatan: <b>{user?.shop_location || "Kantor Pusat Plaza Bali"}</b></span>
                    </div>
                  </div>

                  {/* Account Status Meta */}
                  <div className="px-4 py-2 bg-white flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-slate-600 font-medium">Status Sesi:</span>
                      <span className="text-emerald-700 font-bold">Aktif (Online)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      MIS-AUTH
                    </span>
                  </div>

                  {/* Quick Action Navigation Links */}
                  <div className="p-2 space-y-1 bg-white">
                    <p className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Akses Cepat Pengguna
                    </p>
                    <Link
                      href="/tickets"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                          <LifeBuoy className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">Tiket Kendala Kasir</p>
                          <p className="text-[10px] text-slate-400">Lapor & pantau antrean perbaikan</p>
                        </div>
                      </div>
                      {stats?.pendingTickets > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                          {stats.pendingTickets}
                        </span>
                      )}
                    </Link>

                    <Link
                      href="/extensions"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
                          <PhoneCall className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">Direktori Interkom IT</p>
                          <p className="text-[10px] text-slate-400">Kontak PABX & ekstensi toko</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                    </Link>

                    {isAdmin && (
                      <Link
                        href="/permissions"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-purple-700 hover:bg-purple-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-semibold text-purple-900">Hak Akses & Role</p>
                            <p className="text-[10px] text-purple-600">Konfigurasi permission admin</p>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-purple-300" />
                      </Link>
                    )}
                  </div>

                  {/* Sign Out Action */}
                  <div className="p-2 bg-slate-50/60">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all shadow-2xs"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar dari Akun</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 w-full animate-in fade-in-50 duration-200">
          {children}
        </div>
      </div>

      {/* Floating Role Switch Notification Toast */}
      {roleToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700/80 max-w-sm flex items-start gap-3">
            <div className="p-2.5 bg-[#006622] text-white rounded-xl shadow-md shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-white">Role Berhasil Diubah</span>
                <button
                  type="button"
                  onClick={() => setRoleToast(null)}
                  className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="font-bold text-emerald-400 text-xs mt-0.5">
                {roleToast.title}
              </p>
              <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">
                {roleToast.subtitle}. Seluruh menu navigasi telah disesuaikan dengan wewenang role ini.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

