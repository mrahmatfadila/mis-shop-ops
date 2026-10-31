"use client";

import { useEffect, useState, Suspense } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import { useAuth } from "@/context/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Save,
  RotateCcw,
  Sparkles,
  Lock,
  Search,
  Eye,
  Edit3,
  SlidersHorizontal,
  Users,
  Layers,
  Check,
  AlertCircle,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  Laptop,
  CreditCard,
  Building2,
  Video,
  Server,
  Activity,
  LifeBuoy,
  PhoneCall,
  ShoppingCart,
  Map,
  ShieldAlert,
  Shield,
  X,
  Store,
  CheckCheck,
  BookOpen,
  Network
} from "lucide-react";
import { UserRole } from "@/types";

interface MenuItemDef {
  key: string;
  label: string;
  href: string;
  group: string;
  description: string;
}

interface RoleDef {
  role: UserRole;
  name: string;
  desc: string;
}

const MENU_ICONS: Record<string, any> = {
  dashboard: LayoutDashboard,
  assets: Laptop,
  "pos-topology": Map,
  network: Network,
  edc: CreditCard,
  office: Building2,
  "t3-assets": Layers,
  dvr: Video,
  "server-rack": Server,
  monitoring: Activity,
  tickets: LifeBuoy,
  extensions: PhoneCall,
  purchases: ShoppingCart,
  "knowledge-base": BookOpen,
  users: Users,
  permissions: SlidersHorizontal,
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; ring: string; gradient: string }> = {
  ADMIN: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    ring: "ring-purple-500",
    gradient: "from-purple-600 to-indigo-700",
  },
  MIS: {
    bg: "bg-emerald-50",
    text: "text-[#006622]",
    border: "border-emerald-200",
    ring: "ring-emerald-500",
    gradient: "from-[#006622] to-emerald-800",
  },
  MANAGER: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    ring: "ring-amber-500",
    gradient: "from-amber-600 to-orange-700",
  },
  IT_PROCUREMENT: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    ring: "ring-blue-500",
    gradient: "from-blue-600 to-cyan-800",
  },
  SPV_PLAZABALI_T3: {
    bg: "bg-teal-50",
    text: "text-teal-800",
    border: "border-teal-200",
    ring: "ring-teal-500",
    gradient: "from-teal-600 to-emerald-700",
  },
  SPV_PLAZABALI_T2: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    ring: "ring-teal-500",
    gradient: "from-teal-500 to-cyan-700",
  },
  SPV_SAM_T3: {
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    border: "border-indigo-200",
    ring: "ring-indigo-500",
    gradient: "from-indigo-600 to-purple-800",
  },
  SPV_SAM_T2: {
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
    ring: "ring-sky-500",
    gradient: "from-sky-600 to-blue-800",
  },
  SPV_PLAZABALI: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    ring: "ring-teal-500",
    gradient: "from-teal-600 to-emerald-700",
  },
  SPV_SAM: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    ring: "ring-indigo-500",
    gradient: "from-indigo-600 to-purple-800",
  },
};

function PermissionsContent() {
  const { user, isAdmin, isMIS } = useAuth();

  // Guard: Hanya ADMIN & MIS yang dapat mengakses halaman permission
  if (!isAdmin && !isMIS) {
    return <AccessDenied moduleName="Pengaturan Role & Hak Akses Permission" />;
  }

  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [menus, setMenus] = useState<MenuItemDef[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, { can_view: boolean; can_edit: boolean }>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Tabs
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [activeRoleTab, setActiveRoleTab] = useState<string>("ALL");

  // Fetch matrix from API
  const fetchPermissions = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/permissions");
      const data = await res.json();
      if (data.success) {
        setRoles(data.roles || []);
        setMenus(data.menus || []);
        setMatrix(data.matrix || {});
      } else {
        setErrorMessage(data.message || "Gagal memuat permission.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Koneksi ke server gagal.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  // Toggle View or Edit for a specific role and menu
  const handleToggle = (role: string, menuKey: string, field: "can_view" | "can_edit") => {
    // Admin role selalu memiliki akses penuh
    if (role === "ADMIN") return;

    setMatrix((prev) => {
      const currentRoleObj = prev[role] || {};
      const currentMenuObj = currentRoleObj[menuKey] || { can_view: false, can_edit: false };
      const currentVal = currentMenuObj[field];

      let newMenuObj = {
        ...currentMenuObj,
        [field]: !currentVal,
      };

      // Jika edit diaktifkan, otomatis view juga diaktifkan
      if (field === "can_edit" && !currentVal) {
        newMenuObj.can_view = true;
      }
      // Jika view dimatikan, otomatis edit juga dimatikan
      if (field === "can_view" && currentVal) {
        newMenuObj.can_edit = false;
      }

      return {
        ...prev,
        [role]: {
          ...currentRoleObj,
          [menuKey]: newMenuObj,
        },
      };
    });
  };

  // Quick grant all or revoke all for a role
  const handleBulkRoleAction = (role: string, action: "grant_all" | "revoke_all") => {
    if (role === "ADMIN") return;

    setMatrix((prev) => {
      const currentRoleObj = { ...(prev[role] || {}) };
      for (const m of menus) {
        if (action === "grant_all") {
          currentRoleObj[m.key] = { can_view: true, can_edit: role === "MIS" ? true : m.key === "purchases" };
        } else {
          currentRoleObj[m.key] = { can_view: false, can_edit: false };
        }
      }
      return {
        ...prev,
        [role]: currentRoleObj,
      };
    });
  };

  // Save changes to database
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    const flattenedPermissions: { role: string; menu_key: string; can_view: number; can_edit: number }[] = [];
    for (const r of roles) {
      for (const m of menus) {
        const item = matrix[r.role]?.[m.key] || { can_view: false, can_edit: false };
        flattenedPermissions.push({
          role: r.role,
          menu_key: m.key,
          can_view: item.can_view ? 1 : 0,
          can_edit: item.can_edit ? 1 : 0,
        });
      }
    }

    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: flattenedPermissions }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setErrorMessage(data.message || "Gagal menyimpan permission.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menghubungi API.");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to system defaults
  const handleReset = async () => {
    if (!window.confirm("Apakah Anda yakin ingin mereset seluruh permission ke pengaturan default bawaan sistem?")) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchPermissions();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      alert("Gagal mereset: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter menus based on search and group
  const filteredMenus = menus.filter((m) => {
    const matchSearch =
      m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.href.toLowerCase().includes(searchQuery.toLowerCase());
    const matchGroup = selectedGroup === "ALL" || m.group === selectedGroup;
    return matchSearch && matchGroup;
  });

  const availableGroups = ["ALL", ...Array.from(new Set(menus.map((m) => m.group)))];
  const displayedRoles = activeRoleTab === "ALL" ? roles : roles.filter((r) => r.role === activeRoleTab);

  return (
    <SidebarLayout>
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-2.5 sm:px-4 py-5 space-y-4">
        {/* Top Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-purple-700 text-white shadow-2xs">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Hak Akses & Role Permission ({roles.length} Role • {menus.length} Modul)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving || isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-2xs transition-colors active:scale-95"
              title="Reset ke pengaturan default bawaan sistem"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Default</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95"
            >
              {isSaving ? (
                <span>Menyimpan...</span>
              ) : saveSuccess ? (
                <>
                  <CheckCheck className="w-4 h-4 text-emerald-300" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Permission</span>
                </>
              )}
            </button>

            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-lg text-[11px] font-semibold text-purple-700">
              <ShieldCheck className="w-3 h-3 text-purple-600" />
              <span>Khusus Superadmin</span>
            </div>
          </div>
        </div>

        {/* Top 4 KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Peran Terdaftar</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{roles.length} <span className="text-xs font-normal text-slate-400">Role</span></p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Admin, MIS, Mgr, Proc, SPV</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Modul Sistem</p>
              <p className="text-2xl font-black text-[#006622] mt-0.5">{menus.length} <span className="text-xs font-normal text-slate-400">Menu</span></p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Kasir, EDC, PC, Jaringan, User</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006622] flex items-center justify-center font-bold">
              <Laptop className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Superadmin Master</p>
              <p className="text-2xl font-black text-indigo-700 mt-0.5">100% <span className="text-xs font-normal text-slate-400">Akses</span></p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Bypass Hak Akses Penuh</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Database</p>
              <p className="text-2xl font-black text-emerald-600 mt-0.5">Tersinkron</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">SQLite 3 WAL Role Matrix</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Server className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Save Success / Error Alerts */}
        {saveSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-bold animate-in fade-in shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Seluruh perubahan konfigurasi matriks permission berhasil disimpan ke database dan langsung berlaku di sistem!</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-800 text-xs font-bold animate-in fade-in shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Filter Section (Role Switcher & Menu Category) */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          {/* Row 1: Segmented Focus Role Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              Fokus Role:
            </span>
            <button
              type="button"
              onClick={() => setActiveRoleTab("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeRoleTab === "ALL"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              Semua Role (Matriks Lengkap)
            </button>
            {roles.map((r) => {
              const theme = ROLE_COLORS[r.role] || ROLE_COLORS.ADMIN;
              const isActive = activeRoleTab === r.role;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setActiveRoleTab(r.role)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? "bg-purple-700 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? "bg-white" : "bg-purple-400"}`}></span>
                  <span>{r.name}</span>
                </button>
              );
            })}
          </div>

          {/* Row 2: Search Input & Category Pills */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama menu, path route (/office, /dvr, /users), atau deskripsi modul..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Kategori:</span>
              {availableGroups.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGroup(g)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedGroup === g
                      ? "bg-purple-100 text-purple-800 border border-purple-300"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {g === "ALL" ? "Semua Kategori" : g}
                </button>
              ))}

              {(searchQuery || selectedGroup !== "ALL" || activeRoleTab !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedGroup("ALL");
                    setActiveRoleTab("ALL");
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Master Permissions Matrix Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-7 h-7 border-3 border-purple-700 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-bold mt-3">Memuat Matriks Permission Sistem...</p>
            </div>
          ) : filteredMenus.length === 0 ? (
            <div className="p-12 text-center">
              <SlidersHorizontal className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Tidak ada menu atau modul ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter kategori menu.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 min-w-[260px] max-w-[300px]">Menu & Modul Aplikasi</th>
                    {displayedRoles.map((r) => {
                      const theme = ROLE_COLORS[r.role] || ROLE_COLORS.ADMIN;
                      return (
                        <th key={r.role} className="py-3 px-3 min-w-[160px] text-center border-l border-slate-200">
                          <div className="space-y-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-black border ${theme.bg} ${theme.text} ${theme.border}`}>
                              {r.role}
                            </span>
                            <p className="text-slate-900 font-extrabold text-xs truncate">{r.name}</p>
                            {r.role !== "ADMIN" && (
                              <div className="flex items-center justify-center gap-1 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleBulkRoleAction(r.role, "grant_all")}
                                  className="text-[9.5px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold transition-colors"
                                  title="Aktifkan seluruh menu untuk role ini"
                                >
                                  Pilih Semua
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBulkRoleAction(r.role, "revoke_all")}
                                  className="text-[9.5px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold transition-colors"
                                  title="Nonaktifkan seluruh menu untuk role ini"
                                >
                                  Reset
                                </button>
                              </div>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMenus.map((menu) => {
                    const Icon = MENU_ICONS[menu.key] || Laptop;

                    return (
                      <tr key={menu.key} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Kolom Info Menu */}
                        <td className="py-3.5 px-4 align-middle max-w-[300px]">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-slate-900 text-xs">{menu.label}</span>
                                <span className="text-[9.5px] font-bold bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 text-slate-600">
                                  {menu.group}
                                </span>
                              </div>
                              <p className="text-[10.5px] text-slate-400 mt-0.5 line-clamp-1">{menu.description}</p>
                              <span className="text-[10px] font-mono text-purple-700 mt-0.5 inline-block font-semibold">
                                {menu.href}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Kolom Permission per Role */}
                        {displayedRoles.map((r) => {
                          const perm = matrix[r.role]?.[menu.key] || { can_view: false, can_edit: false };
                          const isAdminRole = r.role === "ADMIN";

                          return (
                            <td key={r.role} className="py-3 px-3 text-center align-middle border-l border-slate-100 whitespace-nowrap">
                              {isAdminRole ? (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 font-extrabold text-[10.5px] shadow-2xs">
                                  <Lock className="w-3.5 h-3.5 text-purple-600" />
                                  <span>Akses Penuh (Bypass)</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-1.5">
                                  {/* Toggle 1: Can View (Lihat Menu) */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggle(r.role, menu.key, "can_view")}
                                    title={`Ubah izin lihat menu untuk ${r.name}`}
                                    className={`w-full max-w-[130px] flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[10.5px] font-bold transition-all border ${
                                      perm.can_view
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs hover:bg-emerald-100"
                                        : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1">
                                      <Eye className={`w-3.5 h-3.5 ${perm.can_view ? "text-emerald-700" : "text-slate-400"}`} />
                                      <span>Lihat</span>
                                    </div>
                                    <span className={`w-2 h-2 rounded-full ${perm.can_view ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                                  </button>

                                  {/* Toggle 2: Can Edit (Kelola / Edit) */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggle(r.role, menu.key, "can_edit")}
                                    title={`Ubah izin kelola/edit untuk ${r.name}`}
                                    className={`w-full max-w-[130px] flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[10.5px] font-bold transition-all border ${
                                      perm.can_edit
                                        ? "bg-blue-50 text-blue-800 border-blue-300 shadow-2xs hover:bg-blue-100"
                                        : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1">
                                      <Edit3 className={`w-3.5 h-3.5 ${perm.can_edit ? "text-blue-700" : "text-slate-400"}`} />
                                      <span>Kelola</span>
                                    </div>
                                    <span className={`w-2 h-2 rounded-full ${perm.can_edit ? "bg-blue-500" : "bg-slate-300"}`} />
                                  </button>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Role Profile & Coverage Cards */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-700" />
              <span>Profil Wewenang & Cakupan Akses Role</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-semibold">
              Tersinkronisasi ke SQLite 3 Database
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {roles.map((r) => {
              const theme = ROLE_COLORS[r.role] || ROLE_COLORS.ADMIN;
              const viewCount = r.role === "ADMIN" ? menus.length : menus.filter((m) => matrix[r.role]?.[m.key]?.can_view).length;
              const editCount = r.role === "ADMIN" ? menus.length : menus.filter((m) => matrix[r.role]?.[m.key]?.can_edit).length;
              const pct = Math.round((viewCount / (menus.length || 1)) * 100);

              return (
                <div
                  key={r.role}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:shadow-sm transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md border ${theme.bg} ${theme.text} ${theme.border}`}>
                        {r.role}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 font-bold">
                        {viewCount} / {menus.length} Menu
                      </span>
                    </div>

                    <h3 className="font-black text-sm text-slate-900">{r.name}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{r.desc}</p>

                    {/* Progress Bar */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span>Cakupan Akses</span>
                        <span className="text-purple-700 font-black">{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${theme.gradient} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Badges Footer */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
                    <div className="flex items-center gap-1 text-emerald-700 font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>{viewCount} Lihat</span>
                    </div>
                    <div className="flex items-center gap-1 text-blue-700 font-bold">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{editCount} Kelola</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </SidebarLayout>
  );
}

export default function PermissionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-xs">
          Memuat Hak Akses Permission...
        </div>
      }
    >
      <PermissionsContent />
    </Suspense>
  );
}
