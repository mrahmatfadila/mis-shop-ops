"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera, Keyboard, Search, AlertCircle, CheckCircle, ExternalLink, Wrench } from "lucide-react";
import { Asset } from "@/types";

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset?: (asset: Asset) => void;
  onRequestTicket?: (asset: Asset) => void;
}

export default function ScannerModal({
  isOpen,
  onClose,
  onSelectAsset,
  onRequestTicket,
}: ScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [manualCode, setManualCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
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
        if (buffer.length >= 3) {
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

    if (isOpen && activeTab === "camera") {
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
              // Sukses scan
              if (decodedText) {
                // Hentikan sementara camera agar tidak spam
                scannerInstance.stop().catch(() => {});
                lookupAsset(decodedText.trim());
              }
            },
            () => {
              // scanning frame error (ignore)
            }
          );
        } catch (err: any) {
          console.warn("Camera init error:", err);
          setCameraError(
            "Kamera tidak dapat diakses atau browser memblokir izin. Jika menggunakan IP LAN, browser HP membutuhkan izin khusus atau gunakan input Barcode Scanner / Manual di bawah."
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
  }, [isOpen, activeTab]);

  const lookupAsset = async (code: string) => {
    setIsSearching(true);
    setErrorMsg(null);
    setScannedAsset(null);

    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(code)}`);
      const json = await res.json();

      if (json.success && json.data) {
        setScannedAsset(json.data);
      } else {
        setErrorMsg(`Aset dengan kode atau Serial Number "${code}" tidak ditemukan dalam database.`);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Scan Barcode / QR Aset</h3>
              <p className="text-xs text-slate-500">Scan label di unit POS, printer, atau scanner</p>
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
        <div className="p-5 overflow-y-auto flex-1">
          {/* Result view jika aset ditemukan */}
          {scannedAsset ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-emerald-950 text-sm">Aset Berhasil Teridentifikasi!</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Data diambil langsung dari Master Database IT Support
                  </p>
                </div>
              </div>

              {/* Asset Detail Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    {scannedAsset.asset_code}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      scannedAsset.status === "OPERASIONAL"
                        ? "bg-emerald-100 text-emerald-800"
                        : scannedAsset.status === "RUSAK"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {scannedAsset.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-800">{scannedAsset.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {scannedAsset.category} • {scannedAsset.brand_model}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Lokasi Toko:</span>
                    <span className="font-semibold text-slate-700">{scannedAsset.shop_location}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Serial Number:</span>
                    <span className="font-semibold text-slate-700">{scannedAsset.serial_number}</span>
                  </div>
                  {scannedAsset.ip_address && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block">IP Address:</span>
                      <span className="font-mono text-blue-600 font-semibold">{scannedAsset.ip_address}</span>
                    </div>
                  )}
                  {scannedAsset.notes && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block">Catatan Tambahan:</span>
                      <span className="text-slate-700 italic">{scannedAsset.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onRequestTicket) onRequestTicket(scannedAsset);
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-md shadow-rose-600/20 active:scale-[0.99] transition-all"
                >
                  <Wrench className="w-4 h-4" />
                  Lapor Kerusakan / Buat Tiket IT
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleResetScan}
                    className="flex-1 py-2 px-3 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs hover:bg-slate-50"
                  >
                    Scan Aset Lain
                  </button>
                  <a
                    href={`/assets?search=${encodeURIComponent(scannedAsset.asset_code)}`}
                    className="py-2 px-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-semibold hover:bg-blue-100 flex items-center gap-1.5"
                  >
                    Detail Lengkap <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Tab Selector */}
              <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("camera")}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "camera"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Camera className="w-4 h-4" /> Kamera HP / Tablet
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("manual")}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "manual"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Keyboard className="w-4 h-4" /> Input Barcode / Manual
                </button>
              </div>

              {/* Camera Scanner View */}
              {activeTab === "camera" && (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-square flex items-center justify-center border-2 border-dashed border-slate-300">
                    <div id="reader-camera-view" className="w-full h-full"></div>
                  </div>

                  {cameraError && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                      <p className="font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        Akses Kamera Dibatasi Browser
                      </p>
                      <p className="text-[11px] text-amber-700">
                        {cameraError}
                      </p>
                    </div>
                  )}

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                    <Keyboard className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>
                      <strong>Tips Hardware POS:</strong> Jika Anda menembakkan scanner barcode USB/wireless ke layar ini, sistem akan langsung mengenali kodenya secara otomatis!
                    </span>
                  </div>
                </div>
              )}

              {/* Manual Input View */}
              {activeTab === "manual" && (
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Ketik Kode Aset atau Serial Number:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        autoFocus
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Contoh: AST-POS-001 atau HP88291048"
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white uppercase font-mono"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Bisa juga langsung tembak scanner barcode USB tanpa perlu klik tombol cari.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSearching || !manualCode.trim()}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20"
                  >
                    {isSearching ? "Mencari Aset..." : "Cari Data Aset"}
                  </button>
                </form>
              )}

              {/* Error Notification */}
              {errorMsg && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Aset Tidak Ditemukan</p>
                    <p className="mt-0.5">{errorMsg}</p>
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

