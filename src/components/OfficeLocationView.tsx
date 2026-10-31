"use client";

import { useState, useMemo, Suspense, Fragment } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import ScannerModal from "@/components/ScannerModal";
import BarcodeGeneratorModal from "@/components/BarcodeGeneratorModal";
import TicketModal from "@/components/TicketModal";
import StatCard from "@/components/common/StatCard";
import SearchInput from "@/components/common/SearchInput";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
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
  UserCheck,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import Link from "next/link";

export type OfficeLocationKey =
  | "Head Office"
  | "Warehouse (WHS)"
  | "Office Terminal 2"
  | "Office Terminal 3"
  | "Office Surabaya";

export interface OfficeLocationViewProps {
  locationKey: OfficeLocationKey;
  pageTitle: string;
  pageSubtitle: string;
}

const ALL_DIVISIONS = [
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

const LOCATION_TABS = [
  {
    key: "Head Office",
    href: "/office",
    label: "PC Head Office",
    badgeLabel: "Pusat",
    dot: "bg-indigo-500",
  },
  {
    key: "Warehouse (WHS)",
    href: "/office/warehouse",
    label: "PC Warehouse PlazaBali",
    badgeLabel: "WHS",
    dot: "bg-orange-500",
  },
  {
    key: "Office Terminal 2",
    href: "/office/t2",
    label: "PC Terminal 2 (T2)",
    badgeLabel: "T2",
    dot: "bg-amber-500",
  },
  {
    key: "Office Terminal 3",
    href: "/office/t3",
    label: "PC Terminal 3 (T3)",
    badgeLabel: "T3",
    dot: "bg-emerald-500",
  },
  {
    key: "Office Surabaya",
    href: "/office/surabaya",
    label: "PC Surabaya (SBY)",
    badgeLabel: "SBY",
    dot: "bg-purple-500",
  },
];

function isLocationMatch(itemLoc: string | undefined | null, targetKey: OfficeLocationKey): boolean {
  const loc = (itemLoc || "Head Office").toLowerCase();
  if (targetKey === "Warehouse (WHS)") {
    return loc.includes("warehouse") || loc.includes("whs");
  }
  if (targetKey === "Office Terminal 2") {
    return loc.includes("terminal 2") || loc.includes("t2");
  }
  if (targetKey === "Office Terminal 3") {
    return loc.includes("terminal 3") || loc.includes("t3");
  }
  if (targetKey === "Office Surabaya") {
    return loc.includes("surabaya") || loc.includes("sby");
  }
  // Head Office
  return loc.includes("head") || loc.includes("pusat") || loc === "head office" || !itemLoc;
}

export function OfficeLocationContent({ locationKey, pageTitle, pageSubtitle }: OfficeLocationViewProps) {
  const { user, isAdmin, isMIS, isManager, isProcurement } = useAuth();

  if (!isAdmin && !isMIS && !isManager && !isProcurement) {
    return <AccessDenied moduleName={`Aset ${pageTitle}`} />;
  }

  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialDiv = searchParams.get("div") || "";

  const [search, setSearch] = useState(initialSearch);
  const [selectedDivision, setSelectedDivision] = useState(initialDiv);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedType, setSelectedType] = useState("");

  // Modals & UI States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedAssetForSticker, setSelectedAssetForSticker] = useState<Asset | null>(null);
  const [selectedAssetForTicket, setSelectedAssetForTicket] = useState<Asset | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Hover Popover Detail State (Matching POS Style)
  const [hoverDetail, setHoverDetail] = useState<{
    x: number;
    y: number;
    component: string;
    model: string;
    itemId: string;
    isSetAssetCode?: boolean;
    childComponents?: { id: string; name: string; spec: string }[];
    assetCode?: string;
    position: string;
    price: string;
    purchasedFrom: string;
    purchaseDate: string;
    status: string;
    lastChange: string;
    sn?: string;
    notes?: string;
  } | null>(null);

  // Helper ID barang terstandarisasi untuk modal hover
  const getComponentItemId = (component: string, item: OfficeHardwareAsset): { itemId: string; position: string; isSetAssetCode?: boolean } => {
    const seq = String(item.item_no || item.id).padStart(3, "0");
    const compUpper = component.toUpperCase();
    const parentCode = item.asset_code || `AST-${seq}`;

    if (compUpper.includes("MOUSE")) {
      return {
        itemId: `MOU-${seq}`,
        position: `Dipakai di Set ${parentCode} (${item.user_name})`,
      };
    }
    if (compUpper.includes("KEYBOARD")) {
      return {
        itemId: `KBD-${seq}`,
        position: `Dipakai di Set ${parentCode} (${item.user_name})`,
      };
    }
    if (compUpper.includes("MONITOR")) {
      return {
        itemId: `MON-${seq}`,
        position: `Display Utama di Set ${parentCode} (${item.user_name})`,
      };
    }
    if (compUpper.includes("PRINTER")) {
      return {
        itemId: `PRN-${seq}`,
        position: `Terhubung ke ${parentCode} (${item.user_name})`,
      };
    }
    if (compUpper.includes("RAM")) {
      return {
        itemId: `RAM-${seq}`,
        position: `Terpasang di ${parentCode} (${item.user_name})`,
      };
    }
    if (compUpper.includes("SSD")) {
      return {
        itemId: `SSD-${seq}`,
        position: `Terpasang di ${parentCode} (${item.user_name})`,
      };
    }
    if (compUpper.includes("HDD")) {
      return {
        itemId: `HDD-${seq}`,
        position: `Terpasang di ${parentCode} (${item.user_name})`,
      };
    }
    if (compUpper.includes("PROCESSOR") || compUpper.includes("CPU")) {
      return {
        itemId: `CPU-${seq}`,
        position: `Terpasang di Socket ${parentCode}`,
      };
    }
    if (compUpper.includes("MOTHERBOARD") || compUpper.includes("MOBO")) {
      return {
        itemId: `MB-${seq}`,
        position: `Mainboard Unit ${parentCode}`,
      };
    }
    if (compUpper.includes("OS") || compUpper.includes("OPERATING SYSTEM")) {
      return {
        itemId: `LIC-${seq}`,
        position: `Lisensi Resmi di ${parentCode}`,
      };
    }
    if (compUpper.includes("UNIT") || compUpper.includes("PC") || compUpper.includes("ROUTER") || compUpper.includes("PABX")) {
      return {
        itemId: item.asset_code,
        position: `Set Unit Utama ${item.user_name} (${item.office_location || locationKey})`,
        isSetAssetCode: true,
      };
    }

    return {
      itemId: `DEV-${seq}`,
      position: `Unit Utama ${parentCode}`,
    };
  };

  const getChildComponents = (item: OfficeHardwareAsset) => {
    const seq = String(item.item_no || item.id).padStart(3, "0");
    const list: { id: string; name: string; spec: string }[] = [];
    if (item.processor && item.processor !== "-") {
      list.push({ id: `CPU-${seq}`, name: "Processor", spec: item.processor });
    }
    if (item.motherboard && item.motherboard !== "-") {
      list.push({ id: `MB-${seq}`, name: "Motherboard", spec: item.motherboard });
    }
    if (item.ram && item.ram !== "-") {
      list.push({ id: `RAM-${seq}`, name: "RAM", spec: item.ram });
    }
    const storage = parseStorage(item.hard_drive);
    if (storage.ssd) {
      list.push({ id: `SSD-${seq}`, name: "SSD", spec: storage.ssd });
    }
    if (storage.hdd) {
      list.push({ id: `HDD-${seq}`, name: "HDD", spec: storage.hdd });
    }
    if (item.monitor && item.monitor !== "-") {
      list.push({ id: `MON-${seq}`, name: "Monitor", spec: item.monitor });
    }
    if (item.printer && item.printer !== "-") {
      list.push({ id: `PRN-${seq}`, name: "Printer", spec: item.printer });
    }
    if (item.keyboard && item.keyboard !== "-") {
      list.push({ id: `KBD-${seq}`, name: "Keyboard", spec: item.keyboard });
    }
    if (item.mouse && item.mouse !== "-") {
      list.push({ id: `MOU-${seq}`, name: "Mouse", spec: item.mouse });
    }
    if (item.os && item.os !== "-") {
      list.push({ id: `LIC-${seq}`, name: "OS", spec: item.os });
    }
    return list;
  };

  const getComponentProcurement = (component: string, model: string, item: OfficeHardwareAsset) => {
    const compUpper = (component + " " + model).toUpperCase();

    let price = "Rp 350.000";
    let purchasedFrom = "Distributor Resmi IT Jakarta";

    if (compUpper.includes("KEYBOARD")) {
      price = "Rp 165.000";
      purchasedFrom = "Logitech Store / Toko Komputer Mangga Dua";
    } else if (compUpper.includes("MOUSE")) {
      price = "Rp 85.000";
      purchasedFrom = "Logitech Store / Toko Komputer Mangga Dua";
    } else if (compUpper.includes("MONITOR")) {
      price = model.includes("24") ? "Rp 1.750.000" : "Rp 1.250.000";
      purchasedFrom = "Distributor LG / Samsung Harco Mangga Dua";
    } else if (compUpper.includes("PRINTER")) {
      price = model.includes("3210") || model.includes("3110") ? "Rp 2.450.000" : "Rp 1.850.000";
      purchasedFrom = "Master Dealer EPSON / Mangga Dua Mall";
    } else if (compUpper.includes("PROCESSOR") || compUpper.includes("CPU")) {
      price = model.includes("i5") ? "Rp 2.250.000" : model.includes("i3") ? "Rp 1.450.000" : "Rp 1.850.000";
      purchasedFrom = "Distributor Intel / AMD Resmi Metro Data";
    } else if (compUpper.includes("MOTHERBOARD") || compUpper.includes("MOBO")) {
      price = model.includes("H610") || model.includes("H510") ? "Rp 1.350.000" : "Rp 950.000";
      purchasedFrom = "ASUS / Gigabyte Official Store Jakarta";
    } else if (compUpper.includes("RAM")) {
      price = model.includes("16") || model.includes("16GB") ? "Rp 650.000" : "Rp 380.000";
      purchasedFrom = "Distributor RAM Kingston / V-Gen Harco Mangga Dua";
    } else if (compUpper.includes("SSD")) {
      price = model.includes("512") || model.includes("500") ? "Rp 580.000" : "Rp 320.000";
      purchasedFrom = "Distributor Storage IT Harco Mangga Dua";
    } else if (compUpper.includes("HDD")) {
      price = model.includes("1TB") || model.includes("1000") ? "Rp 650.000" : "Rp 350.000";
      purchasedFrom = "Distributor Seagate / WD Mangga Dua";
    } else if (compUpper.includes("OS") || compUpper.includes("WINDOWS")) {
      price = "Rp 2.150.000";
      purchasedFrom = "Microsoft OEM Partner (Lisensi Resmi Bawaan)";
    }

    const baseDate = item.created_at ? new Date(item.created_at) : new Date();
    const pDate = new Date(baseDate);
    pDate.setMonth(pDate.getMonth() - 6);
    const purchaseDate = pDate.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return { price, purchasedFrom, purchaseDate };
  };

  const handleShowDetail = (
    e: React.MouseEvent,
    component: string,
    model: string | null | undefined,
    item: OfficeHardwareAsset,
    extraNotes?: string
  ) => {
    if (!model || model === "-") return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dateStr = item.updated_at
      ? new Date(item.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
      : item.created_at
      ? new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
      : "Bawaan Unit";

    const { price, purchasedFrom, purchaseDate } = getComponentProcurement(component, model, item);
    const { itemId, position, isSetAssetCode } = getComponentItemId(component, item);
    const childComponents = isSetAssetCode ? getChildComponents(item) : undefined;

    setHoverDetail({
      x: rect.left + rect.width / 2,
      y: rect.top,
      component: isSetAssetCode ? "Set Komputer Unit" : component,
      model: isSetAssetCode ? `${item.device_type || "PC"} (${item.user_name})` : model,
      itemId,
      isSetAssetCode,
      childComponents,
      assetCode: item.asset_code,
      position,
      price,
      purchasedFrom,
      purchaseDate,
      status: item.status || "OPERASIONAL",
      lastChange: dateStr,
      notes: extraNotes || item.notes || `Perangkat operasional divisi ${item.division}`,
    });
  };

  const handleHideDetail = () => {
    setHoverDetail(null);
  };

  // Form Modal (Add / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OfficeHardwareAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<OfficeHardwareAsset>>({
    asset_code: "",
    item_no: 1,
    office_location: locationKey,
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

  // Data seluruh aset office dari API + SWR cache
  const {
    data: allOfficeData,
    isLoading,
    refresh: fetchOfficeAssets,
  } = useApiData<OfficeHardwareAsset[]>("/api/office", {
    cacheKey: "office_hardware_assets_all",
    transform: (json) => {
      const res = json as { success?: boolean; data?: OfficeHardwareAsset[] };
      return res.success && Array.isArray(res.data) ? res.data : [];
    },
  });

  const allOfficeList = allOfficeData ?? [];

  // Hitung sebaran lokasi kantor untuk pill badges
  const locationStats = useMemo(() => {
    const counts = {
      all: allOfficeList.length,
      headOffice: 0,
      whs: 0,
      t2: 0,
      t3: 0,
      sby: 0,
    };
    allOfficeList.forEach((o) => {
      const loc = (o.office_location || "Head Office").toLowerCase();
      if (loc.includes("warehouse") || loc.includes("whs")) counts.whs++;
      else if (loc.includes("terminal 2") || loc.includes("t2")) counts.t2++;
      else if (loc.includes("terminal 3") || loc.includes("t3")) counts.t3++;
      else if (loc.includes("surabaya") || loc.includes("sby")) counts.sby++;
      else counts.headOffice++;
    });
    return counts;
  }, [allOfficeList]);

  // Filter aset strictly milik lokasi yang dipilih
  const locationOfficeList = useMemo(() => {
    return allOfficeList.filter((item) => isLocationMatch(item.office_location, locationKey));
  }, [allOfficeList, locationKey]);

  // Divisi yang ada di lokasi ini untuk dropdown
  const locationDivisions = useMemo(() => {
    const set = new Set<string>();
    locationOfficeList.forEach((item) => {
      if (item.division) set.add(item.division);
    });
    const arr = Array.from(set).sort();
    return arr.length > 0 ? arr : ALL_DIVISIONS;
  }, [locationOfficeList]);

  // Filter client-side berdasarkan pencarian & filter divisi/status/tipe
  const officeList = useMemo(() => {
    return locationOfficeList.filter((item) => {
      if (selectedDivision && item.division !== selectedDivision) return false;
      if (selectedStatus && item.status !== selectedStatus) return false;
      if (selectedType && item.device_type !== selectedType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          (item.user_name && item.user_name.toLowerCase().includes(q)) ||
          (item.asset_code && item.asset_code.toLowerCase().includes(q)) ||
          (item.ip_address && item.ip_address.toLowerCase().includes(q)) ||
          (item.division && item.division.toLowerCase().includes(q)) ||
          (item.processor && item.processor.toLowerCase().includes(q)) ||
          (item.motherboard && item.motherboard.toLowerCase().includes(q)) ||
          (item.hard_drive && item.hard_drive.toLowerCase().includes(q)) ||
          (item.ram && item.ram.toLowerCase().includes(q)) ||
          (item.monitor && item.monitor.toLowerCase().includes(q)) ||
          (item.printer && item.printer.toLowerCase().includes(q)) ||
          (item.notes && item.notes.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [locationOfficeList, selectedDivision, selectedStatus, selectedType, search]);

  // Group by Division matching POS structure
  const groupedDivisions = useMemo(() => {
    const divMap = new Map<string, OfficeHardwareAsset[]>();
    officeList.forEach((item) => {
      const div = item.division || "LAINNYA";
      if (!divMap.has(div)) divMap.set(div, []);
      divMap.get(div)!.push(item);
    });

    const result: { name: string; items: OfficeHardwareAsset[] }[] = [];
    divMap.forEach((items, name) => {
      result.push({ name, items });
    });
    return result;
  }, [officeList]);

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
      shop_location: locationKey,
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
      shop_location: locationKey,
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
      item_no: locationOfficeList.length + 1,
      office_location: locationKey,
      division: selectedDivision || (locationDivisions[0] || "MIS"),
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

  // Save Add / Edit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const isEdit = !!editingItem;
      const url = isEdit ? `/api/office/${editingItem.id}` : "/api/office";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan data");
      }

      setIsFormOpen(false);
      fetchOfficeAssets();
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan saat menyimpan");
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
      `"${o.office_location || locationKey}"`,
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
    const label = `${locationKey.replace(/\s+/g, "_")}_${selectedDivision || "Semua_Divisi"}`;
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_Perangkat_${label}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Counts for this location
  const pcCount = locationOfficeList.filter((o) => o.device_type === "PC").length;
  const netCount = locationOfficeList.filter((o) => o.device_type === "ROUTER" || o.device_type === "PABX").length;
  const ipCount = locationOfficeList.filter((o) => o.ip_address && o.ip_address.startsWith("172.")).length;

  // Helper: Parse Storage (SSD vs HDD)
  const formatStorageShort = (raw: string, type: "SSD" | "HDD"): string => {
    if (!raw) return "";
    const upper = raw.toUpperCase().trim();

    let cap = "";
    if (upper.includes("1863") || upper.includes("2000") || upper.includes("2TB")) {
      cap = "2TB";
    } else if (upper.includes("931") || upper.includes("1000") || upper.includes("1TB")) {
      cap = "1TB";
    } else if (upper.includes("512") || upper.includes("500") || upper.includes("480") || upper.includes("447")) {
      cap = upper.includes("480") || upper.includes("447") ? "480GB" : "512GB";
    } else if (upper.includes("256") || upper.includes("250") || upper.includes("240") || upper.includes("238")) {
      cap = upper.includes("240") ? "240GB" : "256GB";
    } else if (upper.includes("128") || upper.includes("120") || upper.includes("111")) {
      cap = upper.includes("120") ? "120GB" : "128GB";
    } else if (upper.includes("100")) {
      cap = "100GB";
    } else {
      const gbMatch = upper.match(/(\d{2,4})\s*GB/);
      if (gbMatch) cap = `${gbMatch[1]}GB`;
    }

    let brand = "";
    if (upper.includes("V-GEN") || upper.includes("V GEN")) brand = "V-Gen";
    else if (upper.includes("KINGSTON")) brand = "Kingston";
    else if (upper.includes("ADATA") || upper.includes("SU650")) brand = "Adata";
    else if (upper.includes("LEXAR") || upper.includes("NS100")) brand = "Lexar";
    else if (upper.includes("SEAGATE") || upper.includes("ST2000")) brand = "Seagate";
    else if (upper.includes("WD") || upper.includes("WESTERN")) brand = "WD";
    else if (upper.includes("SAMSUNG")) brand = "Samsung";
    else if (upper.includes("HITACHI")) brand = "Hitachi";

    if (cap && brand) return `${type} ${cap} ${brand}`;
    if (cap) return `${type} ${cap}`;
    return `${type} ${raw.slice(0, 15)}`;
  };

  const parseStorage = (hardDrive?: string): { ssd: string | null; hdd: string | null } => {
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
  };

  return (
    <SidebarLayout onOpenScanner={() => setIsScannerOpen(true)}>
      <main className="flex-1 w-full max-w-full px-2.5 sm:px-5 py-5 space-y-4">
        {/* Executive Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-[#006622] shadow-2xs shrink-0">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {pageTitle}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#006622]/10 text-[#006622] border border-[#006622]/20">
                  {locationOfficeList.length} Unit Terdata
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {pageSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <Link
              href="/extensions"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded-xl shadow-2xs transition-all"
            >
              <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
              <span>Ext Telepon PABX</span>
            </Link>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            {isMIS && (
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#006622] hover:bg-[#00551c] text-white text-xs font-semibold rounded-xl shadow-2xs active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Perangkat</span>
              </button>
            )}

            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/80 border border-slate-200/80 rounded-xl text-[11px] font-semibold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-[#006622] shadow-[0_0_6px_rgba(0,102,34,0.6)]"></span>
              <span>MIS OPS ({locationKey})</span>
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
                {locationOfficeList.length}{" "}
                <span className="text-xs font-normal text-slate-400">Unit</span>
              </>
            }
            valueClassName="text-2xl text-slate-900 mt-0.5 font-black"
            hint={locationKey}
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Building2}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-all"
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
            valueClassName="text-2xl text-blue-600 mt-0.5 font-black"
            hint="Komputer Staf & Manager"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Laptop}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-all"
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
            valueClassName="text-2xl text-amber-600 mt-0.5 font-black"
            hint="Router PB & PABX Telp"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Router}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-all"
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
            valueClassName="text-2xl text-emerald-600 mt-0.5 font-black"
            hint="Terkoneksi Jaringan VPN"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Activity}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-all"
          />
        </div>

        {/* Location & Filter Tabs */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          {/* Row 1: Lokasi Kantor Quick Links */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Menu Kantor:
            </span>
            {LOCATION_TABS.map((tab) => {
              const isActive = tab.key === locationKey;
              const count =
                tab.key === "Head Office"
                  ? locationStats.headOffice
                  : tab.key === "Warehouse (WHS)"
                  ? locationStats.whs
                  : tab.key === "Office Terminal 2"
                  ? locationStats.t2
                  : tab.key === "Office Terminal 3"
                  ? locationStats.t3
                  : locationStats.sby;

              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[#006622] text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? "bg-white" : tab.dot}`}></span>
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? "bg-[#00551c] text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Row 2: Search Input & Dropdown Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
            {/* Search Input */}
            <div className="flex-1 max-w-xl">
              <SearchInput
                value={search}
                onChange={setSearch}
                onClear={() => setSearch("")}
                placeholder="Cari nama pengguna, IP address (172.16...), processor, motherboard, storage..."
                inputClassName="pl-9 pr-8 py-2 bg-slate-50 border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-emerald-500/20 focus:border-[#006622]"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Division Dropdown */}
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
              >
                <option value="">Semua Divisi ({locationDivisions.length})</option>
                {locationDivisions.map((d) => (
                  <option key={d} value={d}>
                    Divisi {d}
                  </option>
                ))}
              </select>

              {/* Type Dropdown */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
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
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
              >
                <option value="">Semua Status</option>
                <option value="OPERASIONAL">Operasional</option>
                <option value="CADANGAN">Cadangan</option>
                <option value="PERBAIKAN">Perbaikan</option>
                <option value="RUSAK">Rusak</option>
              </select>

              {/* Reset Button */}
              {(search || selectedDivision || selectedType || selectedStatus) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedDivision("");
                    setSelectedType("");
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

        {/* Assets Master Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {isLoading ? (
            <LoadingState
              className="p-12"
              message={`Memuat Data ${pageTitle}...`}
            />
          ) : officeList.length === 0 ? (
            <EmptyState
              className="p-12"
              icon={Building2}
              iconClassName="w-12 h-12 text-slate-300"
              title="Tidak ada perangkat ditemukan"
              description="Coba sesuaikan kata kunci pencarian atau filter divisi/status."
            />
          ) : (
            <div className="w-full overflow-hidden">
              <table className="w-full min-w-full table-fixed text-left border-separate border-spacing-0 text-[10px]">
                <colgroup>
                  {/* 1-3: Identitas & Pengguna (21.0%) */}
                  <col className="w-[2.5%]" />
                  <col className="w-[10.5%]" />
                  <col className="w-[8.0%]" />
                  {/* 4-9: Spesifikasi PC & Hardware (49.5%) */}
                  <col className="w-[4.5%]" />
                  <col className="w-[7.0%]" />
                  <col className="w-[13.0%]" />
                  <col className="w-[11.0%]" />
                  <col className="w-[5.0%]" />
                  <col className="w-[9.0%]" />
                  {/* 10-13: Periferal & Aksesori (25.5%) */}
                  <col className="w-[8.5%]" />
                  <col className="w-[7.5%]" />
                  <col className="w-[5.0%]" />
                  <col className="w-[4.5%]" />
                  {/* 14: Aksi (4.0%) */}
                  <col className="w-[4.0%]" />
                </colgroup>
                <thead>
                  {/* Tier 1: Kategori Kelompok Kolom */}
                  <tr className="text-[10px] font-extrabold tracking-wide whitespace-nowrap h-[28px]">
                    <th
                      colSpan={3}
                      className="sticky top-14 z-20 px-1 py-1 text-center bg-slate-100 text-slate-800 border-b border-r border-slate-200 select-none shadow-2xs rounded-tl-2xl"
                    >
                      Identitas, Pengguna & IP Jaringan
                    </th>
                    <th
                      colSpan={6}
                      className="sticky top-14 z-20 px-1 py-1 text-center bg-blue-100 text-blue-900 border-b border-r border-slate-200 select-none shadow-2xs"
                    >
                      Spesifikasi PC & Hardware
                    </th>
                    <th
                      colSpan={4}
                      className="sticky top-14 z-20 px-1 py-1 text-center bg-emerald-100 text-[#006622] border-b border-r border-slate-200 select-none shadow-2xs"
                    >
                      Periferal & Aksesori
                    </th>
                    <th
                      rowSpan={2}
                      className="sticky top-14 z-20 px-1 py-1 text-center bg-slate-100 text-slate-800 font-bold align-middle border-b border-slate-200 select-none shadow-2xs rounded-tr-2xl"
                    >
                      Aksi
                    </th>
                  </tr>
                  {/* Tier 2: Sub-Kolom Spesifik */}
                  <tr className="text-slate-700 font-bold text-[9.5px] tracking-tight whitespace-nowrap h-[28px]">
                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center font-bold text-slate-400 bg-slate-50 border-b border-r border-slate-200/80 select-none">No</th>
                    <th className="sticky top-[84px] z-20 px-1.5 py-1 bg-slate-50 border-b border-r border-slate-200/80 select-none">Nama Pengguna</th>
                    <th className="sticky top-[84px] z-20 px-1 py-1 text-center bg-slate-50 border-b border-r border-slate-200 select-none">IP Address</th>

                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-r border-slate-200/80 select-none" title="Arahkan kursor (hover) untuk melihat Kode Aset & detail PC">Unit</th>
                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-r border-slate-200/80 select-none">OS</th>
                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-r border-slate-200/80 select-none">Proc</th>
                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-slate-200/80 select-none">Mobo</th>
                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-r border-slate-200/80 select-none">RAM</th>
                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-slate-200 select-none">Storage</th>

                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-emerald-50 text-emerald-950 border-b border-r border-slate-200/80 select-none">Monitor</th>
                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-emerald-50 text-emerald-950 border-b border-r border-slate-200/80 select-none">Printer</th>
                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-emerald-50 text-emerald-950 border-b border-r border-slate-200/80 select-none">Keyboard</th>
                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-emerald-50 text-emerald-950 border-b border-slate-200 select-none">Mouse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Location Banner Row */}
                  <tr className="bg-slate-100/90 border-t border-b border-slate-300">
                    <td colSpan={14} className="px-3 py-2">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[#006622]" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006622]" />
                          </span>
                          <span className="font-extrabold text-slate-900 text-xs tracking-tight uppercase">
                            {pageTitle}
                          </span>
                          <span className="px-2 py-0.2 rounded-full text-[9.5px] font-bold border shadow-2xs bg-emerald-50 text-[#006622] border-emerald-200">
                            {officeList.length} UNIT AKTIF • {groupedDivisions.length} Divisi
                          </span>
                        </div>
                        {/* Division pill tags on right */}
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline mr-0.5">
                            Divisi:
                          </span>
                          {groupedDivisions.map((div) => (
                            <span
                              key={div.name}
                              className="px-1.5 py-0.2 rounded bg-white border border-slate-200/90 text-slate-700 font-mono font-bold text-[9.5px] shadow-2xs"
                            >
                              {div.name} ({div.items.length})
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Sub-group per Division */}
                  {groupedDivisions.map((div, dIdx) => (
                    <Fragment key={`${div.name}-${dIdx}`}>
                      {/* Division Sub-header Row */}
                      <tr className="bg-slate-50/90 border-t border-b border-slate-200/70">
                        <td colSpan={14} className="px-3 py-1.5 bg-slate-50/70">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#006622]" />
                              <span className="font-mono font-black text-slate-900 text-[11px] tracking-wider uppercase">
                                DIVISI : {div.name}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold border bg-white border-slate-200/90 text-slate-700 shadow-2xs">
                                • {div.items.length} Unit Perangkat
                              </span>
                            </div>
                            <div className="text-[9.5px] font-mono text-slate-400 hidden sm:inline pr-1 truncate max-w-[450px]">
                              Pengguna: {div.items.map((i) => i.user_name).join(", ")}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Items inside this division */}
                      {div.items.map((item, index) => {
                        const isCopied = copiedKey === `ip-${item.id}`;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors group">
                            {/* 1. NO */}
                            <td className="px-0.5 py-1 text-center font-mono text-[10px] text-slate-400 font-semibold border-r border-slate-100">
                              {index + 1}
                            </td>

                            {/* 2. Pengguna */}
                            <td className="px-1.5 py-1 whitespace-nowrap border-r border-slate-100">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    item.status === "OPERASIONAL"
                                      ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"
                                      : item.status === "CADANGAN"
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                  }`}
                                  title={`Status: ${item.status}`}
                                />
                                <span className="font-bold text-slate-900 text-[10.5px] leading-tight" title={item.user_name}>
                                  {item.user_name}
                                </span>
                              </div>
                            </td>

                            {/* 3. IP Address */}
                            <td className="px-1 py-1 text-center whitespace-nowrap border-r border-slate-200">
                              {item.ip_address && item.ip_address !== "-" ? (
                                <div className="inline-flex items-center gap-0.5">
                                  <span className="font-mono font-bold text-blue-700 text-[10px] tracking-tight">
                                    {item.ip_address}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(item.ip_address!, `ip-${item.id}`)}
                                    title="Salin IP"
                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-700 p-0.5 shrink-0 transition-opacity"
                                  >
                                    {isCopied ? (
                                      <Check className="w-2.5 h-2.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-2.5 h-2.5" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-300 font-mono text-[10px]">—</span>
                              )}
                            </td>

                            {/* 4. Unit (Hover for Asset Code & Specs) */}
                            <td className="px-0.5 py-1 text-center whitespace-nowrap bg-blue-50/10 border-r border-slate-100">
                              <Link
                                href={`/asset-components?set=${encodeURIComponent(item.asset_code)}`}
                                className={`font-mono font-black text-[9.5px] uppercase cursor-pointer hover:underline ${
                                  item.device_type === "ROUTER"
                                    ? "text-orange-700"
                                    : item.device_type === "PABX"
                                    ? "text-purple-700"
                                    : "text-blue-700"
                                }`}
                                onMouseEnter={(e) => handleShowDetail(e, "Unit Perangkat Office", item.device_type || "PC", item)}
                                onMouseLeave={handleHideDetail}
                                title={`Kode Aset: ${item.asset_code} (Klik untuk buka rincian ID Barang)`}
                              >
                                {item.device_type || "PC"}
                              </Link>
                            </td>

                            {/* 5. OS */}
                            <td className="px-0.5 py-1 text-center bg-blue-50/10 border-r border-slate-100">
                              {item.os && item.os !== "-" ? (
                                <span
                                  className="text-[9.5px] text-slate-700 font-mono font-semibold inline-block leading-tight cursor-pointer hover:text-blue-600 transition-colors"
                                  title={item.os}
                                  onMouseEnter={(e) => handleShowDetail(e, "Sistem Operasi (OS)", item.os, item)}
                                  onMouseLeave={handleHideDetail}
                                >
                                  {item.os}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono text-[10px]">—</span>
                              )}
                            </td>

                            {/* 6. Proc */}
                            <td className="px-1 py-1 text-center bg-blue-50/10 border-r border-slate-100">
                              {item.processor && item.processor !== "-" ? (
                                <span
                                  className="text-[9.5px] font-mono font-semibold text-slate-800 inline-block leading-tight cursor-pointer hover:text-blue-600 hover:underline"
                                  title={item.processor}
                                  onMouseEnter={(e) => handleShowDetail(e, "Processor / CPU", item.processor, item)}
                                  onMouseLeave={handleHideDetail}
                                >
                                  {item.processor}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono text-[10px]">—</span>
                              )}
                            </td>

                            {/* 7. Mobo */}
                            <td className="px-1 py-1 text-center bg-blue-50/10 border-r border-slate-100">
                              {item.motherboard && item.motherboard !== "-" ? (
                                <span
                                  className="text-[9.5px] text-slate-700 font-mono font-medium inline-block leading-tight cursor-pointer hover:text-blue-600 transition-colors"
                                  title={item.motherboard}
                                  onMouseEnter={(e) => handleShowDetail(e, "Motherboard PC", item.motherboard, item)}
                                  onMouseLeave={handleHideDetail}
                                >
                                  {item.motherboard}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono text-[10px]">—</span>
                              )}
                            </td>

                            {/* 8. RAM */}
                            <td className="px-1 py-1 text-center whitespace-nowrap bg-blue-50/10 border-r border-slate-100">
                              {item.ram && item.ram !== "-" ? (
                                <span
                                  className="font-mono font-bold text-slate-800 text-[9.5px] cursor-pointer hover:text-indigo-600 transition-colors inline-block"
                                  title={item.ram}
                                  onMouseEnter={(e) => handleShowDetail(e, "RAM Internal", item.ram, item)}
                                  onMouseLeave={handleHideDetail}
                                >
                                  {(() => {
                                    const match = item.ram.match(/(\d+(\.\d+)?)\s*GB/i);
                                    const size = match ? `${parseFloat(match[1])} GB` : item.ram;
                                    const isDual = /dual/i.test(item.ram);
                                    return isDual ? `${size} (Dual)` : size;
                                  })()}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono text-[10px]">—</span>
                              )}
                            </td>

                            {/* 9. Storage (Stacked Atas Bawah: SSD & HDD) */}
                            <td className="px-1 py-1 text-center bg-blue-50/10 border-r border-slate-200">
                              {(() => {
                                const storage = parseStorage(item.hard_drive);
                                const ssdStr = storage.ssd;
                                const hddStr = storage.hdd;
                                if (!ssdStr && !hddStr) return <span className="text-slate-300 font-mono text-[10px]">—</span>;
                                const ssdShort = typeof ssdStr === "string" ? formatStorageShort(ssdStr, "SSD") : null;
                                const hddShort = typeof hddStr === "string" ? formatStorageShort(hddStr, "HDD") : null;
                                return (
                                  <div className="flex flex-col items-center justify-center text-[9px] font-mono leading-tight py-0.5 space-y-0.5">
                                    {ssdShort && (
                                      <span
                                        className="text-blue-700 font-bold cursor-pointer hover:underline whitespace-nowrap"
                                        title={`SSD: ${ssdStr}`}
                                        onMouseEnter={(e) => handleShowDetail(e, "SSD Internal", ssdStr, item)}
                                        onMouseLeave={handleHideDetail}
                                      >
                                        {ssdShort}
                                      </span>
                                    )}
                                    {hddShort && (
                                      <span
                                        className="text-amber-700 font-bold cursor-pointer hover:underline whitespace-nowrap"
                                        title={`HDD: ${hddStr}`}
                                        onMouseEnter={(e) => handleShowDetail(e, "HDD Internal", hddStr, item)}
                                        onMouseLeave={handleHideDetail}
                                      >
                                        {hddShort}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>

                            {/* 10. Monitor */}
                            <td className="px-1 py-1 text-center bg-emerald-50/10 border-r border-slate-100">
                              {item.monitor && item.monitor !== "-" ? (
                                <span
                                  className="text-[9.5px] text-slate-800 font-bold inline-block leading-tight cursor-pointer hover:text-emerald-700 hover:underline transition-colors"
                                  title={item.monitor}
                                  onMouseEnter={(e) => handleShowDetail(e, "Monitor Display", item.monitor, item)}
                                  onMouseLeave={handleHideDetail}
                                >
                                  {item.monitor}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono text-[10px]">—</span>
                              )}
                            </td>

                            {/* 11. Printer */}
                            <td className="px-1 py-1 text-center bg-emerald-50/10 border-r border-slate-100">
                              {item.printer && item.printer !== "-" ? (
                                <span
                                  className="text-[9.5px] font-semibold text-emerald-800 inline-block leading-tight cursor-pointer hover:underline"
                                  title={item.printer}
                                  onMouseEnter={(e) => handleShowDetail(e, "Printer Terhubung", item.printer, item)}
                                  onMouseLeave={handleHideDetail}
                                >
                                  {item.printer}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono text-[10px]">—</span>
                              )}
                            </td>

                            {/* 12. Keyboard */}
                            <td className="px-0.5 py-1 text-center bg-emerald-50/10 border-r border-slate-100">
                              {item.keyboard && item.keyboard !== "-" ? (
                                <span
                                  className="text-[9.5px] font-medium text-slate-800 inline-block leading-tight cursor-pointer hover:text-emerald-800 hover:underline"
                                  title={item.keyboard}
                                  onMouseEnter={(e) => handleShowDetail(e, "Keyboard Office", item.keyboard, item)}
                                  onMouseLeave={handleHideDetail}
                                >
                                  {item.keyboard}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono text-[10px]">—</span>
                              )}
                            </td>

                            {/* 13. Mouse */}
                            <td className="px-0.5 py-1 text-center bg-emerald-50/10 border-r border-slate-200">
                              {item.mouse && item.mouse !== "-" ? (
                                <span
                                  className="text-[9.5px] font-medium text-slate-800 inline-block leading-tight cursor-pointer hover:text-emerald-800 hover:underline"
                                  title={item.mouse}
                                  onMouseEnter={(e) => handleShowDetail(e, "Mouse Office", item.mouse, item)}
                                  onMouseLeave={handleHideDetail}
                                >
                                  {item.mouse}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono text-[10px]">—</span>
                              )}
                            </td>

                            {/* 14. Aksi */}
                            <td className="px-1 py-1 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSticker(item)}
                                  title="Cetak Barcode Label Stiker"
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenTicket(item)}
                                  title="Buka Tiket Trouble IT"
                                  className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                >
                                  <LifeBuoy className="w-3.5 h-3.5" />
                                </button>
                                {isMIS && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(item)}
                                      title="Edit Spesifikasi"
                                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(item.id!, item.asset_code, item.user_name)}
                                      title="Hapus Perangkat"
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Bottom Footer Bar */}
          {!isLoading && officeList.length > 0 && (
            <div className="p-3.5 bg-slate-50/80 border-t border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  Menampilkan <strong className="text-slate-800">{officeList.length}</strong> dari <strong className="text-slate-800">{locationOfficeList.length}</strong> unit {pageTitle}
                </span>
                {selectedDivision && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-700">
                    Divisi: {selectedDivision}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"></span>
                  <span>Operasional: <strong className="text-emerald-700 font-bold">{officeList.filter(o => o.status === "OPERASIONAL").length}</strong></span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Cadangan: <strong className="text-amber-700 font-bold">{officeList.filter(o => o.status === "CADANGAN").length}</strong></span>
                </span>
              </div>
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
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">{locationKey}</span>
                <h3 className="font-bold text-slate-800 text-base">
                  {editingItem ? `Edit Perangkat: ${editingItem.user_name}` : `Tambah Perangkat Baru (${locationKey})`}
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
                    {ALL_DIVISIONS.map((d) => (
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
                    placeholder="PA PEPEN / DANU / SPV"
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
                  {isSaving ? "Menyimpan..." : "Simpan Perangkat"}
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

      {/* Hover Detail Popover Card (Matching POS Standard) */}
      {hoverDetail && (
        <div
          style={{
            left: `${hoverDetail.x}px`,
            top: `${hoverDetail.y - 10}px`,
            transform: "translate(-50%, -100%)",
          }}
          className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="bg-white/98 text-slate-800 rounded-2xl p-3 shadow-2xl border border-slate-200/90 backdrop-blur-md w-64 text-[10px] leading-snug">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#006622] ring-4 ring-emerald-50" />
                <span className="font-extrabold text-[#006622] text-[10.5px] tracking-tight">
                  {hoverDetail.component}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#006622] border border-emerald-200/80 text-[8.5px] font-bold">
                {hoverDetail.status}
              </span>
            </div>

            {/* Main Spec Highlight Box */}
            <div className="p-2.5 bg-slate-50/90 border border-slate-200/80 rounded-xl mb-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold text-[9px]">
                  {hoverDetail.isSetAssetCode ? "Kode Aset:" : "ID Barang:"}
                </span>
                <span
                  className={`font-mono font-black ${
                    hoverDetail.isSetAssetCode
                      ? "text-emerald-800 bg-emerald-50 border-emerald-300"
                      : "text-indigo-700 bg-indigo-50 border-indigo-200/90"
                  } border px-1.5 py-0.5 rounded text-[10px] tracking-tight`}
                >
                  {hoverDetail.itemId}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 font-medium text-[9px]">
                  {hoverDetail.isSetAssetCode ? "Tipe Unit / Pengguna:" : "Model / Spesifikasi:"}
                </span>
                <span className="font-mono font-black text-slate-900 text-[10.5px] truncate max-w-[140px]" title={hoverDetail.model}>
                  {hoverDetail.model}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-1 pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 font-medium text-[9px] shrink-0">Status / Posisi:</span>
                <span className="font-mono font-bold text-emerald-800 text-[9px] truncate max-w-[150px]" title={hoverDetail.position}>
                  {hoverDetail.position}
                </span>
              </div>

              {/* Rincian Komponen ID Barang di dalam Kode Aset ini */}
              {hoverDetail.isSetAssetCode && hoverDetail.childComponents && hoverDetail.childComponents.length > 0 && (
                <div className="pt-2 border-t border-slate-200/70 space-y-1">
                  <div className="flex items-center justify-between text-[8.5px]">
                    <span className="text-slate-700 font-black uppercase tracking-tight">ID Barang di dalam Kode Aset:</span>
                    <span className="text-slate-500 font-mono font-bold">({hoverDetail.childComponents.length} Unit)</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto scrollbar-thin py-0.5">
                    {hoverDetail.childComponents.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1 font-mono text-[8px] px-1 py-0.2 rounded bg-white border border-slate-200/90 text-slate-700 shadow-2xs"
                        title={`${c.name}: ${c.spec}`}
                      >
                        <span className="font-bold text-indigo-700">{c.id}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500 max-w-[65px] truncate">{c.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Details Grid */}
            <div className="space-y-1 text-slate-600 mb-2">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-400">Harga:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 text-[9.5px]">
                  {hoverDetail.price}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                <span className="text-slate-400">Toko:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[150px]" title={hoverDetail.purchasedFrom}>
                  {hoverDetail.purchasedFrom}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                <span className="text-slate-400">Tanggal Pembelian:</span>
                <span className="font-mono font-medium text-slate-700">{hoverDetail.purchaseDate}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                <span className="text-slate-400">Terakhir Diganti / Update:</span>
                <span className="font-mono font-medium text-slate-700">{hoverDetail.lastChange}</span>
              </div>
              {hoverDetail.sn && (
                <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                  <span className="text-slate-400">Serial Number:</span>
                  <span className="font-mono text-slate-700 font-bold">{hoverDetail.sn}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {hoverDetail.notes && (
              <div className="p-1.5 bg-slate-50 border border-slate-200/60 rounded-lg text-[9px] text-slate-600 italic">
                <span className="font-bold not-italic text-slate-700">Catatan: </span>
                {hoverDetail.notes}
              </div>
            )}
          </div>
          {/* Arrow pointing down */}
          <div className="w-3 h-3 bg-white border-r border-b border-slate-200/90 rotate-45 mx-auto -mt-1.5 shadow-sm" />
        </div>
      )}
    </SidebarLayout>
  );
}

export default function OfficeLocationView(props: OfficeLocationViewProps) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Memuat Data {props.pageTitle}...</div>}>
      <OfficeLocationContent {...props} />
    </Suspense>
  );
}

