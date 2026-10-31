"use client";

import { useEffect, useState, Suspense, Fragment } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import { User, UserRole } from "@/types";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  X,
  Save,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Store,
  RefreshCw,
  UserCheck,
  ShieldCheck,
  SlidersHorizontal,
  Lock
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AccessDenied from "@/components/AccessDenied";

type UserGroupKey = "ALL" | "MIS" | "SPV_PB_T2" | "SPV_PB_T3" | "SPV_SAM_T2" | "SPV_SAM_T3";

interface GroupConfig {
  key: UserGroupKey;
  label: string;
  shortLabel: string;
  desc: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardBg: string;
  dotColor: string;
}

const USER_GROUPS: Record<Exclude<UserGroupKey, "ALL">, GroupConfig> = {
  MIS: {
    key: "MIS",
    label: "MIS (IT, Manager & Procurement)",
    shortLabel: "MIS",
    desc: "Admin, MIS OPS, Manager, Procurement",
    color: "emerald",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    badgeBorder: "border-emerald-200",
    cardBg: "from-emerald-50 to-emerald-100/50",
    dotColor: "bg-emerald-500",
  },
  SPV_PB_T2: {
    key: "SPV_PB_T2",
    label: "SPV PB T2 (Plaza Bali Terminal 2)",
    shortLabel: "SPV PB T2",
    desc: "Supervisor Toko Plaza Bali Bandara Terminal 2",
    color: "teal",
    badgeBg: "bg-teal-50",
    badgeText: "text-teal-800",
    badgeBorder: "border-teal-200",
    cardBg: "from-teal-50 to-teal-100/50",
    dotColor: "bg-teal-500",
  },
  SPV_PB_T3: {
    key: "SPV_PB_T3",
    label: "SPV PB T3 (Plaza Bali Terminal 3)",
    shortLabel: "SPV PB T3",
    desc: "Supervisor Toko Plaza Bali Bandara Terminal 3",
    color: "cyan",
    badgeBg: "bg-cyan-50",
    badgeText: "text-cyan-800",
    badgeBorder: "border-cyan-200",
    cardBg: "from-cyan-50 to-cyan-100/50",
    dotColor: "bg-cyan-500",
  },
  SPV_SAM_T2: {
    key: "SPV_SAM_T2",
    label: "SPV SAM T2 (Toko SAM Terminal 2)",
    shortLabel: "SPV SAM T2",
    desc: "Supervisor Toko SAM Bandara Terminal 2",
    color: "sky",
    badgeBg: "bg-sky-50",
    badgeText: "text-sky-800",
    badgeBorder: "border-sky-200",
    cardBg: "from-sky-50 to-sky-100/50",
    dotColor: "bg-sky-500",
  },
  SPV_SAM_T3: {
    key: "SPV_SAM_T3",
    label: "SPV SAM T3 (Toko SAM Terminal 3)",
    shortLabel: "SPV SAM T3",
    desc: "Supervisor Toko SAM Bandara Terminal 3",
    color: "indigo",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-800",
    badgeBorder: "border-indigo-200",
    cardBg: "from-indigo-50 to-indigo-100/50",
    dotColor: "bg-indigo-500",
  },
};

function getUserGroup(u: User): Exclude<UserGroupKey, "ALL"> {
  if (["ADMIN", "MIS", "MANAGER", "IT_PROCUREMENT"].includes(u.role)) {
    return "MIS";
  }
  if (u.role === "SPV_PLAZABALI_T2" || (u.role.includes("PLAZABALI") && u.shop_location?.includes("Terminal 2"))) {
    return "SPV_PB_T2";
  }
  if (u.role === "SPV_PLAZABALI_T3" || (u.role.includes("PLAZABALI") && (u.shop_location?.includes("Terminal 3") || !u.shop_location?.includes("Terminal 2")))) {
    return "SPV_PB_T3";
  }
  if (u.role === "SPV_SAM_T2" || (u.role.includes("SAM") && u.shop_location?.includes("Terminal 2"))) {
    return "SPV_SAM_T2";
  }
  return "SPV_SAM_T3";
}

const ROLE_OPTIONS: { role: UserRole; label: string; desc: string; badge: string; groupKey: Exclude<UserGroupKey, "ALL">; defaultLocation: string }[] = [
  {
    role: "ADMIN",
    label: "Administrator Sistem",
    desc: "Akses Superuser Penuh",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    groupKey: "MIS",
    defaultLocation: "Semua Toko",
  },
  {
    role: "MIS",
    label: "MIS OPS (IT Support)",
    desc: "Teknis Kasir & Jaringan",
    badge: "bg-emerald-100 text-[#006622] border-emerald-200",
    groupKey: "MIS",
    defaultLocation: "Semua Toko",
  },
  {
    role: "MANAGER",
    label: "MIS MANAGER",
    desc: "Supervisi & Approval",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    groupKey: "MIS",
    defaultLocation: "Semua Toko",
  },
  {
    role: "IT_PROCUREMENT",
    label: "MIS PROCUREMENT",
    desc: "Pengadaan IT & CAPEX",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    groupKey: "MIS",
    defaultLocation: "Semua Toko",
  },
  {
    role: "SPV_PLAZABALI_T2",
    label: "SPV Plaza Bali (Terminal 2)",
    desc: "Supervisor Toko Plaza Bali T2",
    badge: "bg-teal-100 text-teal-800 border-teal-200",
    groupKey: "SPV_PB_T2",
    defaultLocation: "Plaza Bali (Terminal 2)",
  },
  {
    role: "SPV_PLAZABALI_T3",
    label: "SPV Plaza Bali (Terminal 3)",
    desc: "Supervisor Toko Plaza Bali T3",
    badge: "bg-cyan-100 text-cyan-800 border-cyan-200",
    groupKey: "SPV_PB_T3",
    defaultLocation: "Plaza Bali (Terminal 3)",
  },
  {
    role: "SPV_SAM_T2",
    label: "SPV SAM (Terminal 2)",
    desc: "Supervisor Toko SAM T2",
    badge: "bg-sky-100 text-sky-800 border-sky-200",
    groupKey: "SPV_SAM_T2",
    defaultLocation: "SAM (Terminal 2)",
  },
  {
    role: "SPV_SAM_T3",
    label: "SPV SAM (Terminal 3)",
    desc: "Supervisor Toko SAM T3",
    badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
    groupKey: "SPV_SAM_T3",
    defaultLocation: "SAM (Terminal 3)",
  },
];

function UsersContent() {
  const { user: currentUser, isAdmin } = useAuth();

  if (!isAdmin) {
    return <AccessDenied moduleName="Manajemen User & Akun Sistem" />;
  }

  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedGroup, setSelectedGroup] = useState<UserGroupKey>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  // UI state
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    username: "",
    name: "",
    role: "SPV_PLAZABALI_T3",
    shop_location: "Plaza Bali (Terminal 3)",
    password: "123",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success) {
        setUsersList(json.data);
      }
    } catch (e) {
      console.error("Failed to load users", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const togglePassword = (id: number) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Open Add modal
  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      username: "",
      name: "",
      role: "SPV_PLAZABALI_T3",
      shop_location: "Plaza Bali (Terminal 3)",
      password: "123",
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Edit modal
  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setFormData({
      ...u,
      password: "", // Leave blank if not changing
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Save (Create / Update)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success) {
        setIsFormOpen(false);
        fetchUsers();
      } else {
        setFormError(json.message || "Gagal menyimpan data pengguna.");
      }
    } catch (err) {
      setFormError("Gagal menghubungi server database.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (u: User) => {
    if (u.username === "admin") {
      alert("Akun Superadmin 'admin' tidak dapat dihapus!");
      return;
    }
    if (currentUser?.username === u.username) {
      alert("Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan!");
      return;
    }
    if (!confirm(`Yakin ingin menghapus pengguna "${u.name}" (${u.username})?`)) return;

    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchUsers();
      } else {
        alert(json.message || "Gagal menghapus pengguna.");
      }
    } catch (e) {
      alert("Gagal menghapus.");
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["NO", "NIK_USERNAME", "NAMA_LENGKAP", "ROLE_AKSES", "LOKASI_TOKO", "PASSWORD"];
    const rows = usersList.map((u, idx) => [
      idx + 1,
      `"${u.username}"`,
      `"${u.name}"`,
      `"${u.role}"`,
      `"${u.shop_location}"`,
      `"${u.password || "123"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Daftar_Pengguna_MIS_Shop_Ops_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics & Groups
  const misUsers = usersList.filter((u) => getUserGroup(u) === "MIS");
  const spvPbT2Users = usersList.filter((u) => getUserGroup(u) === "SPV_PB_T2");
  const spvPbT3Users = usersList.filter((u) => getUserGroup(u) === "SPV_PB_T3");
  const spvSamT2Users = usersList.filter((u) => getUserGroup(u) === "SPV_SAM_T2");
  const spvSamT3Users = usersList.filter((u) => getUserGroup(u) === "SPV_SAM_T3");

  const filteredUsers = usersList.filter((u) => {
    const grp = getUserGroup(u);
    if (selectedGroup !== "ALL" && grp !== selectedGroup) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = u.name?.toLowerCase().includes(term);
      const matchUser = u.username?.toLowerCase().includes(term);
      const matchShop = u.shop_location?.toLowerCase().includes(term);
      const matchRole = u.role?.toLowerCase().includes(term);
      if (!matchName && !matchUser && !matchShop && !matchRole) return false;
    }

    if (selectedLocation) {
      if (!u.shop_location?.toLowerCase().includes(selectedLocation.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  const getRoleBadgeStyle = (role: UserRole) => {
    const opt = ROLE_OPTIONS.find((r) => r.role === role);
    return opt ? opt.badge : "bg-slate-100 text-slate-700 border-slate-200";
  };

  const getRoleLabel = (role: UserRole) => {
    const opt = ROLE_OPTIONS.find((r) => r.role === role);
    return opt ? opt.label : role;
  };

  // Name initials
  const getInitials = (name: string) => {
    if (!name) return "US";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const groupsOrder: (Exclude<UserGroupKey, "ALL">)[] = [
    "MIS",
    "SPV_PB_T2",
    "SPV_PB_T3",
    "SPV_SAM_T2",
    "SPV_SAM_T3",
  ];

  return (
    <SidebarLayout>
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-2.5 sm:px-4 py-5 space-y-4">
        {/* Header Title & Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-purple-700 text-white shadow-2xs">
              <Users className="w-4 h-4" />
              <span>Manajemen User & Akun Sistem ({usersList.length} Pengguna)</span>
            </div>
            <span className="hidden sm:inline-block px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200">
              5 Kelompok Pengguna
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-2xs active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah User Baru</span>
            </button>
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-lg text-[11px] font-semibold text-purple-700">
              <ShieldCheck className="w-3 h-3 text-purple-600" />
              <span>Khusus Superadmin</span>
            </div>
          </div>
        </div>

        {/* 5 KPI Metric Cards: MIS, SPV PB T2, SPV PB T3, SPV SAM T2, SPV SAM T3 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 1. MIS */}
          <div
            onClick={() => setSelectedGroup(selectedGroup === "MIS" ? "ALL" : "MIS")}
            className={`p-3.5 bg-white rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
              selectedGroup === "MIS"
                ? "border-emerald-600 ring-2 ring-emerald-500/30 shadow-md bg-gradient-to-br from-emerald-50/50 to-white"
                : "border-slate-200/90 shadow-2xs hover:border-emerald-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">MIS</p>
                </div>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  {misUsers.length} <span className="text-xs font-semibold text-slate-400">User</span>
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Admin, Support, Mgr, Proc</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Shield className="w-4.5 h-4.5" />
              </div>
            </div>
          </div>

          {/* 2. SPV PB T2 */}
          <div
            onClick={() => setSelectedGroup(selectedGroup === "SPV_PB_T2" ? "ALL" : "SPV_PB_T2")}
            className={`p-3.5 bg-white rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
              selectedGroup === "SPV_PB_T2"
                ? "border-teal-600 ring-2 ring-teal-500/30 shadow-md bg-gradient-to-br from-teal-50/50 to-white"
                : "border-slate-200/90 shadow-2xs hover:border-teal-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">SPV PB T2</p>
                </div>
                <p className="text-2xl font-black text-teal-700 mt-1">
                  {spvPbT2Users.length} <span className="text-xs font-semibold text-slate-400">User</span>
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Plaza Bali Terminal 2</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Store className="w-4.5 h-4.5" />
              </div>
            </div>
          </div>

          {/* 3. SPV PB T3 */}
          <div
            onClick={() => setSelectedGroup(selectedGroup === "SPV_PB_T3" ? "ALL" : "SPV_PB_T3")}
            className={`p-3.5 bg-white rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
              selectedGroup === "SPV_PB_T3"
                ? "border-cyan-600 ring-2 ring-cyan-500/30 shadow-md bg-gradient-to-br from-cyan-50/50 to-white"
                : "border-slate-200/90 shadow-2xs hover:border-cyan-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">SPV PB T3</p>
                </div>
                <p className="text-2xl font-black text-cyan-700 mt-1">
                  {spvPbT3Users.length} <span className="text-xs font-semibold text-slate-400">User</span>
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Plaza Bali Terminal 3</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Store className="w-4.5 h-4.5" />
              </div>
            </div>
          </div>

          {/* 4. SPV SAM T2 */}
          <div
            onClick={() => setSelectedGroup(selectedGroup === "SPV_SAM_T2" ? "ALL" : "SPV_SAM_T2")}
            className={`p-3.5 bg-white rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
              selectedGroup === "SPV_SAM_T2"
                ? "border-sky-600 ring-2 ring-sky-500/30 shadow-md bg-gradient-to-br from-sky-50/50 to-white"
                : "border-slate-200/90 shadow-2xs hover:border-sky-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">SPV SAM T2</p>
                </div>
                <p className="text-2xl font-black text-sky-700 mt-1">
                  {spvSamT2Users.length} <span className="text-xs font-semibold text-slate-400">User</span>
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Toko SAM Terminal 2</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="w-4.5 h-4.5" />
              </div>
            </div>
          </div>

          {/* 5. SPV SAM T3 */}
          <div
            onClick={() => setSelectedGroup(selectedGroup === "SPV_SAM_T3" ? "ALL" : "SPV_SAM_T3")}
            className={`p-3.5 bg-white rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
              selectedGroup === "SPV_SAM_T3"
                ? "border-indigo-600 ring-2 ring-indigo-500/30 shadow-md bg-gradient-to-br from-indigo-50/50 to-white"
                : "border-slate-200/90 shadow-2xs hover:border-indigo-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">SPV SAM T3</p>
                </div>
                <p className="text-2xl font-black text-indigo-700 mt-1">
                  {spvSamT3Users.length} <span className="text-xs font-semibold text-slate-400">User</span>
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Toko SAM Terminal 3</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="w-4.5 h-4.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          {/* Row 1: 5 Groups Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
              Kelompok User:
            </span>
            <button
              type="button"
              onClick={() => setSelectedGroup("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedGroup === "ALL"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              Semua User ({usersList.length})
            </button>
            {groupsOrder.map((grpKey) => {
              const grp = USER_GROUPS[grpKey];
              const count = usersList.filter((u) => getUserGroup(u) === grpKey).length;
              const isSelected = selectedGroup === grpKey;
              return (
                <button
                  key={grpKey}
                  type="button"
                  onClick={() => setSelectedGroup(isSelected ? "ALL" : grpKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-purple-700 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : grp.dotColor}`}></span>
                  <span>{grp.shortLabel} ({count})</span>
                </button>
              );
            })}
          </div>

          {/* Row 2: Search Input & Dropdowns */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari NIK / Username (111..., 811..., admin), nama karyawan, lokasi toko..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="">Semua Wilayah Penugasan</option>
                <option value="Terminal 2">Bandara Terminal 2 (T2)</option>
                <option value="Terminal 3">Bandara Terminal 3 (T3)</option>
                <option value="Plaza Bali">Plaza Bali</option>
                <option value="SAM">Toko SAM</option>
                <option value="Semua Toko">Semua Toko / Head Office</option>
              </select>

              {(searchTerm || selectedGroup !== "ALL" || selectedLocation) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedGroup("ALL");
                    setSelectedLocation("");
                  }}
                  className="px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Master Users Table Grouped */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-7 h-7 border-3 border-purple-700 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-bold mt-3">Memuat Data Pengguna Sistem...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Tidak ada pengguna ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian NIK, nama, atau filter kelompok.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">No</th>
                    <th className="py-3 px-3">Pengguna & NIK</th>
                    <th className="py-3 px-3">Wewenang / Role</th>
                    <th className="py-3 px-3">Lokasi Penugasan</th>
                    <th className="py-3 px-3">Password / Login</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupsOrder
                    .filter((gk) => selectedGroup === "ALL" || selectedGroup === gk)
                    .map((gk) => {
                      const grpConfig = USER_GROUPS[gk];
                      const grpUsers = filteredUsers.filter((u) => getUserGroup(u) === gk);

                      if (grpUsers.length === 0 && selectedGroup === "ALL") {
                        return null;
                      }

                      return (
                        <Fragment key={gk}>
                          {/* Group Section Header */}
                          <tr className="bg-slate-50/90 border-y border-slate-200/90">
                            <td colSpan={7} className="py-2.5 px-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full ${grpConfig.dotColor}`}></span>
                                  <span className="text-slate-800 text-xs font-black tracking-wide uppercase">
                                    {grpConfig.label}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${grpConfig.badgeBg} ${grpConfig.badgeText} border ${grpConfig.badgeBorder}`}>
                                    {grpUsers.length} User
                                  </span>
                                </div>
                                <span className="text-[10.5px] font-medium text-slate-500 hidden sm:inline">
                                  {grpConfig.desc}
                                </span>
                              </div>
                            </td>
                          </tr>

                          {/* Group User Rows */}
                          {grpUsers.map((u, index) => {
                            const isPassVisible = visiblePasswords[u.id!];
                            const isCopiedPass = copiedKey === `pass-${u.id}`;
                            const isCopiedUser = copiedKey === `user-${u.id}`;
                            const isSuperadmin = u.username === "admin";

                            return (
                              <tr key={u.id} className="hover:bg-slate-50/80 transition-colors group">
                                {/* No */}
                                <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-400 align-middle">
                                  {index + 1}
                                </td>

                                {/* Pengguna & NIK */}
                                <td className="py-3.5 px-3 align-middle">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                                      {getInitials(u.name)}
                                    </div>
                                    <div>
                                      <div className="font-black text-slate-900 text-xs flex items-center gap-1.5 leading-tight">
                                        <span>{u.name}</span>
                                        {isSuperadmin && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                                            SUPERADMIN
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <span className="font-mono text-[10.5px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                          {u.username}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => copyToClipboard(u.username, `user-${u.id}`)}
                                          title="Salin NIK / Username"
                                          className="p-0.5 text-slate-400 hover:text-slate-700"
                                        >
                                          {isCopiedUser ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Role & Wewenang */}
                                <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold border ${getRoleBadgeStyle(u.role)}`}>
                                    <Shield className="w-3 h-3 shrink-0" />
                                    <span>{getRoleLabel(u.role)}</span>
                                  </span>
                                </td>

                                {/* Lokasi Toko */}
                                <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-xs">
                                    <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{u.shop_location || "Semua Toko"}</span>
                                  </div>
                                </td>

                                {/* Password / Login */}
                                <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-900 border border-slate-200 min-w-[75px]">
                                      {isPassVisible ? (u.password || "123") : "••••••••"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => togglePassword(u.id!)}
                                      title={isPassVisible ? "Sembunyikan password" : "Lihat password"}
                                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                                    >
                                      {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(u.password || "123", `pass-${u.id}`)}
                                      title="Salin password"
                                      className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    >
                                      {isCopiedPass ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="py-3.5 px-3 text-center align-middle whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>AKTIF</span>
                                  </span>
                                </td>

                                {/* Aksi */}
                                <td className="py-3.5 px-3 text-right align-middle whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(u)}
                                      title="Edit Data Pengguna"
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>

                                    {!isSuperadmin && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteUser(u)}
                                        title="Hapus Pengguna"
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* MODAL TAMBAH / EDIT PENGGUNA */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[95vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingUser ? `Edit Data User: ${editingUser.name}` : "Tambah Pengguna Baru"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingUser ? `Username/NIK: ${editingUser.username}` : "Pemberian Hak Akses & Kredensial Login"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username / Nomor Induk Karyawan (NIK): <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingUser}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Contoh: 1112040001 (SPV) / 8117110002 (IT Support) / johndoe"
                  className={`w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold outline-none transition-all ${
                    editingUser
                      ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                      : "bg-slate-50 border-slate-300 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  }`}
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  *Username digunakan sebagai ID unik saat login ke aplikasi.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Karyawan: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Yulia Pastria Lubis / Ahmad Dimyati"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Wewenang / Role Akses: <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    const opt = ROLE_OPTIONS.find((r) => r.role === newRole);
                    setFormData({
                      ...formData,
                      role: newRole,
                      shop_location: opt ? opt.defaultLocation : formData.shop_location,
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
                >
                  <optgroup label="1. KELOMPOK MIS (IT OPS, MANAGER, PROCUREMENT, ADMIN)">
                    {ROLE_OPTIONS.filter((r) => r.groupKey === "MIS").map((r) => (
                      <option key={r.role} value={r.role}>
                        {r.label} — ({r.desc})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="2. KELOMPOK SPV PB T2 (PLAZA BALI TERMINAL 2)">
                    {ROLE_OPTIONS.filter((r) => r.groupKey === "SPV_PB_T2").map((r) => (
                      <option key={r.role} value={r.role}>
                        {r.label} — ({r.desc})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="3. KELOMPOK SPV PB T3 (PLAZA BALI TERMINAL 3)">
                    {ROLE_OPTIONS.filter((r) => r.groupKey === "SPV_PB_T3").map((r) => (
                      <option key={r.role} value={r.role}>
                        {r.label} — ({r.desc})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="4. KELOMPOK SPV SAM T2 (TOKO SAM TERMINAL 2)">
                    {ROLE_OPTIONS.filter((r) => r.groupKey === "SPV_SAM_T2").map((r) => (
                      <option key={r.role} value={r.role}>
                        {r.label} — ({r.desc})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="5. KELOMPOK SPV SAM T3 (TOKO SAM TERMINAL 3)">
                    {ROLE_OPTIONS.filter((r) => r.groupKey === "SPV_SAM_T3").map((r) => (
                      <option key={r.role} value={r.role}>
                        {r.label} — ({r.desc})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lokasi Toko / Wilayah Penugasan:
                </label>
                <input
                  type="text"
                  value={formData.shop_location}
                  onChange={(e) => setFormData({ ...formData, shop_location: e.target.value })}
                  placeholder="Contoh: Plaza Bali (Terminal 3) / SAM (Terminal 2) / Semua Toko"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Login: {editingUser ? "(Kosongkan jika tidak ingin mengubah)" : <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "Masukkan password baru..." : "Default: 123 atau NIK karyawan"}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  *Untuk kemudahan testing dev, password default adalah '123' atau NIK akun tersebut.
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "Menyimpan..." : editingUser ? "Perbarui User" : "Simpan Pengguna"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Memuat Data User...</div>}>
      <UsersContent />
    </Suspense>
  );
}

