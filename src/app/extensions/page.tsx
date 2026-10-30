"use client";

import { useState } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import StatCard from "@/components/common/StatCard";
import SearchInput from "@/components/common/SearchInput";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import Modal from "@/components/common/Modal";
import { useApiData } from "@/hooks/useApiData";
import { formatDate } from "@/lib/utils";
import { PhoneExtension } from "@/types";
import {
  PhoneCall,
  Plus,
  Download,
  Printer,
  Edit2,
  Trash2,
  Copy,
  Check,
  Building2,
  Shield,
  RefreshCw,
  PhoneForwarded,
} from "lucide-react";

type ExtStats = {
  totalExtensions: number;
  activeExtensions: number;
  countByDivision: Record<string, number>;
};

type ExtensionsPayload = { data: PhoneExtension[]; stats: ExtStats };

const EMPTY_STATS: ExtStats = {
  totalExtensions: 0,
  activeExtensions: 0,
  countByDivision: {},
};

export default function ExtensionsPage() {
  // Filters
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
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

  // Query string & cache key mengikuti filter; endpoint tetap /api/extensions
  const params = new URLSearchParams();
  if (submittedSearch) params.append("search", submittedSearch);
  if (selectedDivision !== "ALL") params.append("division", selectedDivision);
  const cacheKey = `ext_${submittedSearch}_${selectedDivision}`;

  const { data, isLoading, refresh } = useApiData<ExtensionsPayload>(
    `/api/extensions?${params.toString()}`,
    {
      cacheKey,
      transform: (json) => {
        const res = json as {
          success?: boolean;
          data?: PhoneExtension[];
          stats?: ExtStats;
        };
        return {
          data: res.success && Array.isArray(res.data) ? res.data : [],
          stats: res.stats ?? EMPTY_STATS,
        };
      },
    }
  );

  const extensions = data?.data ?? [];
  const stats = data?.stats ?? EMPTY_STATS;

  const handleFetch = () => {
    if (search !== submittedSearch) setSubmittedSearch(search);
    else refresh();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFetch();
  };

  const selectDivision = (div: string) => {
    if (search !== submittedSearch) setSubmittedSearch(search);
    setSelectedDivision(div);
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
          handleFetch();
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
          handleFetch();
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
        handleFetch();
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
          <StatCard
            label="Total Extension"
            value={stats.totalExtensions}
            icon={PhoneCall}
            iconClassName="text-blue-600"
            hint="Pesawat Telepon Head Office"
          />
          <StatCard
            label="Operator PABX"
            value={
              <>
                0000 <span className="text-xs font-normal text-slate-500">(Riani)</span>
              </>
            }
            valueClassName="text-xl sm:text-2xl"
            icon={PhoneForwarded}
            iconClassName="text-emerald-600"
            hint="Operator Utama / Resepsionis (Nol 4X)"
            hintClassName="text-emerald-600 font-medium"
          />
          <StatCard
            label="Divisi & Lokasi"
            value={`${Object.keys(stats.countByDivision || {}).length} Unit`}
            icon={Building2}
            iconClassName="text-indigo-600"
            hint="Head Office & Warehouse (WHS)"
          />
          <StatCard
            label="Status Jalur MIS"
            value="IT Helpdesk"
            valueClassName="text-xl sm:text-2xl"
            icon={Shield}
            iconClassName="text-purple-600"
            hint="Pa Pepen, Farhan, Hamdi, Bili"
            hintClassName="text-purple-600 font-medium"
          />
        </div>

        {/* Division Quick Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => selectDivision("ALL")}
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
              onClick={() => selectDivision(div)}
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
          <SearchInput
            value={search}
            onChange={setSearch}
            onSubmit={handleSearchSubmit}
            placeholder="Cari Nama Karyawan, Nomor Extension (misal: 1101, 1011, 1401), Divisi, atau IP..."
          />

          <button
            onClick={handleFetch}
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
                {isLoading ? (
                  <tr>
                    <td colSpan={9}>
                      <LoadingState message="Memuat direktori extension telepon..." />
                    </td>
                  </tr>
                ) : extensions.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState
                        className="py-12"
                        title="Tidak ada data extension yang cocok dengan pencarian."
                      />
                    </td>
                  </tr>
                ) : (
                  extensions.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        {item.item_no || index + 1}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge
                          status={item.division}
                          variant="division"
                          className="rounded-lg px-2.5 py-0.5 text-xs font-black"
                        />
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
                        <StatusBadge status={item.status} />
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
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExt ? "Edit Nomor Extension" : "Tambah Extension Baru"}
        description="PABX Internal Head Office & Toko"
        icon={PhoneCall}
        iconClassName="bg-blue-50 text-blue-600"
        size="sm"
      >
        <form onSubmit={handleSubmitForm} className="space-y-3.5 text-xs">
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
      </Modal>

      {/* Modal Cetak Lembar Buku Telepon Extension PABX */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Lembar Cetak Buku Extension Telepon PABX (A4)"
        icon={Printer}
        iconClassName="bg-blue-50 text-blue-600"
        size="lg"
      >
        <div className="space-y-6">
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
                  Operator Utama: Riani (Ext. 0000 / Nol 4X) • Update: {formatDate(new Date())}
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
      </Modal>
    </SidebarLayout>
  );
}

