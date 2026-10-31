"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Camera,
  Keyboard,
  Search,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Wrench,
  Calendar,
  Store,
  Coins,
  ShieldCheck,
  RefreshCw,
  Clock,
  Laptop,
  Monitor,
  Printer,
  Scan,
  HardDrive,
  Cpu,
  Layers,
  Copy,
  Check,
  QrCode,
  MapPin,
  Tag,
  Boxes,
  FileText,
  Ticket,
} from "lucide-react";
import { Asset } from "@/types";

export interface ScannedAssetDetail {
  code: string;
  itemType?: "SET_POS" | "SET_OFFICE" | "COMPONENT" | "EDC" | "DVR" | "GENERIC_ASSET";
  name: string;
  category: string;
  brandModel: string;
  serialNumber: string;
  status: "OPERASIONAL" | "CADANGAN" | "PERBAIKAN" | "RUSAK" | string;
  location: string;
  subLocation?: string;
  ipAddress?: string;

  // Riwayat Pengadaan / Pembelian
  purchaseDate: string;
  purchasedFrom: string;
  purchasePrice: string;
  poNumber?: string;
  warrantyStatus?: string;

  // Riwayat Penggantian & Maintenance
  lastChangeDate: string;
  changeHistory?: {
    component: string;
    newModel: string;
    price: string;
    store: string;
    date: string;
    notes: string;
  }[];
  notes?: string;

  parentSet?: {
    code: string;
    name: string;
    type: "POS" | "OFFICE";
    location: string;
  };

  childComponents?: {
    id: string;
    name: string;
    spec: string;
    category: "SPED" | "PREFERAL";
    price?: string;
    store?: string;
    purchaseDate?: string;
    lastChange?: string;
  }[];

  tickets?: any[];

  // Compatibility fields
  asset_code?: string;
  shop_location?: string;
  brand_model?: string;
  serial_number?: string;
  ip_address?: string | null;
}

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset?: (asset: Asset) => void;
  onRequestTicket?: (asset: Asset) => void;
  onOpenSticker?: (asset: Asset) => void;
}

export default function ScannerModal({
  isOpen,
  onClose,
  onSelectAsset,
  onRequestTicket,
  onOpenSticker,
}: ScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [manualCode, setManualCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [scannedAsset, setScannedAsset] = useState<ScannedAssetDetail | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<"spec" | "procurement" | "history" | "tickets">("spec");
  const [copiedCode, setCopiedCode] = useState(false);
  const html5QrCodeRef = useRef<any>(null);

  // USB Barcode Scanner listener (captures rapid keyboard inputs ending with Enter)
  useEffect(() => {
    if (!isOpen) return;

    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika user sedang mengetik di input manual
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = ""; // Reset buffer jika jeda terlalu lama (bukan scanner)
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.length >= 2) {
          lookupAsset(buffer.trim());
          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Inisialisasi Camera Scanner ketika tab camera aktif
  useEffect(() => {
    let scannerInstance: any = null;

    if (isOpen && activeTab === "camera" && !scannedAsset) {
      const initCamera = async () => {
        try {
          const { Html5Qrcode } = await import("html5-qrcode");
          setCameraError(null);

          const scannerId = "reader-camera-view";
          const el = document.getElementById(scannerId);
          if (!el) return;

          scannerInstance = new Html5Qrcode(scannerId);
          html5QrCodeRef.current = scannerInstance;

          await scannerInstance.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText: string) => {
              if (decodedText) {
                scannerInstance.stop().catch(() => {});
                lookupAsset(decodedText.trim());
              }
            },
            () => {}
          );
        } catch (err: any) {
          console.warn("Camera init error:", err);
          setCameraError(
            "Kamera tidak dapat diakses atau browser memblokir izin. Jika menggunakan IP LAN, browser membutuhkan izin khusus atau gunakan input Barcode Scanner / Manual di bawah."
          );
        }
      };

      const timer = setTimeout(initCamera, 200);
      return () => {
        clearTimeout(timer);
        if (scannerInstance && scannerInstance.isScanning) {
          scannerInstance.stop().catch(() => {});
        }
      };
    } else {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    }
  }, [isOpen, activeTab, scannedAsset]);

  const lookupAsset = async (code: string) => {
    setIsSearching(true);
    setErrorMsg(null);
    setScannedAsset(null);
    setResultTab("spec");

    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(code)}`, { cache: "no-store" });
      const json = await res.json();

      if (json.success && json.data) {
        setScannedAsset(json.data);
      } else {
        setErrorMsg(json.message || `Aset dengan kode atau Serial Number "${code}" tidak ditemukan dalam database.`);
      }
    } catch (err) {
      setErrorMsg("Gagal menghubungi server. Pastikan komputer server aktif.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    lookupAsset(manualCode.trim());
  };

  const handleResetScan = () => {
    setScannedAsset(null);
    setErrorMsg(null);
    setManualCode("");
    setActiveTab("camera");
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getDeviceIcon = (cat?: string, name?: string) => {
    const s = ((cat || "") + " " + (name || "")).toUpperCase();
    if (s.includes("PRINTER")) return Printer;
    if (s.includes("SCANNER") || s.includes("PASSPORT")) return Scan;
    if (s.includes("MONITOR") || s.includes("DISPLAY")) return Monitor;
    if (s.includes("KEYBOARD")) return Keyboard;
    if (s.includes("STORAGE") || s.includes("SSD") || s.includes("HDD") || s.includes("DRAWER")) return HardDrive;
    if (s.includes("PROCESSOR") || s.includes("CPU") || s.includes("MOTHERBOARD") || s.includes("RAM")) return Cpu;
    return Laptop;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-2xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm tracking-tight">
                Pindai Barcode & Identifikasi Aset
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Pindai stiker QR / Barcode untuk audit detail perolehan, penggantian, & spesifikasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* HASIL SCAN DITEMUKAN: DETAIL EKSEKUTIF LENGKAP                        */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {scannedAsset ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Success Badge Banner */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-emerald-950 text-xs tracking-tight">
                      Perangkat Berhasil Teridentifikasi!
                    </h4>
                    <p className="text-[11px] text-emerald-700">
                      Sinkron otomatis dengan Master Database Operasional IT & Procurement
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px] shadow-2xs">
                  TERVALIDASI
                </span>
              </div>

              {/* Hero Asset Card */}
              {(() => {
                const DeviceIcon = getDeviceIcon(scannedAsset.category, scannedAsset.name);
                const isOperasional = scannedAsset.status === "OPERASIONAL";

                return (
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                          <DeviceIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-slate-900 text-xs bg-white px-2 py-0.5 rounded-md border border-slate-300 shadow-2xs">
                              {scannedAsset.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(scannedAsset.code)}
                              title="Salin Kode"
                              className="text-slate-400 hover:text-indigo-600 p-0.5 transition-colors"
                            >
                              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isOperasional
                                  ? "bg-emerald-50 text-[#006622] border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {scannedAsset.status}
                            </span>
                          </div>

                          <h3 className="font-black text-slate-900 text-base mt-1 leading-snug">
                            {scannedAsset.name}
                          </h3>

                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            {scannedAsset.category} • <span className="font-mono text-slate-700">{scannedAsset.brandModel}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Terpasang di Set (Jika Komponen) */}
                    {scannedAsset.parentSet && (
                      <div className="px-3 py-1.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-indigo-700 font-medium flex items-center gap-1.5">
                          <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Terpasang di Set:</span>
                          <strong className="font-mono font-bold text-indigo-900">
                            {scannedAsset.parentSet.code}
                          </strong>
                          <span className="text-indigo-600">({scannedAsset.parentSet.name})</span>
                        </span>
                        <span className="text-[10.5px] font-semibold text-slate-500">
                          {scannedAsset.parentSet.location}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Sub-Tab Navigation for Scanned Asset */}
              <div className="flex border-b border-slate-200 text-xs font-bold text-slate-500">
                <button
                  type="button"
                  onClick={() => setResultTab("spec")}
                  className={`pb-2 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    resultTab === "spec"
                      ? "border-[#006622] text-[#006622]"
                      : "border-transparent hover:text-slate-800"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Rincian & Komponen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResultTab("procurement")}
                  className={`pb-2 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    resultTab === "procurement"
                      ? "border-[#006622] text-[#006622]"
                      : "border-transparent hover:text-slate-800"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Kapan Dibeli & Toko</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResultTab("history")}
                  className={`pb-2 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    resultTab === "history"
                      ? "border-[#006622] text-[#006622]"
                      : "border-transparent hover:text-slate-800"
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Kapan Diganti & Log</span>
                  {scannedAsset.changeHistory && scannedAsset.changeHistory.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[9px] font-mono">
                      {scannedAsset.changeHistory.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setResultTab("tickets")}
                  className={`pb-2 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    resultTab === "tickets"
                      ? "border-[#006622] text-[#006622]"
                      : "border-transparent hover:text-slate-800"
                  }`}
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Tiket IT</span>
                  {scannedAsset.tickets && scannedAsset.tickets.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded-full text-[9px] font-mono">
                      {scannedAsset.tickets.length}
                    </span>
                  )}
                </button>
              </div>

              {/* ─── TAB 1: RINCIAN & IDENTITAS SPESIFIKASI ─── */}
              {resultTab === "spec" && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  {/* Grid Metadata Utama */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Lokasi / Penempatan
                      </span>
                      <span className="font-bold text-slate-800 text-xs block mt-0.5">
                        {scannedAsset.location}
                      </span>
                      {scannedAsset.subLocation && (
                        <span className="text-[10.5px] text-slate-500 block">
                          {scannedAsset.subLocation}
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Serial Number (S/N)
                      </span>
                      <span className="font-mono font-bold text-slate-800 text-xs block mt-0.5 truncate" title={scannedAsset.serialNumber}>
                        {scannedAsset.serialNumber}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium block">
                        Barcode Label Terdaftar
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        IP Address Jaringan
                      </span>
                      <span className="font-mono font-black text-blue-700 text-xs block mt-0.5">
                        {scannedAsset.ipAddress || "Non-IP Device"}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        VLAN Kasir / Office
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Status Terakhir
                      </span>
                      <span className="font-bold text-emerald-700 text-xs block mt-0.5">
                        {scannedAsset.status}
                      </span>
                      <span className="text-[10.5px] text-slate-400 block">
                        Update: {scannedAsset.lastChangeDate}
                      </span>
                    </div>
                  </div>

                  {/* Jika merupakan 1 Set Lengkap: Tampilkan Rincian Komponen ID Barang di Dalamnya */}
                  {scannedAsset.childComponents && scannedAsset.childComponents.length > 0 && (
                    <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                      <div className="p-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                        <span className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5 text-[11px]">
                          <Boxes className="w-4 h-4 text-indigo-600" />
                          <span>Daftar ID Barang di dalam Set ini:</span>
                        </span>
                        <span className="font-mono font-bold text-indigo-700 text-[10.5px]">
                          {scannedAsset.childComponents.length} Komponen Terpasang
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {scannedAsset.childComponents.map((c) => (
                          <div key={c.id} className="p-2 hover:bg-slate-50 flex items-center justify-between gap-2 text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded text-[10px]">
                                {c.id}
                              </span>
                              <span className="font-semibold text-slate-800">{c.name}:</span>
                              <span className="text-slate-600 truncate max-w-[200px]" title={c.spec}>
                                {c.spec}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-emerald-700 font-semibold shrink-0">
                              {c.price || "-"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Catatan Tambahan */}
                  {scannedAsset.notes && (
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600">
                      <strong className="text-slate-700 not-italic block mb-0.5">Catatan Teknis / Kondisi:</strong>
                      <p className="italic leading-relaxed">{scannedAsset.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB 2: RIWAYAT PEMBELIAN & PENGADAAN (KAPAN DIBELI) ─── */}
              {resultTab === "procurement" && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="bg-gradient-to-br from-emerald-50/60 to-white p-4 rounded-xl border border-emerald-200/80 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-emerald-100">
                      <Calendar className="w-4 h-4 text-[#006622]" />
                      <h4 className="font-black text-emerald-950 text-xs uppercase tracking-wider">
                        Informasi Perolehan & Pembelian
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10.5px]">
                          📅 Kapan Dibeli (Tanggal Pembelian):
                        </span>
                        <span className="font-bold text-slate-800 text-sm block mt-0.5">
                          {scannedAsset.purchaseDate}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block text-[10.5px]">
                          💰 Harga / Nilai Pembelian:
                        </span>
                        <span className="font-mono font-black text-emerald-700 text-sm block mt-0.5">
                          {scannedAsset.purchasePrice}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block text-[10.5px]">
                          🏬 Toko / Vendor Pembelian:
                        </span>
                        <span className="font-semibold text-slate-800 block mt-0.5">
                          {scannedAsset.purchasedFrom}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block text-[10.5px]">
                          📄 Nomor PO / Pengadaan:
                        </span>
                        <span className="font-mono font-bold text-slate-800 block mt-0.5">
                          {scannedAsset.poNumber || "PO-PBP-2026"}
                        </span>
                      </div>

                      <div className="sm:col-span-2 pt-2 border-t border-emerald-100/80 flex items-center justify-between">
                        <span className="text-slate-400 font-semibold text-[10.5px]">
                          🛡️ Status Garansi & Pemeliharaan:
                        </span>
                        <span className="font-bold text-emerald-800 text-xs bg-emerald-100/70 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                          {scannedAsset.warrantyStatus || "Garansi Distributor Resmi"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 leading-relaxed">
                    💡 <em>Data pengadaan terhubung langsung dengan sistem Purchase Order (PO) dan modul Pengadaan IT Plaza Bali Prima.</em>
                  </div>
                </div>
              )}

              {/* ─── TAB 3: RIWAYAT PENGGANTIAN & MAINTENANCE (KAPAN DIGANTI) ─── */}
              {resultTab === "history" && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-bold text-amber-950">Terakhir Diganti / Diperbarui:</span>
                    </div>
                    <span className="font-mono font-black text-amber-900 text-xs bg-white border border-amber-300 px-2.5 py-0.5 rounded-md shadow-2xs">
                      {scannedAsset.lastChangeDate}
                    </span>
                  </div>

                  {scannedAsset.changeHistory && scannedAsset.changeHistory.length > 0 ? (
                    <div className="space-y-2">
                      <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Log Riwayat Penggantian Perangkat:
                      </h5>
                      <div className="space-y-2">
                        {scannedAsset.changeHistory.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">
                                Penggantian {item.component}: <strong className="text-indigo-700">{item.newModel}</strong>
                              </span>
                              <span className="font-mono text-[10.5px] text-slate-500 font-semibold">
                                {item.date}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                              <span>Toko: <strong className="text-slate-700">{item.store}</strong></span>
                              <span>Biaya: <strong className="text-emerald-700 font-mono">{item.price}</strong></span>
                            </div>
                            {item.notes && (
                              <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200/60 italic">
                                Alasan: {item.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" />
                      <h5 className="font-bold text-slate-700 text-xs">Belum Pernah Diganti</h5>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Perangkat ini masih menggunakan unit asli bawaan sejak tanggal pembelian pertama ({scannedAsset.purchaseDate}) dan dalam kondisi operasional normal.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB 4: TIKET KENDALA IT ─── */}
              {resultTab === "tickets" && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  {scannedAsset.tickets && scannedAsset.tickets.length > 0 ? (
                    <div className="space-y-2">
                      {scannedAsset.tickets.map((t: any) => (
                        <div
                          key={t.id}
                          className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{t.title}</span>
                            <span
                              className={`text-[9.5px] font-bold px-2 py-0.2 rounded-full border ${
                                t.status === "SELESAI"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : t.status === "PROSES"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2">{t.description}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                            <span>Pelapor: {t.reporter || "-"}</span>
                            <span>{t.created_at ? new Date(t.created_at).toLocaleDateString("id-ID") : "-"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <Ticket className="w-6 h-6 text-slate-300 mx-auto" />
                      <h5 className="font-bold text-slate-700 text-xs">Tidak Ada Tiket Kendala Aktif</h5>
                      <p className="text-[11px] text-slate-400">
                        Perangkat ini bersih dari laporan kerusakan.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons Footer */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onRequestTicket) {
                        const astObj: Asset = {
                          asset_code: scannedAsset.code,
                          name: scannedAsset.name,
                          category: scannedAsset.category as any,
                          shop_location: scannedAsset.location,
                          brand_model: scannedAsset.brandModel,
                          serial_number: scannedAsset.serialNumber,
                          ip_address: scannedAsset.ipAddress !== "-" ? scannedAsset.ipAddress || null : null,
                          status: scannedAsset.status as any,
                          notes: scannedAsset.notes,
                        };
                        onRequestTicket(astObj);
                      }
                      onClose();
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 active:scale-[0.99] transition-all"
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Lapor Kendala / Buat Tiket</span>
                  </button>

                  {onOpenSticker && (
                    <button
                      type="button"
                      onClick={() => {
                        const astObj: Asset = {
                          asset_code: scannedAsset.code,
                          name: scannedAsset.name,
                          category: scannedAsset.category as any,
                          shop_location: scannedAsset.location,
                          brand_model: scannedAsset.brandModel,
                          serial_number: scannedAsset.serialNumber,
                          ip_address: scannedAsset.ipAddress !== "-" ? scannedAsset.ipAddress || null : null,
                          status: scannedAsset.status as any,
                          notes: scannedAsset.notes,
                        };
                        onOpenSticker(astObj);
                        onClose();
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Cetak Ulang Barcode</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleResetScan}
                    className="flex-1 py-2 px-3 border border-slate-300 rounded-xl text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                  >
                    Scan Aset Lain
                  </button>
                  <a
                    href={`/asset-components?set=${encodeURIComponent(scannedAsset.parentSet?.code || scannedAsset.code)}`}
                    className="py-2 px-3.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 flex items-center gap-1.5 transition-colors"
                  >
                    <span>Rincian Master</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* ═══════════════════════════════════════════════════════════════════════ */
            /* MODE SCANNING: KAMERA / INPUT USB BARCODE                              */
            /* ═══════════════════════════════════════════════════════════════════════ */
            <div>
              {/* Tab Selector */}
              <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("camera")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "camera"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Kamera HP / Scanner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("manual")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "manual"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Keyboard className="w-4 h-4" />
                  <span>Tembak USB / Ketik Manual</span>
                </button>
              </div>

              {/* Camera Scanner View */}
              {activeTab === "camera" && (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-square flex items-center justify-center border-2 border-slate-300 shadow-inner">
                    <div id="reader-camera-view" className="w-full h-full"></div>
                    {/* Visual Laser Beam Scan Overlay */}
                    <div className="absolute inset-x-8 top-1/2 h-0.5 bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)] animate-pulse pointer-events-none" />
                  </div>

                  {cameraError && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Akses Kamera Dibatasi</span>
                      </p>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        {cameraError}
                      </p>
                    </div>
                  )}

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
                    <Keyboard className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="leading-snug">
                      <strong>Siap Scanner USB:</strong> Tembak barcode atau QR langsung dengan scanner wireless/kabel USB, sistem otomatis membuka detail lengkapnya!
                    </span>
                  </div>
                </div>
              )}

              {/* Manual Input View */}
              {activeTab === "manual" && (
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ketik Kode Aset, Serial Number, atau ID Barang:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        autoFocus
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Contoh: CGKT3DFA02-P01, KBD-001, atau PC-MIS-26-001"
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white uppercase font-mono font-bold"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Mendukung semua format kode POS kasir, komputer office, mesin EDC, dan ID barang suku cadang.
                    </p>

                    {/* Quick Suggestion Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-2">
                      <span className="text-slate-400 font-bold text-[10.5px]">Contoh Cepat:</span>
                      {["RAM-001", "RAM-002", "CPU-001", "SSD-001", "CGKT2DFD05-P04", "PC-MIS-26-002-0", "PC-HRD-26-002-0"].map((sample) => (
                        <button
                          key={sample}
                          type="button"
                          onClick={() => {
                            setManualCode(sample);
                            lookupAsset(sample);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-[#006622] hover:border-emerald-300 border border-slate-200 font-mono font-bold text-[10.5px] text-slate-600 transition-colors cursor-pointer"
                        >
                          {sample}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSearching || !manualCode.trim()}
                    className="w-full py-2.5 px-4 bg-[#006622] hover:bg-[#00551c] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-700/20 active:scale-[0.99]"
                  >
                    {isSearching ? "Mencari & Mengidentifikasi Aset..." : "Tampilkan Detail Perangkat"}
                  </button>
                </form>
              )}

              {/* Error Notification */}
              {errorMsg && (
                <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Aset Tidak Ditemukan</p>
                    <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
