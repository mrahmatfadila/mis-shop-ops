"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import { PhoneExtension } from "@/types";
import {
  PhoneCall,
  Search,
  Plus,
  Download,
  Printer,
  Edit2,
  Trash2,
  Copy,
  Check,
  Building2,
  Users,
  Shield,
  RefreshCw,
  X,
  PhoneForwarded,
  Layers,
  Monitor
} from "lucide-react";
import { getClientCache, setClientCache } from "@/lib/cache";

export default function ExtensionsPage() {
  const [extensions, setExtensions] = useState<PhoneExtension[]>([]);
  const [stats, setStats] = useState({
    totalExtensions: 0,
    activeExtensions: 0,
    countByDivision: {
      ACC: 0, BOD: 0, FIN: 0, GS: 0, MCD: 0, MIS: 0
    } as Record<string, number>
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("ALL");
  const [copiedExt, setCopiedExt] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExt, setEditingExt] = useState<PhoneExtension | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    division: "ACC",
    user_name: "",
    ext: "",
    location: "Head Office",
    notes: "",
    ip_address: "-",
    status: "AKTIF" as 'AKTIF' | 'KOSONG' | 'STANDBY'
  });

  const divisions = ["ACC", "BOD", "FIN", "GS", "MCD", "MIS", "WHS", "HRD", "FACILITY"];

  const fetchExtensions = async () => {
    const cacheKey = `ext_${search}_${selectedDivision}`;
    const cached = getClientCache<{ data: PhoneExtension[]; stats: any }>(cacheKey);
    if (cached) {
      setExtensions(cached.data);
      if (cached.stats) setStats(cached.stats);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedDivision !== "ALL") params.append("division", selectedDivision);

      const res = await fetch(`/api/extensions?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setExtensions(json.data);
        if (json.stats) {
          setStats(json.stats);
        }
        setClientCache(cacheKey, { data: json.data, stats: json.stats });
      }
    } catch (err) {
      console.error("Failed to load phone extensions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtensions();
  }, [selectedDivision]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExtensions();
  };

  const handleCopy = (ext: string) => {
    navigator.clipboard.writeText(ext);
    setCopiedExt(ext);
    setTimeout(() => setCopiedExt(null), 2000);
  };

  const handleOpenAdd = () => {
    setEditingExt(null);
    setFormData({
      division: selectedDivision !== "ALL" ? selectedDivision : "ACC",
      user_name: "",
      ext: "",
      location: "Head Office",
      notes: "",
      ip_address: "-",
      status: "AKTIF"
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ext: PhoneExtension) => {
    setEditingExt(ext);
    setFormData({
      division: ext.division || "ACC",
      user_name: ext.user_name || "",
      ext: ext.ext === "-" ? "" : ext.ext,
      location: ext.location || "Head Office",
      notes: ext.notes || "",
      ip_address: ext.ip_address || "-",
      status: ext.status || "AKTIF"
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExt && editingExt.id) {
        const res = await fetch(`/api/extensions/${editingExt.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        const json = await res.json();
        if (json.success) {
          setIsModalOpen(false);
          fetchExtensions();
        } else {
          alert(json.message || "Gagal memperbarui extension");
        }
      } else {
        const res = await fetch("/api/extensions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        const json = await res.json();
        if (json.success) {
          setIsModalOpen(false);
          fetchExtensions();
        } else {
          alert(json.message || "Gagal menambahkan extension");
        }
      }
    } catch (err) {
      console.error("Error saving extension", err);
      alert("Terjadi kesalahan saat menyimpan data");
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!confirm("Apakah Anda yakin ingin menghapus nomor extension ini?")) return;
    try {
      const res = await fetch(`/api/extensions/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchExtensions();
      } else {
        alert(json.message || "Gagal menghapus extension");
      }
    } catch (err) {
      console.error("Error deleting extension", err);
    }
  };

  const handleExportCSV = () => {
    const headers = ["No", "Divisi", "Nama", "Nomor Ext", "Lokasi", "Keterangan", "IP Address PC", "Status"];
    const rows = extensions.map((e, idx) => [
      e.item_no || idx + 1,
      `"${e.division}"`,
      `"${e.user_name}"`,
      `"${e.ext}"`,
      `"${e.location || ""}"`,
      `"${(e.notes || "").replace(/"/g, '""')}"`,
      `"${e.ip_address || ""}"`,
      `"${e.status || ""}"`
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Direktori_Ext_Telepon_PABX_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDivisionBadgeColor = (div: string) => {
    switch (div) {
      case "ACC":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "BOD":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "FIN":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "GS":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "MCD":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "MIS":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "WHS":
        return "bg-cyan-50 text-cyan-800 border-cyan-300";
      case "HRD":
        return "bg-pink-50 text-pink-700 border-pink-200";
      case "FACILITY":
        return "bg-teal-50 text-teal-700 border-teal-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <SidebarLayout>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-xs font-semibold text-blue-300">
                <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                PABX Panasonic & IP Intercom System • Head Office
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Direktori Extension Telepon (PABX)
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 max-w-2xl">
                Buku telepon nomor extension internal kantor pusat untuk divisi Accounting, Direksi (BOD), Finance, General Services, Merchandise, dan MIS IT Support.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/20"
              >
                <Printer className="w-4 h-4" />
                Cetak Lembar Telepon
              </button>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/20"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition shadow-lg shadow-blue-500/25"
              >
                <Plus className="w-4 h-4" />
                Tambah Ext
              </button>
            </div>
          </div>
        </div>

        {/* Metric Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Total Extension</span>
              <PhoneCall className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.totalExtensions}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Pesawat Telepon Head Office
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Operator PABX</span>
              <PhoneForwarded className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-800">
              0000 <span className="text-xs font-normal text-slate-500">(Riani)</span>
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">
              Operator Utama / Resepsionis (Nol 4X)
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Divisi & Lokasi</span>
              <Building2 className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-800">
              {Object.keys(stats.countByDivision || {}).length} Unit
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Head Office & Warehouse (WHS)
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Status Jalur MIS</span>
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-800">IT Helpdesk</div>
            <div className="text-[11px] text-purple-600 font-medium mt-1">
              Pa Pepen, Farhan, Hamdi, Bili
            </div>
          </div>
        </div>

        {/* Division Quick Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedDivision("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              selectedDivision === "ALL"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            Semua Divisi
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
              {stats.totalExtensions}
            </span>
          </button>
          {divisions.map(div => (
            <button
              key={div}
              onClick={() => setSelectedDivision(div)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                selectedDivision === div
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {div}
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedDivision === div ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {stats.countByDivision[div] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Nama Karyawan, Nomor Extension (misal: 1101, 1011, 1401), Divisi, atau IP..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </form>

          <button
            onClick={fetchExtensions}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition flex items-center gap-1.5 text-xs font-semibold self-end md:self-auto"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Extensions Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-3 text-center w-10">No</th>
                  <th className="py-3.5 px-3">Divisi</th>
                  <th className="py-3.5 px-3">Nama Karyawan / PIC</th>
                  <th className="py-3.5 px-3">Nomor Extension</th>
                  <th className="py-3.5 px-3">Lokasi / Ruangan</th>
                  <th className="py-3.5 px-3">Jabatan / Keterangan</th>
                  <th className="py-3.5 px-3">IP Address PC</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-3 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                      Memuat direktori extension telepon...
                    </td>
                  </tr>
                ) : extensions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Tidak ada data extension yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  extensions.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        {item.item_no || index + 1}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black border ${getDivisionBadgeColor(item.division)}`}>
                          {item.division}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{item.user_name}</div>
                      </td>
                      <td className="py-3 px-3">
                        {item.ext && item.ext !== "-" ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-mono text-sm font-black tracking-wider">
                            <span>{item.ext}</span>
                            <button
                              onClick={() => handleCopy(item.ext)}
                              className="p-0.5 hover:text-blue-900 transition"
                              title="Salin Nomor Ext"
                            >
                              {copiedExt === item.ext ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-blue-400" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 italic">
                            Line Helpdesk / Belum Diisi
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {item.location || "Head Office"}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px]">
                        {item.notes || "-"}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        {item.ip_address && item.ip_address !== "-" ? (
                          <span className="text-slate-800">{item.ip_address}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === "AKTIF"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.status === "KOSONG"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-amber-100 text-amber-800"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition"
                            title="Edit Extension"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
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

      {/* Modal Tambah / Edit Extension */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingExt ? "Edit Nomor Extension" : "Tambah Extension Baru"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    PABX Internal Head Office & Toko
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

            <form onSubmit={handleSubmitForm} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Divisi <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.division}
                  onChange={e => setFormData({ ...formData, division: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                  required
                >
                  {divisions.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Karyawan / PIC <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BU NYOMAN / PA PEPEN"
                  value={formData.user_name}
                  onChange={e => setFormData({ ...formData, user_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 uppercase font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nomor Extension (4 Digit)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 1101, 1011, 0000 (atau kosongkan untuk MIS)"
                  value={formData.ext}
                  onChange={e => setFormData({ ...formData, ext: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Lokasi / Ruangan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Head Office / Ruang MIS"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jabatan / Keterangan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Accounting Manager / Operator PABX"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  IP Address Komputer PC (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 172.16.45.10"
                  value={formData.ip_address}
                  onChange={e => setFormData({ ...formData, ip_address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="AKTIF">AKTIF</option>
                  <option value="KOSONG">KOSONG / STANDBY</option>
                  <option value="STANDBY">STANDBY</option>
                </select>
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-md shadow-blue-600/20"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Lembar Buku Telepon Extension PABX */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 p-6 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" />
                Lembar Cetak Buku Extension Telepon PABX (A4)
              </h3>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Print Sheet Preview */}
            <div className="border border-slate-300 p-6 rounded-xl bg-white text-slate-900 space-y-4 shadow-sm text-xs">
              <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
                <h2 className="text-base font-black tracking-wider uppercase text-slate-900">
                  PT. PLAZA BALI & SAM GROUP
                </h2>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                  DIREKTORI NOMOR EXTENSION TELEPON PABX HEAD OFFICE
                </h3>
                <p className="text-[10px] text-slate-500">
                  Operator Utama: Riani (Ext. 0000 / Nol 4X) • Update: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Grid 2 Columns for Printing */}
              <div className="grid grid-cols-2 gap-4">
                {divisions.map(div => {
                  const divItems = extensions.filter(e => e.division === div);
                  if (divItems.length === 0) return null;
                  return (
                    <div key={div} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50">
                      <div className="font-black text-[11px] text-blue-900 border-b border-slate-200 pb-1 mb-1.5 flex justify-between items-center">
                        <span>DIVISI {div}</span>
                        <span className="text-[9px] font-normal text-slate-500">{divItems.length} Kontak</span>
                      </div>
                      <table className="w-full text-[11px]">
                        <tbody>
                          {divItems.map(item => (
                            <tr key={item.id} className="border-b border-slate-100 last:border-none">
                              <td className="py-1 font-semibold text-slate-800">{item.user_name}</td>
                              <td className="py-1 text-right font-mono font-black text-blue-700">
                                {item.ext || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-200 pt-2 text-[9px] text-slate-500 text-center italic">
                *Simpan atau tempel lembar direktori ini di dekat meja kerja / pesawat telepon kantor untuk kemudahan komunikasi antar departemen.
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
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Lembar Telepon
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}

