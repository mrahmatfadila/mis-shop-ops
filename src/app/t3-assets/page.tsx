"use client";

import { useState, useMemo } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import StatCard from "@/components/common/StatCard";
import SearchInput from "@/components/common/SearchInput";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import { useApiData } from "@/hooks/useApiData";
import { formatNumber, formatRupiah } from "@/lib/utils";
import { T3FixedAsset } from "@/types";
import {
  Layers,
  Plus,
  Download,
  Printer,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Building2,
  DollarSign,
  Tag,
  Monitor,
  Laptop,
  QrCode,
  HardDrive,
  RefreshCw,
  X
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AccessDenied from "@/components/AccessDenied";

type T3Stats = {
  totalAssets: number;
  totalNilai: number;
  totalQty: number;
  operationalCount: number;
  countByLocation: Record<string, number>;
};

type T3Payload = { data: T3FixedAsset[]; stats: T3Stats };

const EMPTY_T3_STATS: T3Stats = {
  totalAssets: 0,
  totalNilai: 0,
  totalQty: 0,
  operationalCount: 0,
  countByLocation: {},
};

export default function T3AssetsPage() {
  const { isAdmin, isMIS, isManager } = useAuth();

  if (!isAdmin && !isMIS && !isManager) {
    return <AccessDenied moduleName="Aset Tetap T3 (DF1-DF7)" />;
  }
  // Filters
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<T3FixedAsset | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeAsset, setBarcodeAsset] = useState<T3FixedAsset | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    tgl_perolehan: new Date().toISOString().split("T")[0],
    tgl_pemakaian: new Date().toISOString().split("T")[0],
    kategori: "POS Terminal",
    nama_merk: "",
    serial_number: "-",
    spesifikasi: "",
    lokasi: "DF1",
    pengguna: "",
    harga_pembelian: 0,
    qty: 1,
    no_asset: "",
    keterangan: "",
    status: "OPERASIONAL" as 'OPERASIONAL' | 'RUSAK' | 'PERBAIKAN' | 'CADANGAN'
  });

  const categories = [
    "POS Terminal",
    "Printer Kasir",
    "Passport Reader",
    "Barcode Scanner",
    "Cash Drawer",
    "PC Office / SPV",
    "Network / Jaringan",
    "UPS / Kelistrikan",
    "Display / Monitor",
    "Lainnya"
  ];

  const locations = ["DF1", "DF2", "DF3", "DF4", "DF5", "DF6", "DF7"];

  // Query string & cache key mengikuti filter; endpoint tetap /api/t3-assets
  const params = new URLSearchParams();
  if (submittedSearch) params.append("search", submittedSearch);
  if (selectedLocation !== "ALL") params.append("lokasi", selectedLocation);
  if (selectedCategory !== "ALL") params.append("kategori", selectedCategory);
  if (selectedStatus !== "ALL") params.append("status", selectedStatus);
  const cacheKey = `t3_assets_${submittedSearch}_${selectedLocation}_${selectedCategory}_${selectedStatus}`;

  const {
    data,
    isLoading,
    refresh: fetchAssets,
  } = useApiData<T3Payload>(`/api/t3-assets?${params.toString()}`, {
    cacheKey,
    transform: (json) => {
      const res = json as {
        success?: boolean;
        data?: T3FixedAsset[];
        stats?: T3Stats;
      };
      return {
        data: res.success && Array.isArray(res.data) ? res.data : [],
        stats: res.stats ?? EMPTY_T3_STATS,
      };
    },
  });

  const assets = data?.data ?? [];
  const stats = data?.stats ?? EMPTY_T3_STATS;

  const handleFetch = () => {
    if (search !== submittedSearch) setSubmittedSearch(search);
    else fetchAssets();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFetch();
  };

  // Filter berubah => pakai kata kunci yang sedang diketik (perilaku lama)
  const applyFilter = (apply: () => void) => {
    if (search !== submittedSearch) setSubmittedSearch(search);
    apply();
  };

  const handleOpenAdd = () => {
    setEditingAsset(null);
    setFormData({
      tgl_perolehan: new Date().toISOString().split("T")[0],
      tgl_pemakaian: new Date().toISOString().split("T")[0],
      kategori: "POS Terminal",
      nama_merk: "",
      serial_number: "-",
      spesifikasi: "",
      lokasi: selectedLocation !== "ALL" ? selectedLocation : "DF1",
      pengguna: "",
      harga_pembelian: 0,
      qty: 1,
      no_asset: "",
      keterangan: "",
      status: "OPERASIONAL"
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (asset: T3FixedAsset) => {
    setEditingAsset(asset);
    setFormData({
      tgl_perolehan: asset.tgl_perolehan || "",
      tgl_pemakaian: asset.tgl_pemakaian || "",
      kategori: asset.kategori || "POS Terminal",
      nama_merk: asset.nama_merk || "",
      serial_number: asset.serial_number || "-",
      spesifikasi: asset.spesifikasi || "",
      lokasi: asset.lokasi || "DF1",
      pengguna: asset.pengguna || "",
      harga_pembelian: asset.harga_pembelian || 0,
      qty: asset.qty || 1,
      no_asset: asset.no_asset || "",
      keterangan: asset.keterangan || "",
      status: asset.status || "OPERASIONAL"
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAsset && editingAsset.id) {
        // Update
        const res = await fetch(`/api/t3-assets/${editingAsset.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        const json = await res.json();
        if (json.success) {
          setIsModalOpen(false);
          fetchAssets();
        } else {
          alert(json.message || "Gagal memperbarui aset");
        }
      } else {
        // Create
        const res = await fetch("/api/t3-assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        const json = await res.json();
        if (json.success) {
          setIsModalOpen(false);
          fetchAssets();
        } else {
          alert(json.message || "Gagal menambahkan aset");
        }
      }
    } catch (err) {
      console.error("Error saving T3 asset", err);
      alert("Terjadi kesalahan saat menyimpan aset");
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!confirm("Apakah Anda yakin ingin menghapus catatan aset ini?")) return;
    try {
      const res = await fetch(`/api/t3-assets/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchAssets();
      } else {
        alert(json.message || "Gagal menghapus aset");
      }
    } catch (err) {
      console.error("Error deleting asset", err);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenBarcodeTag = (asset: T3FixedAsset) => {
    setBarcodeAsset(asset);
    setIsBarcodeModalOpen(true);
  };

  const handleExportCSV = () => {
    const headers = [
      "No",
      "Tgl Perolehan",
      "Tgl Pemakaian",
      "Kategori",
      "Nama/Merk",
      "Serial Number",
      "Spesifikasi",
      "Lokasi",
      "Pengguna",
      "Harga Pembelian",
      "Qty",
      "No. Asset",
      "Keterangan",
      "Status"
    ];

    const rows = assets.map((a, idx) => [
      a.item_no || idx + 1,
      `"${a.tgl_perolehan || ""}"`,
      `"${a.tgl_pemakaian || ""}"`,
      `"${a.kategori || ""}"`,
      `"${(a.nama_merk || "").replace(/"/g, '""')}"`,
      `"${(a.serial_number || "").replace(/"/g, '""')}"`,
      `"${(a.spesifikasi || "").replace(/"/g, '""')}"`,
      `"${a.lokasi || ""}"`,
      `"${(a.pengguna || "").replace(/"/g, '""')}"`,
      a.harga_pembelian || 0,
      a.qty || 1,
      `"${a.no_asset || ""}"`,
      `"${(a.keterangan || "").replace(/"/g, '""')}"`,
      `"${a.status || ""}"`
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Aset_MIS_T3_DF1-DF7_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLocationBadgeColor = (loc: string) => {
    switch (loc) {
      case "DF1":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "DF2":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "DF3":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "DF4":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DF5":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "DF6":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "DF7":
        return "bg-teal-50 text-teal-700 border-teal-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <SidebarLayout>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-xs font-semibold text-indigo-300">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Terminal 3 Soekarno-Hatta • Plaza Bali Duty Free
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Pencatatan Aset MIS T3-DF1 (DF1 - DF7)
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                Daftar inventaris aktiva tetap & hardware MIS di counter Duty Free 1 sampai 7 Terminal 3: Mesin POS NCR/Kassen, Passport Reader, Printer Struk, Scanner Barcode, UPS, & Jaringan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/20"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition shadow-lg shadow-indigo-500/25"
              >
                <Plus className="w-4 h-4" />
                Tambah Aset DF
              </button>
            </div>
          </div>
        </div>

        {/* Metric Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Unit Aset"
            value={formatNumber(stats.totalAssets)}
            icon={Layers}
            iconClassName="text-indigo-600"
            hint="Tersebar di Counter DF1 s/d DF7"
          />

          <StatCard
            label="Nilai Total Perolehan"
            value={formatRupiah(stats.totalNilai)}
            valueClassName="text-xl sm:text-2xl"
            icon={DollarSign}
            iconClassName="text-emerald-600"
            hint="Akumulasi Harga Pembelian"
            hintClassName="text-emerald-600 font-medium"
          />

          <StatCard
            label="Aset Operasional"
            value={
              <>
                {formatNumber(stats.operationalCount)}{" "}
                <span className="text-xs font-normal text-slate-400">
                  / {formatNumber(stats.totalAssets)}
                </span>
              </>
            }
            icon={CheckCircle2}
            iconClassName="text-blue-600"
            hint="Status Berfungsi Normal"
            hintClassName="text-blue-600 font-medium"
          />

          <StatCard
            label="Cakupan Lokasi"
            value="7 Counter"
            icon={Building2}
            iconClassName="text-purple-600"
            hint="DF1, DF2, DF3, DF4, DF5, DF6, DF7"
          />
        </div>

        {/* Location Quick Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => applyFilter(() => setSelectedLocation("ALL"))}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              selectedLocation === "ALL"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            Semua DF
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
              {stats.totalAssets}
            </span>
          </button>
          {locations.map(loc => (
            <button
              key={loc}
              onClick={() => applyFilter(() => setSelectedLocation(loc))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                selectedLocation === loc
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {loc}
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedLocation === loc ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {stats.countByLocation[loc] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            onSubmit={handleSearchSubmit}
            placeholder="Cari No. Asset, Nama/Merk, Serial Number, Pengguna, Spesifikasi..."
            inputClassName="pl-9 pr-4 py-2 border-slate-200 rounded-xl focus:ring-indigo-500/20 focus:border-indigo-500"
          />

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={e => applyFilter(() => setSelectedCategory(e.target.value))}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={e => applyFilter(() => setSelectedStatus(e.target.value))}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">Semua Status</option>
              <option value="OPERASIONAL">OPERASIONAL</option>
              <option value="RUSAK">RUSAK</option>
              <option value="PERBAIKAN">PERBAIKAN</option>
              <option value="CADANGAN">CADANGAN</option>
            </select>

            <button
              onClick={handleFetch}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-3 text-center w-10">No</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Tgl Perolehan</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Tgl Pemakaian</th>
                  <th className="py-3.5 px-3">Kategori</th>
                  <th className="py-3.5 px-3">Nama / Merk</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Serial Number</th>
                  <th className="py-3.5 px-3 min-w-[200px]">Spesifikasi</th>
                  <th className="py-3.5 px-3 text-center">Lokasi</th>
                  <th className="py-3.5 px-3">Pengguna</th>
                  <th className="py-3.5 px-3 text-right whitespace-nowrap">Harga Pembelian</th>
                  <th className="py-3.5 px-3 text-center">Qty</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">No. Asset</th>
                  <th className="py-3.5 px-3 min-w-[150px]">Keterangan</th>
                  <th className="py-3.5 px-3 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={14}>
                      <LoadingState message="Memuat data aset MIS T3-DF..." />
                    </td>
                  </tr>
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={14}>
                      <EmptyState
                        className="py-12"
                        title="Tidak ada data aset yang sesuai filter pencarian."
                      />
                    </td>
                  </tr>
                ) : (
                  assets.map((asset, index) => (
                    <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        {asset.item_no || index + 1}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {asset.tgl_perolehan || "-"}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {asset.tgl_pemakaian || "-"}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800">
                          {asset.kategori}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{asset.nama_merk}</div>
                        {asset.status && asset.status !== "OPERASIONAL" && (
                          <StatusBadge
                            status={asset.status}
                            className="mt-0.5 px-1.5 py-0.2 rounded text-[9px]"
                          />
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {asset.serial_number || "-"}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-600 leading-relaxed">
                        {asset.spesifikasi || "-"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black border ${getLocationBadgeColor(asset.lokasi)}`}>
                          {asset.lokasi}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                        {asset.pengguna || "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatRupiah(asset.harga_pembelian || 0)}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {asset.qty || 1}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[11px] font-bold">
                          <span>{asset.no_asset}</span>
                          <button
                            onClick={() => handleCopy(asset.no_asset)}
                            className="p-0.5 hover:text-indigo-900 transition"
                            title="Salin No. Asset"
                          >
                            {copiedCode === asset.no_asset ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-indigo-400" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-500">
                        {asset.keterangan || "-"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenBarcodeTag(asset)}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition"
                            title="Cetak Label Tagging"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(asset)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition"
                            title="Edit Data"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(asset.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Tambah / Edit Aset */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 my-8 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingAsset ? "Edit Catatan Aset MIS T3" : "Tambah Catatan Aset MIS T3-DF"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Counter Duty Free 1 s/d 7 Terminal 3 Soekarno-Hatta
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Lokasi Counter DF <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.lokasi}
                    onChange={e => setFormData({ ...formData, lokasi: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  >
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc} (Duty Free {loc.replace("DF", "")})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kategori Hardware <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.kategori}
                    onChange={e => setFormData({ ...formData, kategori: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama / Merk Perangkat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: NCR RealPOS 70XRT / Epson TM-U220D"
                    value={formData.nama_merk}
                    onChange={e => setFormData({ ...formData, nama_merk: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Serial Number (S/N)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: NCR-70X-992144"
                    value={formData.serial_number}
                    onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tanggal Perolehan
                  </label>
                  <input
                    type="date"
                    value={formData.tgl_perolehan}
                    onChange={e => setFormData({ ...formData, tgl_perolehan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tanggal Pemakaian / Go-Live
                  </label>
                  <input
                    type="date"
                    value={formData.tgl_pemakaian}
                    onChange={e => setFormData({ ...formData, tgl_pemakaian: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Pengguna / Kasir / Unit
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kasir DF1-P01 / SPV DF1"
                    value={formData.pengguna}
                    onChange={e => setFormData({ ...formData, pengguna: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    No. Asset (Otomatis jika dikosongkan)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: AST-MIS-T3-DF1-008"
                    value={formData.no_asset}
                    onChange={e => setFormData({ ...formData, no_asset: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Harga Pembelian (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.harga_pembelian}
                    onChange={e => setFormData({ ...formData, harga_pembelian: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Qty Unit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.qty}
                    onChange={e => setFormData({ ...formData, qty: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Spesifikasi Teknis
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Intel Celeron G540, 4GB DDR3, 128GB SSD, Win 7 Embed, Dual Display"
                  value={formData.spesifikasi}
                  onChange={e => setFormData({ ...formData, spesifikasi: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Status Kondisi
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="OPERASIONAL">OPERASIONAL</option>
                    <option value="RUSAK">RUSAK</option>
                    <option value="PERBAIKAN">PERBAIKAN</option>
                    <option value="CADANGAN">CADANGAN</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Keterangan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Mesin Kasir Utama DF1 Gate 1-2, EDC Aktif"
                    value={formData.keterangan}
                    onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
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
                  {editingAsset ? "Simpan Perubahan" : "Simpan Aset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Label Barcode Tagging */}
      {isBarcodeModalOpen && barcodeAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-indigo-600" />
                Stiker Tagging Aset Tetap MIS
              </h3>
              <button
                onClick={() => setIsBarcodeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Label Fisik Print Preview */}
            <div className="border-2 border-dashed border-slate-300 p-4 rounded-xl bg-slate-50 text-center space-y-3">
              <div className="border-b border-slate-200 pb-2">
                <div className="text-[10px] uppercase font-black tracking-widest text-slate-500">
                  PLAZA BALI DUTY FREE • MIS IT DEPT
                </div>
                <div className="text-xs font-bold text-indigo-700">
                  TERMINAL 3 BANDARA SOEKARNO-HATTA
                </div>
              </div>

              {/* Fake Barcode Representation */}
              <div className="py-2 px-4 bg-white rounded-lg border border-slate-200 inline-block shadow-sm">
                <div className="font-mono text-base font-black tracking-wider text-slate-900">
                  {barcodeAsset.no_asset}
                </div>
                <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                  S/N: {barcodeAsset.serial_number}
                </div>
              </div>

              <div className="text-left space-y-1 text-[11px] bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-400">Nama Aset:</span>
                  <span className="font-bold text-slate-800">{barcodeAsset.nama_merk}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kategori:</span>
                  <span className="font-semibold text-slate-700">{barcodeAsset.kategori}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lokasi:</span>
                  <span className="font-bold text-indigo-600">{barcodeAsset.lokasi} (Terminal 3)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pengguna:</span>
                  <span className="font-medium text-slate-700">{barcodeAsset.pengguna}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tgl Perolehan:</span>
                  <span className="font-mono text-slate-700">{barcodeAsset.tgl_perolehan}</span>
                </div>
              </div>

              <div className="text-[9px] text-slate-400 italic">
                *Dilarang merusak atau melepas label inventaris MIS tanpa izin.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsBarcodeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Label
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}

