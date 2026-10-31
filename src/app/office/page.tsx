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

  // Hover Popover Detail State (Matching POS Style)
  const [hoverDetail, setHoverDetail] = useState<{
    x: number;
    y: number;
    component: string;
    model: string;
    itemId: string;
    position: string;
    price: string;
    purchasedFrom: string;
    purchaseDate: string;
    status: string;
    lastChange: string;
    sn?: string;
    notes?: string;
  } | null>(null);

  const getComponentItemId = (component: string, item: OfficeHardwareAsset) => {
    const parentCode = item.asset_code || "PC-OFFICE";
    const compUpper = component.toUpperCase();
    const itemNum = item.item_no || item.id || 1;
    const seq = String(itemNum).padStart(3, "0");

    if (compUpper.includes("KEYBOARD")) {
      return {
        itemId: `KBD-${seq}`,
        position: `Dipakai di Set ${parentCode} (${item.user_name})`,
      };
    }
    if (compUpper.includes("MOUSE")) {
      return {
        itemId: `MSE-${seq}`,
        position: `Dipakai di Set ${parentCode} (${item.user_name})`,
      };
    }
    if (compUpper.includes("MONITOR") || compUpper.includes("DISPLAY")) {
      return {
        itemId: `MNT-${seq}`,
        position: `Terhubung ke ${parentCode} (${item.user_name})`,
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
    return {
      itemId: `DEV-${seq}`,
      position: `Unit Utama ${parentCode}`,
    };
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
    model: string | undefined,
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
    const { itemId, position } = getComponentItemId(component, item);

    setHoverDetail({
      x: rect.left + rect.width / 2,
      y: rect.top,
      component,
      model,
      itemId,
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

  // Hitung sebaran lokasi kantor secara dinamis dari seluruh inventaris
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

  // Filter client-side berkecepatan tinggi tanpa flicker / delay
  const officeList = useMemo(() => {
    return allOfficeList.filter((item) => {
      if (selectedLocation) {
        const loc = (item.office_location || "Head Office").toLowerCase();
        if (selectedLocation === "Head Office") {
          if (!loc.includes("head") && !loc.includes("pusat") && item.office_location !== "Head Office") return false;
        } else if (!loc.includes(selectedLocation.toLowerCase())) {
          return false;
        }
      }
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
  }, [allOfficeList, selectedLocation, selectedDivision, selectedStatus, selectedType, search]);

  // Group officeList by Location -> Division matching POS structure
  const groupedLocations = useMemo(() => {
    const locationOrder = [
      {
        key: "Head Office",
        name: "HEAD OFFICE (PUSAT)",
        color: "bg-blue-600",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        match: (loc?: string) => {
          const l = (loc || "Head Office").toLowerCase();
          return l.includes("head") || l.includes("pusat") || l === "head office";
        },
      },
      {
        key: "Warehouse",
        name: "WAREHOUSE (WHS)",
        color: "bg-amber-600",
        badge: "bg-amber-50 text-amber-800 border-amber-200",
        match: (loc?: string) => {
          const l = (loc || "").toLowerCase();
          return l.includes("warehouse") || l.includes("whs");
        },
      },
      {
        key: "Terminal 2",
        name: "OFFICE TERMINAL 2 (T2)",
        color: "bg-emerald-600",
        badge: "bg-emerald-50 text-[#006622] border-emerald-200",
        match: (loc?: string) => {
          const l = (loc || "").toLowerCase();
          return l.includes("terminal 2") || l.includes("t2");
        },
      },
      {
        key: "Terminal 3",
        name: "OFFICE TERMINAL 3 (T3)",
        color: "bg-indigo-600",
        badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
        match: (loc?: string) => {
          const l = (loc || "").toLowerCase();
          return l.includes("terminal 3") || l.includes("t3");
        },
      },
      {
        key: "Surabaya",
        name: "OFFICE SURABAYA (SBY)",
        color: "bg-purple-600",
        badge: "bg-purple-50 text-purple-700 border-purple-200",
        match: (loc?: string) => {
          const l = (loc || "").toLowerCase();
          return l.includes("surabaya") || l.includes("sby");
        },
      },
    ];

    const result: {
      key: string;
      name: string;
      color: string;
      badge: string;
      items: OfficeHardwareAsset[];
      divisions: {
        name: string;
        items: OfficeHardwareAsset[];
      }[];
    }[] = [];

    locationOrder.forEach((loc) => {
      const itemsInLoc = officeList.filter((item) => loc.match(item.office_location));
      if (itemsInLoc.length > 0) {
        const divMap = new Map<string, OfficeHardwareAsset[]>();
        itemsInLoc.forEach((item) => {
          const div = item.division || "LAINNYA";
          if (!divMap.has(div)) divMap.set(div, []);
          divMap.get(div)!.push(item);
        });

        const divisions: { name: string; items: OfficeHardwareAsset[] }[] = [];
        divMap.forEach((divItems, divName) => {
          divisions.push({ name: divName, items: divItems });
        });

        result.push({
          key: loc.key,
          name: loc.name,
          color: loc.color,
          badge: loc.badge,
          items: itemsInLoc,
          divisions,
        });
      }
    });

    const assignedIds = new Set(result.flatMap((r) => r.items.map((i) => i.id)));
    const unassigned = officeList.filter((i) => !assignedIds.has(i.id));
    if (unassigned.length > 0) {
      const divMap = new Map<string, OfficeHardwareAsset[]>();
      unassigned.forEach((item) => {
        const div = item.division || "LAINNYA";
        if (!divMap.has(div)) divMap.set(div, []);
        divMap.get(div)!.push(item);
      });
      const divisions: { name: string; items: OfficeHardwareAsset[] }[] = [];
      divMap.forEach((divItems, divName) => {
        divisions.push({ name: divName, items: divItems });
      });
      result.push({
        key: "Others",
        name: "LOKASI LAINNYA",
        color: "bg-slate-600",
        badge: "bg-slate-50 text-slate-700 border-slate-200",
        items: unassigned,
        divisions,
      });
    }

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
  const pcCount = allOfficeList.filter((o) => o.device_type === "PC").length;
  const netCount = allOfficeList.filter((o) => o.device_type === "ROUTER" || o.device_type === "PABX").length;
  const fclCount = allOfficeList.filter((o) => o.device_type === "FACILITY").length;
  const ipCount = allOfficeList.filter((o) => o.ip_address && o.ip_address.startsWith("172.")).length;

  // Helper: Format RAM Display
  const formatRamDisplay = (ram?: string) => {
    if (!ram || ram === "-") return <span className="text-slate-300 select-none font-mono">—</span>;
    const match = ram.match(/(\d+(\.\d+)?)\s*GB/i);
    const size = match ? `${parseFloat(match[1])} GB` : ram;
    const isDual = /dual[- ]?channel/i.test(ram);
    const isSingle = /single[- ]?channel/i.test(ram);

    return (
      <div className="flex items-center gap-1 flex-wrap">
        <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50/90 px-1.5 py-0.5 rounded border border-indigo-200/80 shadow-2xs">
          {size}
        </span>
        {isDual && (
          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
            Dual-Ch
          </span>
        )}
        {isSingle && (
          <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
            Single-Ch
          </span>
        )}
      </div>
    );
  };

  // Helper: Parse Storage (SSD vs HDD)
  const parseStorage = (hardDrive?: string): { ssd: string | null; hdd: string | null } => {
    if (!hardDrive || hardDrive === "-") return { ssd: null, hdd: null };

    const parts = hardDrive.split(/\s*[\/,]\s*(?=\()/).length > 1
      ? hardDrive.split(/\s*[\/,]\s*(?=\()/)
      : hardDrive.split(/\s*\/\s*/);

    let ssd: string | null = null;
    let hdd: string | null = null;

    parts.forEach((p) => {
      const isSsd = p.toUpperCase().includes("SSD");
      const isHdd = p.toUpperCase().includes("HDD");
      const cleaned = p.replace(/[\(\[](SSD|HDD)[\)\]]/gi, "").trim();

      if (isSsd) {
        ssd = cleaned;
      } else if (isHdd) {
        hdd = cleaned;
      } else {
        if (/lexar|adata|v[\s-]?gen|kingston|samsung|nvme|m\.2/i.test(p)) {
          ssd = cleaned;
        } else {
          hdd = cleaned;
        }
      }
    });

    return { ssd, hdd };
  };

  // Helper: Format Processor Display
  const formatProcessorDisplay = (proc?: string, mobo?: string) => {
    if (!proc || proc === "-") {
      return <span className="text-slate-300 font-mono select-none">—</span>;
    }
    const isIntel = proc.toLowerCase().includes("intel");
    const isAmd = proc.toLowerCase().includes("amd");

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900" title={proc}>
          <Cpu className={`w-3.5 h-3.5 shrink-0 ${isIntel ? "text-blue-600" : isAmd ? "text-rose-600" : "text-indigo-600"}`} />
          <span className="truncate">{proc}</span>
        </div>
        {mobo && mobo !== "-" && (
          <div className="text-[10px] text-slate-500 truncate flex items-center gap-1" title={mobo}>
            <span className="font-semibold text-slate-400">Mobo:</span>
            <span className="text-slate-700 font-medium truncate">{mobo}</span>
          </div>
        )}
      </div>
    );
  };

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
        {/* Executive Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-[#006622] shadow-2xs shrink-0">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Aset Komputer Office & WHS
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#006622]/10 text-[#006622] border border-[#006622]/20">
                  {allOfficeList.length} Unit Terdata
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Monitoring hardware spesifikasi, IP address jaringan, printer & periferal seluruh divisi kantor
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
                {allOfficeList.length}{" "}
                <span className="text-xs font-normal text-slate-400">Unit</span>
              </>
            }
            valueClassName="text-2xl text-slate-900 mt-0.5 font-black"
            hint="Seluruh Divisi Office"
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
          {/* Row 1: Lokasi Kantor Segmented Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Lokasi:
            </span>
            <button
              type="button"
              onClick={() => setSelectedLocation("")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedLocation === ""
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              <span>Semua Kantor</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedLocation === "" ? "bg-slate-800 text-slate-200" : "bg-slate-200 text-slate-600"}`}>
                {locationStats.all}
              </span>
            </button>
            {[
              { label: "Head Office (Pusat)", value: "Head Office", count: locationStats.headOffice, dot: "bg-indigo-500" },
              { label: "Warehouse (WHS)", value: "Warehouse (WHS)", count: locationStats.whs, dot: "bg-orange-500" },
              { label: "Office Terminal 2 (T2)", value: "Office Terminal 2", count: locationStats.t2, dot: "bg-amber-500" },
              { label: "Office Terminal 3 (T3)", value: "Office Terminal 3", count: locationStats.t3, dot: "bg-emerald-500" },
              { label: "Office Surabaya (SBY)", value: "Office Surabaya", count: locationStats.sby, dot: "bg-purple-500" },
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
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedLocation === loc.value ? "bg-[#00551c] text-white" : "bg-slate-200 text-slate-600"}`}>
                  {loc.count}
                </span>
              </button>
            ))}
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
                <option value="">Semua Divisi ({DIVISIONS.length})</option>
                {DIVISIONS.map((d) => (
                  <option key={d} value={d}>Divisi {d}</option>
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
            <div className="w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs bg-white">
              <table className="w-full table-fixed text-left border-separate border-spacing-0 text-[10px]">
                <colgroup>
                  {/* 1-4: Identitas & Pengguna (29.4%) */}
                  <col className="w-[2.2%]" />
                  <col className="w-[10.2%]" />
                  <col className="w-[9.2%]" />
                  <col className="w-[7.8%]" />
                  {/* 5-10: Spesifikasi PC & Hardware (38.6%) */}
                  <col className="w-[4.4%]" />
                  <col className="w-[5.8%]" />
                  <col className="w-[8.2%]" />
                  <col className="w-[6.8%]" />
                  <col className="w-[5.2%]" />
                  <col className="w-[8.2%]" />
                  {/* 11-14: Periferal & Aksesori (22.0%) */}
                  <col className="w-[6.2%]" />
                  <col className="w-[5.8%]" />
                  <col className="w-[5.0%]" />
                  <col className="w-[5.0%]" />
                  {/* 15: Status (5.5%) */}
                  <col className="w-[5.5%]" />
                  {/* 16: Aksi (4.5%) */}
                  <col className="w-[4.5%]" />
                </colgroup>
                <thead>
                  {/* Tier 1: Kategori Kelompok Kolom */}
                  <tr className="text-[10px] font-extrabold tracking-wide whitespace-nowrap h-[28px]">
                    <th
                      colSpan={4}
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
                      colSpan={1}
                      className="sticky top-14 z-20 px-1 py-1 text-center bg-amber-100 text-amber-900 border-b border-r border-slate-200 select-none shadow-2xs"
                    >
                      Status
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
                    <th className="sticky top-[84px] z-20 px-1 py-1 text-center bg-slate-50 border-b border-r border-slate-200/80 select-none">Kode Aset</th>
                    <th className="sticky top-[84px] z-20 px-1 py-1 text-center bg-slate-50 border-b border-r border-slate-200 select-none">IP Address</th>

                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-r border-slate-200/80 select-none">Unit</th>
                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-r border-slate-200/80 select-none">OS</th>
                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-slate-200/80 select-none">Proc</th>
                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-slate-200/80 select-none">Mobo</th>
                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-slate-200/80 select-none">RAM</th>
                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-slate-200 select-none">Storage</th>

                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-emerald-50 text-emerald-950 border-b border-r border-slate-200/80 select-none">Monitor</th>
                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-emerald-50 text-emerald-950 border-b border-r border-slate-200/80 select-none">Printer</th>
                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-emerald-50 text-emerald-950 border-b border-r border-slate-200/80 select-none">Keyboard</th>
                    <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-emerald-50 text-emerald-950 border-b border-slate-200 select-none">Mouse</th>

                    <th className="sticky top-[84px] z-20 px-1 py-1 text-center bg-amber-50 text-amber-950 border-b border-r border-slate-200 select-none">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedLocations.map((group, gIdx) => (
                    <Fragment key={gIdx}>
                      {/* 1. Location Section Header */}
                      <tr className="bg-slate-100/90 border-t border-b border-slate-300">
                        <td colSpan={16} className="px-3 py-2">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                            <div className="flex items-center gap-2">
                              <span className="relative flex h-2 w-2 flex-shrink-0">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${group.color}`} />
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${group.color}`} />
                              </span>
                              <span className="font-extrabold text-slate-900 text-xs tracking-tight">
                                {group.name}
                              </span>
                              <span className={`px-2 py-0.2 rounded-full text-[9.5px] font-bold border shadow-2xs ${group.badge}`}>
                                {group.items.length} UNIT AKTIF • {group.divisions.length} Divisi
                              </span>
                            </div>
                            {/* Division pill tags on right */}
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline mr-0.5">
                                Divisi:
                              </span>
                              {group.divisions.map((div) => (
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

                      {/* 2. Sub-group per Division */}
                      {group.divisions.map((div, dIdx) => (
                        <Fragment key={`${div.name}-${dIdx}`}>
                          {/* Division Sub-header Row */}
                          <tr className="bg-slate-50/90 border-t border-b border-slate-200/70">
                            <td colSpan={16} className="px-3 py-1.5 bg-slate-50/70">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full ${group.color}`} />
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

                          {/* 3. Items inside this division */}
                          {div.items.map((item, index) => {
                            const isCopied = copiedKey === `ip-${item.id}`;
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors group">
                                {/* 1. NO */}
                                <td className="px-0.5 py-1 text-center font-mono text-[10px] text-slate-400 font-semibold border-r border-slate-100">
                                  {index + 1}
                                </td>

                                {/* 2. Pengguna */}
                                <td className="px-1.5 py-1 whitespace-nowrap border-r border-slate-100 overflow-hidden">
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
                                    <span className="font-bold text-slate-900 text-[10.5px] truncate" title={item.user_name}>
                                      {item.user_name}
                                    </span>
                                  </div>
                                </td>

                                {/* 3. Kode Aset */}
                                <td className="px-1 py-1 text-center whitespace-nowrap border-r border-slate-100 overflow-hidden">
                                  <div className="inline-flex items-center justify-center gap-1">
                                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[9.5px] border border-slate-200/90 shadow-2xs tracking-tight">
                                      {item.asset_code}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(item.asset_code, `code-${item.id}`)}
                                      title="Salin Kode Aset"
                                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-700 p-0.5 shrink-0 transition-opacity"
                                    >
                                      {copiedKey === `code-${item.id}` ? (
                                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-2.5 h-2.5" />
                                      )}
                                    </button>
                                  </div>
                                </td>

                                {/* 4. IP Address */}
                                <td className="px-1 py-1 text-center whitespace-nowrap border-r border-slate-200">
                                  {item.ip_address && item.ip_address !== "-" ? (
                                    <div className="inline-flex items-center gap-0.5">
                                      <span className="font-mono font-bold text-blue-700 bg-blue-50/90 px-1 py-0.5 rounded text-[9.5px] border border-blue-200/70 tracking-tight">
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

                                {/* 5. Unit */}
                                <td className="px-0.5 py-1 text-center whitespace-nowrap bg-blue-50/10 border-r border-slate-100">
                                  <span
                                    className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-black uppercase cursor-pointer hover:ring-1 hover:ring-blue-400 transition-all ${
                                      item.device_type === "ROUTER"
                                        ? "bg-orange-100 text-orange-800 border border-orange-200"
                                        : item.device_type === "PABX"
                                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                                        : "bg-blue-100 text-blue-800 border border-blue-200"
                                    }`}
                                    onMouseEnter={(e) => handleShowDetail(e, "Unit Perangkat Office", item.device_type || "PC", item)}
                                    onMouseLeave={handleHideDetail}
                                  >
                                    {item.device_type || "PC"}
                                  </span>
                                </td>

                                {/* 6. OS */}
                                <td className="px-0.5 py-1 text-center whitespace-nowrap bg-blue-50/10 border-r border-slate-100 overflow-hidden">
                                  {item.os && item.os !== "-" ? (
                                    <span
                                      className="text-[9.5px] text-slate-700 font-mono font-semibold inline-block max-w-full truncate cursor-pointer hover:text-blue-600 transition-colors"
                                      title={item.os}
                                      onMouseEnter={(e) => handleShowDetail(e, "Sistem Operasi (OS)", item.os, item)}
                                      onMouseLeave={handleHideDetail}
                                    >
                                      {item.os.replace("WINDOWS 10 PRO", "Win 10 Pro").replace("WINDOWS 10", "Win 10").replace("WINDOWS 7 ULTIMATE", "Win 7 Ult").replace("WINDOWS 7", "Win 7").replace("WINDOWS 11", "Win 11")}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 font-mono text-[10px]">—</span>
                                  )}
                                </td>

                                {/* 7. Proc */}
                                <td className="px-1 py-1 text-center whitespace-nowrap bg-blue-50/10 border-r border-slate-100 overflow-hidden">
                                  {item.processor && item.processor !== "-" ? (
                                    <span
                                      className="px-1.5 py-0.2 bg-slate-100 border border-slate-200/80 rounded text-[9.5px] font-mono font-semibold text-slate-800 inline-block max-w-full truncate cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all"
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

                                {/* 8. Mobo */}
                                <td className="px-1 py-1 text-center whitespace-nowrap bg-blue-50/10 border-r border-slate-100 overflow-hidden">
                                  {item.motherboard && item.motherboard !== "-" ? (
                                    <span
                                      className="text-[9.5px] text-slate-600 font-mono font-medium inline-block max-w-full truncate cursor-pointer hover:text-blue-600 transition-colors"
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

                                {/* 9. RAM */}
                                <td className="px-0.5 py-1 text-center whitespace-nowrap bg-blue-50/10 border-r border-slate-100">
                                  {item.ram && item.ram !== "-" ? (
                                    <span
                                      className="cursor-pointer hover:opacity-80 transition-opacity inline-block"
                                      onMouseEnter={(e) => handleShowDetail(e, "RAM Internal", item.ram, item)}
                                      onMouseLeave={handleHideDetail}
                                    >
                                      {formatRamDisplay(item.ram)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 font-mono text-[10px]">—</span>
                                  )}
                                </td>

                                {/* 10. Storage */}
                                <td className="px-1 py-1 text-center whitespace-nowrap bg-blue-50/10 border-r border-slate-200 overflow-hidden">
                                  {(() => {
                                    const storage = parseStorage(item.hard_drive);
                                    const ssdStr = storage.ssd;
                                    const hddStr = storage.hdd;
                                    if (!ssdStr && !hddStr) return <span className="text-slate-300 font-mono text-[10px]">—</span>;
                                    return (
                                      <div className="inline-flex items-center justify-center gap-1 max-w-full truncate">
                                        {typeof ssdStr === "string" && (
                                          <span
                                            className="px-1 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200 text-[8.5px] font-black uppercase truncate cursor-pointer hover:ring-1 hover:ring-blue-400 transition-all"
                                            title={`SSD: ${ssdStr}`}
                                            onMouseEnter={(e) => handleShowDetail(e, "SSD Internal", ssdStr, item)}
                                            onMouseLeave={handleHideDetail}
                                          >
                                            SSD {ssdStr.replace(/v-gen|adata|wd green|lexar|seagate|kingston/gi, "").trim()}
                                          </span>
                                        )}
                                        {typeof hddStr === "string" && (
                                          <span
                                            className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[8.5px] font-black uppercase truncate cursor-pointer hover:ring-1 hover:ring-amber-400 transition-all"
                                            title={`HDD: ${hddStr}`}
                                            onMouseEnter={(e) => handleShowDetail(e, "HDD Internal", hddStr, item)}
                                            onMouseLeave={handleHideDetail}
                                          >
                                            HDD {hddStr.replace(/seagate|wd|toshiba|hitachi/gi, "").trim()}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>

                                {/* 11. Monitor */}
                                <td className="px-1 py-1 text-center whitespace-nowrap bg-emerald-50/10 border-r border-slate-100 overflow-hidden">
                                  {item.monitor && item.monitor !== "-" ? (
                                    <span
                                      className="text-[9.5px] text-slate-800 font-bold inline-block max-w-full truncate cursor-pointer hover:text-emerald-700 hover:underline transition-colors"
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

                                {/* 12. Printer */}
                                <td className="px-1 py-1 text-center whitespace-nowrap bg-emerald-50/10 border-r border-slate-100 overflow-hidden">
                                  {item.printer && item.printer !== "-" ? (
                                    <span
                                      className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200/90 inline-block max-w-full truncate shadow-2xs cursor-pointer hover:ring-1 hover:ring-emerald-400 transition-all"
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

                                {/* 13. Keyboard */}
                                <td className="px-0.5 py-1 text-center whitespace-nowrap bg-emerald-50/10 border-r border-slate-100 overflow-hidden">
                                  {item.keyboard && item.keyboard !== "-" ? (
                                    <span
                                      className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white border border-slate-200 text-slate-700 inline-block max-w-full truncate shadow-2xs cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-all"
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

                                {/* 14. Mouse */}
                                <td className="px-0.5 py-1 text-center whitespace-nowrap bg-emerald-50/10 border-r border-slate-200 overflow-hidden">
                                  {item.mouse && item.mouse !== "-" ? (
                                    <span
                                      className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white border border-slate-200 text-slate-700 inline-block max-w-full truncate shadow-2xs cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-all"
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

                                {/* 15. Status */}
                                <td className="px-1 py-1 text-center whitespace-nowrap bg-amber-50/10 border-r border-slate-200">
                                  <StatusBadge
                                    status={item.status}
                                    label={<span className="text-[8.5px] font-extrabold">{item.status}</span>}
                                    className={
                                      item.status === "CADANGAN"
                                        ? "bg-amber-50 text-amber-800 border-amber-200 font-bold px-1.5 py-0.2 shadow-2xs text-[8.5px]"
                                        : item.status === "OPERASIONAL"
                                        ? "bg-emerald-50 text-[#006622] border-emerald-200/90 font-bold px-1.5 py-0.2 shadow-2xs text-[8.5px]"
                                        : "px-1.5 py-0.2 shadow-2xs text-[8.5px]"
                                    }
                                  />
                                </td>

                                {/* 16. Aksi */}
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
                  Menampilkan <strong className="text-slate-800">{officeList.length}</strong> dari <strong className="text-slate-800">{allOfficeList.length}</strong> unit perangkat
                </span>
                {selectedLocation && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-700">
                    Lokasi: {selectedLocation}
                  </span>
                )}
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
                <span className="text-slate-500 font-medium text-[9px]">ID Barang:</span>
                <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200/90 px-1.5 py-0.5 rounded text-[10px] tracking-tight">
                  {hoverDetail.itemId}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 font-medium text-[9px]">Model / Spesifikasi:</span>
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

export default function OfficePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Memuat Data Perangkat Office...</div>}>
      <OfficeContent />
    </Suspense>
  );
}

