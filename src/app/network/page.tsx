"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import { useAuth } from "@/context/AuthContext";
import { NetworkAsset, NetworkDeviceType } from "@/types";
import SearchInput from "@/components/common/SearchInput";
import StatCard from "@/components/common/StatCard";
import BarcodeGeneratorModal from "@/components/BarcodeGeneratorModal";
import TicketModal from "@/components/TicketModal";
import ScannerModal from "@/components/ScannerModal";
import {
  Network,
  Router as RouterIcon,
  Wifi,
  Server,
  Activity,
  Plus,
  Download,
  Copy,
  Check,
  Printer,
  LifeBuoy,
  Edit2,
  Trash2,
  Radio,
  Globe,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Shield,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  ChevronDown,
  X,
  MapPin,
  Laptop
} from "lucide-react";

export default function NetworkAssetsPage() {
  const { user } = useAuth();
  const isMIS = user?.role === "MIS" || user?.role === "ADMIN" || user?.role === "MANAGER";

  // Data States
  const [networkList, setNetworkList] = useState<NetworkAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Ping Testing States
  const [pingStates, setPingStates] = useState<Record<string, { status: "ONLINE" | "OFFLINE" | "TESTING"; latency: number | null }>>({});
  const [isBatchPinging, setIsBatchPinging] = useState(false);

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NetworkAsset | null>(null);
  const [selectedAssetForSticker, setSelectedAssetForSticker] = useState<any | null>(null);
  const [selectedAssetForTicket, setSelectedAssetForTicket] = useState<any | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const initialFormState: Partial<NetworkAsset> = {
    asset_code: "",
    name: "",
    device_type: "SWITCH",
    brand_model: "",
    serial_number: "-",
    mac_address: "-",
    ip_address: "-",
    subnet_mask: "255.255.255.0",
    gateway: "-",
    vlan: "-",
    port_count: "24 Port Gigabit",
    location: "Terminal 3 Bandara",
    counter_zone: "-",
    firmware_version: "-",
    status: "OPERASIONAL",
    purchase_date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
    notes: "-",
  };
  const [formData, setFormData] = useState<Partial<NetworkAsset>>(initialFormState);

  // Fetch Network Data
  const fetchNetworkAssets = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/network");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setNetworkList(data.data);
      }
    } catch (err) {
      console.error("Failed to load network assets:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNetworkAssets();
  }, [fetchNetworkAssets]);

  // Copy to clipboard helper
  const copyToClipboard = (text: string, key: string) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Ping single device
  const handlePingDevice = async (ip: string, status?: string) => {
    if (!ip || ip === "-") return;
    setPingStates((prev) => ({
      ...prev,
      [ip]: { status: "TESTING", latency: null },
    }));

    try {
      const res = await fetch("/api/network/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, status }),
      });
      const data = await res.json();
      if (data.success) {
        setPingStates((prev) => ({
          ...prev,
          [ip]: {
            status: data.status,
            latency: data.latency,
          },
        }));
      } else {
        setPingStates((prev) => ({
          ...prev,
          [ip]: { status: "OFFLINE", latency: null },
        }));
      }
    } catch (e) {
      setPingStates((prev) => ({
        ...prev,
        [ip]: { status: "OFFLINE", latency: null },
      }));
    }
  };

  // Ping All Devices in Current View
  const handlePingAll = async () => {
    const validIps = filteredList.filter((item) => item.ip_address && item.ip_address !== "-").map((item) => item.ip_address!);
    if (validIps.length === 0) return;

    setIsBatchPinging(true);
    // Set all to testing
    const newTesting: Record<string, { status: "TESTING"; latency: null }> = {};
    validIps.forEach((ip) => {
      newTesting[ip] = { status: "TESTING", latency: null };
    });
    setPingStates((prev) => ({ ...prev, ...newTesting }));

    try {
      const res = await fetch("/api/network/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ips: validIps }),
      });
      const data = await res.json();
      if (data.success && data.results) {
        setPingStates((prev) => ({
          ...prev,
          ...data.results,
        }));
      }
    } catch (e) {
      console.error("Batch ping failed:", e);
    } finally {
      setIsBatchPinging(false);
    }
  };

  // Locations Definition for Pills
  const locationPills = useMemo(() => {
    return [
      { key: "ALL", label: "Semua Jaringan", count: networkList.length },
      { key: "Terminal 3 Bandara", label: "Terminal 3 Bandara", count: networkList.filter((i) => i.location.includes("Terminal 3")).length },
      { key: "Terminal 2 Bandara", label: "Terminal 2 Bandara", count: networkList.filter((i) => i.location.includes("Terminal 2")).length },
      { key: "Head Office (Pusat)", label: "Head Office (Pusat)", count: networkList.filter((i) => i.location.includes("Head Office")).length },
      { key: "Warehouse PlazaBali", label: "Warehouse PlazaBali", count: networkList.filter((i) => i.location.includes("Warehouse")).length },
      { key: "Office Surabaya (SBY)", label: "Office Surabaya (SBY)", count: networkList.filter((i) => i.location.includes("Surabaya")).length },
    ];
  }, [networkList]);

  // Filtered List
  const filteredList = useMemo(() => {
    return networkList.filter((item) => {
      // Location
      if (selectedLocation !== "ALL" && !item.location.toLowerCase().includes(selectedLocation.toLowerCase().replace(" (pusat)", "").replace(" (sby)", ""))) {
        return false;
      }
      // Device Type
      if (selectedType !== "ALL" && item.device_type !== selectedType) {
        return false;
      }
      // Status
      if (selectedStatus !== "ALL" && item.status !== selectedStatus) {
        return false;
      }
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          item.asset_code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.brand_model.toLowerCase().includes(q) ||
          (item.serial_number && item.serial_number.toLowerCase().includes(q)) ||
          (item.mac_address && item.mac_address.toLowerCase().includes(q)) ||
          (item.ip_address && item.ip_address.toLowerCase().includes(q)) ||
          (item.vlan && item.vlan.toLowerCase().includes(q)) ||
          (item.counter_zone && item.counter_zone.toLowerCase().includes(q)) ||
          (item.notes && item.notes.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [networkList, selectedLocation, selectedType, selectedStatus, search]);

  // Executive Metrics
  const metrics = useMemo(() => {
    return {
      total: networkList.length,
      routers: networkList.filter((i) => i.device_type === "ROUTER").length,
      switches: networkList.filter((i) => i.device_type === "SWITCH").length,
      aps: networkList.filter((i) => i.device_type === "ACCESS_POINT").length,
      modems: networkList.filter((i) => i.device_type === "MODEM" || i.device_type === "FIREWALL").length,
      operational: networkList.filter((i) => i.status === "OPERASIONAL").length,
    };
  }, [networkList]);

  // Helper Device Type Styling
  const getDeviceTypeBadge = (type: NetworkDeviceType) => {
    switch (type) {
      case "ROUTER":
        return {
          icon: RouterIcon,
          label: "Router Gateway",
          className: "bg-blue-50 text-blue-700 border-blue-200/80",
        };
      case "SWITCH":
        return {
          icon: Server,
          label: "Switch Hub / Core",
          className: "bg-emerald-50 text-[#006622] border-emerald-200/80",
        };
      case "ACCESS_POINT":
        return {
          icon: Wifi,
          label: "Access Point Wi-Fi",
          className: "bg-purple-50 text-purple-700 border-purple-200/80",
        };
      case "MODEM":
        return {
          icon: Globe,
          label: "Modem / ONT",
          className: "bg-amber-50 text-amber-800 border-amber-200/80",
        };
      case "FIREWALL":
        return {
          icon: Shield,
          label: "Firewall / Security",
          className: "bg-rose-50 text-rose-700 border-rose-200/80",
        };
      default:
        return {
          icon: Network,
          label: "Network Hardware",
          className: "bg-slate-50 text-slate-700 border-slate-200/80",
        };
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "Kode Aset",
      "Nama Perangkat",
      "Tipe",
      "Brand & Model",
      "Serial Number",
      "MAC Address",
      "IP Address",
      "Subnet Mask",
      "Gateway",
      "VLAN",
      "Port Count",
      "Lokasi",
      "Counter / Zone",
      "Firmware",
      "Status",
      "Tanggal Pembelian",
      "Catatan",
    ];

    const rows = filteredList.map((item) => [
      `"${item.asset_code}"`,
      `"${item.name}"`,
      `"${item.device_type}"`,
      `"${item.brand_model}"`,
      `"${item.serial_number || "-"}"`,
      `"${item.mac_address || "-"}"`,
      `"${item.ip_address || "-"}"`,
      `"${item.subnet_mask || "-"}"`,
      `"${item.gateway || "-"}"`,
      `"${item.vlan || "-"}"`,
      `"${item.port_count || "-"}"`,
      `"${item.location}"`,
      `"${item.counter_zone || "-"}"`,
      `"${item.firmware_version || "-"}"`,
      `"${item.status}"`,
      `"${item.purchase_date || "-"}"`,
      `"${(item.notes || "-").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Jaringan_Network_MIS_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      ...initialFormState,
      location: selectedLocation !== "ALL" ? selectedLocation : "Terminal 3 Bandara",
    });
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: NetworkAsset) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsAddEditModalOpen(true);
  };

  // Save Form (Add or Edit)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.device_type || !formData.location) {
      alert("Nama perangkat, tipe, dan lokasi wajib diisi!");
      return;
    }

    try {
      setIsSubmitting(true);
      const url = editingItem ? `/api/network/${editingItem.id}` : "/api/network";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setIsAddEditModalOpen(false);
        fetchNetworkAssets();
      } else {
        alert(data.error || "Gagal menyimpan data perangkat jaringan");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Action
  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus perangkat jaringan ini?")) return;

    try {
      const res = await fetch(`/api/network/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchNetworkAssets();
      } else {
        alert(data.error || "Gagal menghapus perangkat");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Terjadi kesalahan sistem saat menghapus");
    }
  };

  return (
    <SidebarLayout onOpenScanner={() => setIsScannerOpen(true)}>
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-2.5 sm:px-4 py-5 space-y-4">
        {/* Top Header & Executive Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              <span>Shop Ops</span>
              <span>/</span>
              <span>Master Aset</span>
              <span>/</span>
              <span className="text-[#006622]">Data Jaringan (Network)</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Network className="w-6 h-6 text-[#006622]" />
                <span>Master Aset & Data Jaringan</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-[#006622] border border-emerald-200/80">
                {networkList.length} Perangkat
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pusat kendali router gateway, switch hub toko, access point Wi-Fi, modem, & infrastruktur network seluruh bandara & kantor pusat.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePingAll}
              disabled={isBatchPinging || filteredList.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#006622] border border-emerald-200 rounded-xl text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              title="Ping seluruh IP perangkat di tabel saat ini"
            >
              <Activity className={`w-3.5 h-3.5 ${isBatchPinging ? "animate-spin text-emerald-600" : ""}`} />
              <span>{isBatchPinging ? "Sedang Ping..." : "Tes Ping Semua IP"}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            {isMIS && (
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#006622] hover:bg-[#00521b] text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Perangkat Jaringan</span>
              </button>
            )}
          </div>
        </div>

        {/* 5 Executive Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard
            label="Total Perangkat"
            labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            value={
              <>
                {metrics.total} <span className="text-xs font-normal text-slate-400">Unit</span>
              </>
            }
            valueClassName="text-2xl text-slate-900 mt-0.5 font-black"
            hint="Seluruh Jaringan MIS"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Network}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-all"
          />

          <StatCard
            label="Router Gateway"
            labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            value={
              <>
                {metrics.routers} <span className="text-xs font-normal text-slate-400">Unit</span>
              </>
            }
            valueClassName="text-2xl text-blue-600 mt-0.5 font-black"
            hint="MikroTik & Cloud Gateway"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={RouterIcon}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-all"
          />

          <StatCard
            label="Switch Hub / Core"
            labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            value={
              <>
                {metrics.switches} <span className="text-xs font-normal text-slate-400">Unit</span>
              </>
            }
            valueClassName="text-2xl text-[#006622] mt-0.5 font-black"
            hint="Cisco, Ruijie & D-Link"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Server}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-[#006622] flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-all"
          />

          <StatCard
            label="Access Point Wi-Fi"
            labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            value={
              <>
                {metrics.aps} <span className="text-xs font-normal text-slate-400">Unit</span>
              </>
            }
            valueClassName="text-2xl text-purple-600 mt-0.5 font-black"
            hint="Ruijie Reyee Wi-Fi 6"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Wifi}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-all"
          />

          <StatCard
            label="Status Operasional"
            labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            value={
              <>
                {metrics.operational} <span className="text-xs font-normal text-slate-400">Aktif</span>
              </>
            }
            valueClassName="text-2xl text-emerald-600 mt-0.5 font-black"
            hint="100% Siap Operasional"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Activity}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-all"
          />
        </div>

        {/* Filter Card: Scope Pills & Search Dropdowns */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 space-y-3">
          {/* Row 1: Location Scope Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Lokasi:</span>
            </span>
            {locationPills.map((pill) => {
              const active = selectedLocation === pill.key;
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setSelectedLocation(pill.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? "bg-[#006622] text-white shadow-2xs font-bold"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80"
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      active ? "bg-black/20 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Row 2: Search Input & Dropdowns */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
            {/* Search Input */}
            <div className="flex-1 max-w-xl">
              <SearchInput
                value={search}
                onChange={setSearch}
                onClear={() => setSearch("")}
                placeholder="Cari nama perangkat, IP (172.19...), MAC, VLAN, Switch, MikroTik, Lokasi..."
                inputClassName="pl-9 pr-8 py-2 bg-slate-50 border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-[#006622]/20 focus:border-[#006622]"
              />
            </div>

            {/* Dropdowns Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Device Type Dropdown */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#006622]/20 transition-all cursor-pointer"
              >
                <option value="ALL">Semua Tipe Perangkat</option>
                <option value="ROUTER">Router Gateway</option>
                <option value="SWITCH">Switch Hub / Core</option>
                <option value="ACCESS_POINT">Access Point Wi-Fi</option>
                <option value="MODEM">Modem / ONT Fiber</option>
                <option value="FIREWALL">Firewall Security</option>
              </select>

              {/* Status Dropdown */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#006622]/20 transition-all cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="OPERASIONAL">Operasional</option>
                <option value="CADANGAN">Cadangan</option>
                <option value="PERBAIKAN">Perbaikan</option>
                <option value="RUSAK">Rusak</option>
              </select>

              {/* Reset Filter Button */}
              {(search || selectedLocation !== "ALL" || selectedType !== "ALL" || selectedStatus !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedLocation("ALL");
                    setSelectedType("ALL");
                    setSelectedStatus("ALL");
                  }}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#006622]" />
              <span>Memuat data perangkat jaringan...</span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <Network className="w-8 h-8 text-slate-300" />
              <span className="font-semibold text-slate-600">Tidak ada perangkat jaringan yang cocok dengan filter.</span>
              <span className="text-[11px] text-slate-400">Coba ubah kata kunci pencarian atau reset filter.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-3 text-center w-10">No</th>
                    <th className="px-3.5 py-3">Perangkat & Brand Model</th>
                    <th className="px-3.5 py-3">Tipe & Port</th>
                    <th className="px-3.5 py-3">Lokasi & Area Counter</th>
                    <th className="px-3.5 py-3">IP Address, Subnet & VLAN</th>
                    <th className="px-3.5 py-3 text-center">Status</th>
                    <th className="px-3.5 py-3 text-center">Tes Ping</th>
                    <th className="px-3.5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredList.map((item, idx) => {
                    const badge = getDeviceTypeBadge(item.device_type);
                    const Icon = badge.icon;
                    const ipPing = item.ip_address ? pingStates[item.ip_address] : null;
                    const isCodeCopied = copiedKey === `code-${item.id}`;
                    const isIpCopied = copiedKey === `ip-${item.id}`;
                    const isMacCopied = copiedKey === `mac-${item.id}`;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* No */}
                        <td className="px-3.5 py-3 text-center font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Perangkat & Brand Model */}
                        <td className="px-3.5 py-3">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-[#006622] flex items-center justify-center shrink-0 mt-0.5">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 group-hover:text-[#006622] transition-colors">
                                  {item.name}
                                </span>
                                <span className="font-mono text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 border border-slate-200 rounded font-semibold flex items-center gap-1">
                                  {item.asset_code}
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(item.asset_code, `code-${item.id}`)}
                                    title="Salin Kode Aset"
                                    className="text-slate-400 hover:text-slate-700"
                                  >
                                    {isCodeCopied ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                                  </button>
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="font-semibold text-slate-700">{item.brand_model}</span>
                                {item.serial_number && item.serial_number !== "-" && (
                                  <span className="font-mono text-[10px] text-slate-400">SN: {item.serial_number}</span>
                                )}
                                {item.mac_address && item.mac_address !== "-" && (
                                  <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1 bg-slate-50 px-1 rounded border border-slate-200/60">
                                    MAC: {item.mac_address}
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(item.mac_address || "", `mac-${item.id}`)}
                                      title="Salin MAC Address"
                                      className="text-slate-400 hover:text-slate-700"
                                    >
                                      {isMacCopied ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                                    </button>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Tipe & Port */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${badge.className}`}>
                            <Icon className="w-3 h-3" />
                            <span>{badge.label}</span>
                          </span>
                          <div className="text-[10.5px] text-slate-500 font-medium mt-1">
                            {item.port_count || "-"}
                          </div>
                        </td>

                        {/* Lokasi & Area */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{item.location}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                            {item.counter_zone || "-"}
                          </div>
                        </td>

                        {/* IP Address, Subnet & VLAN */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {item.ip_address && item.ip_address !== "-" ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-blue-700 text-[11px]">
                                  {item.ip_address}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(item.ip_address || "", `ip-${item.id}`)}
                                  title="Salin IP Address"
                                  className="text-slate-400 hover:text-blue-700 p-0.5"
                                >
                                  {isIpCopied ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                                </button>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Subnet: {item.subnet_mask || "255.255.255.0"}
                              </div>
                              {item.vlan && item.vlan !== "-" && (
                                <span className="inline-block font-mono text-[9.5px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold">
                                  {item.vlan}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">-</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === "OPERASIONAL"
                                ? "bg-emerald-50 text-[#006622] border border-emerald-200/80"
                                : item.status === "CADANGAN"
                                ? "bg-blue-50 text-blue-700 border border-blue-200/80"
                                : item.status === "PERBAIKAN"
                                ? "bg-amber-50 text-amber-800 border border-amber-200/80"
                                : "bg-rose-50 text-rose-700 border border-rose-200/80"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        {/* Tes Ping */}
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          {item.ip_address && item.ip_address !== "-" ? (
                            <div className="flex flex-col items-center gap-1">
                              {ipPing?.status === "TESTING" ? (
                                <span className="inline-flex items-center gap-1 text-[10.5px] text-emerald-600 font-semibold animate-pulse">
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>Pinging...</span>
                                </span>
                              ) : ipPing?.status === "ONLINE" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[#006622] border border-emerald-200 text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <span>{ipPing.latency || 2}ms (Online)</span>
                                </span>
                              ) : ipPing?.status === "OFFLINE" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                  <span>RTO (Offline)</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handlePingDevice(item.ip_address!, item.status)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-[#006622] border border-slate-200 hover:border-emerald-200 text-[10.5px] font-semibold transition-colors cursor-pointer"
                                  title="Tes koneksi ping ke IP ini"
                                >
                                  <Activity className="w-3 h-3" />
                                  <span>Tes Ping</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-[10px]">No IP</span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* Cetak Stiker Barcode & QR Label */}
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedAssetForSticker({
                                  asset_code: item.asset_code,
                                  name: item.name,
                                  category: "Network / Router",
                                  shop_location: item.location,
                                  brand_model: item.brand_model,
                                  serial_number: item.serial_number || "-",
                                  ip_address: item.ip_address || "-",
                                  status: item.status,
                                })
                              }
                              title="Cetak Stiker Barcode Label"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Buat Tiket Kendala */}
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedAssetForTicket({
                                  asset_code: item.asset_code,
                                  name: item.name,
                                  category: "Network / Router",
                                  shop_location: item.location,
                                  brand_model: item.brand_model,
                                  serial_number: item.serial_number || "-",
                                  status: item.status,
                                })
                              }
                              title="Buat Tiket Kendala Jaringan"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                            >
                              <LifeBuoy className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Perangkat */}
                            {isMIS && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item)}
                                title="Edit Data Perangkat"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Hapus Perangkat */}
                            {isMIS && (
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id!)}
                                title="Hapus Perangkat"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* MODAL TAMBAH / EDIT PERANGKAT JARINGAN */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#006622] flex items-center justify-center">
                  <Network className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingItem ? "Edit Perangkat Jaringan" : "Tambah Perangkat Jaringan Baru"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Konfigurasi spesifikasi hardware, port, IP, dan subnet perangkat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Kode Aset */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Kode Aset <span className="text-slate-400 font-normal">(Otomatis jika kosong)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.asset_code || ""}
                    onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                    placeholder="Contoh: NET-T3-SW-001"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#006622]/20 font-mono"
                  />
                </div>

                {/* Tipe Perangkat */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Tipe Perangkat <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.device_type}
                    onChange={(e) => setFormData({ ...formData, device_type: e.target.value as NetworkDeviceType })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#006622]/20 font-semibold"
                  >
                    <option value="ROUTER">Router Gateway</option>
                    <option value="SWITCH">Switch Hub / Core</option>
                    <option value="ACCESS_POINT">Access Point Wi-Fi</option>
                    <option value="MODEM">Modem / ONT Fiber</option>
                    <option value="FIREWALL">Firewall Security</option>
                    <option value="OTHER">Lainnya</option>
                  </select>
                </div>

                {/* Nama Perangkat */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Nama Perangkat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Switch Hub 24P Toko DF1 / Router MikroTik Gateway T3"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#006622]/20 font-medium"
                  />
                </div>

                {/* Brand & Model */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Brand & Model</label>
                  <input
                    type="text"
                    value={formData.brand_model || ""}
                    onChange={(e) => setFormData({ ...formData, brand_model: e.target.value })}
                    placeholder="Contoh: Ruijie RG-NBS3100-24GT4SFP-P"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#006622]/20"
                  />
                </div>

                {/* Port Count */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Jumlah & Tipe Port</label>
                  <input
                    type="text"
                    value={formData.port_count || ""}
                    onChange={(e) => setFormData({ ...formData, port_count: e.target.value })}
                    placeholder="Contoh: 24 Port Gigabit PoE + 4 SFP"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#006622]/20"
                  />
                </div>

                {/* Lokasi */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Lokasi <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#006622]/20 font-semibold"
                  >
                    <option value="Terminal 3 Bandara">Terminal 3 Bandara</option>
                    <option value="Terminal 2 Bandara">Terminal 2 Bandara</option>
                    <option value="Head Office (Pusat)">Head Office (Pusat)</option>
                    <option value="Warehouse PlazaBali">Warehouse PlazaBali</option>
                    <option value="Office Surabaya (SBY)">Office Surabaya (SBY)</option>
                  </select>
                </div>

                {/* Area Counter / Posisi Rak */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Area Counter / Rak</label>
                  <input
                    type="text"
                    value={formData.counter_zone || ""}
                    onChange={(e) => setFormData({ ...formData, counter_zone: e.target.value })}
                    placeholder="Contoh: Rack Wallmount DF1 / Rak Server 32U"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#006622]/20"
                  />
                </div>

                {/* IP Address */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">IP Address</label>
                  <input
                    type="text"
                    value={formData.ip_address || ""}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    placeholder="Contoh: 172.19.20.241"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#006622]/20 font-mono"
                  />
                </div>

                {/* Subnet Mask */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Subnet Mask</label>
                  <input
                    type="text"
                    value={formData.subnet_mask || "255.255.255.0"}
                    onChange={(e) => setFormData({ ...formData, subnet_mask: e.target.value })}
                    placeholder="255.255.255.0"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#006622]/20 font-mono"
                  />
                </div>

                {/* Gateway IP */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Default Gateway</label>
                  <input
                    type="text"
                    value={formData.gateway || ""}
                    onChange={(e) => setFormData({ ...formData, gateway: e.target.value })}
                    placeholder="Contoh: 172.19.20.1"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#006622]/20 font-mono"
                  />
                </div>

                {/* VLAN */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">VLAN</label>
                  <input
                    type="text"
                    value={formData.vlan || ""}
                    onChange={(e) => setFormData({ ...formData, vlan: e.target.value })}
                    placeholder="Contoh: VLAN 20 (POS T3)"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#006622]/20"
                  />
                </div>

                {/* MAC Address */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">MAC Address</label>
                  <input
                    type="text"
                    value={formData.mac_address || ""}
                    onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                    placeholder="Contoh: 68:D2:1D:90:DF:01"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#006622]/20 font-mono uppercase"
                  />
                </div>

                {/* Serial Number */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Serial Number</label>
                  <input
                    type="text"
                    value={formData.serial_number || ""}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="Contoh: RJ-NBS3100-3321"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#006622]/20 font-mono"
                  />
                </div>

                {/* Firmware / OS Version */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Firmware / OS</label>
                  <input
                    type="text"
                    value={formData.firmware_version || ""}
                    onChange={(e) => setFormData({ ...formData, firmware_version: e.target.value })}
                    placeholder="Contoh: RouterOS v7.14 / RGOS 11.4"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#006622]/20"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Status Operasional</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#006622]/20 font-semibold"
                  >
                    <option value="OPERASIONAL">Operasional</option>
                    <option value="CADANGAN">Cadangan</option>
                    <option value="PERBAIKAN">Perbaikan</option>
                    <option value="RUSAK">Rusak</option>
                  </select>
                </div>

                {/* Tanggal Pembelian */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Tanggal Pembelian</label>
                  <input
                    type="text"
                    value={formData.purchase_date || ""}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    placeholder="Contoh: 15 Jan 2024"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#006622]/20"
                  />
                </div>

                {/* Catatan / Keterangan */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Catatan & Keterangan</label>
                  <textarea
                    rows={2}
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Contoh: Menghubungkan 5 Unit Kasir POS DF1 & EDC Bank"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#006622]/20"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-[#006622] hover:bg-[#00521b] text-white rounded-xl text-xs font-bold shadow-2xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Tambahkan Perangkat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CETAK STIKER BARCODE & QR LABEL */}
      <BarcodeGeneratorModal
        isOpen={!!selectedAssetForSticker}
        asset={selectedAssetForSticker}
        onClose={() => setSelectedAssetForSticker(null)}
      />

      {/* MODAL TIKET KENDALA */}
      <TicketModal
        isOpen={!!selectedAssetForTicket}
        asset={selectedAssetForTicket}
        onClose={() => setSelectedAssetForTicket(null)}
      />

      {/* SCANNER MODAL */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </SidebarLayout>
  );
}
