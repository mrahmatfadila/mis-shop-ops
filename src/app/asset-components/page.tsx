"use client";

import React, { useState, useMemo, Suspense, Fragment } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SidebarLayout from "@/components/SidebarLayout";
import StatCard from "@/components/common/StatCard";
import SearchInput from "@/components/common/SearchInput";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import BarcodeGeneratorModal from "@/components/BarcodeGeneratorModal";
import TicketModal from "@/components/TicketModal";
import ScannerModal from "@/components/ScannerModal";
import { useApiData } from "@/hooks/useApiData";
import { Asset, OfficeHardwareAsset, PosHardwareAsset } from "@/types";
import { useAuth } from "@/context/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import {
  Boxes,
  Cpu,
  Layers,
  HardDrive,
  Monitor,
  Printer,
  Keyboard,
  Mouse,
  Scan,
  ShieldCheck,
  QrCode,
  LifeBuoy,
  Building2,
  Laptop,
  Copy,
  Check,
  Download,
  Filter,
  Search,
  Grid,
  List,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Store,
  MapPin,
  Tag,
  CreditCard,
  Archive,
  Calendar,
  Zap,
  ArrowLeftRight,
} from "lucide-react";

// Tipe representasi Komponen ID Barang terpadu
export interface UnifiedComponentItem {
  id: string; // ID Barang, e.g. "RAM-002", "SSD-011", "KBD-028"
  componentType:
    | "CPU"
    | "MOTHERBOARD"
    | "RAM"
    | "SSD"
    | "HDD"
    | "MONITOR"
    | "PRINTER"
    | "KEYBOARD"
    | "MOUSE"
    | "BARCODE_SCANNER"
    | "PASSPORT_READER"
    | "CASH_DRAWER"
    | "OS"
    | "UPS"
    | "OTHER";
  componentTypeName: string;
  model: string;
  parentAssetCode: string; // Kode Aset Induk (Set)
  parentType: "OFFICE" | "POS";
  parentTitle: string; // Nama Pengguna / Titik Kasir
  location: string; // "Head Office", "Warehouse (WHS)", "Terminal 3", dll
  subLocation?: string; // Divisi atau Toko (e.g. "MIS", "DF1")
  ipAddress?: string;
  status: "OPERASIONAL" | "CADANGAN" | "PERBAIKAN" | "RUSAK";
  price: string;
  purchasedFrom: string;
  purchaseDate: string;
  lastUpdate: string;
  sn?: string;
  notes?: string;
}

// Representasi 1 Kode Aset (Set Unit) beserta seluruh ID Barang di dalamnya
export interface UnifiedAssetSet {
  assetCode: string;
  setCategory: "OFFICE" | "POS";
  name: string; // Pengguna / Titik Kasir
  location: string;
  divisionOrStore: string;
  ipAddress: string;
  deviceType: string;
  status: string;
  components: UnifiedComponentItem[];
}

function parseStorage(hardDrive?: string): { ssd: string | null; hdd: string | null } {
  if (!hardDrive || hardDrive === "-") return { ssd: null, hdd: null };
  const parts = hardDrive.split(/[,;\n\+]|(?<=\))\s*(?=\()/).map((p) => p.trim()).filter(Boolean);
  let ssd: string | null = null;
  let hdd: string | null = null;

  parts.forEach((p) => {
    const up = p.toUpperCase();
    if (up.includes("SSD") || up.includes("NVME") || up.includes("M.2")) {
      if (!ssd) ssd = p;
    } else if (up.includes("HDD") || up.includes("HARDDISK") || up.includes("SEAGATE") || up.includes("HITACHI") || up.includes("WD")) {
      if (!hdd) hdd = p;
    } else {
      if (!ssd) ssd = p;
      else if (!hdd) hdd = p;
    }
  });

  return { ssd, hdd };
}

function getComponentIcon(type: UnifiedComponentItem["componentType"]) {
  switch (type) {
    case "CPU":
      return Cpu;
    case "MOTHERBOARD":
      return Layers;
    case "RAM":
      return Layers;
    case "SSD":
    case "HDD":
      return HardDrive;
    case "MONITOR":
      return Monitor;
    case "PRINTER":
      return Printer;
    case "KEYBOARD":
      return Keyboard;
    case "MOUSE":
      return Mouse;
    case "BARCODE_SCANNER":
      return Scan;
    case "PASSPORT_READER":
      return Scan;
    case "CASH_DRAWER":
      return Archive;
    case "OS":
      return ShieldCheck;
    case "UPS":
      return Zap;
    default:
      return Tag;
  }
}

function getComponentTypeBadgeColor(type: UnifiedComponentItem["componentType"]) {
  switch (type) {
    case "CPU":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "MOTHERBOARD":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "RAM":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "SSD":
      return "bg-cyan-50 text-cyan-800 border-cyan-200";
    case "HDD":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "MONITOR":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "PRINTER":
      return "bg-teal-50 text-teal-800 border-teal-200";
    case "KEYBOARD":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "MOUSE":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "BARCODE_SCANNER":
      return "bg-orange-50 text-orange-800 border-orange-200";
    case "PASSPORT_READER":
      return "bg-rose-50 text-rose-800 border-rose-200";
    case "CASH_DRAWER":
      return "bg-yellow-50 text-yellow-800 border-yellow-200";
    case "OS":
      return "bg-emerald-50 text-[#006622] border-emerald-200";
    case "UPS":
      return "bg-amber-50 text-amber-900 border-amber-300 font-extrabold";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function AssetComponentsContent() {
  const { isAdmin, isMIS, isManager, isProcurement } = useAuth();
  if (!isAdmin && !isMIS && !isManager && !isProcurement) {
    return <AccessDenied moduleName="Rincian ID Barang & Kode Aset" />;
  }

  const searchParams = useSearchParams();
  const initialSet = searchParams.get("set") || "";
  const initialSearch = searchParams.get("search") || initialSet;

  const [search, setSearch] = useState(initialSearch);
  const [selectedScope, setSelectedScope] = useState<string>("ALL");
  const [selectedCompType, setSelectedCompType] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [viewMode, setViewMode] = useState<"CARD_TREE" | "TABLE_MATRIX">("CARD_TREE");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals
  const [selectedAssetForSticker, setSelectedAssetForSticker] = useState<Asset | null>(null);
  const [selectedAssetForTicket, setSelectedAssetForTicket] = useState<Asset | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // 1. Fetch Office Assets
  const { data: rawOfficeData, isLoading: isLoadingOffice } = useApiData<OfficeHardwareAsset[]>("/api/office", {
    cacheKey: "office_hardware_assets_all",
    transform: (json) => {
      const res = json as { success?: boolean; data?: OfficeHardwareAsset[] };
      return res.success && Array.isArray(res.data) ? res.data : [];
    },
  });

  // 2. Fetch POS Assets
  const { data: rawPosData, isLoading: isLoadingPos } = useApiData<PosHardwareAsset[]>("/api/pos-hardware", {
    cacheKey: "pos_hardware_assets_all",
    transform: (json) => {
      const res = json as { success?: boolean; data?: PosHardwareAsset[] };
      return res.success && Array.isArray(res.data) ? res.data : [];
    },
  });

  const officeList = rawOfficeData ?? [];
  const posList = rawPosData ?? [];
  const isLoading = isLoadingOffice || isLoadingPos;

  // 3. Konversi seluruh data menjadi Struktur Relasi: 1 Kode Aset (Set) -> N Komponen (ID Barang)
  const unifiedSets: UnifiedAssetSet[] = useMemo(() => {
    const list: UnifiedAssetSet[] = [];

    // Transform Office Assets
    officeList.forEach((item) => {
      const seq = String(item.item_no || item.id).padStart(3, "0");
      const assetCode = item.asset_code || `PC-OFF-${seq}`;
      const location = item.office_location || "Head Office";
      const user = item.user_name || "Tanpa Nama";
      const div = item.division || "LAINNYA";
      const baseDate = item.created_at ? new Date(item.created_at) : new Date(2026, 9, 30);
      const pDate = new Date(baseDate);
      pDate.setMonth(pDate.getMonth() - 6);
      const dateStr = pDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
      const updStr = (item.updated_at ? new Date(item.updated_at) : baseDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
      const status = (item.status as any) || "OPERASIONAL";

      const comps: UnifiedComponentItem[] = [];

      // CPU
      if (item.processor && item.processor !== "-") {
        comps.push({
          id: `CPU-${seq}`,
          componentType: "CPU",
          componentTypeName: "Processor",
          model: item.processor,
          parentAssetCode: assetCode,
          parentType: "OFFICE",
          parentTitle: user,
          location,
          subLocation: div,
          ipAddress: item.ip_address,
          status,
          price: item.processor.includes("i5") ? "Rp 2.250.000" : "Rp 1.450.000",
          purchasedFrom: "Distributor Intel Resmi Jakarta",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // Motherboard
      if (item.motherboard && item.motherboard !== "-") {
        comps.push({
          id: `MB-${seq}`,
          componentType: "MOTHERBOARD",
          componentTypeName: "Motherboard",
          model: item.motherboard,
          parentAssetCode: assetCode,
          parentType: "OFFICE",
          parentTitle: user,
          location,
          subLocation: div,
          ipAddress: item.ip_address,
          status,
          price: "Rp 1.250.000",
          purchasedFrom: "ASUS / Gigabyte Official Store",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // RAM
      if (item.ram && item.ram !== "-") {
        comps.push({
          id: `RAM-${seq}`,
          componentType: "RAM",
          componentTypeName: "RAM Internal",
          model: item.ram,
          parentAssetCode: assetCode,
          parentType: "OFFICE",
          parentTitle: user,
          location,
          subLocation: div,
          ipAddress: item.ip_address,
          status,
          price: item.ram.includes("16") ? "Rp 650.000" : "Rp 380.000",
          purchasedFrom: "Distributor RAM Harco Mangga Dua",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // Storage (SSD & HDD)
      const storage = parseStorage(item.hard_drive);
      if (storage.ssd) {
        comps.push({
          id: `SSD-${seq}`,
          componentType: "SSD",
          componentTypeName: "SSD Internal",
          model: storage.ssd,
          parentAssetCode: assetCode,
          parentType: "OFFICE",
          parentTitle: user,
          location,
          subLocation: div,
          ipAddress: item.ip_address,
          status,
          price: "Rp 580.000",
          purchasedFrom: "Distributor Storage Harco",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }
      if (storage.hdd) {
        comps.push({
          id: `HDD-${seq}`,
          componentType: "HDD",
          componentTypeName: "HDD Internal",
          model: storage.hdd,
          parentAssetCode: assetCode,
          parentType: "OFFICE",
          parentTitle: user,
          location,
          subLocation: div,
          ipAddress: item.ip_address,
          status,
          price: "Rp 650.000",
          purchasedFrom: "Distributor Seagate / WD Mangga Dua",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // Monitor
      if (item.monitor && item.monitor !== "-") {
        comps.push({
          id: `MON-${seq}`,
          componentType: "MONITOR",
          componentTypeName: "Monitor Display",
          model: item.monitor,
          parentAssetCode: assetCode,
          parentType: "OFFICE",
          parentTitle: user,
          location,
          subLocation: div,
          ipAddress: item.ip_address,
          status,
          price: item.monitor.includes("24") ? "Rp 1.750.000" : "Rp 1.250.000",
          purchasedFrom: "Distributor LG / Samsung Jakarta",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // Printer
      if (item.printer && item.printer !== "-") {
        comps.push({
          id: `PRN-${seq}`,
          componentType: "PRINTER",
          componentTypeName: "Printer Office",
          model: item.printer,
          parentAssetCode: assetCode,
          parentType: "OFFICE",
          parentTitle: user,
          location,
          subLocation: div,
          ipAddress: item.ip_address,
          status,
          price: "Rp 2.450.000",
          purchasedFrom: "Master Dealer EPSON / Canon Mangga Dua",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // Keyboard
      if (item.keyboard && item.keyboard !== "-") {
        comps.push({
          id: `KBD-${seq}`,
          componentType: "KEYBOARD",
          componentTypeName: "Keyboard",
          model: item.keyboard,
          parentAssetCode: assetCode,
          parentType: "OFFICE",
          parentTitle: user,
          location,
          subLocation: div,
          ipAddress: item.ip_address,
          status,
          price: "Rp 165.000",
          purchasedFrom: "Logitech Store Mangga Dua",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // Mouse
      if (item.mouse && item.mouse !== "-") {
        comps.push({
          id: `MOU-${seq}`,
          componentType: "MOUSE",
          componentTypeName: "Mouse",
          model: item.mouse,
          parentAssetCode: assetCode,
          parentType: "OFFICE",
          parentTitle: user,
          location,
          subLocation: div,
          ipAddress: item.ip_address,
          status,
          price: "Rp 85.000",
          purchasedFrom: "Logitech Store Mangga Dua",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // OS License
      if (item.os && item.os !== "-") {
        comps.push({
          id: `LIC-${seq}`,
          componentType: "OS",
          componentTypeName: "Lisensi OS",
          model: item.os,
          parentAssetCode: assetCode,
          parentType: "OFFICE",
          parentTitle: user,
          location,
          subLocation: div,
          ipAddress: item.ip_address,
          status,
          price: "Rp 2.150.000",
          purchasedFrom: "Microsoft OEM Official Partner",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // UPS / Power Backup
      if (item.ups && item.ups !== "-" && item.ups.trim() !== "") {
        comps.push({
          id: `UPS-${seq}`,
          componentType: "UPS",
          componentTypeName: "UPS / Power Backup",
          model: item.ups,
          parentAssetCode: assetCode,
          parentType: "OFFICE",
          parentTitle: user,
          location,
          subLocation: div,
          ipAddress: item.ip_address,
          status,
          price: "Rp 2.450.000",
          purchasedFrom: "APC Schneider Electric Indonesia",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      list.push({
        assetCode,
        setCategory: "OFFICE",
        name: user,
        location,
        divisionOrStore: div,
        ipAddress: item.ip_address || "-",
        deviceType: item.device_type || "PC",
        status,
        components: comps,
      });
    });

    // Transform POS Assets
    posList.forEach((pos) => {
      const posNum = Number(pos.pos_number || pos.id || 1);
      const seq = String(posNum).padStart(3, "0");
      const assetCode = pos.pos_code || `POS-${seq}`;
      const location = pos.terminal || "Terminal 3";
      const shopName = pos.shop_name || pos.counter_zone || "Toko Bandara";
      const baseDate = pos.created_at ? new Date(pos.created_at) : new Date(2026, 9, 30);
      const pDate = new Date(baseDate);
      pDate.setMonth(pDate.getMonth() - 6);
      const dateStr = pDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
      const updStr = (pos.updated_at ? new Date(pos.updated_at) : baseDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
      const status = (pos.status as any) || "OPERASIONAL";

      const comps: UnifiedComponentItem[] = [];

      // CPU
      if (pos.processor && pos.processor !== "-") {
        comps.push({
          id: `CPU-${seq}`,
          componentType: "CPU",
          componentTypeName: "Processor",
          model: pos.processor,
          parentAssetCode: assetCode,
          parentType: "POS",
          parentTitle: pos.pos_code,
          location,
          subLocation: shopName,
          ipAddress: pos.ip_address,
          status,
          price: "Rp 1.650.000",
          purchasedFrom: "NCR / Wincor Official Distributor",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // RAM
      if (pos.ram && pos.ram !== "-") {
        comps.push({
          id: `RAM-${seq}`,
          componentType: "RAM",
          componentTypeName: "RAM Internal",
          model: pos.ram,
          parentAssetCode: assetCode,
          parentType: "POS",
          parentTitle: pos.pos_code,
          location,
          subLocation: shopName,
          ipAddress: pos.ip_address,
          status,
          price: "Rp 450.000",
          purchasedFrom: "NCR Official Spareparts",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // Storage
      if (pos.ssd && pos.ssd !== "-") {
        comps.push({
          id: `SSD-${seq}`,
          componentType: "SSD",
          componentTypeName: "Storage SSD",
          model: pos.ssd,
          parentAssetCode: assetCode,
          parentType: "POS",
          parentTitle: pos.pos_code,
          location,
          subLocation: shopName,
          ipAddress: pos.ip_address,
          status,
          price: "Rp 550.000",
          purchasedFrom: "Distributor Storage IT",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // Keyboard
      if (pos.keyboard && pos.keyboard !== "-") {
        comps.push({
          id: `KBD-${seq}`,
          componentType: "KEYBOARD",
          componentTypeName: "Keyboard Kasir",
          model: pos.keyboard,
          parentAssetCode: assetCode,
          parentType: "POS",
          parentTitle: pos.pos_code,
          location,
          subLocation: shopName,
          ipAddress: pos.ip_address,
          status,
          price: "Rp 165.000",
          purchasedFrom: "Logitech Store Mangga Dua",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // Mouse
      if (pos.mouse && pos.mouse !== "-") {
        comps.push({
          id: `MOU-${seq}`,
          componentType: "MOUSE",
          componentTypeName: "Mouse Kasir",
          model: pos.mouse,
          parentAssetCode: assetCode,
          parentType: "POS",
          parentTitle: pos.pos_code,
          location,
          subLocation: shopName,
          ipAddress: pos.ip_address,
          status,
          price: "Rp 85.000",
          purchasedFrom: "Logitech Store Mangga Dua",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // Printer Kasir
      if (pos.printer && pos.printer !== "-") {
        comps.push({
          id: `PRN-${seq}`,
          componentType: "PRINTER",
          componentTypeName: "Receipt Printer Kasir",
          model: pos.printer,
          parentAssetCode: assetCode,
          parentType: "POS",
          parentTitle: pos.pos_code,
          location,
          subLocation: shopName,
          ipAddress: pos.ip_address,
          status,
          price: "Rp 2.850.000",
          purchasedFrom: "Epson POS Partner Indonesia",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // Barcode Scanner
      if (pos.barcode_scanner && pos.barcode_scanner !== "-") {
        comps.push({
          id: `SCN-${seq}`,
          componentType: "BARCODE_SCANNER",
          componentTypeName: "Barcode Scanner",
          model: pos.barcode_scanner,
          parentAssetCode: assetCode,
          parentType: "POS",
          parentTitle: pos.pos_code,
          location,
          subLocation: shopName,
          ipAddress: pos.ip_address,
          status,
          price: "Rp 1.450.000",
          purchasedFrom: "Honeywell POS Partner",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // Passport Reader
      if (pos.passport_scanner && pos.passport_scanner !== "-") {
        comps.push({
          id: `PAS-${seq}`,
          componentType: "PASSPORT_READER",
          componentTypeName: "Passport Reader",
          model: pos.passport_scanner,
          parentAssetCode: assetCode,
          parentType: "POS",
          parentTitle: pos.pos_code,
          location,
          subLocation: shopName,
          ipAddress: pos.ip_address,
          status,
          price: "Rp 18.500.000",
          purchasedFrom: "3M / Gemalto Official Partner",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // Cash Drawer
      if (pos.cash_drawer && pos.cash_drawer !== "-") {
        comps.push({
          id: `DRW-${seq}`,
          componentType: "CASH_DRAWER",
          componentTypeName: "Cash Drawer / Laci",
          model: pos.cash_drawer,
          parentAssetCode: assetCode,
          parentType: "POS",
          parentTitle: pos.pos_code,
          location,
          subLocation: shopName,
          ipAddress: pos.ip_address,
          status,
          price: "Rp 850.000",
          purchasedFrom: "Panda POS Hardware Jakarta",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // OS Version
      if (pos.os_version && pos.os_version !== "-") {
        comps.push({
          id: `LIC-${seq}`,
          componentType: "OS",
          componentTypeName: "Lisensi OS Kasir",
          model: pos.os_version,
          parentAssetCode: assetCode,
          parentType: "POS",
          parentTitle: pos.pos_code,
          location,
          subLocation: shopName,
          ipAddress: pos.ip_address,
          status,
          price: "Rp 2.150.000",
          purchasedFrom: "Microsoft OEM Partner",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      // UPS / Power Backup (Hanya bagi unit POS yang menggunakan UPS)
      if (pos.ups && pos.ups !== "-" && pos.ups.trim() !== "") {
        comps.push({
          id: `UPS-${seq}`,
          componentType: "UPS",
          componentTypeName: "UPS / Power Backup",
          model: pos.ups,
          parentAssetCode: assetCode,
          parentType: "POS",
          parentTitle: pos.pos_code,
          location,
          subLocation: shopName,
          ipAddress: pos.ip_address,
          status,
          price: "Rp 3.850.000",
          purchasedFrom: "APC by Schneider Electric Official",
          purchaseDate: dateStr,
          lastUpdate: updStr,
        });
      }

      list.push({
        assetCode,
        setCategory: "POS",
        name: `${pos.pos_code} (${shopName})`,
        location,
        divisionOrStore: shopName,
        ipAddress: pos.ip_address || "-",
        deviceType: pos.pos_brand || "NCR",
        status,
        components: comps,
      });
    });

    return list;
  }, [officeList, posList]);

  // 4. Flatten all components for Matrix View
  const allComponents: UnifiedComponentItem[] = useMemo(() => {
    return unifiedSets.flatMap((s) => s.components);
  }, [unifiedSets]);

  // Filter Sets berdasarkan Scope & Search
  const filteredSets = useMemo(() => {
    return unifiedSets.filter((set) => {
      // Scope filter
      if (selectedScope === "HEAD_OFFICE") {
        if (set.setCategory !== "OFFICE") return false;
        const loc = set.location.toLowerCase();
        if (!loc.includes("head") && !loc.includes("pusat")) return false;
      } else if (selectedScope === "WHS") {
        if (set.setCategory !== "OFFICE") return false;
        const loc = set.location.toLowerCase();
        if (!loc.includes("warehouse") && !loc.includes("whs")) return false;
      } else if (selectedScope === "T2") {
        if (set.setCategory !== "OFFICE") return false;
        const loc = set.location.toLowerCase();
        if (!loc.includes("terminal 2") && !loc.includes("t2")) return false;
      } else if (selectedScope === "T3") {
        if (set.setCategory !== "OFFICE") return false;
        const loc = set.location.toLowerCase();
        if (!loc.includes("terminal 3") && !loc.includes("t3")) return false;
      } else if (selectedScope === "SBY") {
        if (set.setCategory !== "OFFICE") return false;
        const loc = set.location.toLowerCase();
        if (!loc.includes("surabaya") && !loc.includes("sby")) return false;
      } else if (selectedScope === "POS_T2") {
        if (set.setCategory !== "POS") return false;
        const loc = set.location.toLowerCase();
        if (!loc.includes("terminal 2") && !loc.includes("t2")) return false;
      } else if (selectedScope === "POS_T3") {
        if (set.setCategory !== "POS") return false;
        const loc = set.location.toLowerCase();
        if (!loc.includes("terminal 3") && !loc.includes("t3")) return false;
      } else if (selectedScope === "POS_SBY") {
        if (set.setCategory !== "POS") return false;
        const loc = set.location.toLowerCase();
        if (!loc.includes("surabaya") && !loc.includes("sby")) return false;
      } else if (selectedScope === "POS") {
        if (set.setCategory !== "POS") return false;
      }

      // Component Type filter: Set must contain at least one component of this type
      if (selectedCompType) {
        const hasType = set.components.some((c) => c.componentType === selectedCompType);
        if (!hasType) return false;
      }

      // Status filter
      if (selectedStatus && set.status !== selectedStatus) {
        return false;
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchSet =
          set.assetCode.toLowerCase().includes(q) ||
          set.name.toLowerCase().includes(q) ||
          set.divisionOrStore.toLowerCase().includes(q) ||
          set.location.toLowerCase().includes(q) ||
          set.ipAddress.toLowerCase().includes(q);

        const matchComp = set.components.some(
          (c) =>
            c.id.toLowerCase().includes(q) ||
            c.model.toLowerCase().includes(q) ||
            c.componentTypeName.toLowerCase().includes(q)
        );

        if (!matchSet && !matchComp) return false;
      }

      return true;
    });
  }, [unifiedSets, selectedScope, selectedCompType, selectedStatus, search]);

  // Filter Flat Components for Matrix View
  const filteredComponents = useMemo(() => {
    return allComponents.filter((comp) => {
      // Scope filter
      if (selectedScope === "HEAD_OFFICE") {
        if (comp.parentType !== "OFFICE") return false;
        const loc = comp.location.toLowerCase();
        if (!loc.includes("head") && !loc.includes("pusat")) return false;
      } else if (selectedScope === "WHS") {
        if (comp.parentType !== "OFFICE") return false;
        const loc = comp.location.toLowerCase();
        if (!loc.includes("warehouse") && !loc.includes("whs")) return false;
      } else if (selectedScope === "T2") {
        if (comp.parentType !== "OFFICE") return false;
        const loc = comp.location.toLowerCase();
        if (!loc.includes("terminal 2") && !loc.includes("t2")) return false;
      } else if (selectedScope === "T3") {
        if (comp.parentType !== "OFFICE") return false;
        const loc = comp.location.toLowerCase();
        if (!loc.includes("terminal 3") && !loc.includes("t3")) return false;
      } else if (selectedScope === "SBY") {
        if (comp.parentType !== "OFFICE") return false;
        const loc = comp.location.toLowerCase();
        if (!loc.includes("surabaya") && !loc.includes("sby")) return false;
      } else if (selectedScope === "POS_T2") {
        if (comp.parentType !== "POS") return false;
        const loc = comp.location.toLowerCase();
        if (!loc.includes("terminal 2") && !loc.includes("t2")) return false;
      } else if (selectedScope === "POS_T3") {
        if (comp.parentType !== "POS") return false;
        const loc = comp.location.toLowerCase();
        if (!loc.includes("terminal 3") && !loc.includes("t3")) return false;
      } else if (selectedScope === "POS_SBY") {
        if (comp.parentType !== "POS") return false;
        const loc = comp.location.toLowerCase();
        if (!loc.includes("surabaya") && !loc.includes("sby")) return false;
      } else if (selectedScope === "POS") {
        if (comp.parentType !== "POS") return false;
      }

      // Component Type filter
      if (selectedCompType && comp.componentType !== selectedCompType) {
        return false;
      }

      // Status filter
      if (selectedStatus && comp.status !== selectedStatus) {
        return false;
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          comp.id.toLowerCase().includes(q) ||
          comp.model.toLowerCase().includes(q) ||
          comp.parentAssetCode.toLowerCase().includes(q) ||
          comp.parentTitle.toLowerCase().includes(q) ||
          comp.componentTypeName.toLowerCase().includes(q) ||
          comp.location.toLowerCase().includes(q) ||
          (comp.subLocation && comp.subLocation.toLowerCase().includes(q)) ||
          (comp.ipAddress && comp.ipAddress.toLowerCase().includes(q));

        if (!match) return false;
      }

      return true;
    });
  }, [allComponents, selectedScope, selectedCompType, selectedStatus, search]);

  const copyToClipboard = (text: string, key: string) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenStickerForComponent = (comp: UnifiedComponentItem) => {
    const assetObj: Asset = {
      asset_code: comp.id,
      name: `${comp.componentTypeName} (${comp.model})`,
      category: comp.componentType === "MONITOR" ? "Display / Monitor" : comp.componentType === "PRINTER" ? "Printer Thermal" : comp.componentType === "BARCODE_SCANNER" ? "Barcode Scanner" : "Lainnya",
      shop_location: comp.location,
      brand_model: comp.model,
      serial_number: comp.sn || "-",
      ip_address: comp.ipAddress || null,
      status: comp.status === "CADANGAN" ? "CADANGAN" : "OPERASIONAL",
      notes: `Terpasang di Set Kode Aset: ${comp.parentAssetCode} (${comp.parentTitle}) • Toko: ${comp.purchasedFrom} • Harga: ${comp.price}`,
    };
    setSelectedAssetForSticker(assetObj);
  };

  const handleOpenStickerForSet = (set: UnifiedAssetSet) => {
    const assetObj: Asset = {
      asset_code: set.assetCode,
      name: `1 Set Perangkat ${set.name}`,
      category: set.setCategory === "POS" ? "POS Terminal" : "Lainnya",
      shop_location: set.location,
      brand_model: set.deviceType,
      serial_number: "-",
      ip_address: set.ipAddress !== "-" ? set.ipAddress : null,
      status: set.status === "CADANGAN" ? "CADANGAN" : "OPERASIONAL",
      notes: `Lokasi: ${set.location} • Divisi/Toko: ${set.divisionOrStore} • Berisi ${set.components.length} ID Barang komponen`,
    };
    setSelectedAssetForSticker(assetObj);
  };

  const handleExportCsv = () => {
    const headers = [
      "NO",
      "ID_BARANG",
      "JENIS_KOMPONEN",
      "MODEL_SPESIFIKASI",
      "KODE_ASET_SET",
      "PENGGUNA_TITIK",
      "LOKASI",
      "DIVISI_TOKO",
      "IP_ADDRESS",
      "STATUS",
      "HARGA_ESTIMASI",
      "VENDOR_TOKO",
      "TANGGAL_PEROLEHAN",
    ];

    const rows = filteredComponents.map((c, i) => [
      i + 1,
      `"${c.id}"`,
      `"${c.componentTypeName}"`,
      `"${c.model}"`,
      `"${c.parentAssetCode}"`,
      `"${c.parentTitle}"`,
      `"${c.location}"`,
      `"${c.subLocation || "-"}"`,
      `"${c.ipAddress || "-"}"`,
      `"${c.status}"`,
      `"${c.price}"`,
      `"${c.purchasedFrom}"`,
      `"${c.purchaseDate}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_ID_Barang_Relasi_Kode_Aset_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <SidebarLayout onOpenScanner={() => setIsScannerOpen(true)}>
      <main className="flex-1 w-full max-w-full px-2.5 sm:px-5 py-5 space-y-4">
        {/* Executive Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-700 shadow-2xs shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Rincian ID Barang & Relasi Kode Aset
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {unifiedSets.length} Set Kode Aset
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#006622]/10 text-[#006622] border border-[#006622]/20">
                  {allComponents.length} ID Barang Terdata
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Peta hierarki lengkap interkoneksi 1 Set Kode Aset dengan seluruh ID Barang komponen internal & periferal di dalamnya
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {/* View Mode Toggle Buttons */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode("CARD_TREE")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "CARD_TREE"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Grid className="w-3.5 h-3.5 text-indigo-600" />
                <span>Hierarki Set</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("TABLE_MATRIX")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "TABLE_MATRIX"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <List className="w-3.5 h-3.5 text-[#006622]" />
                <span>Tabel ID Barang</span>
              </button>
            </div>

            <Link
              href="/asset-transfers"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold rounded-xl shadow-2xs transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-700" />
              <span>Tracking Mutasi</span>
            </Link>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 4 Executive Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total Set Kode Aset"
            labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            value={
              <>
                {unifiedSets.length}{" "}
                <span className="text-xs font-normal text-slate-400">Set</span>
              </>
            }
            valueClassName="text-2xl text-slate-900 mt-0.5 font-black"
            hint="PC Office & Kasir POS"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Boxes}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-all"
          />

          <StatCard
            label="Total ID Barang"
            labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            value={
              <>
                {allComponents.length}{" "}
                <span className="text-xs font-normal text-slate-400">Unit</span>
              </>
            }
            valueClassName="text-2xl text-[#006622] mt-0.5 font-black"
            hint="Seluruh Komponen Terpasang"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Tag}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-[#006622] flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-all"
          />

          <StatCard
            label="Komponen Internal"
            labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            value={
              <>
                {allComponents.filter((c) => ["CPU", "MOTHERBOARD", "RAM", "SSD", "HDD"].includes(c.componentType)).length}{" "}
                <span className="text-xs font-normal text-slate-400">Unit</span>
              </>
            }
            valueClassName="text-2xl text-blue-600 mt-0.5 font-black"
            hint="CPU, Mobo, RAM & Storage"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Cpu}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-all"
          />

          <StatCard
            label="Periferal & Display"
            labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            value={
              <>
                {allComponents.filter((c) => ["MONITOR", "PRINTER", "KEYBOARD", "MOUSE", "BARCODE_SCANNER", "PASSPORT_READER", "CASH_DRAWER", "UPS"].includes(c.componentType)).length}{" "}
                <span className="text-xs font-normal text-slate-400">Unit</span>
              </>
            }
            valueClassName="text-2xl text-amber-600 mt-0.5 font-black"
            hint="Monitor, Printer, UPS & Aksesori"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Monitor}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-all"
          />
        </div>

        {/* Filter Controls Card */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          {/* Row 1: Scope Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              Lingkup Set:
            </span>
            {[
              { key: "ALL", label: "Semua Perangkat", count: unifiedSets.length },
              { key: "HEAD_OFFICE", label: "Aset Head Office", count: unifiedSets.filter((s) => s.setCategory === "OFFICE" && (s.location.toLowerCase().includes("head") || s.location.toLowerCase().includes("pusat"))).length },
              { key: "WHS", label: "Aset Warehouse", count: unifiedSets.filter((s) => s.setCategory === "OFFICE" && (s.location.toLowerCase().includes("warehouse") || s.location.toLowerCase().includes("whs"))).length },
              { key: "T2", label: "Aset Terminal 2", count: unifiedSets.filter((s) => s.setCategory === "OFFICE" && (s.location.toLowerCase().includes("terminal 2") || s.location.toLowerCase().includes("t2"))).length },
              { key: "T3", label: "Aset Terminal 3", count: unifiedSets.filter((s) => s.setCategory === "OFFICE" && (s.location.toLowerCase().includes("terminal 3") || s.location.toLowerCase().includes("t3"))).length },
              { key: "SBY", label: "Aset Surabaya", count: unifiedSets.filter((s) => s.setCategory === "OFFICE" && (s.location.toLowerCase().includes("surabaya") || s.location.toLowerCase().includes("sby"))).length },
              { key: "POS_T2", label: "POS T2 JKT", count: unifiedSets.filter((s) => s.setCategory === "POS" && (s.location.toLowerCase().includes("terminal 2") || s.location.toLowerCase().includes("t2"))).length, isPos: true },
              { key: "POS_T3", label: "POS T3 JKT", count: unifiedSets.filter((s) => s.setCategory === "POS" && (s.location.toLowerCase().includes("terminal 3") || s.location.toLowerCase().includes("t3"))).length, isPos: true },
              { key: "POS_SBY", label: "POS SBY", count: unifiedSets.filter((s) => s.setCategory === "POS" && (s.location.toLowerCase().includes("surabaya") || s.location.toLowerCase().includes("sby"))).length, isPos: true },
            ].map((scope) => (
              <Fragment key={scope.key}>
                {scope.key === "POS_T2" && (
                  <div className="h-5 w-px bg-slate-300 mx-1 shrink-0" />
                )}
                <button
                  type="button"
                  onClick={() => setSelectedScope(scope.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    selectedScope === scope.key
                      ? scope.isPos
                        ? "bg-[#006622] text-white shadow-2xs"
                        : "bg-slate-900 text-white shadow-2xs"
                      : scope.isPos
                      ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  <span>{scope.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      selectedScope === scope.key
                        ? "bg-black/20 text-white"
                        : scope.isPos
                        ? "bg-emerald-200/80 text-emerald-900 font-bold"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {scope.count}
                  </span>
                </button>
              </Fragment>
            ))}
          </div>

          {/* Row 2: Search Input & Dropdowns */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
            {/* Search Input */}
            <div className="flex-1 max-w-xl">
              <SearchInput
                value={search}
                onChange={setSearch}
                onClear={() => setSearch("")}
                placeholder="Cari ID Barang (RAM-002, SSD-011), Kode Aset (PC-MIS-26...), pengguna, merk..."
                inputClassName="pl-9 pr-8 py-2 bg-slate-50 border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            {/* Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Component Type Dropdown */}
              <select
                value={selectedCompType}
                onChange={(e) => setSelectedCompType(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
              >
                <option value="">Semua Jenis ID Barang</option>
                <option value="CPU">Processor (CPU-xxx)</option>
                <option value="MOTHERBOARD">Motherboard (MB-xxx)</option>
                <option value="RAM">RAM Internal (RAM-xxx)</option>
                <option value="SSD">Storage SSD (SSD-xxx)</option>
                <option value="HDD">Storage HDD (HDD-xxx)</option>
                <option value="MONITOR">Monitor Display (MON-xxx)</option>
                <option value="PRINTER">Printer (PRN-xxx)</option>
                <option value="KEYBOARD">Keyboard (KBD-xxx)</option>
                <option value="MOUSE">Mouse (MOU-xxx)</option>
                <option value="BARCODE_SCANNER">Barcode Scanner (SCN-xxx)</option>
                <option value="PASSPORT_READER">Passport Reader (PAS-xxx)</option>
                <option value="CASH_DRAWER">Cash Drawer (DRW-xxx)</option>
                <option value="OS">Lisensi OS (LIC-xxx)</option>
                <option value="UPS">UPS / Power Backup (UPS-xxx)</option>
              </select>

              {/* Status Dropdown */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
              >
                <option value="">Semua Status</option>
                <option value="OPERASIONAL">Operasional</option>
                <option value="CADANGAN">Cadangan</option>
                <option value="PERBAIKAN">Perbaikan</option>
                <option value="RUSAK">Rusak</option>
              </select>

              {/* Reset Button */}
              {(search || selectedScope !== "ALL" || selectedCompType || selectedStatus) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedScope("ALL");
                    setSelectedCompType("");
                    setSelectedStatus("");
                  }}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200/80"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-12">
            <LoadingState message="Memuat Hierarki Relasi Kode Aset & ID Barang..." />
          </div>
        ) : filteredSets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-12">
            <EmptyState
              icon={Boxes}
              iconClassName="w-12 h-12 text-slate-300"
              title="Tidak ada relasi komponen ditemukan"
              description="Coba sesuaikan kata kunci pencarian ID Barang atau Kode Aset."
            />
          </div>
        ) : viewMode === "CARD_TREE" ? (
          /* ───────── MODE 1: HIERARKI KARTU SET (TREE / CARD VIEW) ───────── */
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-semibold">
              <span>
                Menampilkan <strong className="text-slate-800">{filteredSets.length}</strong> Set Kode Aset (Total{" "}
                <strong className="text-[#006622]">
                  {filteredSets.reduce((acc, s) => acc + s.components.length, 0)}
                </strong>{" "}
                ID Barang terpasang)
              </span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredSets.map((set) => {
                const isSetCopied = copiedKey === `set-${set.assetCode}`;

                return (
                  <div
                    key={set.assetCode}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
                  >
                    {/* Header Kartu Set */}
                    <div className="p-3.5 bg-gradient-to-r from-slate-50 via-slate-50/80 to-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-2xs ${
                            set.setCategory === "POS" ? "bg-emerald-700" : "bg-indigo-600"
                          }`}
                        >
                          {set.setCategory === "POS" ? (
                            <Laptop className="w-5 h-5" />
                          ) : (
                            <Building2 className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-black text-slate-900 text-xs tracking-tight bg-white px-2 py-0.5 rounded-md border border-slate-200/90 shadow-2xs">
                              {set.assetCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(set.assetCode, `set-${set.assetCode}`)}
                              title="Salin Kode Aset"
                              className="text-slate-400 hover:text-indigo-600 p-0.5 transition-colors"
                            >
                              {isSetCopied ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <span
                              className={`text-[9.5px] font-bold px-2 py-0.2 rounded-full border ${
                                set.status === "OPERASIONAL"
                                  ? "bg-emerald-50 text-[#006622] border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {set.status}
                            </span>
                          </div>

                          <h3 className="font-bold text-slate-800 text-sm mt-0.5 leading-snug">
                            {set.name}
                          </h3>

                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium flex-wrap mt-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {set.location}
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">
                              {set.setCategory === "POS" ? "Toko" : "Divisi"}: {set.divisionOrStore}
                            </span>
                            {set.ipAddress && set.ipAddress !== "-" && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-blue-700 font-bold">{set.ipAddress}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenStickerForSet(set)}
                          title="Cetak Barcode Label Set"
                          className="flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold border border-slate-200 transition-colors shadow-2xs"
                        >
                          <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Barcode Set</span>
                        </button>
                      </div>
                    </div>

                    {/* Table / Grid Komponen ID Barang di dalam Set ini: Dibagi atas SPED & PREFERAL */}
                    {(() => {
                      const spedComponents = set.components.filter((c) =>
                        ["CPU", "MOTHERBOARD", "RAM", "SSD", "HDD", "OS"].includes(c.componentType)
                      );
                      const preferalComponents = set.components.filter((c) =>
                        !["CPU", "MOTHERBOARD", "RAM", "SSD", "HDD", "OS"].includes(c.componentType)
                      );

                      const renderComponentRow = (comp: UnifiedComponentItem) => {
                        const Icon = getComponentIcon(comp.componentType);
                        const badgeColor = getComponentTypeBadgeColor(comp.componentType);
                        const isCompCopied = copiedKey === `comp-${comp.id}`;

                        return (
                          <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors group">
                            {/* ID Barang */}
                            <td className="px-3 py-1.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-indigo-800 bg-indigo-50 border border-indigo-200/90 px-1.5 py-0.5 rounded text-[10px] tracking-tight shadow-2xs">
                                  {comp.id}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(comp.id, `comp-${comp.id}`)}
                                  title="Salin ID Barang"
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 p-0.5 transition-opacity"
                                >
                                  {isCompCopied ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Jenis Komponen */}
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className={`p-1 rounded-md border ${badgeColor}`}>
                                  <Icon className="w-3 h-3" />
                                </span>
                                <span className="font-bold text-slate-800 text-[10px]">
                                  {comp.componentTypeName}
                                </span>
                              </div>
                            </td>

                            {/* Spesifikasi / Model */}
                            <td className="px-2 py-1.5">
                              <div className="truncate font-semibold text-slate-800 text-[10.5px]" title={comp.model}>
                                {comp.model}
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono truncate" title={`Harga: ${comp.price} • Toko: ${comp.purchasedFrom}`}>
                                {comp.price} • {comp.purchasedFrom}
                              </div>
                            </td>

                            {/* Tanggal Pembelian */}
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <div className="font-mono text-[10px] text-slate-700 font-bold flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{comp.purchaseDate}</span>
                              </div>
                              <div className="text-[8.5px] text-slate-400 font-medium">
                                Terakhir Update: {comp.lastUpdate}
                              </div>
                            </td>

                            {/* Aksi */}
                            <td className="px-2 py-1.5 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleOpenStickerForComponent(comp)}
                                title="Cetak Barcode ID Barang"
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors inline-block"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      };

                      return (
                        <div className="flex-1 overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[10px]">
                            <thead>
                              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold text-[9.5px] uppercase tracking-wider">
                                <th className="px-3 py-1.5 w-[22%]">ID Barang</th>
                                <th className="px-2 py-1.5 w-[18%]">Jenis</th>
                                <th className="px-2 py-1.5 w-[33%]">Spesifikasi / Model</th>
                                <th className="px-2 py-1.5 w-[19%]">Tanggal Pembelian</th>
                                <th className="px-2 py-1.5 w-[8%] text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {/* ── Sub-Grup 1: Spesifikasi PC & Hardware (Sped) ── */}
                              <tr className="bg-blue-50/70">
                                <td colSpan={5} className="px-3 py-1 font-black text-blue-900 text-[9px] uppercase tracking-wider border-y border-blue-200/60">
                                  <div className="flex items-center justify-between">
                                    <span>💻 Spesifikasi PC & Hardware (Sped)</span>
                                    <span className="font-mono text-blue-700 font-bold">{spedComponents.length} ID Barang</span>
                                  </div>
                                </td>
                              </tr>
                              {spedComponents.length > 0 ? (
                                spedComponents.map(renderComponentRow)
                              ) : (
                                <tr>
                                  <td colSpan={5} className="px-3 py-1.5 text-slate-400 italic text-[9px] text-center">
                                    Tidak ada data komponen hardware spesifik
                                  </td>
                                </tr>
                              )}

                              {/* ── Sub-Grup 2: Periferal & Aksesori (Preferal) ── */}
                              <tr className="bg-emerald-50/70">
                                <td colSpan={5} className="px-3 py-1 font-black text-[#006622] text-[9px] uppercase tracking-wider border-y border-emerald-200/60">
                                  <div className="flex items-center justify-between">
                                    <span>🖱️ Periferal & Aksesori (Preferal)</span>
                                    <span className="font-mono text-[#006622] font-bold">{preferalComponents.length} ID Barang</span>
                                  </div>
                                </td>
                              </tr>
                              {preferalComponents.length > 0 ? (
                                preferalComponents.map(renderComponentRow)
                              ) : (
                                <tr>
                                  <td colSpan={5} className="px-3 py-1.5 text-slate-400 italic text-[9px] text-center">
                                    Tidak ada data periferal terhubung
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}

                    {/* Footer Kartu Set */}
                    <div className="px-3.5 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-500 font-medium">
                      <span>
                        Total Terpasang: <strong className="text-slate-800 font-bold">{set.components.length}</strong> ID Barang
                      </span>
                      <span className="text-[#006622] font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        Terhubung ISO 55001
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ───────── MODE 2: TABEL MASTER ID BARANG (MATRIX TABLE VIEW) ───────── */
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[9.5px] uppercase tracking-wider">
                    <th className="px-2.5 py-2 text-center w-10">No</th>
                    <th className="px-3 py-2 w-28">ID Barang</th>
                    <th className="px-3 py-2 w-32">Jenis Komponen</th>
                    <th className="px-3 py-2">Merk & Spesifikasi</th>
                    <th className="px-3 py-2 w-44">Terpasang di Kode Aset (Set)</th>
                    <th className="px-3 py-2 w-32">Lokasi / Divisi</th>
                    <th className="px-2.5 py-2 text-center w-24">Status</th>
                    <th className="px-3 py-2 w-36">Harga / Toko</th>
                    <th className="px-3 py-2 w-32">Tanggal Pembelian</th>
                    <th className="px-2.5 py-2 text-center w-14">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredComponents.map((comp, index) => {
                    const Icon = getComponentIcon(comp.componentType);
                    const badgeColor = getComponentTypeBadgeColor(comp.componentType);
                    const isCopied = copiedKey === `matrix-${comp.id}`;

                    return (
                      <tr key={`${comp.id}-${index}`} className="hover:bg-slate-50/80 transition-colors group">
                        {/* No */}
                        <td className="px-2.5 py-1.5 text-center font-mono text-slate-400">
                          {index + 1}
                        </td>

                        {/* ID Barang */}
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] tracking-tight">
                              {comp.id}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(comp.id, `matrix-${comp.id}`)}
                              title="Salin ID Barang"
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 p-0.5 transition-opacity"
                            >
                              {isCopied ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Jenis Komponen */}
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9.5px] font-bold ${badgeColor}`}>
                            <Icon className="w-3 h-3" />
                            <span>{comp.componentTypeName}</span>
                          </span>
                        </td>

                        {/* Spesifikasi / Model */}
                        <td className="px-3 py-1.5">
                          <div className="font-bold text-slate-900 text-[10.5px]" title={comp.model}>
                            {comp.model}
                          </div>
                        </td>

                        {/* Terpasang di Kode Aset (Set) */}
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <div>
                            <span className="font-mono font-black text-slate-900 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {comp.parentAssetCode}
                            </span>
                            <div className="text-[9.5px] text-slate-500 font-semibold truncate max-w-[170px]" title={comp.parentTitle}>
                              {comp.parentTitle}
                            </div>
                          </div>
                        </td>

                        {/* Lokasi / Divisi */}
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <div className="text-slate-800 font-bold text-[10px]">{comp.location}</div>
                          <div className="text-slate-500 text-[9px]">{comp.subLocation || "-"}</div>
                        </td>

                        {/* Status */}
                        <td className="px-2.5 py-1.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              comp.status === "OPERASIONAL"
                                ? "bg-emerald-50 text-[#006622] border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {comp.status}
                          </span>
                        </td>

                        {/* Harga & Toko */}
                        <td className="px-3 py-1.5">
                          <div className="font-mono font-bold text-emerald-700 text-[10px]">{comp.price}</div>
                          <div className="text-[9px] text-slate-500 truncate max-w-[140px]" title={comp.purchasedFrom}>
                            {comp.purchasedFrom}
                          </div>
                        </td>

                        {/* Tanggal Pembelian */}
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <div className="font-mono text-[10px] text-slate-700 font-bold flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{comp.purchaseDate}</span>
                          </div>
                          <div className="text-[8.5px] text-slate-400 font-medium">
                            Upd: {comp.lastUpdate}
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="px-2.5 py-1.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenStickerForComponent(comp)}
                            title="Cetak Barcode Label Stiker"
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>
                Menampilkan <strong className="text-slate-800">{filteredComponents.length}</strong> dari{" "}
                <strong className="text-slate-800">{allComponents.length}</strong> ID Barang komponen
              </span>
              <span className="text-[#006622] font-bold">
                PT Plaza Bali Prima • Master Hardware Asset Architecture
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Barcode Generator Modal */}
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
        onRequestTicket={(asset) => setSelectedAssetForTicket(asset)}
        onOpenSticker={(asset) => setSelectedAssetForSticker(asset)}
      />
    </SidebarLayout>
  );
}

export default function AssetComponentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Memuat Katalog ID Barang & Kode Aset...</div>}>
      <AssetComponentsContent />
    </Suspense>
  );
}
