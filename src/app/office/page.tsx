"use client";

import { useState, Suspense } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import ScannerModal from "@/components/ScannerModal";
import BarcodeGeneratorModal from "@/components/BarcodeGeneratorModal";
import TicketModal from "@/components/TicketModal";
import StatCard from "@/components/common/StatCard";
import SearchInput from "@/components/common/SearchInput";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import { useApiData } from "@/hooks/useApiData";
import { Asset, OfficeHardwareAsset } from "@/types";
import {
  Laptop,
  Plus,
  Filter,
  QrCode,
  Printer,
  Edit2,
  Trash2,
  Wrench,
  CheckCircle,
  AlertCircle,
  X,
  Save,
  Download,
  Copy,
  Check,
  LifeBuoy,
  Cpu,
  Monitor,
  HardDrive,
  Building2,
  Router,
  PhoneCall,
  Layers,
  Server,
  Activity,
  UserCheck
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import Link from "next/link";

const DIVISIONS = [
  "MIS",
  "ACCOUNTING",
  "FINANCE",
  "MERCHANDISE",
  "GS",
  "HRD",
  "SECRETARY",
  "WHS",
  "SPV T3",
  "STOCK CONTROL T3",
  "SPV T2",
  "STOCK CONTROL T2",
  "STOCK CONTROL SAM T2",
  "SPV SBY",
  "OPERASIONAL SBY",
  "SECURITY",
  "ME",
  "FASILITAS",
  "NETWORK",
];

function OfficeContent() {
  const { user, isAdmin, isMIS, isManager, isProcurement } = useAuth();

  if (!isAdmin && !isMIS && !isManager && !isProcurement) {
    return <AccessDenied moduleName="Aset PC Office & Gudang WHS" />;
  }
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialDiv = searchParams.get("div") || "";
  const initialLoc = searchParams.get("loc") || "";

  const [search, setSearch] = useState(initialSearch);
  const [selectedLocation, setSelectedLocation] = useState(initialLoc);
  const [selectedDivision, setSelectedDivision] = useState(initialDiv);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedType, setSelectedType] = useState("");

  // Modals & UI States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedAssetForSticker, setSelectedAssetForSticker] = useState<Asset | null>(null);
  const [selectedAssetForTicket, setSelectedAssetForTicket] = useState<Asset | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form Modal (Add / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OfficeHardwareAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<OfficeHardwareAsset>>({
    asset_code: "",
    item_no: 1,
    office_location: "Head Office",
    division: "MIS",
    user_name: "",
    os: "WIN 10 PRO 64 BIT",
    motherboard: "-",
    processor: "-",
    ram: "8 GB",
    monitor: "LG 20 INCH",
    hard_drive: "(SSD) 256GB",
    used_disk1: "-",
    used_disk2: "-",
    keyboard: "LOGITECH USB",
    mouse: "LOGITECH USB",
    printer: "-",
    ip_address: "-",
    device_type: "PC",
    status: "OPERASIONAL",
    notes: "",
  });

  // Data aset office dari API + SWR cache (endpoint & cache key tetap)
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (selectedLocation) params.append("location", selectedLocation);
  if (selectedDivision) params.append("division", selectedDivision);
  if (selectedStatus) params.append("status", selectedStatus);
  if (selectedType) params.append("device_type", selectedType);
  const cacheKey = `office_${search}_${selectedLocation}_${selectedDivision}_${selectedStatus}_${selectedType}`;

  const {
    data: officeData,
    isLoading,
    refresh: fetchOfficeAssets,
  } = useApiData<OfficeHardwareAsset[]>(`/api/office?${params.toString()}`, {
    cacheKey,
    transform: (json) => {
      const res = json as { success?: boolean; data?: OfficeHardwareAsset[] };
      return res.success && Array.isArray(res.data) ? res.data : [];
    },
  });

  const officeList = officeData ?? [];

  const copyToClipboard = (text: string, key: string) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open Sticker Modal
  const handleOpenSticker = (item: OfficeHardwareAsset) => {
    const assetObj: Asset = {
      asset_code: item.asset_code,
      name: `Perangkat Office ${item.user_name}`,
      category: item.device_type === "ROUTER" ? "Network / Router" : (item.device_type === "PABX" ? "Lainnya" : "Display / Monitor"),
      shop_location: "Head Office",
      brand_model: item.motherboard !== "-" ? `${item.motherboard} / ${item.processor}` : (item.device_type || "PC"),
      serial_number: "-",
      ip_address: item.ip_address !== "-" ? item.ip_address : null,
      status: item.status === "CADANGAN" ? "CADANGAN" : "OPERASIONAL",
      notes: `Divisi: ${item.division} • OS: ${item.os} • RAM: ${item.ram} • Storage: ${item.hard_drive} • Printer: ${item.printer}`,
    };
    setSelectedAssetForSticker(assetObj);
  };

  // Open Ticket Modal
  const handleOpenTicket = (item: OfficeHardwareAsset) => {
    const assetObj: Asset = {
      asset_code: item.asset_code,
      name: `Perangkat Office ${item.user_name}`,
      category: item.device_type === "ROUTER" ? "Network / Router" : (item.device_type === "PABX" ? "Lainnya" : "Display / Monitor"),
      shop_location: "Head Office",
      brand_model: `${item.processor} (IP: ${item.ip_address})`,
      serial_number: "-",
      ip_address: item.ip_address !== "-" ? item.ip_address : null,
      status: item.status === "CADANGAN" ? "CADANGAN" : "OPERASIONAL",
      notes: `Divisi: ${item.division} • OS: ${item.os} • RAM: ${item.ram}`,
    };
    setSelectedAssetForTicket(assetObj);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      asset_code: "",
      item_no: officeList.length + 1,
      division: selectedDivision || "MIS",
      user_name: "",
      os: "WIN 10 PRO 64 BIT",
      motherboard: "-",
      processor: "-",
      ram: "8 GB",
      monitor: "LG 20 INCH",
      hard_drive: "(SSD) 256GB",
      used_disk1: "-",
      used_disk2: "-",
      keyboard: "LOGITECH USB",
      mouse: "LOGITECH USB",
      printer: "-",
      ip_address: "-",
      device_type: "PC",
      status: "OPERASIONAL",
      notes: "",
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: OfficeHardwareAsset) => {
    setEditingItem(item);
    setFormData({ ...item });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Save Modal
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const url = editingItem ? `/api/office/${editingItem.id}` : "/api/office";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success) {
        setIsFormOpen(false);
        fetchOfficeAssets();
      } else {
        setFormError(json.message || "Gagal menyimpan data.");
      }
    } catch (err) {
      setFormError("Gagal menghubungi server database.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Item
  const handleDelete = async (id: number, code: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus perangkat office "${name} (${code})"?`)) return;

    try {
      const res = await fetch(`/api/office/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchOfficeAssets();
      } else {
        alert(json.message || "Gagal menghapus data.");
      }
    } catch (err) {
      alert("Gagal menghapus.");
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "NO",
      "KODE_ASET",
      "LOKASI_KANTOR",
      "DIVISI",
      "NAMA_PENGGUNA",
      "TIPE",
      "OS",
      "MOTHERBOARD",
      "PROCESSOR",
      "RAM",
      "MONITOR",
      "HARD_DRIVE",
      "USED_DISK_1",
      "USED_DISK_2",
      "KEYBOARD",
      "MOUSE",
      "PRINTER",
      "IP_ADDRESS",
      "STATUS",
      "CATATAN",
    ];

    const rows = officeList.map((o) => [
      o.item_no || "-",
      `"${o.asset_code}"`,
      `"${o.office_location || "Head Office"}"`,
      `"${o.division}"`,
      `"${o.user_name}"`,
      `"${o.device_type || "PC"}"`,
      `"${o.os || "-"}"`,
      `"${o.motherboard || "-"}"`,
      `"${o.processor || "-"}"`,
      `"${o.ram || "-"}"`,
      `"${o.monitor || "-"}"`,
      `"${o.hard_drive || "-"}"`,
      `"${o.used_disk1 || "-"}"`,
      `"${o.used_disk2 || "-"}"`,
      `"${o.keyboard || "-"}"`,
      `"${o.mouse || "-"}"`,
      `"${o.printer || "-"}"`,
      `"${o.ip_address || "-"}"`,
      `"${o.status}"`,
      `"${o.notes || "-"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const label = selectedDivision || "Semua_Divisi";
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_Perangkat_Office_${label}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Counts
  const pcCount = officeList.filter((o) => o.device_type === "PC").length;
  const netCount = officeList.filter((o) => o.device_type === "ROUTER" || o.device_type === "PABX").length;
  const fclCount = officeList.filter((o) => o.device_type === "FACILITY").length;
  const ipCount = officeList.filter((o) => o.ip_address && o.ip_address.startsWith("172.")).length;

  const getDivisionBadge = (div: string) => {
    switch (div.toUpperCase()) {
      case "MIS":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "ACCOUNTING":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "FINANCE":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "MERCHANDISE":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "GS":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "HRD":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "SECRETARY":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "WHS":
        return "bg-orange-100 text-orange-800 border-orange-300 font-bold";
      case "SPV T3":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
      case "STOCK CONTROL T3":
        return "bg-teal-100 text-teal-800 border-teal-300 font-bold";
      case "SPV T2":
        return "bg-amber-100 text-amber-800 border-amber-300 font-bold";
      case "STOCK CONTROL T2":
        return "bg-sky-100 text-sky-800 border-sky-300 font-bold";
      case "STOCK CONTROL SAM T2":
        return "bg-indigo-100 text-indigo-800 border-indigo-300 font-bold";
      case "SPV SBY":
        return "bg-purple-100 text-purple-800 border-purple-300 font-bold";
      case "OPERASIONAL SBY":
        return "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 font-bold";
      case "SECURITY":
        return "bg-rose-100 text-rose-800 border-rose-300 font-bold";
      case "ME":
        return "bg-slate-200 text-slate-800 border-slate-300 font-bold";
      case "NETWORK":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <SidebarLayout onOpenScanner={() => setIsScannerOpen(true)}>
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-2.5 sm:px-4 py-5 space-y-4">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-[#006622] text-white shadow-2xs">
              <Laptop className="w-4 h-4" />
              <span>Aset Komputer Office & WHS ({officeList.length} Unit)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/extensions"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded-lg shadow-2xs transition-all"
            >
              <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
              <span>Ext Telepon PABX</span>
            </Link>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            {isMIS && (
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#006622] hover:bg-[#00551c] text-white text-xs font-semibold rounded-lg shadow-2xs active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Perangkat</span>
              </button>
            )}

            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-lg text-[11px] font-semibold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-[#006622]"></span>
              <span>MIS OPS (Semua Divisi)</span>
            </div>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total Perangkat"
            labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            value={
              <>
                {officeList.length}{" "}
                <span className="text-xs font-normal text-slate-400">Unit</span>
              </>
            }
            valueClassName="text-2xl text-slate-900 mt-0.5"
            hint="Seluruh Divisi Office"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Building2}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-sm transition-all"
          />

          <StatCard
            label="PC & Desktop"
            labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            value={
              <>
                {pcCount}{" "}
                <span className="text-xs font-normal text-slate-400">Unit</span>
              </>
            }
            valueClassName="text-2xl text-blue-600 mt-0.5"
            hint="Komputer Karyawan"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Laptop}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-sm transition-all"
          />

          <StatCard
            label="Router & Jaringan"
            labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            value={
              <>
                {netCount}{" "}
                <span className="text-xs font-normal text-slate-400">Unit</span>
              </>
            }
            valueClassName="text-2xl text-amber-600 mt-0.5"
            hint="Router PB & PABX Telp"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Router}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-sm transition-all"
          />

          <StatCard
            label="IP Address Aktif"
            labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            value={
              <>
                {ipCount}{" "}
                <span className="text-xs font-normal text-slate-400">Unit</span>
              </>
            }
            valueClassName="text-2xl text-emerald-600 mt-0.5"
            hint="Terkoneksi Jaringan VPN"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Activity}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-sm transition-all"
          />
        </div>

        {/* Location & Division Filter Tabs */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          {/* Row 1: Lokasi Kantor Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Lokasi:
            </span>
            <button
              type="button"
              onClick={() => setSelectedLocation("")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedLocation === ""
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              Semua Kantor ({officeList.length})
            </button>
            {[
              { label: "Head Office (Pusat)", value: "Head Office", dot: "bg-indigo-500" },
              { label: "Warehouse (WHS)", value: "Warehouse (WHS)", dot: "bg-orange-500" },
              { label: "Office Terminal 2 (T2)", value: "Office Terminal 2", dot: "bg-amber-500" },
              { label: "Office Terminal 3 (T3)", value: "Office Terminal 3", dot: "bg-emerald-500" },
              { label: "Office Surabaya (SBY)", value: "Office Surabaya", dot: "bg-purple-500" },
            ].map((loc) => (
              <button
                key={loc.value}
                type="button"
                onClick={() => setSelectedLocation(loc.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  selectedLocation === loc.value
                    ? "bg-[#006622] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${selectedLocation === loc.value ? "bg-white" : loc.dot}`}></span>
                <span>{loc.label}</span>
              </button>
            ))}
          </div>

          {/* Row 2: Search Input & Dropdown Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
            {/* Search Input */}
            <SearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch("")}
              placeholder="Cari nama pengguna, IP address (172.16...), processor, motherboard, storage..."
              inputClassName="pl-9 pr-8 py-2 bg-slate-50 border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-emerald-500/20 focus:border-[#006622]"
            />

            {/* Dropdown Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Division Dropdown */}
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Semua Divisi ({DIVISIONS.length})</option>
                {DIVISIONS.map((d) => (
                  <option key={d} value={d}>Divisi {d}</option>
                ))}
              </select>

              {/* Type Dropdown */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Semua Tipe Perangkat</option>
                <option value="PC">PC Desktop</option>
                <option value="ROUTER">Router Network</option>
                <option value="PABX">PABX Telepon</option>
                <option value="FACILITY">Fasilitas / Ruangan</option>
              </select>

              {/* Status Dropdown */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Semua Status</option>
                <option value="OPERASIONAL">Operasional</option>
                <option value="CADANGAN">Cadangan</option>
                <option value="PERBAIKAN">Perbaikan</option>
                <option value="RUSAK">Rusak</option>
              </select>

              {/* Reset Button */}
              {(search || selectedLocation || selectedDivision || selectedType || selectedStatus) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedLocation("");
                    setSelectedDivision("");
                    setSelectedType("");
                    setSelectedStatus("");
                  }}
                  className="px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Assets Master Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {isLoading ? (
            <LoadingState
              className="p-12"
              message="Memuat Data Perangkat Office & WHS..."
            />
          ) : officeList.length === 0 ? (
            <EmptyState
              className="p-12"
              icon={Building2}
              iconClassName="w-12 h-12 text-slate-300"
              title="Tidak ada perangkat ditemukan"
              description="Coba sesuaikan kata kunci pencarian atau filter lokasi/divisi."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">No</th>
                    <th className="py-3 px-3">Divisi & User</th>
                    <th className="py-3 px-3">Hardware & Spesifikasi</th>
                    <th className="py-3 px-3">Storage & Kapasitas</th>
                    <th className="py-3 px-3">Periferal & Monitor</th>
                    <th className="py-3 px-3">IP & Jaringan</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {officeList.map((item, idx) => {
                    const isCopied = copiedKey === `ip-${item.id}`;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* No */}
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-400 align-top">
                          {item.item_no || idx + 1}
                        </td>

                        {/* Divisi & User */}
                        <td className="py-3.5 px-3 align-top max-w-[200px]">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${getDivisionBadge(item.division)}`}>
                              {item.division}
                            </span>
                            <span className="font-mono text-[10.5px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                              {item.asset_code}
                            </span>
                          </div>
                          <div className="font-black text-slate-900 text-sm flex items-center gap-1.5 leading-tight">
                            <span>{item.user_name}</span>
                            {item.device_type === "ROUTER" && (
                              <span className="px-1.5 py-0.2 bg-orange-100 text-orange-800 text-[9px] rounded font-bold">ROUTER</span>
                            )}
                            {item.device_type === "PABX" && (
                              <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[9px] rounded font-bold">PABX</span>
                            )}
                          </div>
                          {item.os && item.os !== "-" && (
                            <span className="text-[10px] text-slate-500 font-medium block mt-1">
                              {item.os}
                            </span>
                          )}
                          {item.office_location && (
                            <span className="text-[9.5px] text-slate-400 block mt-0.5">
                              {item.office_location}
                            </span>
                          )}
                        </td>

                        {/* Hardware & Spec */}
                        <td className="py-3.5 px-3 align-top max-w-[230px]">
                          <div className="space-y-1">
                            {item.processor && item.processor !== "-" ? (
                              <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs" title={item.processor}>
                                <Cpu className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span className="truncate">{item.processor}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs select-none">—</span>
                            )}
                            {item.motherboard && item.motherboard !== "-" && (
                              <div className="text-[10px] text-slate-500 truncate" title={item.motherboard}>
                                Mobo: <span className="font-semibold text-slate-700">{item.motherboard}</span>
                              </div>
                            )}
                            {item.ram && item.ram !== "-" && (
                              <div className="text-[10px] font-bold text-slate-600">
                                RAM: <span className="text-indigo-700 font-mono bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200">{item.ram}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Storage */}
                        <td className="py-3.5 px-3 align-top max-w-[190px]">
                          <div className="space-y-1">
                            {item.hard_drive && item.hard_drive !== "-" ? (
                              <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs" title={item.hard_drive}>
                                <HardDrive className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="truncate">{item.hard_drive}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs select-none">—</span>
                            )}
                            {(item.used_disk1 && item.used_disk1 !== "-") && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                Disk C: <span className="text-slate-800 font-bold">{item.used_disk1}</span>
                                {item.used_disk2 && item.used_disk2 !== "-" && (
                                  <> • D: <span className="text-slate-800 font-bold">{item.used_disk2}</span></>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Peripheral & Printer */}
                        <td className="py-3.5 px-3 align-top max-w-[210px]">
                          <div className="space-y-1">
                            {item.monitor && item.monitor !== "-" && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-800 font-bold" title={item.monitor}>
                                <Monitor className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate">{item.monitor}</span>
                              </div>
                            )}
                            {item.printer && item.printer !== "-" && (
                              <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 max-w-fit truncate">
                                <Printer className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="truncate">{item.printer}</span>
                              </div>
                            )}
                            {(item.keyboard && item.keyboard !== "-") && (
                              <div className="text-[10px] text-slate-400 truncate">
                                KB: {item.keyboard} • Mouse: {item.mouse}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* IP Address */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          {item.ip_address && item.ip_address !== "-" && item.ip_address.startsWith("172.") ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-100">
                                  {item.ip_address}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(item.ip_address!, `ip-${item.id}`)}
                                  title="Salin IP"
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                                >
                                  {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              {item.notes && (
                                <span className="text-[10px] text-slate-400 block truncate max-w-[150px]" title={item.notes}>
                                  {item.notes}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-slate-300 font-mono text-xs select-none">—</span>
                              {item.notes && (
                                <span className="text-[10px] text-slate-400 block truncate max-w-[150px]" title={item.notes}>
                                  {item.notes}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 text-center align-top whitespace-nowrap">
                          <StatusBadge
                            status={item.status}
                            label={
                              <>
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    item.status === "OPERASIONAL"
                                      ? "bg-emerald-500"
                                      : item.status === "CADANGAN"
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                  }`}
                                />
                                {item.status}
                              </>
                            }
                            className={
                              item.status === "CADANGAN"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "px-2.5 py-0.5"
                            }
                          />
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-3 text-right align-top whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenSticker(item)}
                              title="Cetak Barcode Label Stiker"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenTicket(item)}
                              title="Buat Tiket Masalah IT"
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                              <LifeBuoy className="w-4 h-4" />
                            </button>

                            {isMIS && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(item)}
                                  title="Edit Spesifikasi"
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item.id!, item.asset_code, item.user_name)}
                                  title="Hapus Perangkat"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
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

      {/* Form Modal (Add / Edit) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Office Assets</span>
                <h3 className="font-bold text-slate-800 text-base">
                  {editingItem ? `Edit Perangkat Office: ${editingItem.user_name}` : "Tambah Perangkat Office Baru"}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lokasi Kantor:
                  </label>
                  <select
                    value={formData.office_location}
                    onChange={(e) => setFormData({ ...formData, office_location: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Head Office">Head Office (Pusat)</option>
                    <option value="Warehouse (WHS)">Warehouse (WHS / Gudang)</option>
                    <option value="Office Terminal 2">Office Terminal 2 (T2)</option>
                    <option value="Office Terminal 3">Office Terminal 3 (T3)</option>
                    <option value="Office Surabaya">Office Surabaya (SBY)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Divisi: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.division}
                    onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {DIVISIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Pengguna / Ruang: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.user_name}
                    onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                    placeholder="PA PEPEN / DANU / SPV J5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold uppercase focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tipe Perangkat:
                  </label>
                  <select
                    value={formData.device_type}
                    onChange={(e: any) => setFormData({ ...formData, device_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="PC">PC Desktop</option>
                    <option value="PRINTER">Printer / Scanner</option>
                    <option value="CCTV">IP Camera / CCTV</option>
                    <option value="ROUTER">Router Network</option>
                    <option value="PABX">PABX Telepon</option>
                    <option value="FACILITY">Fasilitas / Ruangan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    IP Address:
                  </label>
                  <input
                    type="text"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    placeholder="172.16.99.12"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sistem Operasi (OS):
                  </label>
                  <input
                    type="text"
                    value={formData.os}
                    onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                    placeholder="WIN 10 PRO 64 BIT"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status:
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="OPERASIONAL">OPERASIONAL</option>
                    <option value="CADANGAN">CADANGAN</option>
                    <option value="PERBAIKAN">PERBAIKAN</option>
                    <option value="RUSAK">RUSAK</option>
                  </select>
                </div>
              </div>

              {/* Hardware Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="font-bold text-slate-800 block">Spesifikasi Motherboard, CPU & RAM:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Motherboard:</label>
                    <input
                      type="text"
                      value={formData.motherboard}
                      onChange={(e) => setFormData({ ...formData, motherboard: e.target.value })}
                      placeholder="GIGABYTE H110M / ASUS H61M"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Processor:</label>
                    <input
                      type="text"
                      value={formData.processor}
                      onChange={(e) => setFormData({ ...formData, processor: e.target.value })}
                      placeholder="Intel Core i3 / i5"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">RAM:</label>
                    <input
                      type="text"
                      value={formData.ram}
                      onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                      placeholder="8 GB / 16 GB"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <span className="font-bold text-slate-800 block pt-1">Storage & Kapasitas Disk:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Storage (SSD / HDD):</label>
                    <input
                      type="text"
                      value={formData.hard_drive}
                      onChange={(e) => setFormData({ ...formData, hard_drive: e.target.value })}
                      placeholder="(SSD) ADATA 480GB"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Used Disk C:</label>
                    <input
                      type="text"
                      value={formData.used_disk1}
                      onChange={(e) => setFormData({ ...formData, used_disk1: e.target.value })}
                      placeholder="49.2 GB"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Used Disk D:</label>
                    <input
                      type="text"
                      value={formData.used_disk2}
                      onChange={(e) => setFormData({ ...formData, used_disk2: e.target.value })}
                      placeholder="31.0 GB"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <span className="font-bold text-slate-800 block pt-1">Periferal & Printer:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Monitor:</label>
                    <input
                      type="text"
                      value={formData.monitor}
                      onChange={(e) => setFormData({ ...formData, monitor: e.target.value })}
                      placeholder="LG 20 INCH"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Printer:</label>
                    <input
                      type="text"
                      value={formData.printer}
                      onChange={(e) => setFormData({ ...formData, printer: e.target.value })}
                      placeholder="CANON PIXMA G2010"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Keyboard:</label>
                    <input
                      type="text"
                      value={formData.keyboard}
                      onChange={(e) => setFormData({ ...formData, keyboard: e.target.value })}
                      placeholder="LOGITECH USB"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Mouse:</label>
                    <input
                      type="text"
                      value={formData.mouse}
                      onChange={(e) => setFormData({ ...formData, mouse: e.target.value })}
                      placeholder="LOGITECH USB"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan:</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Password, nomor ekstensi, port router..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {formError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Menyimpan..." : "Simpan Perangkat Office"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Sticker Generator Modal */}
      <BarcodeGeneratorModal
        isOpen={!!selectedAssetForSticker}
        asset={selectedAssetForSticker}
        onClose={() => setSelectedAssetForSticker(null)}
      />

      {/* Ticket Modal */}
      <TicketModal
        isOpen={!!selectedAssetForTicket}
        asset={selectedAssetForTicket}
        onClose={() => setSelectedAssetForTicket(null)}
      />

      {/* Scanner Modal */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </SidebarLayout>
  );
}

export default function OfficePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Memuat Data Perangkat Office...</div>}>
      <OfficeContent />
    </Suspense>
  );
}

