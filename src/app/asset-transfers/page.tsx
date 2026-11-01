"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import SidebarLayout from "@/components/SidebarLayout";
import StatCard from "@/components/common/StatCard";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { AssetTransfer, PosHardwareAsset } from "@/types";
import {
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Scan,
  Printer,
  FileText,
  User,
  Calendar,
  Layers,
  Laptop,
  Boxes,
  ArrowRight,
  Repeat,
  Package,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Building2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  X,
  ChevronRight,
  AlertTriangle,
  Info,
  Archive,
  CreditCard,
  Grid,
  List,
} from "lucide-react";

export default function AssetTransfersPage() {
  const { user } = useAuth();

  // State data transfers
  const [transfers, setTransfers] = useState<AssetTransfer[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    replace_and_transfer: 0,
    direct_transfer: 0,
    new_install: 0,
    return_to_spare: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterComponent, setFilterComponent] = useState("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // State daftar POS untuk dropdown form
  const [posList, setPosList] = useState<PosHardwareAsset[]>([]);

  // State Modal Catat Mutasi
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    transfer_type: "REPLACE_AND_TRANSFER",
    component_type: "BARCODE_SCANNER",
    item_name: "Barcode Scanner Kasir",
    source_type: "POS",
    source_asset_code: "CGKT3DFD06-P01",
    source_location: "Terminal 3 - Counter DFD06 (P01)",
    source_shop: "Plaza Bali",
    source_item_model: "Honeywell Voyager 1400g",
    source_item_sn: "-",
    dest_type: "POS",
    dest_asset_code: "CGKT3DFD07-P02",
    dest_location: "Terminal 3 - Counter DFD07 (P02)",
    dest_shop: "Plaza Bali",
    new_item_model: "Honeywell Xenon 1950g 2D",
    new_item_sn: "-",
    new_item_source: "MIS PROC (Pengadaan Baru)",
    performed_by: user?.name || "IT Support",
    reason: "Replace scanner barcode di P01 DF6 dengan unit baru kiriman MIS PROC, dan scanner lama yang masih berfungsi dialihkan ke P02 DF7 untuk menggantikan scanner DF7 yang bermasalah.",
    reference_no: "BA-MUT-2026-004",
    notes: "",
  });

  // Fetch data mutasi
  const fetchTransfers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterType !== "ALL") params.set("type", filterType);
      if (filterComponent !== "ALL") params.set("component", filterComponent);

      const res = await fetch(`/api/transfers?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setTransfers(json.data || []);
        if (json.stats) setStats(json.stats);
      }
    } catch (err) {
      console.error("Gagal memuat mutasi aset:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch daftar POS hardware untuk pilihan dropdown
  const fetchPosList = async () => {
    try {
      const res = await fetch("/api/pos-hardware", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setPosList(json.data || []);
      }
    } catch (e) {
      console.warn("Gagal load POS list:", e);
    }
  };

  useEffect(() => {
    fetchTransfers();
    fetchPosList();
  }, [filterType, filterComponent]);

  // Handle Search dengan debounce sederhana
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransfers();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Bila user berganti POS Asal di modal, update model barang otomatis
  const handleSourcePosChange = (posCode: string) => {
    const selected = posList.find((p) => p.pos_code === posCode);
    if (!selected) {
      setFormData((prev) => ({
        ...prev,
        source_asset_code: posCode,
      }));
      return;
    }

    let currentModel = "-";
    if (formData.component_type === "BARCODE_SCANNER") currentModel = selected.barcode_scanner || "-";
    else if (formData.component_type === "PRINTER") currentModel = selected.printer || "-";
    else if (formData.component_type === "PASSPORT_SCANNER") currentModel = selected.passport_scanner || "-";
    else if (formData.component_type === "MONITOR") currentModel = selected.monitor || "-";
    else if (formData.component_type === "KEYBOARD") currentModel = selected.keyboard || "-";
    else if (formData.component_type === "MOUSE") currentModel = selected.mouse || "-";
    else if (formData.component_type === "RAM") currentModel = selected.ram || "-";
    else if (formData.component_type === "SSD") currentModel = selected.ssd || "-";
    else if (formData.component_type === "UPS") currentModel = selected.ups || "-";

    setFormData((prev) => ({
      ...prev,
      source_asset_code: selected.pos_code,
      source_location: `${selected.terminal} - Counter ${selected.counter_zone} (P0${selected.pos_number})`,
      source_shop: selected.shop_name,
      source_item_model: currentModel !== "-" ? currentModel : prev.source_item_model,
    }));
  };

  // Bila user berganti POS Tujuan di modal
  const handleDestPosChange = (posCode: string) => {
    const selected = posList.find((p) => p.pos_code === posCode);
    if (!selected) {
      setFormData((prev) => ({ ...prev, dest_asset_code: posCode }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      dest_asset_code: selected.pos_code,
      dest_location: `${selected.terminal} - Counter ${selected.counter_zone} (P0${selected.pos_number})`,
      dest_shop: selected.shop_name,
    }));
  };

  // Submit transfer baru
  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success) {
        setSubmitSuccess(json.message || "Pemindahan barang berhasil dicatat!");
        setTimeout(() => {
          setIsModalOpen(false);
          setSubmitSuccess(null);
          fetchTransfers();
          fetchPosList();
        }, 1200);
      } else {
        setSubmitError(json.message || "Gagal mencatat pemindahan.");
      }
    } catch (err: any) {
      setSubmitError("Gagal menghubungi server database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  // Filtered transfers
  const filteredTransfers = useMemo(() => transfers, [transfers]);

  return (
    <SidebarLayout>
      <div className="space-y-6 pb-20">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-[#006622] border border-emerald-200">
                PT PLAZA BALI PRIMA & SAM
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Live Asset Relocation & Audit Trail
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <ArrowLeftRight className="w-6 h-6 text-[#006622]" />
              <span>Tracking & Mutasi Pemindahan Barang</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Pelacakan riwayat pergantian unit POS, penggantian komponen kiriman MIS PROC, serta mutasi/relokasi perangkat antar kasir dan antar toko secara lengkap dan transparan.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  performed_by: user?.name || "IT Support",
                }));
                setIsModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#006622] hover:bg-[#00551c] text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-sm shadow-emerald-900/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Pemindahan / Replace</span>
            </button>

            <button
              type="button"
              onClick={fetchTransfers}
              title="Refresh Data"
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#006622]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total Pemindahan / Mutasi"
            value={stats.total}
            icon={ArrowLeftRight}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-emerald-50 text-[#006622] flex items-center justify-center font-bold"
            hint="Semua catatan relokasi & replace"
          />
          <StatCard
            label="Replace & Pindah POS"
            value={stats.replace_and_transfer}
            icon={Repeat}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold"
            hint="Replace baru MIS & unit lama dipindah"
          />
          <StatCard
            label="Mutasi Langsung Antar POS"
            value={stats.direct_transfer}
            icon={ArrowRight}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold"
            hint="Perpindahan langsung antar kasir / toko"
          />
          <StatCard
            label="Pasang Baru dari MIS PROC"
            value={stats.new_install}
            icon={Package}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold"
            hint="Unit baru pengadaan dipasang di POS"
          />
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kode transfer, POS asal, POS tujuan, nama barang, nomor BA, atau petugas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006622]/20 focus:border-[#006622] transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter Tipe */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Tipe Mutasi</option>
                  <option value="REPLACE_AND_TRANSFER">Replace & Pindah ke POS Lain</option>
                  <option value="DIRECT_TRANSFER">Mutasi Langsung Antar POS</option>
                  <option value="NEW_INSTALL">Pemasangan Baru MIS PROC</option>
                  <option value="RETURN_TO_SPARE">Retur / Tarik ke Gudang</option>
                </select>
              </div>

              {/* Filter Komponen */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={filterComponent}
                  onChange={(e) => setFilterComponent(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Komponen</option>
                  <option value="BARCODE_SCANNER">Barcode Scanner</option>
                  <option value="PRINTER">Printer Thermal</option>
                  <option value="PASSPORT_SCANNER">Passport Reader</option>
                  <option value="MONITOR">Monitor Display</option>
                  <option value="KEYBOARD">Keyboard</option>
                  <option value="MOUSE">Mouse</option>
                  <option value="RAM">RAM</option>
                  <option value="SSD">SSD / Storage</option>
                  <option value="UPS">UPS Power</option>
                  <option value="PC_SET">Set PC Kasir</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden p-0.5 bg-slate-100/70">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "cards" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Tampilan Alur Visual (Cards)"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Tampilan Tabel Rinci"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {isLoading && transfers.length === 0 ? (
          <LoadingState message="Memuat riwayat pemindahan & mutasi perangkat..." />
        ) : filteredTransfers.length === 0 ? (
          <EmptyState
            title="Belum Ada Riwayat Pemindahan"
            description="Tidak ditemukan riwayat mutasi atau pemindahan barang yang cocok dengan filter pencarian."
            action={
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#006622] hover:bg-[#00551c] text-white font-bold text-xs cursor-pointer shadow-2xs transition-colors"
              >
                Catat Pemindahan Baru
              </button>
            }
          />
        ) : viewMode === "cards" ? (
          /* Cards View with Visual Transfer Flow */
          <div className="space-y-4">
            {filteredTransfers.map((t) => {
              const isCopied = copiedCode === t.transfer_code;
              const isReplace = t.transfer_type === "REPLACE_AND_TRANSFER";
              const isDirect = t.transfer_type === "DIRECT_TRANSFER";
              const isNew = t.transfer_type === "NEW_INSTALL";

              return (
                <div
                  key={t.id || t.transfer_code}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all p-5 space-y-4 group"
                >
                  {/* Top Bar Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Code Badge */}
                      <button
                        type="button"
                        onClick={() => handleCopy(t.transfer_code, t.transfer_code)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-mono font-black text-xs text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Klik untuk salin kode transfer"
                      >
                        <span>{t.transfer_code}</span>
                        {isCopied ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                        )}
                      </button>

                      {/* Type Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wide flex items-center gap-1 ${
                          isReplace
                            ? "bg-blue-50 text-blue-900 border border-blue-200"
                            : isDirect
                            ? "bg-amber-50 text-amber-900 border border-amber-200"
                            : isNew
                            ? "bg-purple-50 text-purple-900 border border-purple-200"
                            : "bg-slate-100 text-slate-800 border border-slate-200"
                        }`}
                      >
                        {isReplace && <Repeat className="w-3 h-3 text-blue-700" />}
                        {isDirect && <ArrowRight className="w-3 h-3 text-amber-700" />}
                        {isNew && <Package className="w-3 h-3 text-purple-700" />}
                        <span>
                          {isReplace
                            ? "Replace & Pindah POS"
                            : isDirect
                            ? "Mutasi Langsung"
                            : isNew
                            ? "Pasang Baru MIS"
                            : "Retur Cadangan"}
                        </span>
                      </span>

                      {/* Component Badge */}
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#006622] font-black text-[10.5px] border border-emerald-200 flex items-center gap-1">
                        <Scan className="w-3 h-3" />
                        <span>{t.component_type.replace(/_/g, " ")}</span>
                      </span>

                      {/* Status */}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/70 text-emerald-900 flex items-center gap-1">
                        <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                        <span>{t.status || "COMPLETED"}</span>
                      </span>
                    </div>

                    {/* Metadata Kanan: Waktu & Pelaksana */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{t.transfer_date ? t.transfer_date.slice(0, 16) : "-"}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-800 font-bold">
                        <User className="w-3 h-3 text-[#006622]" />
                        <span>{t.performed_by || "IT Support"}</span>
                      </span>
                      {t.reference_no && (
                        <>
                          <span>•</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-50 border border-slate-200 font-mono text-[10.5px] font-bold text-slate-700">
                            Ref: {t.reference_no}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* VISUAL FLOW DIAGRAM (Alur Pemindahan Barang) */}
                  <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/70">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3 h-3 text-[#006622]" />
                      <span>Diagram Alur Mutasi / Pemindahan Fisik:</span>
                    </div>

                    {isReplace ? (
                      /* Dual Flow for REPLACE_AND_TRANSFER */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {/* Jalur 1: Unit Baru dari MIS PROC -> Terpasang di POS Asal */}
                        <div className="bg-white p-3 rounded-xl border border-blue-200/80 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between text-[10.5px] font-black text-blue-900 border-b border-blue-50 pb-1.5">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                              <span>Langkah 1: Pasang Unit Baru</span>
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-blue-100/60 text-blue-800 text-[9.5px]">
                              Kiriman MIS PROC
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                              <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Sumber Unit</span>
                              <span className="font-black text-slate-900 text-xs truncate block" title={t.new_item_source || "MIS PROC"}>
                                {t.new_item_source || "MIS PROC"}
                              </span>
                            </div>

                            <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />

                            <div className="flex-1 bg-blue-50/60 p-2 rounded-lg border border-blue-200 text-center">
                              <span className="text-[9.5px] font-bold text-blue-700 block uppercase">Terpasang Di (POS Asal)</span>
                              <Link
                                href={`/scan?code=${encodeURIComponent(t.source_asset_code || "")}`}
                                className="font-mono font-black text-blue-950 text-xs hover:underline flex items-center justify-center gap-1"
                              >
                                <span>{t.source_asset_code}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </Link>
                              <span className="text-[9.5px] text-slate-500 truncate block mt-0.5">
                                {t.source_location}
                              </span>
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-blue-50/30 border border-blue-100 text-xs">
                            <span className="text-slate-500 font-medium">Model Baru: </span>
                            <span className="font-black text-blue-950">{t.new_item_model || "-"}</span>
                            {t.new_item_sn && t.new_item_sn !== "-" && (
                              <span className="text-slate-500 text-[10px] ml-1.5 font-mono">
                                (SN: {t.new_item_sn})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Jalur 2: Unit Lama POS Asal -> Dipindahkan ke POS Tujuan */}
                        <div className="bg-white p-3 rounded-xl border border-emerald-200/80 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between text-[10.5px] font-black text-emerald-950 border-b border-emerald-50 pb-1.5">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#006622]"></span>
                              <span>Langkah 2: Relokasi Unit Lama</span>
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100/60 text-[#006622] text-[9.5px]">
                              Masih Layak Pakai
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-amber-50/50 p-2 rounded-lg border border-amber-200 text-center">
                              <span className="text-[9.5px] font-bold text-amber-800 block uppercase">Dilepas Dari (Asal)</span>
                              <Link
                                href={`/scan?code=${encodeURIComponent(t.source_asset_code || "")}`}
                                className="font-mono font-black text-slate-900 text-xs hover:underline flex items-center justify-center gap-1"
                              >
                                <span>{t.source_asset_code}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </Link>
                            </div>

                            <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />

                            <div className="flex-1 bg-emerald-50/60 p-2 rounded-lg border border-emerald-200 text-center">
                              <span className="text-[9.5px] font-bold text-emerald-900 block uppercase">Dipasang Di (POS Tujuan)</span>
                              <Link
                                href={`/scan?code=${encodeURIComponent(t.dest_asset_code || "")}`}
                                className="font-mono font-black text-[#006622] text-xs hover:underline flex items-center justify-center gap-1"
                              >
                                <span>{t.dest_asset_code}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </Link>
                              <span className="text-[9.5px] text-slate-500 truncate block mt-0.5">
                                {t.dest_location}
                              </span>
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-emerald-50/30 border border-emerald-100 text-xs">
                            <span className="text-slate-500 font-medium">Unit Lama Yang Dipindah: </span>
                            <span className="font-black text-slate-900">{t.source_item_model || "-"}</span>
                            {t.source_item_sn && t.source_item_sn !== "-" && (
                              <span className="text-slate-500 text-[10px] ml-1.5 font-mono">
                                (SN: {t.source_item_sn})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Single Flow for Direct Transfer or New Install */
                      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                        {/* Asal */}
                        <div className="flex-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200 w-full text-center sm:text-left">
                          <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Titik Asal</span>
                          <span className="font-mono font-black text-slate-900 text-xs block">
                            {t.source_asset_code || t.source_location}
                          </span>
                          <span className="text-[10px] text-slate-500 block">{t.source_location}</span>
                        </div>

                        {/* Panah Alur */}
                        <div className="flex flex-col items-center gap-1 px-2 shrink-0">
                          <span className="text-[9.5px] font-bold text-[#006622] uppercase tracking-wider">
                            {t.transfer_type.replace(/_/g, " ")}
                          </span>
                          <ArrowRight className="w-5 h-5 text-[#006622]" />
                        </div>

                        {/* Tujuan */}
                        <div className="flex-1 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200 w-full text-center sm:text-left">
                          <span className="text-[9.5px] font-bold text-emerald-800 block uppercase">Titik Tujuan</span>
                          <span className="font-mono font-black text-[#006622] text-xs block">
                            {t.dest_asset_code || t.dest_location}
                          </span>
                          <span className="text-[10px] text-slate-500 block">{t.dest_location}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Alasan & Keterangan Lapangan */}
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Alasan & Kronologi Pemindahan:
                    </span>
                    <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                      "{t.reason}"
                    </p>
                    {t.notes && (
                      <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/50 mt-1">
                        Catatan Teknis: {t.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-900 font-black border-b border-slate-200 text-[10.5px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5 text-center">No</th>
                    <th className="px-3 py-2.5">Kode Transfer</th>
                    <th className="px-3 py-2.5">Tipe Mutasi</th>
                    <th className="px-3 py-2.5">Komponen</th>
                    <th className="px-3 py-2.5">Asal (Source)</th>
                    <th className="px-3 py-2.5">Tujuan (Dest)</th>
                    <th className="px-3 py-2.5">Model / Pengganti</th>
                    <th className="px-3 py-2.5">Petugas</th>
                    <th className="px-3 py-2.5">Tanggal</th>
                    <th className="px-3 py-2.5">Alasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransfers.map((t, idx) => (
                    <tr key={t.id || t.transfer_code} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-mono font-black text-slate-900 whitespace-nowrap">
                        {t.transfer_code}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                          {t.transfer_type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                        {t.component_type.replace(/_/g, " ")}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-blue-900">{t.source_asset_code || "-"}</div>
                        <div className="text-[10px] text-slate-400">{t.source_location}</div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-emerald-900">{t.dest_asset_code || "-"}</div>
                        <div className="text-[10px] text-slate-400">{t.dest_location}</div>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] max-w-[200px]">
                        <div className="font-black text-slate-900 truncate">
                          {t.new_item_model || t.source_item_model || "-"}
                        </div>
                        {t.new_item_source && (
                          <div className="text-[9.5px] text-slate-400 truncate">
                            Sumber: {t.new_item_source}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                        {t.performed_by}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-slate-600 whitespace-nowrap">
                        {t.transfer_date ? t.transfer_date.slice(0, 10) : "-"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 max-w-[240px] truncate" title={t.reason}>
                        {t.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CATAT PEMINDAHAN / REPLACE BARANG */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-[#006622] flex items-center justify-center shadow-2xs">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Form Pemindahan & Replace Perangkat
                  </h3>
                  <p className="text-xs text-slate-500">
                    Catat mutasi antar POS, replace kiriman MIS PROC, atau relokasi toko
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitTransfer} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {submitError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[#006622] font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              {/* 1. Pilih Tipe Mutasi */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                  1. Tipe Aksi Pemindahan / Mutasi <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, transfer_type: "REPLACE_AND_TRANSFER" })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      formData.transfer_type === "REPLACE_AND_TRANSFER"
                        ? "border-[#006622] bg-emerald-50/50 shadow-2xs ring-1 ring-[#006622]"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Repeat className="w-4 h-4 text-[#006622] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-black text-slate-900 text-xs">Replace & Pindah ke POS Lain</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Ganti unit di POS Asal dg kiriman MIS PROC, unit lama dipindah ke POS Tujuan (e.g. P01 DF6 ➔ P02 DF7)
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, transfer_type: "DIRECT_TRANSFER" })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      formData.transfer_type === "DIRECT_TRANSFER"
                        ? "border-[#006622] bg-emerald-50/50 shadow-2xs ring-1 ring-[#006622]"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <ArrowRight className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-black text-slate-900 text-xs">Mutasi Langsung Antar POS / Toko</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Perpindahan perangkat langsung dari POS A ke POS B tanpa unit baru
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, transfer_type: "NEW_INSTALL" })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      formData.transfer_type === "NEW_INSTALL"
                        ? "border-[#006622] bg-emerald-50/50 shadow-2xs ring-1 ring-[#006622]"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Package className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-black text-slate-900 text-xs">Pemasangan Baru MIS PROC</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Pasang unit baru dari pengadaan ke kasir POS tertentu
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, transfer_type: "RETURN_TO_SPARE" })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      formData.transfer_type === "RETURN_TO_SPARE"
                        ? "border-[#006622] bg-emerald-50/50 shadow-2xs ring-1 ring-[#006622]"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Archive className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-black text-slate-900 text-xs">Tarik / Retur ke Gudang Cadangan</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Tarik perangkat dari POS untuk disimpan di cadangan atau perbaikan MIS
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Jenis Komponen */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                  2. Jenis Komponen / Perangkat yang Dipindah <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.component_type}
                  onChange={(e) => {
                    const ct = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      component_type: ct,
                      item_name: `${ct.replace(/_/g, " ")} Kasir`,
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 outline-none focus:border-[#006622]"
                >
                  <option value="BARCODE_SCANNER">Barcode Scanner (Handheld / Omni / 2D)</option>
                  <option value="PRINTER">Printer Thermal Struk Kasir</option>
                  <option value="PASSPORT_SCANNER">Passport Reader / Scanner</option>
                  <option value="MONITOR">Monitor Display Kasir</option>
                  <option value="KEYBOARD">Keyboard</option>
                  <option value="MOUSE">Mouse</option>
                  <option value="CASH_DRAWER">Cash Drawer / Laci Uang</option>
                  <option value="RAM">RAM Internal</option>
                  <option value="SSD">SSD / Harddisk Storage</option>
                  <option value="UPS">UPS Power Backup</option>
                  <option value="PC_SET">Set Unit Komputer Kasir POS Lengkap</option>
                </select>
              </div>

              {/* 3. Section Skenario REPLACE: Unit Baru Pengganti di Asal */}
              {formData.transfer_type === "REPLACE_AND_TRANSFER" && (
                <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2.5">
                  <div className="flex items-center gap-2 text-blue-900 font-black text-xs">
                    <Package className="w-4 h-4 text-blue-700" />
                    <span>Unit Baru dari MIS PROC (Dipasang di POS Asal)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Model Unit Baru
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Honeywell Xenon 1950g 2D"
                        value={formData.new_item_model}
                        onChange={(e) => setFormData({ ...formData, new_item_model: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Sumber / Asal Pengadaan Baru
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. MIS PROC (Pengadaan Baru)"
                        value={formData.new_item_source}
                        onChange={(e) => setFormData({ ...formData, new_item_source: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. POS Asal & POS Tujuan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* POS ASAL */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-black text-slate-900 text-xs flex items-center justify-between">
                    <span>Titik / POS Asal</span>
                    <span className="text-[10px] text-blue-700 font-mono">Source</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Pilih POS Asal</label>
                    <select
                      value={formData.source_asset_code}
                      onChange={(e) => handleSourcePosChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs text-slate-800"
                    >
                      {posList.map((p) => (
                        <option key={p.id || p.pos_code} value={p.pos_code}>
                          {p.pos_code} ({p.terminal} - {p.counter_zone} P0{p.pos_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Model Unit Lama Yang Dilepas
                    </label>
                    <input
                      type="text"
                      value={formData.source_item_model}
                      onChange={(e) => setFormData({ ...formData, source_item_model: e.target.value })}
                      placeholder="e.g. Honeywell Voyager 1400g"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* POS TUJUAN */}
                <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-200 space-y-2">
                  <div className="font-black text-emerald-950 text-xs flex items-center justify-between">
                    <span>Titik / POS Tujuan (Penerima)</span>
                    <span className="text-[10px] text-[#006622] font-mono">Destination</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Pilih POS Tujuan</label>
                    <select
                      value={formData.dest_asset_code}
                      onChange={(e) => handleDestPosChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs text-slate-800"
                    >
                      {posList.map((p) => (
                        <option key={p.id || p.pos_code} value={p.pos_code}>
                          {p.pos_code} ({p.terminal} - {p.counter_zone} P0{p.pos_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Lokasi Tujuan
                    </label>
                    <input
                      type="text"
                      value={formData.dest_location}
                      onChange={(e) => setFormData({ ...formData, dest_location: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Alasan & Keterangan Kronologi */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                  Alasan & Kronologi Mutasi / Replace <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Contoh: Replace scanner barcode di P01 DF6 dengan unit baru kiriman MIS PROC, dan scanner lama yang masih berfungsi dialihkan ke P02 DF7..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#006622]"
                  required
                />
              </div>

              {/* 6. Petugas IT Support & No Referensi / BA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Petugas Pelaksana (IT Support)
                  </label>
                  <input
                    type="text"
                    value={formData.performed_by}
                    onChange={(e) => setFormData({ ...formData, performed_by: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    No. Berita Acara / Surat Jalan / No Tiket
                  </label>
                  <input
                    type="text"
                    value={formData.reference_no}
                    onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                    placeholder="e.g. BA-MUT-2026-004"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#006622] hover:bg-[#00551c] text-white font-black text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan Mutasi...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Konfirmasi & Simpan Mutasi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
