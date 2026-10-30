"use client";

import { useEffect, useState, useMemo } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import { ServerRackPort, ServerRackUnit } from "@/types";
import {
  Server,
  Network,
  Activity,
  Layers,
  Search,
  Plus,
  Download,
  Printer,
  Edit2,
  Trash2,
  Copy,
  Check,
  Shield,
  PhoneCall,
  Laptop,
  Wifi,
  Radio,
  Globe,
  RadioTower,
  Cpu,
  RefreshCw,
  X,
  ExternalLink,
  ChevronRight,
  Box,
  Cable,
  ArrowRightLeft,
  Flame,
  CheckCircle2,
  Zap
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import { getClientCache, setClientCache } from "@/lib/cache";

export default function ServerRackPage() {
  const { isAdmin, isMIS, isManager } = useAuth();

  if (!isAdmin && !isMIS && !isManager) {
    return <AccessDenied moduleName="Rak Server 32U & 6U Wallmount" />;
  }
  const [selectedRack, setSelectedRack] = useState<'RACK_32U_MAIN' | 'RACK_6U_WALLMOUNT'>('RACK_32U_MAIN');
  const [ports, setPorts] = useState<ServerRackPort[]>([]);
  const [rackUnits, setRackUnits] = useState<ServerRackUnit[]>([]);
  const [stats, setStats] = useState({
    totalPorts: 0,
    connectedPorts: 0,
    voipPorts: 0,
    pcPorts: 0,
    uplinkPorts: 0,
    rack32Count: 0,
    rack6Count: 0
  });
  const [loading, setLoading] = useState(true);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<
    'SWITCH_1_VOIP' | 'SWITCH_2_PC' | 'SWITCH_3_CORE' | 'PATCH_PANEL_3' |
    'WALLMOUNT_SW1_VOIP' | 'WALLMOUNT_SW1_PC' | 'ALL'
  >('SWITCH_1_VOIP');
  const [search, setSearch] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPort, setEditingPort] = useState<ServerRackPort | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    rack_type: "RACK_32U_MAIN" as any,
    device_group: "SWITCH_1_VOIP" as any,
    port_no: 1,
    port_label: "PORT 1 -->",
    patch_panel_label: "",
    device_type: "VOIP" as any,
    user_name: "",
    ext: "-",
    ip_address: "",
    destination: "",
    cable_color: "Blue",
    status: "CONNECTED" as any,
    notes: ""
  });

  // Switch rack types and set sensible default tab
  const handleSelectRack = (rack: 'RACK_32U_MAIN' | 'RACK_6U_WALLMOUNT') => {
    setSelectedRack(rack);
    if (rack === 'RACK_32U_MAIN') {
      setActiveTab('SWITCH_1_VOIP');
    } else {
      setActiveTab('WALLMOUNT_SW1_VOIP');
    }
  };

  const fetchData = async () => {
    const cacheKey = `rack_${selectedRack}_${search}_${activeTab}`;
    const cached = getClientCache<{ ports: any[]; rackUnits: any[]; stats: any }>(cacheKey);
    if (cached) {
      setPorts(cached.ports);
      setRackUnits(cached.rackUnits);
      if (cached.stats) setStats(cached.stats);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      params.append("rack", selectedRack);
      if (search) params.append("search", search);
      if (activeTab !== "ALL") params.append("group", activeTab);

      const res = await fetch(`/api/server-rack?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setPorts(json.ports);
        setRackUnits(json.rackUnits);
        if (json.stats) setStats(json.stats);
        setClientCache(cacheKey, { ports: json.ports, rackUnits: json.rackUnits, stats: json.stats });
      }
    } catch (err) {
      console.error("Failed to load server rack data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedRack, activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleOpenAdd = () => {
    setEditingPort(null);
    const defaultGroup = selectedRack === 'RACK_6U_WALLMOUNT'
      ? (activeTab === 'WALLMOUNT_SW1_PC' ? 'WALLMOUNT_SW1_PC' : 'WALLMOUNT_SW1_VOIP')
      : (activeTab !== 'ALL' ? activeTab : 'SWITCH_1_VOIP');

    const isVoip = defaultGroup.includes("VOIP");
    setFormData({
      rack_type: selectedRack,
      device_group: defaultGroup,
      port_no: ports.length + 1,
      port_label: `PORT ${ports.length + 1} -->`,
      patch_panel_label: "",
      device_type: isVoip ? "VOIP" : (defaultGroup.includes("PC") ? "PC" : "UPLINK"),
      user_name: "",
      ext: "-",
      ip_address: "",
      destination: "",
      cable_color: isVoip ? "Blue" : "Green",
      status: "CONNECTED",
      notes: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (port: ServerRackPort) => {
    setEditingPort(port);
    setFormData({
      rack_type: port.rack_type || selectedRack,
      device_group: port.device_group,
      port_no: port.port_no,
      port_label: port.port_label,
      patch_panel_label: port.patch_panel_label || "",
      device_type: port.device_type,
      user_name: port.user_name || "",
      ext: port.ext || "-",
      ip_address: port.ip_address || "",
      destination: port.destination || "",
      cable_color: port.cable_color || "Blue",
      status: port.status,
      notes: port.notes || ""
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPort && editingPort.id) {
        const res = await fetch(`/api/server-rack/${editingPort.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        const json = await res.json();
        if (json.success) {
          setIsModalOpen(false);
          fetchData();
        } else {
          alert(json.message || "Gagal memperbarui port");
        }
      } else {
        const res = await fetch("/api/server-rack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        const json = await res.json();
        if (json.success) {
          setIsModalOpen(false);
          fetchData();
        } else {
          alert(json.message || "Gagal menambahkan port");
        }
      }
    } catch (err) {
      console.error("Error saving port", err);
      alert("Terjadi kesalahan saat menyimpan data");
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!confirm("Apakah Anda yakin ingin menghapus port mapping ini?")) return;
    try {
      const res = await fetch(`/api/server-rack/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchData();
      } else {
        alert(json.message || "Gagal menghapus port");
      }
    } catch (err) {
      console.error("Error deleting port", err);
    }
  };

  const handleExportCSV = () => {
    const headers = ["No Port", "Switch Port", "Patch Panel", "Tipe", "User / PIC", "Ext VoIP", "IP Address", "Destination", "Warna Kabel", "Status", "Keterangan"];
    const rows = ports.map(p => [
      p.port_no,
      `"${p.port_label}"`,
      `"${p.patch_panel_label || ""}"`,
      `"${p.device_type}"`,
      `"${(p.user_name || "").replace(/"/g, '""')}"`,
      `"${p.ext || ""}"`,
      `"${p.ip_address || ""}"`,
      `"${(p.destination || "").replace(/"/g, '""')}"`,
      `"${p.cable_color || ""}"`,
      `"${p.status}"`,
      `"${(p.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const rackLabel = selectedRack === 'RACK_32U_MAIN' ? 'Rak32U_Main' : 'Rak6U_Wallmount';
    link.setAttribute(
      "download",
      `Cabling_${rackLabel}_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDeviceTypeBadge = (type: string) => {
    switch (type) {
      case "VOIP":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "PC":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "AP_POE":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "UPLINK":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "ROUTER":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "PABX":
      case "GATEWAY":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "BACKBONE":
        return "bg-slate-100 text-slate-800 border-slate-300";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const getPortLedColor = (type: string, status: string) => {
    if (status === "STANDBY" || status === "DISCONNECTED") return "bg-slate-400";
    switch (type) {
      case "VOIP": return "bg-blue-500 shadow-blue-500/50";
      case "PC": return "bg-emerald-500 shadow-emerald-500/50";
      case "UPLINK":
      case "BACKBONE": return "bg-orange-500 shadow-orange-500/50 animate-pulse";
      case "AP_POE": return "bg-amber-500 shadow-amber-500/50";
      case "ROUTER": return "bg-indigo-500 shadow-indigo-500/50";
      default: return "bg-emerald-500 shadow-emerald-500/50";
    }
  };

  const activeSwitchTitle = useMemo(() => {
    switch (activeTab) {
      case 'SWITCH_1_VOIP': return "SWITCH 1 (VOIP 24-PORT • RUANG SERVER)";
      case 'SWITCH_2_PC': return "SWITCH 2 (PC DATA 24-PORT • RUANG SERVER)";
      case 'SWITCH_3_CORE': return "SWITCH 3 (CORE & BACKBONE 24-PORT • RUANG SERVER)";
      case 'PATCH_PANEL_3': return "PATCH PANEL 3 (POE & ACCESS POINT RUIJIE)";
      case 'WALLMOUNT_SW1_VOIP': return "SWITCH 1 VOIP (24-PORT • WALLMOUNT 6U FINANCE/ACC)";
      case 'WALLMOUNT_SW1_PC': return "SWITCH 1 PC DATA (24-PORT • WALLMOUNT 6U FINANCE/ACC)";
      default: return selectedRack === 'RACK_32U_MAIN' ? "SEMUA PORT RAK 32U" : "SEMUA PORT RAK WALLMOUNT 6U";
    }
  }, [activeTab, selectedRack]);

  return (
    <SidebarLayout>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner Header (Clean Minimalist Enterprise) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 text-slate-800 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#006622]">
              <Server className="w-3.5 h-3.5 text-[#006622]" />
              Network Infrastructure & Server Rack Cabling • Head Office
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {selectedRack === 'RACK_32U_MAIN' ? "Rak Server Utama 32 U (Ruang Server)" : "Rak Server Wallmount 6 U (Finance / ACC / GS)"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              {selectedRack === 'RACK_32U_MAIN'
                ? "Susunan fisik rak 32U, port switch VoIP, switch PC data, core backbone, patch panel 3, dual-WAN failover (Hypernet Radio & Starlink), router Ruijie, MikroTik 140/196, Yeastar IP-PABX, dan Dinstar GSM."
                : "Susunan fisik rak wallmount 6U area Finance/ACC/GS, distribusi 24 port Switch VoIP & 24 port Switch PC Data, terhubung langsung via 2 kabel Backbone ke Core Switch 3 Port 4 & 5 di Rak Server Utama 32U."
              }
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition border border-slate-200 shadow-2xs"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Cetak Skema Rak
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition border border-slate-200 shadow-2xs"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Export CSV
            </button>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#006622] hover:bg-[#00551c] text-white text-xs font-semibold transition shadow-2xs active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Tambah Port
            </button>
          </div>
        </div>

        {/* Rack Switcher Selection Bar (32U vs 6U) */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Pilih Rak Server:</span>
            
            <button
              onClick={() => handleSelectRack('RACK_32U_MAIN')}
              className={`flex-1 sm:flex-initial inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                selectedRack === 'RACK_32U_MAIN'
                  ? 'bg-[#006622] text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>Rak Utama 32 U (Ruang Server)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
                {stats.rack32Count || 87} Port
              </span>
            </button>

            <button
              onClick={() => handleSelectRack('RACK_6U_WALLMOUNT')}
              className={`flex-1 sm:flex-initial inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                selectedRack === 'RACK_6U_WALLMOUNT'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <Box className="w-4 h-4" />
              <span>Rak Wallmount 6 U (Finance / ACC)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
                {stats.rack6Count || 48} Port
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 px-3 py-1 bg-slate-50 rounded-xl border border-slate-200">
            <Cable className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-semibold text-slate-700">Inter-Rack Backbone Link:</span>
            <span className="text-[11px] text-slate-600">Cat6 Trunk Port 24 ⇄ Core SW3 Port 4 & 5</span>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Port Aktif {selectedRack === 'RACK_32U_MAIN' ? '32U' : '6U'}</span>
              <Network className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-800">
              {stats.connectedPorts} <span className="text-xs font-normal text-slate-400">/ {stats.totalPorts}</span>
            </div>
            <div className="text-[11px] text-indigo-600 font-medium mt-1 truncate">
              {selectedRack === 'RACK_32U_MAIN' ? 'Switch 1, 2, 3 & PP3' : 'Switch 1 VOIP & Switch 1 PC'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Port IP Phone VoIP</span>
              <PhoneCall className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.voipPorts} Port</div>
            <div className="text-[11px] text-blue-600 font-medium mt-1 truncate">
              {selectedRack === 'RACK_32U_MAIN' ? 'MIS, MCD, BOD, SEC, R.Meet' : 'GS, FIN, ACC, HRD, Pantry'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Port PC Staff Data</span>
              <Laptop className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.pcPorts} Port</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1 truncate">
              {selectedRack === 'RACK_32U_MAIN' ? 'Subnet 172.16.70 / 60 / 20 / 50' : 'Subnet 172.16.41 / 31 / 11 / 51'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>{selectedRack === 'RACK_32U_MAIN' ? 'Dual-WAN Gateway' : 'Backbone Uplink'}</span>
              {selectedRack === 'RACK_32U_MAIN' ? <Globe className="w-4 h-4 text-purple-600" /> : <ArrowRightLeft className="w-4 h-4 text-orange-600" />}
            </div>
            <div className="text-lg font-black text-slate-800 flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {selectedRack === 'RACK_32U_MAIN' ? 'Hypernet + Starlink' : '2x Trunk Cat6'}
            </div>
            <div className="text-[11px] text-purple-600 font-medium mt-1 truncate">
              {selectedRack === 'RACK_32U_MAIN' ? 'Radio Wireless & Satellite' : 'Connected to 32U SW3'}
            </div>
          </div>
        </div>

        {/* Dual Column Layout: Left (Interactive Physical Rack Visual), Right (Active Component Details) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Physical Server Rack Visual */}
          <div className="lg:col-span-4 bg-slate-900 border-4 border-slate-800 rounded-3xl p-4 text-white shadow-2xl space-y-3">
            <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black tracking-widest uppercase text-indigo-400">
                  {selectedRack === 'RACK_32U_MAIN' ? "TAMPAK FISIK RAK 32U" : "TAMPAK FISIK RAK WALLMOUNT 6U"}
                </h3>
                <p className="text-[10px] text-slate-400">
                  {selectedRack === 'RACK_32U_MAIN' ? "Server Room Head Office" : "Area Finance / ACC / GS"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ONLINE
              </div>
            </div>

            {/* Rack Units Elevation */}
            <div className="space-y-1 bg-black/60 p-2.5 rounded-2xl border border-slate-800/80 font-mono text-[10px] max-h-[600px] overflow-y-auto">
              {rackUnits.map(unit => {
                const isSelected =
                  (selectedRack === 'RACK_32U_MAIN' && (
                    (unit.name.includes("SWITCH 1") && activeTab === "SWITCH_1_VOIP") ||
                    (unit.name.includes("SWITCH 2") && activeTab === "SWITCH_2_PC") ||
                    (unit.name.includes("SWITCH 3") && activeTab === "SWITCH_3_CORE") ||
                    (unit.name.includes("PATCH PANEL 3") && activeTab === "PATCH_PANEL_3")
                  )) ||
                  (selectedRack === 'RACK_6U_WALLMOUNT' && (
                    (unit.name.includes("VOIP") && activeTab === "WALLMOUNT_SW1_VOIP") ||
                    (unit.name.includes("PC") && activeTab === "WALLMOUNT_SW1_PC")
                  ));

                let bgClass = "bg-slate-800/80 text-slate-300 border-slate-700/60";
                if (unit.device_type === "SWITCH") bgClass = "bg-indigo-950/80 text-indigo-200 border-indigo-700/60";
                if (unit.device_type === "ROUTER" || unit.device_type === "GATEWAY") bgClass = "bg-blue-950/80 text-blue-200 border-blue-700/60";
                if (unit.device_type === "PABX") bgClass = "bg-purple-950/80 text-purple-200 border-purple-700/60";
                if (unit.device_type === "UPS") bgClass = "bg-amber-950/80 text-amber-200 border-amber-700/60";
                if (unit.device_type === "MANAGEMENT") bgClass = "bg-slate-900/60 text-slate-500 border-slate-800";

                return (
                  <button
                    key={unit.id || unit.u_position}
                    onClick={() => {
                      if (selectedRack === 'RACK_32U_MAIN') {
                        if (unit.name.includes("SWITCH 1")) setActiveTab("SWITCH_1_VOIP");
                        else if (unit.name.includes("SWITCH 2")) setActiveTab("SWITCH_2_PC");
                        else if (unit.name.includes("SWITCH 3")) setActiveTab("SWITCH_3_CORE");
                        else if (unit.name.includes("PATCH PANEL 3")) setActiveTab("PATCH_PANEL_3");
                      } else {
                        if (unit.name.includes("VOIP")) setActiveTab("WALLMOUNT_SW1_VOIP");
                        else if (unit.name.includes("PC")) setActiveTab("WALLMOUNT_SW1_PC");
                      }
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all text-left ${bgClass} ${
                      isSelected ? "ring-2 ring-indigo-400 border-indigo-400 scale-[1.02] shadow-lg" : "hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-slate-400 w-6 text-right shrink-0">{unit.u_position}U</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      <div className="truncate">
                        <div className="font-bold truncate text-[11px]">{unit.name}</div>
                        <div className="text-[9px] text-slate-400 truncate">{unit.description}</div>
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-slate-400 font-mono shrink-0 ml-1">
                      {unit.vendor || unit.device_type}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Context Card Below Elevation */}
            {selectedRack === 'RACK_32U_MAIN' ? (
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 space-y-2 text-xs">
                <h4 className="font-bold text-white text-[11px] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    Skema Dual-WAN Head Office
                  </span>
                  <button
                    onClick={() => handleSelectRack('RACK_6U_WALLMOUNT')}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-semibold"
                  >
                    Buka Rak Wallmount 6U →
                  </button>
                </h4>
                <div className="space-y-1.5 text-[10px] text-slate-300">
                  <div className="flex justify-between items-center bg-black/30 p-1.5 rounded-lg border border-white/5">
                    <span className="text-slate-400">WAN 1 (Primary):</span>
                    <span className="font-bold text-emerald-400">Hypernet Wireless Radio (PP3-02)</span>
                  </div>
                  <div className="flex justify-between items-center bg-black/30 p-1.5 rounded-lg border border-white/5">
                    <span className="text-slate-400">WAN 2 (Backup):</span>
                    <span className="font-bold text-blue-400">Starlink Satellite (PP3-01)</span>
                  </div>
                  <div className="flex justify-between items-center bg-black/30 p-1.5 rounded-lg border border-white/5">
                    <span className="text-slate-400">Trunk ke Rak 6U:</span>
                    <span className="font-mono text-purple-300">SW3 Port 4 (VOIP) & Port 5 (PC)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 space-y-2 text-xs">
                <h4 className="font-bold text-white text-[11px] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Cable className="w-3.5 h-3.5 text-amber-400" />
                    Backbone Trunk ke Rak Server 32U
                  </span>
                  <button
                    onClick={() => handleSelectRack('RACK_32U_MAIN')}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-semibold"
                  >
                    Buka Rak Utama 32U →
                  </button>
                </h4>
                <div className="space-y-1.5 text-[10px] text-slate-300">
                  <div className="flex justify-between items-center bg-black/30 p-1.5 rounded-lg border border-white/5">
                    <span className="text-slate-400">Backbone VOIP (BB-FIN-A):</span>
                    <span className="font-mono font-bold text-orange-400">Port 24 ⇄ SW3 Port 4</span>
                  </div>
                  <div className="flex justify-between items-center bg-black/30 p-1.5 rounded-lg border border-white/5">
                    <span className="text-slate-400">Backbone PC Data (BB-FIN-B):</span>
                    <span className="font-mono font-bold text-orange-400">Port 24 ⇄ SW3 Port 5</span>
                  </div>
                  <div className="flex justify-between items-center bg-black/30 p-1.5 rounded-lg border border-white/5">
                    <span className="text-slate-400">Cakupan Distribusi:</span>
                    <span className="text-emerald-300 font-semibold">GS, Finance, ACC, HRD, Pantry</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Active Component Ports & Management */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Quick Switch Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {selectedRack === 'RACK_32U_MAIN' ? (
                <>
                  <button
                    onClick={() => setActiveTab("SWITCH_1_VOIP")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                      activeTab === "SWITCH_1_VOIP"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    SWITCH 1 (VOIP)
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                      24 Port
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("SWITCH_2_PC")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                      activeTab === "SWITCH_2_PC"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    SWITCH 2 (PC DATA)
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                      24 Port
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("SWITCH_3_CORE")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                      activeTab === "SWITCH_3_CORE"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    SWITCH 3 (CORE & BB)
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                      24 Port
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("PATCH_PANEL_3")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                      activeTab === "PATCH_PANEL_3"
                        ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    PATCH PANEL 3 & AP RUIJIE
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                      PoE
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("ALL")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === "ALL"
                        ? "bg-slate-800 text-white shadow-md"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Semua Port 32U
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setActiveTab("WALLMOUNT_SW1_VOIP")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                      activeTab === "WALLMOUNT_SW1_VOIP"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    SWITCH 1 (VOIP GS / FIN / ACC)
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                      24 Port
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("WALLMOUNT_SW1_PC")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                      activeTab === "WALLMOUNT_SW1_PC"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    SWITCH 1 (PC DATA GS / FIN / ACC)
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                      24 Port
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("ALL")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === "ALL"
                        ? "bg-slate-800 text-white shadow-md"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Semua Port 6U
                  </button>
                </>
              )}
            </div>

            {/* Visual 24-Port Switch Panel LED View */}
            <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 text-white shadow-lg space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="font-bold font-mono tracking-wider text-slate-200 truncate">
                    {activeSwitchTitle}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 shrink-0">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> VoIP</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> PC</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Trunk</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Standby</span>
                </div>
              </div>

              {/* 2 Rows of 12 Ports (Standard 24-Port Switch Layout) */}
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 p-2 bg-black/40 rounded-xl border border-slate-800">
                {Array.from({ length: 24 }).map((_, idx) => {
                  const portNum = idx + 1;
                  const portData = ports.find(p => p.port_no === portNum);
                  const isConnected = !!portData;

                  return (
                    <button
                      key={portNum}
                      onClick={() => portData && handleOpenEdit(portData)}
                      className={`flex flex-col items-center justify-between p-1.5 rounded-lg border text-center transition-all ${
                        isConnected
                          ? "bg-slate-800/90 border-slate-700 hover:border-indigo-400 hover:scale-105"
                          : "bg-slate-900/40 border-slate-800/50 text-slate-600"
                      }`}
                      title={portData ? `Port ${portNum}: ${portData.user_name || portData.patch_panel_label} (${portData.ip_address || "No IP"})` : `Port ${portNum}: Standby`}
                    >
                      <div className="flex items-center justify-between w-full px-0.5">
                        <span className="text-[8px] font-mono font-bold text-slate-400">{portNum}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? getPortLedColor(portData.device_type, portData.status) : "bg-slate-700"}`}></div>
                      </div>
                      <div className="my-1 text-[8px] font-mono truncate w-full font-semibold text-slate-200">
                        {portData ? (portData.patch_panel_label || portData.user_name?.slice(0, 5)) : "-"}
                      </div>
                      <div className="text-[7px] text-slate-400 truncate w-full">
                        {portData?.ext && portData.ext !== "-" ? `Ext ${portData.ext}` : (portData?.ip_address && portData.ip_address !== "-" ? portData.ip_address.split('.').slice(-1)[0] : (portData?.status === "UPLINK" ? "TRUNK" : "-"))}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Backbone Link Information Banner on Wallmount 6U */}
              {selectedRack === 'RACK_6U_WALLMOUNT' && (
                <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400">
                      <Cable className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-bold text-blue-200 text-[11px]">
                        Uplink Backbone Port 24: Terhubung ke Ruang Server 32U
                      </div>
                      <div className="text-[10px] text-slate-300">
                        {activeTab === 'WALLMOUNT_SW1_VOIP'
                          ? "Port 24 terhubung langsung ke Core Switch 3 Port 4 (BB-FIN-A - Trunk VoIP)"
                          : "Port 24 terhubung langsung ke Core Switch 3 Port 5 (BB-FIN-B - Trunk PC Data)"
                        }
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRack('RACK_32U_MAIN');
                      setActiveTab('SWITCH_3_CORE');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] transition shrink-0 ml-2"
                  >
                    Buka Switch 3 →
                  </button>
                </div>
              )}
            </div>

            {/* Search Bar Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
              <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari Port, User / PIC, IP Address, No Ext, atau Keterangan..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </form>

              <button
                onClick={fetchData}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition flex items-center gap-1.5 text-xs font-semibold self-end md:self-auto"
                title="Refresh Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Port Mapping Data Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Daftar Koneksi Kabel & Port Switch
                  </h3>
                  <p className="text-xs text-slate-500">
                    Menampilkan {ports.length} port pada {activeSwitchTitle}
                  </p>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Total Port Rak: {ports.length}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3 w-12 text-center">Port</th>
                      <th className="py-3 px-3">Switch Port</th>
                      <th className="py-3 px-3">Patch Panel / User</th>
                      <th className="py-3 px-3">Tipe</th>
                      <th className="py-3 px-3">IP Address</th>
                      <th className="py-3 px-3">Ext VoIP</th>
                      <th className="py-3 px-3">Destination / Lokasi</th>
                      <th className="py-3 px-3">Keterangan</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          <div className="inline-block animate-spin mb-2">
                            <RefreshCw className="w-6 h-6 text-indigo-600" />
                          </div>
                          <p>Memuat port mapping rak server...</p>
                        </td>
                      </tr>
                    ) : ports.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          <Network className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="font-semibold text-slate-600">Tidak ada port yang cocok</p>
                          <p className="text-[11px] text-slate-400">Silakan ubah filter pencarian atau switch tab</p>
                        </td>
                      </tr>
                    ) : (
                      ports.map(port => {
                        const isUplink = port.device_type === "UPLINK" || port.device_type === "BACKBONE";

                        return (
                          <tr
                            key={port.id}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isUplink ? "bg-amber-50/30" : ""
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                              {port.port_no}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-900">
                              {port.port_label}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              <div className="flex items-center gap-1.5">
                                {port.device_type === "VOIP" ? (
                                  <PhoneCall className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                ) : port.device_type === "PC" ? (
                                  <Laptop className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : isUplink ? (
                                  <Cable className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                ) : (
                                  <Network className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className="truncate max-w-[140px] font-bold">
                                  {port.patch_panel_label || port.user_name || "-"}
                                </span>
                              </div>
                              {port.user_name && port.patch_panel_label && port.user_name !== port.patch_panel_label && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {port.user_name}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getDeviceTypeBadge(
                                  port.device_type
                                )}`}
                              >
                                {port.device_type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                              {port.ip_address && port.ip_address !== "-" ? (
                                <button
                                  onClick={() => handleCopy(port.ip_address || "")}
                                  className="inline-flex items-center gap-1 hover:text-indigo-600 font-semibold group"
                                  title="Klik untuk salin IP"
                                >
                                  <span>{port.ip_address}</span>
                                  {copiedText === port.ip_address ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                                  )}
                                </button>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-800">
                              {port.ext && port.ext !== "-" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
                                  <PhoneCall className="w-2.5 h-2.5" />
                                  {port.ext}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 max-w-[160px] truncate" title={port.destination}>
                              {port.destination || "-"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 max-w-[160px] truncate" title={port.notes}>
                              {port.notes || "-"}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                                  port.status === "CONNECTED"
                                    ? "text-emerald-600"
                                    : port.status === "UPLINK"
                                    ? "text-orange-600"
                                    : "text-slate-400"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    port.status === "CONNECTED"
                                      ? "bg-emerald-500"
                                      : port.status === "UPLINK"
                                      ? "bg-orange-500"
                                      : "bg-slate-400"
                                  }`}
                                ></span>
                                {port.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEdit(port)}
                                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition"
                                  title="Edit Port"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(port.id)}
                                  className="p-1 rounded-lg hover:bg-rose-100 text-rose-600 transition"
                                  title="Hapus Port"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Add / Edit Port Mapping */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  {editingPort ? "Edit Port Mapping" : "Tambah Port Mapping Baru"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedRack === 'RACK_32U_MAIN' ? "Rak Utama 32U Ruang Server" : "Rak Wallmount 6U Area Finance/ACC"}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Rak Server <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.rack_type}
                    onChange={e => setFormData({ ...formData, rack_type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                    required
                  >
                    <option value="RACK_32U_MAIN">Rak Utama 32U (Ruang Server)</option>
                    <option value="RACK_6U_WALLMOUNT">Rak Wallmount 6U (Finance/ACC)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Grup Switch / Perangkat <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.device_group}
                    onChange={e => setFormData({ ...formData, device_group: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                    required
                  >
                    <optgroup label="Rak Utama 32U">
                      <option value="SWITCH_1_VOIP">SWITCH 1 (VOIP 32U)</option>
                      <option value="SWITCH_2_PC">SWITCH 2 (PC DATA 32U)</option>
                      <option value="SWITCH_3_CORE">SWITCH 3 (CORE & BB 32U)</option>
                      <option value="PATCH_PANEL_3">PATCH PANEL 3 & AP</option>
                    </optgroup>
                    <optgroup label="Rak Wallmount 6U">
                      <option value="WALLMOUNT_SW1_VOIP">WALLMOUNT SW 1 (VOIP)</option>
                      <option value="WALLMOUNT_SW1_PC">WALLMOUNT SW 1 (PC DATA)</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    No Port <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    required
                    value={formData.port_no}
                    onChange={e => setFormData({ ...formData, port_no: Number(e.target.value), port_label: `PORT ${e.target.value} -->` })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Switch Port Label <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.port_label}
                    onChange={e => setFormData({ ...formData, port_label: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Patch Panel / User Label
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: GS-MGR / FIN-1 / ACC-JR1"
                    value={formData.patch_panel_label}
                    onChange={e => setFormData({ ...formData, patch_panel_label: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tipe Perangkat
                  </label>
                  <select
                    value={formData.device_type}
                    onChange={e => setFormData({ ...formData, device_type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="VOIP">VOIP IP Phone</option>
                    <option value="PC">PC Data LAN</option>
                    <option value="AP_POE">Access Point PoE</option>
                    <option value="UPLINK">Uplink Trunk</option>
                    <option value="BACKBONE">Backbone Fiber/LAN</option>
                    <option value="ROUTER">Router Gateway</option>
                    <option value="PABX">IP PABX</option>
                    <option value="STANDBY">STANDBY / Kosong</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama User / PIC
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Bu Enny / Bagus / Nyoman"
                    value={formData.user_name}
                    onChange={e => setFormData({ ...formData, user_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Extension Telepon (Ext)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 1162 / 1151 / 1106"
                    value={formData.ext}
                    onChange={e => setFormData({ ...formData, ext: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    IP Address
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 172.16.41.1 / 172.16.11.94"
                    value={formData.ip_address}
                    onChange={e => setFormData({ ...formData, ip_address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Destination / Outlet Port
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Meja GS / Ruang ACC"
                    value={formData.destination}
                    onChange={e => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Status Port
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="CONNECTED">CONNECTED</option>
                    <option value="UPLINK">UPLINK</option>
                    <option value="STANDBY">STANDBY</option>
                    <option value="DISCONNECTED">DISCONNECTED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Keterangan
                  </label>
                  <input
                    type="text"
                    placeholder="Catatan koneksi..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-md shadow-indigo-600/20"
                >
                  Simpan Port
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Skema Dokumentasi Rak Server (32U & 6U Wallmount) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 p-6 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-600" />
                Lembar Skema Cabling {selectedRack === 'RACK_32U_MAIN' ? "Rak Server 32U" : "Rak Server Wallmount 6U"} (Print Preview A4)
              </h3>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Print Sheet Layout */}
            <div className="border border-slate-300 p-6 rounded-xl bg-white text-slate-900 space-y-4 shadow-sm text-xs">
              <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
                <h2 className="text-base font-black tracking-wider uppercase text-slate-900">
                  PT. PLAZA BALI & SAM GROUP • MIS IT INFRASTRUCTURE
                </h2>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                  {selectedRack === 'RACK_32U_MAIN'
                    ? "DOKUMENTASI KABEL & SUSUNAN RAK SERVER 32U RUANG SERVER"
                    : "DOKUMENTASI KABEL & SUSUNAN RAK WALLMOUNT 6U FINANCE / ACC / GS"
                  }
                </h3>
                <p className="text-[10px] text-slate-500">
                  Update: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })} • Lokasi: {selectedRack === 'RACK_32U_MAIN' ? 'Server Room Head Office' : 'Area Finance / ACC / GS Office'}
                </p>
              </div>

              {selectedRack === 'RACK_32U_MAIN' ? (
                <>
                  <div className="grid grid-cols-2 gap-4 text-[10px]">
                    {/* Switch 1 VOIP Summary */}
                    <div className="border border-slate-200 p-3 rounded-lg bg-slate-50">
                      <h4 className="font-bold text-blue-900 mb-1 border-b border-slate-200 pb-1">
                        SWITCH 1 (VOIP) - 24 PORT
                      </h4>
                      <p className="text-slate-600 mb-2">VLAN IP Phone: Hamdi (1170), Billy (1180), Farhan (1158), Effendy (1175), Fazir (1177), Eza (1174), Mega (1189), Maikel (1121), Ved (1190), Tiffenie (1142), July (1188), HL (1122), RL (1199), Aryo (1133)</p>
                      <p className="font-mono font-bold text-blue-700">Port 9: Uplink ke Switch 3 Port 6</p>
                    </div>

                    {/* Switch 2 PC Summary */}
                    <div className="border border-slate-200 p-3 rounded-lg bg-slate-50">
                      <h4 className="font-bold text-emerald-900 mb-1 border-b border-slate-200 pb-1">
                        SWITCH 2 (PC DATA) - 24 PORT
                      </h4>
                      <p className="text-slate-600 mb-2">VLAN Data PC: 172.16.70.x (MIS 1-5), 172.16.60.x (MCD 1-5, JR, MGR), 172.16.20.x (BOD, VIP 1-3), 172.16.90.x (SEC 1-2), 172.16.80.x (Meeting & Training), 172.16.50.x (HRD 1-3)</p>
                      <p className="font-mono font-bold text-emerald-700">Port 9: Uplink ke Switch 3 Port 7</p>
                    </div>
                  </div>

                  {/* Core & WAN Summary */}
                  <div className="border border-slate-200 p-3 rounded-lg bg-slate-50 text-[10px] space-y-1">
                    <h4 className="font-bold text-indigo-900 border-b border-slate-200 pb-1">
                      CORE SWITCH 3, INTER-RACK BACKBONE & DUAL WAN
                    </h4>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-slate-700">
                      <div>
                        <span className="font-bold">Backbone SW1 VOIP:</span> SW3 Port 4 ⇄ Rak 6U Port 24
                      </div>
                      <div>
                        <span className="font-bold">Backbone SW1 PC:</span> SW3 Port 5 ⇄ Rak 6U Port 24
                      </div>
                      <div>
                        <span className="font-bold">WAN Failover:</span> Hypernet Radio (Primary) + Starlink (Backup)
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 text-[10px]">
                    {/* Switch 1 VOIP Wallmount Summary */}
                    <div className="border border-slate-200 p-3 rounded-lg bg-slate-50">
                      <h4 className="font-bold text-blue-900 mb-1 border-b border-slate-200 pb-1">
                        SWITCH 1 (VOIP WALLMOUNT) - 24 PORT
                      </h4>
                      <p className="text-slate-600 mb-2">
                        GS: Enny (1162), Bagus (1160), Denti (1159), Riani (1000)<br />
                        FIN: SM (1126), Nunung (1154), Abel (1106), Yana (1145), FIN-3 (1127)<br />
                        ACC: Nyoman (1151), Nurul (1194), Mari (1146), Indah (1164), Sindi (1116), Aryanti (1161), Satriyo (1115), Reynaldi (1123), Sayuti (1127), Rina (1107)<br />
                        HRD: Fitri (1169) • Pantry: Ext 1111
                      </p>
                      <p className="font-mono font-bold text-orange-700">Port 24 (Backbone): TO SW 3 (4) di Rak 32U Ruang Server</p>
                    </div>

                    {/* Switch 1 PC Wallmount Summary */}
                    <div className="border border-slate-200 p-3 rounded-lg bg-slate-50">
                      <h4 className="font-bold text-emerald-900 mb-1 border-b border-slate-200 pb-1">
                        SWITCH 1 (PC DATA WALLMOUNT) - 24 PORT
                      </h4>
                      <p className="text-slate-600 mb-2">
                        GS LAN: 172.16.41.62 (Enny), 172.16.41.60 (Bagus), 172.16.41.59 (Denti), 172.16.41.1 (Riani)<br />
                        FIN LAN: 172.16.31.26 (SM), 172.16.30.x (Nunung, Abel, Yana, Fin-3)<br />
                        ACC LAN: 172.16.11.x (Nyoman, Mari, Indah, Sindi, Aryanti, Reynaldi, Sayuti, Rina), 172.16.11.94 (Nurul), 172.16.45.9 (Satriyo)<br />
                        HRD: 172.16.51.69 (Fitri) • Pantry: 172.16.81.11
                      </p>
                      <p className="font-mono font-bold text-orange-700">Port 24 (Backbone): TO SW 3 (5) di Rak 32U Ruang Server</p>
                    </div>
                  </div>

                  <div className="border border-slate-200 p-3 rounded-lg bg-slate-50 text-[10px] space-y-1">
                    <h4 className="font-bold text-indigo-900 border-b border-slate-200 pb-1">
                      SUSUNAN FISIK RAK WALLMOUNT 6U
                    </h4>
                    <p className="text-slate-600">
                      6U: Switch 1 VOIP • 5U: Wire Management 1 • 4U: Patch Panel 24-Port Cat6 • 3U: Switch 1 PC Data • 2U: Wire Management 2 • 1U: PDU Power Strip 6-Way
                    </p>
                  </div>
                </>
              )}

              <div className="border-t border-slate-200 pt-2 text-[9px] text-slate-500 text-center italic">
                *Dokumentasi resmi MIS IT Support. Tempel lembar ini pada pintu rak server untuk mempermudah audit dan troubleshooting jaringan.
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Lembar Dokumentasi
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
