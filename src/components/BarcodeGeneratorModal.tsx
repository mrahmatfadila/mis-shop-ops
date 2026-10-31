"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  X,
  Printer,
  Download,
  QrCode,
  Copy,
  Check,
  Laptop,
  CheckCircle2,
  Sliders,
  Layers,
  Sparkles,
  Maximize2,
  ShieldCheck,
  CreditCard,
  Building2,
  HardDrive,
  Cpu,
  Monitor,
  Mouse,
  Keyboard,
  Scan,
  FileText,
  Globe,
  ExternalLink
} from "lucide-react";
import { Asset, PosHardwareAsset } from "@/types";

interface BarcodeGeneratorModalProps {
  isOpen: boolean;
  asset: Asset | null;
  posHardware?: PosHardwareAsset | null;
  onClose: () => void;
}

export type LabelSize = "70x50" | "40x20";

interface ComponentOption {
  key: string;
  name: string;
  category: string;
  brand: string;
  serialNumber: string;
  code: string;
  recommendedSize: LabelSize;
  icon: any;
}

export default function BarcodeGeneratorModal({
  isOpen,
  asset,
  posHardware,
  onClose,
}: BarcodeGeneratorModalProps) {
  // 1. Build List of Selectable Components from POS Hardware or generic Asset
  const componentOptions = useMemo<ComponentOption[]>(() => {
    if (posHardware) {
      const posCode = posHardware.pos_code;
      const opts: ComponentOption[] = [
        {
          key: "POS_MAIN",
          name: `Unit PC Kasir ${posCode}`,
          category: "POS Terminal (CPU/AIO)",
          brand: `${posHardware.pos_brand || "NCR"} (${posHardware.terminal || "Terminal"})`,
          serialNumber: posHardware.pos_sn && posHardware.pos_sn !== "-" ? posHardware.pos_sn : `SN-${posCode}`,
          code: posCode,
          recommendedSize: "70x50",
          icon: Laptop,
        },
        {
          key: "MONITOR",
          name: `Monitor Kasir - ${posCode}`,
          category: "Display / Monitor Kasir",
          brand: posHardware.monitor && posHardware.monitor !== "-" ? posHardware.monitor : "LED Monitor Kasir 15\"",
          serialNumber: `SN-MON-${posCode}`,
          code: `MON-${posCode}`,
          recommendedSize: "70x50",
          icon: Monitor,
        },
        {
          key: "PRINTER",
          name: `Printer Thermal - ${posCode}`,
          category: "Printer Struk Kasir",
          brand: posHardware.printer && posHardware.printer !== "-" ? posHardware.printer : "EPSON TM-U220B",
          serialNumber: `SN-PRN-${posCode}`,
          code: `PRN-${posCode}`,
          recommendedSize: "70x50",
          icon: Printer,
        },
        {
          key: "BARCODE",
          name: `Barcode Scanner - ${posCode}`,
          category: "Scanner Barcode 1D/2D",
          brand: posHardware.barcode_scanner && posHardware.barcode_scanner !== "-" ? posHardware.barcode_scanner : "HONEYWELL VOYAGER",
          serialNumber: `SN-BCS-${posCode}`,
          code: `BCS-${posCode}`,
          recommendedSize: "40x20",
          icon: Scan,
        },
        {
          key: "PASSPORT",
          name: `Passport Scanner - ${posCode}`,
          category: "Scanner Paspor Bandara",
          brand: posHardware.passport_scanner && posHardware.passport_scanner !== "-" ? posHardware.passport_scanner : "3M AT9000 MK2",
          serialNumber: `SN-PAS-${posCode}`,
          code: `PAS-${posCode}`,
          recommendedSize: "70x50",
          icon: Scan,
        },
        {
          key: "DRAWER",
          name: `Cash Drawer - ${posCode}`,
          category: "Laci Uang Kasir",
          brand: posHardware.cash_drawer && posHardware.cash_drawer !== "-" ? posHardware.cash_drawer : "PANDA POS RJ11",
          serialNumber: `SN-DRW-${posCode}`,
          code: `DRW-${posCode}`,
          recommendedSize: "70x50",
          icon: HardDrive,
        },
        {
          key: "KEYBOARD",
          name: `Keyboard Kasir - ${posCode}`,
          category: "Keyboard Kasir",
          brand: posHardware.keyboard && posHardware.keyboard !== "-" ? posHardware.keyboard : "LOGITECH K120",
          serialNumber: `SN-KBD-${posCode}`,
          code: `KBD-${posCode}`,
          recommendedSize: "40x20",
          icon: Keyboard,
        },
        {
          key: "MOUSE",
          name: `Mouse Kasir - ${posCode}`,
          category: "Mouse Kasir",
          brand: posHardware.mouse && posHardware.mouse !== "-" ? posHardware.mouse : "LOGITECH B100",
          serialNumber: `SN-MOU-${posCode}`,
          code: `MOU-${posCode}`,
          recommendedSize: "40x20",
          icon: Mouse,
        },
        {
          key: "FINGERPRINT",
          name: `Fingerprint - ${posCode}`,
          category: "Sensor Sidik Jari Kasir",
          brand: posHardware.fingerprint_scanner && posHardware.fingerprint_scanner !== "-" ? posHardware.fingerprint_scanner : "DIGITAL PERSONA U.are.U",
          serialNumber: `SN-FPR-${posCode}`,
          code: `FPR-${posCode}`,
          recommendedSize: "40x20",
          icon: QrCode,
        },
      ];

      // Add Bank EDC if present
      if (posHardware.bca_tid && posHardware.bca_tid !== "-") {
        opts.push({
          key: "EDC_BCA",
          name: `Mesin EDC BCA - ${posCode}`,
          category: "Mesin EDC Payment",
          brand: `BCA (TID: ${posHardware.bca_tid})`,
          serialNumber: `TID: ${posHardware.bca_tid}`,
          code: `EDC-BCA-${posHardware.bca_tid}`,
          recommendedSize: "70x50",
          icon: CreditCard,
        });
      }
      if (posHardware.mandiri_tid && posHardware.mandiri_tid !== "-") {
        opts.push({
          key: "EDC_MDR",
          name: `Mesin EDC Mandiri - ${posCode}`,
          category: "Mesin EDC Payment",
          brand: `MANDIRI (TID: ${posHardware.mandiri_tid})`,
          serialNumber: `TID: ${posHardware.mandiri_tid}`,
          code: `EDC-MDR-${posHardware.mandiri_tid}`,
          recommendedSize: "70x50",
          icon: CreditCard,
        });
      }
      if (posHardware.bri_tid && posHardware.bri_tid !== "-") {
        opts.push({
          key: "EDC_BRI",
          name: `Mesin EDC BRI - ${posCode}`,
          category: "Mesin EDC Payment",
          brand: `BRI (TID: ${posHardware.bri_tid})`,
          serialNumber: `TID: ${posHardware.bri_tid}`,
          code: `EDC-BRI-${posHardware.bri_tid}`,
          recommendedSize: "70x50",
          icon: CreditCard,
        });
      }

      return opts;
    }

    if (asset) {
      return [
        {
          key: "DEFAULT",
          name: asset.name,
          category: asset.category,
          brand: asset.brand_model || "Hardware IT",
          serialNumber: asset.serial_number || "-",
          code: asset.asset_code,
          recommendedSize: "70x50",
          icon: Laptop,
        },
      ];
    }

    return [];
  }, [posHardware, asset]);

  // States
  const [selectedCompKey, setSelectedCompKey] = useState<string>("POS_MAIN");
  const [selectedSize, setSelectedSize] = useState<LabelSize>("70x50");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // QR Mode: "url" encodes web link so phone camera opens inspection page directly; "code" encodes raw text
  const [qrMode, setQrMode] = useState<"url" | "code">("url");
  const [serverHost, setServerHost] = useState<string>("");
  const [isEditingHost, setIsEditingHost] = useState(false);
  const [customHostInput, setCustomHostInput] = useState("");

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  // Active selected component
  const currentComp = useMemo(() => {
    return componentOptions.find((c) => c.key === selectedCompKey) || componentOptions[0];
  }, [componentOptions, selectedCompKey]);

  // Sync size when component changes (auto select recommended size)
  const handleSelectComponent = (comp: ComponentOption) => {
    setSelectedCompKey(comp.key);
    setSelectedSize(comp.recommendedSize);
  };

  // Auto-detect server LAN/VPN IP so phone on same Wi-Fi / VPN can open the web link directly
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedHost = localStorage.getItem("mis_qr_base_host");
    if (savedHost) {
      setServerHost(savedHost);
      setCustomHostInput(savedHost);
      return;
    }

    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!isLocal) {
      setServerHost(window.location.origin);
      setCustomHostInput(window.location.origin);
    } else {
      fetch("/api/server-info")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.primaryIp) {
            const autoUrl = `http://${data.primaryIp}:${data.port || "3000"}`;
            setServerHost(autoUrl);
            setCustomHostInput(autoUrl);
          } else {
            setServerHost(window.location.origin);
            setCustomHostInput(window.location.origin);
          }
        })
        .catch(() => {
          setServerHost(window.location.origin);
          setCustomHostInput(window.location.origin);
        });
    }
  }, []);

  // Compute final payload encoded into QR Code
  const qrPayload = useMemo(() => {
    if (!currentComp) return "";
    if (qrMode === "code") return currentComp.code;
    const base = serverHost || (typeof window !== "undefined" ? window.location.origin : "");
    return `${base}/scan?code=${encodeURIComponent(currentComp.code)}`;
  }, [qrMode, serverHost, currentComp]);

  // Generate QR Code & Barcode for single selected component
  useEffect(() => {
    if (!isOpen || !currentComp || !qrPayload) return;

    let isMounted = true;

    const generateCodes = async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        // Generate high resolution QR code encoding full web URL or code
        const url = await QRCode.toDataURL(qrPayload, {
          width: 320,
          margin: 1,
          errorCorrectionLevel: "H",
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        });
        if (isMounted) setQrDataUrl(url);

        // Render Barcode Code128 (Selalu encode raw code agar barcode gun / scanner kasir membaca persis kode barang)
        const JsBarcode = (await import("jsbarcode")).default;
        if (barcodeSvgRef.current) {
          JsBarcode(barcodeSvgRef.current, currentComp.code, {
            format: "CODE128",
            width: selectedSize === "40x20" ? 1.5 : 2,
            height: selectedSize === "40x20" ? 30 : 48,
            displayValue: true,
            fontSize: selectedSize === "40x20" ? 11 : 13,
            textMargin: 2,
            font: "monospace",
            lineColor: "#0f172a",
          });
        }
      } catch (err) {
        console.error("Failed to generate QR or Barcode", err);
      }
    };

    generateCodes();

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentComp, selectedSize, qrPayload]);

  if (!isOpen || !currentComp) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentComp.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Download high-resolution PNG using HTML5 Canvas
  const handleDownloadPng = async () => {
    setIsDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Scale up 4x for crystal clear 300 DPI print quality
      const scale = 4;
      const width = selectedSize === "70x50" ? 360 : 250;
      const height = selectedSize === "70x50" ? 250 : 130;

      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.scale(scale, scale);

      // Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Border with rounded corners
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, width - 8, height - 8);

      // Header Bar
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(4, 4, width - 8, 24);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText("PROPERTY OF PT PLAZA BALI PRIMA • MIS OPS", 12, 19);

      // Draw QR Image
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.src = qrDataUrl;
      await new Promise((res) => {
        qrImg.onload = res;
      });

      const qrSize = selectedSize === "70x50" ? 75 : 45;
      ctx.drawImage(qrImg, 12, 34, qrSize, qrSize);

      // Texts
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(currentComp.name, 16 + qrSize, 46);

      ctx.font = "9px sans-serif";
      ctx.fillStyle = "#475569";
      ctx.fillText(`Tipe: ${currentComp.brand}`, 16 + qrSize, 60);
      ctx.fillText(`SN: ${currentComp.serialNumber}`, 16 + qrSize, 74);
      if (posHardware) {
        ctx.fillText(`Lokasi: ${posHardware.terminal || "T3 CGK"} [${posHardware.counter_zone || "POS"}]`, 16 + qrSize, 88);
      }

      // Barcode text
      ctx.font = "bold 13px monospace";
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.fillText(`* ${currentComp.code} *`, width / 2, height - 12);

      // Trigger download
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `STIKER_${currentComp.code}_${selectedSize}.png`;
      a.click();
    } catch (err) {
      console.error("Gagal download stiker PNG", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const storeLocationName = posHardware?.shop_name || asset?.shop_location || "Plaza Bali";
  const terminalName = posHardware?.terminal || "Bandara Soekarno-Hatta";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      {/* ── ISOLATED PRINT STYLES (HANYA STIKER YANG TERCETAK DI PRINTER) ── */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-sticker-container,
          #printable-sticker-container * {
            visibility: visible !important;
          }
          #printable-sticker-container {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 2mm !important;
            background: white !important;
          }
          @page {
            size: auto;
            margin: 2mm;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[95vh] my-auto animate-in zoom-in-95 duration-200">
        {/* ── HEADER MODAL ── */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-2xl shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Cetak Stiker Label Barcode & QR Aset</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Thermal Ready
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pilih perangkat & sesuaikan dimensi label untuk casing PC, printer, scanner, atau kabel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── MODAL BODY ── */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* 1. PILIH PERANGKAT / KOMPONEN KASIR */}
          {componentOptions.length > 1 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  <span>Pilih Perangkat yang Ingin Dicetak Labelnya:</span>
                </label>
                <span className="text-[11px] font-mono text-slate-400 font-semibold">
                  {componentOptions.length} Perangkat Terdaftar
                </span>
              </div>

              {/* Grid Pills of Available Components */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {componentOptions.map((comp) => {
                  const CompIcon = comp.icon;
                  const isSelected = selectedCompKey === comp.key;
                  return (
                    <button
                      key={comp.key}
                      type="button"
                      onClick={() => handleSelectComponent(comp)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2 ${
                        isSelected
                          ? "bg-blue-50/80 border-blue-500 text-blue-950 ring-2 ring-blue-500/20 shadow-xs"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <CompIcon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[11px] truncate leading-tight">{comp.name}</p>
                        <p className="text-[9.5px] text-slate-400 truncate mt-0.5">{comp.brand}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. PILIHAN UKURAN LABEL STIKER */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>Sesuaikan Ukuran Stiker dengan Dimensi Alat:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedSize("70x50")}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  selectedSize === "70x50"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 font-bold shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Standar Besar</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-100/70 text-emerald-800 rounded-lg">70x50 mm</span>
                </div>
                <p className="text-[10.5px] text-slate-400 mt-1 leading-tight">Casing CPU, Monitor, Printer Kasir, Cash Drawer, EDC</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSize("40x20")}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  selectedSize === "40x20"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 font-bold shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Ramping / Slim</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-100/70 text-emerald-800 rounded-lg">40x20 mm</span>
                </div>
                <p className="text-[10.5px] text-slate-400 mt-1 leading-tight">Scanner Barcode, Mouse, Keyboard, Fingerprint</p>
              </button>
            </div>
          </div>

          {/* QR Code Target URL Configuration Bar (Smart Web URL vs Plain Text) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Globe className="w-4 h-4 text-[#006622]" />
                <span>Target Tautan Scan QR:</span>
              </div>
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setQrMode("url")}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                    qrMode === "url"
                      ? "bg-[#006622] text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Scan QR dengan kamera HP akan otomatis membuka web detail barang"
                >
                  Tautan Web (Kamera HP)
                </button>
                <button
                  type="button"
                  onClick={() => setQrMode("code")}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                    qrMode === "code"
                      ? "bg-[#006622] text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Scan QR hanya berisi teks kode barang murni"
                >
                  Teks Kode Saja
                </button>
              </div>
            </div>

            {qrMode === "url" ? (
              <div className="text-xs space-y-1">
                {isEditingHost ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <input
                      type="text"
                      value={customHostInput}
                      onChange={(e) => setCustomHostInput(e.target.value)}
                      placeholder="http://172.16.x.x:3000 atau http://IP-VPN:3000"
                      className="flex-1 min-w-[200px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-[11px] font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-[#006622] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cleaned = customHostInput.trim().replace(/\/$/, "");
                        if (cleaned) {
                          setServerHost(cleaned);
                          localStorage.setItem("mis_qr_base_host", cleaned);
                        }
                        setIsEditingHost(false);
                      }}
                      className="px-3 py-1.5 bg-[#006622] hover:bg-[#00521b] text-white rounded-xl font-bold text-xs shadow-2xs cursor-pointer"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomHostInput(serverHost);
                        setIsEditingHost(false);
                      }}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                        URL HP:
                      </span>
                      <span className="font-mono text-[11px] text-[#006622] font-black truncate" title={qrPayload}>
                        {qrPayload}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingHost(true)}
                      className="text-[10.5px] font-bold text-sky-700 hover:text-sky-900 underline shrink-0 cursor-pointer text-left sm:text-right"
                    >
                      Ubah Host / IP VPN Server
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  ✓ Kamera HP yang tersambung jaringan VPN/Wi-Fi akan langsung memunculkan tautan web untuk membuka rincian barang secara lengkap.
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 font-medium">
                QR Code hanya berisi string teks: <code className="font-mono font-bold text-slate-800">{currentComp.code}</code> (cocok untuk pembacaan barcode scanner POS).
              </p>
            )}
          </div>

          {/* 3. LIVE STICKER PREVIEW CONTAINER */}
          <div className="bg-slate-100/80 p-4 rounded-2xl border border-slate-200 flex flex-col items-center justify-center min-h-[280px]">
            <div id="printable-sticker-container" className="w-full flex justify-center">
              {/* VARIANT A: UKURAN STANDAR 70x50 mm */}
              {selectedSize === "70x50" && (
                <div
                  className="w-full max-w-[370px] bg-white border-2 border-slate-900 rounded-xl p-3.5 shadow-sm text-left relative flex flex-col justify-between"
                  style={{ minHeight: "260px" }}
                >
                  {/* Top Bar Header */}
                  <div className="border-b-2 border-slate-900 pb-2 mb-2.5 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black tracking-tight text-blue-900">
                          PT PLAZA BALI PRIMA
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">• MIS OPS</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-700 leading-tight">
                        {storeLocationName} — {terminalName}
                      </p>
                    </div>
                    <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono font-bold tracking-wider shrink-0">
                      IT ASSET
                    </span>
                  </div>

                  {/* Body: QR Code & Specs */}
                  <div className="flex items-center gap-3 mb-2">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="QR Code"
                        className="w-24 h-24 border border-slate-300 rounded-lg p-1 shrink-0 bg-white shadow-2xs"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                        Loading QR...
                      </div>
                    )}

                    <div className="flex-1 space-y-1 text-slate-800">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-semibold block leading-none">
                          Nama Perangkat:
                        </span>
                        <strong className="text-xs font-black text-slate-900 block leading-tight mt-0.5">
                          {currentComp.name}
                        </strong>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-semibold block leading-none">
                          Model / Tipe:
                        </span>
                        <span className="text-[11px] text-slate-700 font-semibold block leading-tight mt-0.5">
                          {currentComp.brand}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-semibold block leading-none">
                          Serial Number:
                        </span>
                        <span className="text-[10.5px] font-mono text-slate-900 font-bold block leading-tight mt-0.5">
                          {currentComp.serialNumber}
                        </span>
                      </div>

                      {posHardware?.ip_address && currentComp.key === "POS_MAIN" && (
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-semibold block leading-none">
                            IP Address:
                          </span>
                          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1 rounded inline-block mt-0.5">
                            {posHardware.ip_address}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 1D Barcode Container */}
                  <div className="pt-2 border-t border-slate-200 flex flex-col items-center">
                    <svg ref={barcodeSvgRef} className="max-w-full h-auto"></svg>
                    <p className="text-[8.5px] text-slate-400 tracking-tight mt-1 text-center font-medium">
                      Jangan merusak atau melepas stiker ini tanpa konfirmasi MIS OPS
                    </p>
                  </div>
                </div>
              )}

              {/* VARIANT C: UKURAN RAMPING 40x20 mm (ULTRA SLIM FOR SCANNER/MOUSE) */}
              {selectedSize === "40x20" && (
                <div
                  className="w-full max-w-[280px] bg-white border-2 border-slate-900 rounded-lg p-2 shadow-sm text-left relative flex items-center gap-2.5"
                  style={{ minHeight: "110px" }}
                >
                  {qrDataUrl && (
                    <img
                      src={qrDataUrl}
                      alt="QR"
                      className="w-14 h-14 border border-slate-300 rounded p-0.5 shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8.5px] font-black text-blue-900">MIS OPS</span>
                      <span className="text-[7.5px] bg-slate-900 text-white px-1 rounded font-mono font-bold">IT</span>
                    </div>
                    <p className="font-bold text-[10px] text-slate-900 truncate leading-tight">{currentComp.name}</p>
                    <p className="text-[8.5px] text-slate-600 truncate">{currentComp.brand}</p>
                    <p className="text-[8.5px] font-mono font-bold text-slate-800 truncate">ID: {currentComp.code}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. PRINTER COMPATIBILITY NOTICE */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Format Siap Cetak Langsung (Direct Thermal / Sticker Roll):</p>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Stiker label ini sudah terisolasi dengan CSS <code className="font-mono bg-blue-100 px-1 rounded text-[10.5px]">@media print</code> tanpa margin browser. Pas dicetak ke printer label thermal roll (Zebra, Xprinter, TSC, Honeywell) maupun printer A4 stiker sheet.
              </p>
            </div>
          </div>
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
              title="Salin kode aset ke clipboard"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedCode ? "Disalin!" : currentComp.code}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
              title="Download gambar stiker resolusi tinggi (PNG 300 DPI)"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>{isDownloading ? "Menyimpan..." : "Download PNG"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-100 transition-colors"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/25 active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Stiker Label Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
