"use client";

import { useEffect, useState, useMemo, useRef, Fragment, Suspense } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import ScannerModal from "@/components/ScannerModal";
import BarcodeGeneratorModal from "@/components/BarcodeGeneratorModal";
import TicketModal from "@/components/TicketModal";
import { Asset, PosHardwareAsset } from "@/types";
import {
  Laptop,
  Plus,
  Search,
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
  Tag,
  Download,
  Copy,
  Check,
  LifeBuoy,
  CreditCard,
  Layers,
  Sparkles,
  Cpu,
  Monitor,
  Fingerprint,
  Scan,
  HardDrive,
  ExternalLink,
  ShieldAlert,
  Store,
  Building2,
  MapPin,
  RefreshCw,
  ShoppingCart,
  ScreenShare,
  Zap
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import { getClientCache, setClientCache, clearClientCache } from "@/lib/cache";
import CustomDropdown, { DropdownOption } from "@/components/CustomDropdown";

function AssetsContent() {
  const { user, isAdmin, isMIS, isManager, isProcurement, isSPVPlazaBali, isSPVSam, userShopLocation } = useAuth();

  if (!user) {
    return <AccessDenied moduleName="Data Perangkat Kasir POS" />;
  }
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialTab = searchParams.get("tab") || "pos";

  // Tab State
  const [activeTab, setActiveTab] = useState<"pos" | "hardware">(
    initialTab === "hardware" ? "hardware" : "pos"
  );

  // --- TAB 1: DATA PERANGKAT KASIR POS PLAZA BALI & SAM ---
  const [posList, setPosList] = useState<PosHardwareAsset[]>([]);
  const [isPosLoading, setIsPosLoading] = useState(true);
  const [posSearch, setPosSearch] = useState(initialSearch);
  const [selectedPosShop, setSelectedPosShop] = useState(isMIS || isAdmin || isManager ? "" : userShopLocation);
  const [selectedTerminal, setSelectedTerminal] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedPassport, setSelectedPassport] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === "SPV_PLAZABALI_T3") {
      setSelectedPosShop("Plaza Bali");
      setSelectedTerminal("Terminal 3");
    } else if (user?.role === "SPV_PLAZABALI_T2") {
      setSelectedPosShop("Plaza Bali");
      setSelectedTerminal("Terminal 2");
    } else if (user?.role === "SPV_SAM_T3") {
      setSelectedPosShop("SAM");
      setSelectedTerminal("Terminal 3");
    } else if (user?.role === "SPV_SAM_T2") {
      setSelectedPosShop("SAM");
      setSelectedTerminal("Terminal 2");
    } else if (user?.role === "SPV_PLAZABALI") {
      setSelectedPosShop("Plaza Bali");
    } else if (user?.role === "SPV_SAM") {
      setSelectedPosShop("SAM");
    } else if (!isMIS && !isAdmin && !isManager && userShopLocation !== "Semua Toko") {
      setSelectedPosShop(userShopLocation);
      setSelectedShop(userShopLocation);
    }
  }, [user, isMIS, isAdmin, isManager, userShopLocation]);

  // POS Form Modal (Add / Edit)
  const [isPosFormOpen, setIsPosFormOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<PosHardwareAsset | null>(null);
  const [posFormData, setPosFormData] = useState<Partial<PosHardwareAsset>>({
    pos_number: 1,
    counter_no: 1,
    pos_code: "",
    shop_name: "Plaza Bali",
    terminal: "Terminal 3",
    counter_zone: "DFD01",
    store_alias: "Toko DF1",
    ip_address: "172.19.20.11",
    pos_brand: "NCR",
    pos_sn: "-",
    processor: "-",
    ram: "-",
    ssd: "-",
    tsigunta_version: "-",
    passport_scanner: "GEMALTO",
    barcode_scanner: "HONEYWELL",
    printer: "EPSON TM-U220D",
    fingerprint_scanner: "-",
    keyboard: "LOGITECH",
    mouse: "LOGITECH",
    cash_drawer: "PANDA",
    monitor: "-",
    os_version: "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
    status: "OPERASIONAL",
    notes: "",
  });
  const [posFormError, setPosFormError] = useState<string | null>(null);
  const [isSavingPos, setIsSavingPos] = useState(false);

  // --- TAB 2: MASTER HARDWARE STANDAR ---
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedShop, setSelectedShop] = useState(isMIS ? "" : userShopLocation);
  const [selectedStatus, setSelectedStatus] = useState("");

  // Asset Form Modal
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assetFormData, setAssetFormData] = useState<Partial<Asset>>({
    asset_code: "",
    name: "",
    category: "POS Terminal",
    shop_location: "Plaza Bali",
    brand_model: "",
    serial_number: "",
    ip_address: "",
    purchase_date: new Date().toISOString().split("T")[0],
    status: "OPERASIONAL",
    notes: "",
  });
  const [assetFormError, setAssetFormError] = useState<string | null>(null);
  const [isSavingAsset, setIsSavingAsset] = useState(false);

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedAssetForSticker, setSelectedAssetForSticker] = useState<Asset | null>(null);
  const [selectedPosForSticker, setSelectedPosForSticker] = useState<PosHardwareAsset | null>(null);
  const [selectedAssetForTicket, setSelectedAssetForTicket] = useState<Asset | null>(null);

  // Floating Hover Detail for Hardware Specs & Peripherals
  const [hoverDetail, setHoverDetail] = useState<{
    x: number;
    y: number;
    component: string;
    model: string;
    price: string;
    purchasedFrom: string;
    purchaseDate: string;
    status: string;
    lastChange: string;
    sn?: string;
    notes?: string;
  } | null>(null);

  const getComponentProcurement = (component: string, model: string, pos: PosHardwareAsset) => {
    // 1. Cek riwayat penggantian terstruktur di pos.notes
    if (pos.notes) {
      const compKeyUpper = component.toUpperCase();
      const matches = pos.notes.match(/\[REPLACE_([A-Z_]+):\s*([^|]+)\s*\|\s*Harga:\s*([^|]+)\s*\|\s*Toko:\s*([^|]+)\s*\|\s*Tgl:\s*([^|]+)\s*\|\s*Ket:\s*([^\]]+)\]/gi);
      if (matches) {
        for (const mStr of matches) {
          const matchResult = /\[REPLACE_([A-Z_]+):\s*([^|]+)\s*\|\s*Harga:\s*([^|]+)\s*\|\s*Toko:\s*([^|]+)\s*\|\s*Tgl:\s*([^|]+)\s*\|\s*Ket:\s*([^\]]+)\]/i.exec(mStr);
          if (matchResult) {
            const [, tagComp, tagModel, tagPrice, tagToko, tagTgl, tagKet] = matchResult;
            const isMatch =
              compKeyUpper.includes(tagComp) ||
              (tagComp === "KEYBOARD" && compKeyUpper.includes("KEYBOARD")) ||
              (tagComp === "MOUSE" && compKeyUpper.includes("MOUSE")) ||
              (tagComp === "PRINTER" && compKeyUpper.includes("PRINTER")) ||
              (tagComp === "BARCODE_SCANNER" && compKeyUpper.includes("BARCODE")) ||
              (tagComp === "PASSPORT_SCANNER" && compKeyUpper.includes("PASSPORT")) ||
              (tagComp === "CASH_DRAWER" && (compKeyUpper.includes("DRAWER") || compKeyUpper.includes("LACI"))) ||
              (tagComp === "POS_BRAND" && (compKeyUpper.includes("UNIT") || compKeyUpper.includes("POS")));

            if (isMatch) {
              const d = new Date(tagTgl.trim());
              const dateFormatted = !isNaN(d.getTime())
                ? d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                : tagTgl.trim();

              return {
                price: tagPrice.trim(),
                purchasedFrom: tagToko.trim(),
                purchaseDate: dateFormatted,
                customNote: tagKet.trim(),
              };
            }
          }
        }
      }
    }

    const compUpper = (component + " " + model).toUpperCase();

    let price = "Rp 450.000";
    let purchasedFrom = "Distributor Resmi IT Jakarta";

    if (compUpper.includes("KEYBOARD")) {
      price = "Rp 165.000";
      purchasedFrom = "Logitech Store / Toko Komputer Mangga Dua";
    } else if (compUpper.includes("MOUSE")) {
      price = "Rp 85.000";
      purchasedFrom = "Logitech Store / Toko Komputer Mangga Dua";
    } else if (compUpper.includes("PRINTER") || compUpper.includes("TM-U") || compUpper.includes("EPSON")) {
      price = model.includes("220") ? "Rp 3.250.000" : "Rp 2.950.000";
      purchasedFrom = "Master Dealer EPSON / Mangga Dua Mall";
    } else if (compUpper.includes("BARCODE") || compUpper.includes("HONEYWELL")) {
      price = "Rp 1.850.000";
      purchasedFrom = "PT Honeywell Barcode Store / Distributor Resmi";
    } else if (compUpper.includes("PASSPORT") || compUpper.includes("GEMALTO") || compUpper.includes("3M")) {
      price = compUpper.includes("GEMALTO") ? "Rp 14.500.000" : "Rp 12.800.000";
      purchasedFrom = "PT Gemalto Indonesia / Idemia Partner";
    } else if (compUpper.includes("DRAWER") || compUpper.includes("LACI") || compUpper.includes("PANDA") || compUpper.includes("VSC")) {
      price = "Rp 650.000";
      purchasedFrom = "Toko Perlengkapan POS Glodok / Harco Mangga Dua";
    } else if (compUpper.includes("UNIT") || compUpper.includes("POS") || compUpper.includes("NCR") || compUpper.includes("KASSEN")) {
      price = compUpper.includes("NCR") ? "Rp 18.500.000" : "Rp 11.200.000";
      purchasedFrom = "Distributor Resmi PT Multi Integra / Retail Solution";
    } else if (compUpper.includes("OS") || compUpper.includes("WINDOWS")) {
      price = "Rp 2.150.000";
      purchasedFrom = "Microsoft OEM Partner (Lisensi Resmi Bawaan)";
    } else if (compUpper.includes("RAM")) {
      price = model.includes("8GB") ? "Rp 580.000" : "Rp 350.000";
      purchasedFrom = "Distributor IT Hardware Harco Mangga Dua";
    } else if (compUpper.includes("STORAGE") || compUpper.includes("SSD")) {
      price = model.includes("250") ? "Rp 480.000" : "Rp 320.000";
      purchasedFrom = "Distributor Storage IT Harco Mangga Dua";
    } else if (compUpper.includes("PATCH") || compUpper.includes("TSIGUNTA")) {
      price = "In-House (Internal)";
      purchasedFrom = "Tim MIS IT Development Plaza Bali";
    }

    // Tanggal Pembelian (pengadaan bawaan)
    const baseDate = pos.created_at ? new Date(pos.created_at) : new Date();
    const pDate = new Date(baseDate);
    pDate.setMonth(pDate.getMonth() - 8);
    const purchaseDate = pDate.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return { price, purchasedFrom, purchaseDate, customNote: undefined };
  };

  const handleShowDetail = (
    e: React.MouseEvent,
    component: string,
    model: string | undefined,
    pos: PosHardwareAsset,
    extraNotes?: string
  ) => {
    if (!model || model === "-") return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dateStr = pos.updated_at
      ? new Date(pos.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
      : pos.created_at
      ? new Date(pos.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
      : "Bawaan Unit";

    const { price, purchasedFrom, purchaseDate, customNote } = getComponentProcurement(component, model, pos);

    setHoverDetail({
      x: rect.left + rect.width / 2,
      y: rect.top,
      component,
      model,
      price,
      purchasedFrom,
      purchaseDate,
      status: pos.status || "OPERASIONAL",
      lastChange: dateStr,
      sn: pos.pos_sn && pos.pos_sn !== "-" ? pos.pos_sn : undefined,
      notes: customNote || extraNotes || (pos.notes && !pos.notes.startsWith("[REPLACE") ? pos.notes : "Kondisi normal / terpasang di unit kasir"),
    });
  };

  const handleHideDetail = () => {
    setHoverDetail(null);
  };

  // Remote AnyDesk State & Quick Connect Handler (Auto Login & Password Injection)
  const [remoteToast, setRemoteToast] = useState<{
    isOpen: boolean;
    posCode: string;
    ip: string;
    store: string;
    password?: string;
    autoLogin?: boolean;
  } | null>(null);

  const [isAnydeskConfigOpen, setIsAnydeskConfigOpen] = useState(false);
  const [defaultAnydeskPassword, setDefaultAnydeskPassword] = useState("cupcake2020");

  useEffect(() => {
    try {
      const savedPwd = localStorage.getItem("mis_anydesk_default_pwd");
      if (savedPwd && savedPwd !== "Cupcake2020") {
        setDefaultAnydeskPassword(savedPwd);
      } else {
        localStorage.setItem("mis_anydesk_default_pwd", "cupcake2020");
        setDefaultAnydeskPassword("cupcake2020");
      }
    } catch (e) {}
  }, []);

  const handleDownloadBat = (target: string, pwd: string, code: string) => {
    const batContent = `@echo off\r\necho Menghubungkan ke AnyDesk ${code} (${target})...\r\necho ${pwd} | "C:\\Program Files (x86)\\AnyDesk\\AnyDesk.exe" ${target} --with-password\r\nif %errorlevel% neq 0 (\r\n  echo ${pwd} | "C:\\Program Files\\AnyDesk\\AnyDesk.exe" ${target} --with-password\r\n)\r\n`;
    const blob = new Blob([batContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Remote-Anydesk-${code}.bat`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRemoteAnydesk = async (pos: PosHardwareAsset) => {
    if (!pos.ip_address || pos.ip_address === "-" || pos.ip_address.trim() === "") {
      alert(`Unit kasir ${pos.pos_code} belum memiliki IP Address terdaftar.`);
      return;
    }

    const cleanIp = pos.ip_address.trim();
    const target = pos.anydesk_id && pos.anydesk_id.trim() !== "" ? pos.anydesk_id.trim() : cleanIp;
    const pwd =
      pos.anydesk_password && pos.anydesk_password.trim() !== ""
        ? pos.anydesk_password.trim()
        : defaultAnydeskPassword || "cupcake2020";

    // 1. Salin password ke clipboard sebagai cadangan instan
    try {
      navigator.clipboard.writeText(pwd);
    } catch (e) {}

    // 2. Panggil backend API untuk otomatis meluncurkan AnyDesk CLI dengan --with-password
    let autoLaunched = false;
    try {
      const res = await fetch("/api/anydesk/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          password: pwd,
          posCode: pos.pos_code,
        }),
      });
      const data = await res.json();
      if (data.success) {
        autoLaunched = true;
      }
    } catch (e) {
      console.error("Auto AnyDesk error", e);
    }

    // Jika API server lokal tidak tersedia (misal diakses dari browser lain), buka via URI scheme
    if (!autoLaunched) {
      window.location.href = `anydesk:${target}`;
    }

    // 3. Tampilkan toast info lengkap
    setRemoteToast({
      isOpen: true,
      posCode: pos.pos_code,
      ip: target,
      store: pos.store_alias || pos.counter_zone,
      password: pwd,
      autoLogin: autoLaunched,
    });

    setTimeout(() => {
      setRemoteToast(null);
    }, 8000);
  };

  // Handler untuk Toggle Cepat Status Terhubung (Operasional) / Mati (Rusak)
  const handleTogglePosStatus = async (pos: PosHardwareAsset) => {
    const isCurrentlyOnline = pos.status === "OPERASIONAL";
    const nextStatus = isCurrentlyOnline ? "RUSAK" : "OPERASIONAL";
    const label = isCurrentlyOnline ? "Mati / Rusak" : "Terhubung / Operasional";

    if (!confirm(`Ubah status koneksi kasir ${pos.pos_code} menjadi "${label}"?`)) return;

    try {
      const payload = {
        ...pos,
        status: nextStatus,
      };
      const res = await fetch(`/api/pos-hardware/${pos.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setPosList((prev) =>
          prev.map((item) => (item.id === pos.id ? { ...item, status: nextStatus } : item))
        );
      } else {
        alert(json.message || "Gagal mengubah status kasir");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan saat mengubah status kasir");
    }
  };

  // Real-Time Live Ping State untuk Kasir POS
  const [posPingState, setPosPingState] = useState<
    Record<string, { status: "ONLINE" | "OFFLINE" | "TESTING"; latency?: number | null }>
  >({});
  const [isPingingAllPos, setIsPingingAllPos] = useState(false);

  // Ping single POS IP (real-time test)
  const handlePingPos = async (ip: string) => {
    if (!ip || ip === "-" || ip.trim() === "") return;
    setPosPingState((prev) => ({
      ...prev,
      [ip]: { status: "TESTING" },
    }));

    try {
      const res = await fetch("/api/edc/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip }),
      });
      const json = await res.json();
      if (json.success) {
        setPosPingState((prev) => ({
          ...prev,
          [ip]: { status: json.status, latency: json.latency },
        }));
      } else {
        setPosPingState((prev) => ({
          ...prev,
          [ip]: { status: "OFFLINE", latency: null },
        }));
      }
    } catch {
      setPosPingState((prev) => ({
        ...prev,
        [ip]: { status: "OFFLINE", latency: null },
      }));
    }
  };

  // Batch Live Ping for all visible POS devices in real-time
  const handlePingAllPos = async (customList?: PosHardwareAsset[]) => {
    const targetList = customList || posList;
    const ips = Array.from(
      new Set(
        targetList
          .map((p) => p.ip_address)
          .filter((ip): ip is string => !!ip && ip !== "-" && ip.trim() !== "")
      )
    );
    if (ips.length === 0) return;
    setIsPingingAllPos(true);
    setPosPingState((prev) => {
      const updated = { ...prev };
      ips.forEach((ip) => {
        updated[ip] = { status: "TESTING" };
      });
      return updated;
    });

    try {
      const res = await fetch("/api/edc/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ips }),
      });
      const json = await res.json();
      if (json.success && json.results) {
        setPosPingState((prev) => ({
          ...prev,
          ...json.results,
        }));
      }
    } catch {
      setPosPingState((prev) => {
        const updated = { ...prev };
        ips.forEach((ip) => {
          updated[ip] = { status: "OFFLINE", latency: null };
        });
        return updated;
      });
    } finally {
      setIsPingingAllPos(false);
    }
  };

  // Logic Ping Hemat Resource & Ultra Ringan:
  // Otomatis dijalankan HANYA SEKALI saat user refresh halaman atau saat user baru masuk/pindah ke menu ini.
  // Tidak berjalan berulang-ulang di background agar CPU & network tidak terbebani.
  const hasAutoPingRunRef = useRef(false);

  useEffect(() => {
    if (!hasAutoPingRunRef.current && posList.length > 0) {
      hasAutoPingRunRef.current = true;
      handlePingAllPos(posList);
    }
  }, [posList]);

  // Replace Hardware Modal State & Integrasi Pencatatan Pembelian
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [replacingPos, setReplacingPos] = useState<PosHardwareAsset | null>(null);
  const [replaceComponentKey, setReplaceComponentKey] = useState<string>("keyboard");
  const [availablePurchases, setAvailablePurchases] = useState<any[]>([]);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [replaceFormData, setReplaceFormData] = useState({
    newModel: "",
    newSn: "-",
    price: "Rp 165.000",
    purchasedFrom: "Logitech Store / Toko Komputer Mangga Dua",
    purchaseDate: new Date().toISOString().split("T")[0],
    reason: "Penggantian unit baru",
  });
  const [isSavingReplace, setIsSavingReplace] = useState(false);
  const [replaceError, setReplaceError] = useState<string | null>(null);

  const handleOpenReplaceModal = async (pos: PosHardwareAsset) => {
    setReplacingPos(pos);
    setReplaceComponentKey("keyboard");
    setSelectedPurchaseId(null);
    setReplaceFormData({
      newModel: pos.keyboard && pos.keyboard !== "-" ? pos.keyboard : "LOGITECH K120",
      newSn: "-",
      price: "Rp 165.000",
      purchasedFrom: "Logitech Store / Toko Komputer Mangga Dua",
      purchaseDate: new Date().toISOString().split("T")[0],
      reason: "Penggantian unit baru / peremajaan berkala",
    });
    setReplaceError(null);
    setIsReplaceModalOpen(true);

    try {
      const res = await fetch("/api/purchases");
      const json = await res.json();
      if (json.success) {
        setAvailablePurchases(json.data || []);
      }
    } catch (e) {
      console.error("Failed to load purchases", e);
    }
  };

  const handleSelectPurchaseItem = (purchaseIdStr: string) => {
    if (!purchaseIdStr || purchaseIdStr === "manual") {
      setSelectedPurchaseId(null);
      return;
    }

    const pId = parseInt(purchaseIdStr, 10);
    const item = availablePurchases.find((p) => p.id === pId);
    if (!item) return;

    setSelectedPurchaseId(item.id);
    const numPrice = item.estimated_price || item.total_price || 0;
    const formattedPrice = numPrice
      ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(numPrice)
      : "Rp 0";

    setReplaceFormData((prev) => ({
      ...prev,
      newModel: item.item_name || prev.newModel,
      newSn: item.serial_number && item.serial_number !== "-" ? item.serial_number : prev.newSn,
      price: formattedPrice,
      purchasedFrom: item.vendor && item.vendor !== "-" ? item.vendor : prev.purchasedFrom,
      purchaseDate: item.purchase_date || item.request_date || prev.purchaseDate,
      reason: `Penggantian unit dari PO: ${item.po_number}${item.target_pos_code && item.target_pos_code !== "-" ? ` (Target: ${item.target_pos_code})` : ""}`,
    }));
  };

  const handleComponentChange = (key: string) => {
    setReplaceComponentKey(key);
    setSelectedPurchaseId(null);
    if (!replacingPos) return;

    let defaultModel = "";
    let defaultPrice = "Rp 350.000";
    let defaultVendor = "Distributor IT Mangga Dua";

    if (key === "keyboard") {
      defaultModel = replacingPos.keyboard && replacingPos.keyboard !== "-" ? replacingPos.keyboard : "LOGITECH K120";
      defaultPrice = "Rp 165.000";
      defaultVendor = "Logitech Store / Toko Komputer Mangga Dua";
    } else if (key === "mouse") {
      defaultModel = replacingPos.mouse && replacingPos.mouse !== "-" ? replacingPos.mouse : "LOGITECH B100";
      defaultPrice = "Rp 85.000";
      defaultVendor = "Logitech Store / Toko Komputer Mangga Dua";
    } else if (key === "printer") {
      defaultModel = replacingPos.printer && replacingPos.printer !== "-" ? replacingPos.printer : "EPSON TM-U220D";
      defaultPrice = "Rp 3.250.000";
      defaultVendor = "Master Dealer EPSON / Mangga Dua Mall";
    } else if (key === "barcode_scanner") {
      defaultModel = replacingPos.barcode_scanner && replacingPos.barcode_scanner !== "-" ? replacingPos.barcode_scanner : "HONEYWELL OMNI";
      defaultPrice = "Rp 1.850.000";
      defaultVendor = "PT Honeywell Barcode Store / Distributor Resmi";
    } else if (key === "passport_scanner") {
      defaultModel = replacingPos.passport_scanner && replacingPos.passport_scanner !== "-" ? replacingPos.passport_scanner : "GEMALTO";
      defaultPrice = "Rp 14.500.000";
      defaultVendor = "PT Gemalto Indonesia / Idemia Partner";
    } else if (key === "cash_drawer") {
      defaultModel = replacingPos.cash_drawer && replacingPos.cash_drawer !== "-" ? replacingPos.cash_drawer : "PANDA";
      defaultPrice = "Rp 650.000";
      defaultVendor = "Toko Perlengkapan POS Glodok / Harco Mangga Dua";
    } else if (key === "pos_brand") {
      defaultModel = replacingPos.pos_brand && replacingPos.pos_brand !== "-" ? replacingPos.pos_brand : "NCR";
      defaultPrice = "Rp 18.500.000";
      defaultVendor = "Distributor Resmi PT Multi Integra / Retail Solution";
    } else if (key === "ram") {
      defaultModel = replacingPos.ram && replacingPos.ram !== "-" ? replacingPos.ram : "4GB";
      defaultPrice = "Rp 350.000";
      defaultVendor = "Distributor IT Hardware Harco Mangga Dua";
    } else if (key === "ssd") {
      defaultModel = replacingPos.ssd && replacingPos.ssd !== "-" ? replacingPos.ssd : "120GB";
      defaultPrice = "Rp 320.000";
      defaultVendor = "Distributor Storage IT Harco Mangga Dua";
    }

    setReplaceFormData((prev) => ({
      ...prev,
      newModel: defaultModel,
      price: defaultPrice,
      purchasedFrom: defaultVendor,
    }));
  };

  const handleSaveReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacingPos || !replacingPos.id) return;
    setIsSavingReplace(true);
    setReplaceError(null);

    try {
      const tagComp = replaceComponentKey.toUpperCase();
      const replacementTag = `[REPLACE_${tagComp}: ${replaceFormData.newModel} | Harga: ${replaceFormData.price} | Toko: ${replaceFormData.purchasedFrom} | Tgl: ${replaceFormData.purchaseDate} | Ket: ${replaceFormData.reason}]`;
      
      const cleanNotes = (replacingPos.notes || "").replace(new RegExp(`\\[REPLACE_${tagComp}:[^\\]]+\\]\\s*•?\\s*`, "gi"), "");
      const updatedNotes = cleanNotes && cleanNotes !== "-"
        ? `${replacementTag} • ${cleanNotes}`
        : replacementTag;

      const payload: any = {
        ...replacingPos,
        [replaceComponentKey]: replaceFormData.newModel,
        notes: updatedNotes,
      };

      if (replaceComponentKey === "pos_brand" && replaceFormData.newSn && replaceFormData.newSn !== "-") {
        payload.pos_sn = replaceFormData.newSn;
      }

      const res = await fetch(`/api/pos-hardware/${replacingPos.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        // Jika penggantian menggunakan item dari pencatatan pembelian, update status pembelian
        if (selectedPurchaseId) {
          try {
            await fetch(`/api/purchases/${selectedPurchaseId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                installed_pos_code: replacingPos.pos_code,
                installed_at: new Date().toISOString(),
                installed_by: user?.name || "MIS OPS",
                status: "DITERIMA",
              }),
            });
          } catch (pErr) {
            console.error("Gagal update status pembelian terpasang", pErr);
          }
        }

        clearClientCache();
        setIsReplaceModalOpen(false);
        fetchPosHardware();
      } else {
        setReplaceError(json.message || "Gagal menyimpan penggantian perangkat.");
      }
    } catch (err: any) {
      setReplaceError("Gagal menghubungi server database.");
    } finally {
      setIsSavingReplace(false);
    }
  };

  // Fetch POS Hardware with instant cached preview
  const fetchPosHardware = async () => {
    const cacheKey = `pos_hw_v4_${posSearch}_${selectedPosShop}_${selectedTerminal}_${selectedZone}_${selectedBrand}_${selectedPassport}`;
    const cached = getClientCache<PosHardwareAsset[]>(cacheKey);
    if (cached) {
      setPosList(cached);
      setIsPosLoading(false);
    } else {
      setIsPosLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (posSearch) params.set("search", posSearch);
      if (selectedPosShop) params.set("shop", selectedPosShop);
      if (selectedTerminal) params.set("terminal", selectedTerminal);
      if (selectedZone) params.set("zone", selectedZone);
      if (selectedBrand) params.set("brand", selectedBrand);

      const res = await fetch(`/api/pos-hardware?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        let data: PosHardwareAsset[] = json.data;
        if (selectedPassport) {
          if (selectedPassport === "NONE") {
            data = data.filter((p) => !p.passport_scanner || p.passport_scanner === "-");
          } else {
            data = data.filter((p) => p.passport_scanner?.includes(selectedPassport));
          }
        }
        setPosList(data);
        setClientCache(cacheKey, data);
      }
    } catch (err) {
      console.error("Failed to load POS hardware assets", err);
    } finally {
      setIsPosLoading(false);
    }
  };

  // Fetch Standard Assets
  const fetchAssets = async () => {
    setIsAssetsLoading(true);
    try {
      const params = new URLSearchParams();
      if (assetSearch) params.set("search", assetSearch);
      if (selectedCategory) params.set("category", selectedCategory);
      if (selectedShop) params.set("shop", selectedShop);
      if (selectedStatus) params.set("status", selectedStatus);

      const res = await fetch(`/api/assets?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setAssets(json.data);
      }
    } catch (err) {
      console.error("Failed to load assets", err);
    } finally {
      setIsAssetsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosHardware();
  }, [posSearch, selectedPosShop, selectedTerminal, selectedZone, selectedBrand, selectedPassport]);

  useEffect(() => {
    if (activeTab === "hardware") {
      fetchAssets();
    }
  }, [activeTab, assetSearch, selectedCategory, selectedShop, selectedStatus]);

  const copyToClipboard = (text: string, key: string) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open Sticker Modal for POS
  const handleOpenPosSticker = (pos: PosHardwareAsset) => {
    setSelectedPosForSticker(pos);
    const assetObj: Asset = {
      asset_code: pos.pos_code,
      name: `Kasir POS ${pos.pos_code}`,
      category: "POS Terminal",
      shop_location: pos.shop_name || "Plaza Bali",
      brand_model: `${pos.pos_brand} (${pos.terminal})`,
      serial_number: pos.pos_sn || "-",
      ip_address: pos.ip_address,
      status: pos.status === "CADANGAN" ? "CADANGAN" : "OPERASIONAL",
      notes: `Printer: ${pos.printer} • Barcode: ${pos.barcode_scanner} • Passport: ${pos.passport_scanner} • EDC BCA: ${pos.bca_tid || '-'}`,
    };
    setSelectedAssetForSticker(assetObj);
  };

  // Open Ticket Modal for POS
  const handleOpenPosTicket = (pos: PosHardwareAsset) => {
    const assetObj: Asset = {
      asset_code: pos.pos_code,
      name: `Kasir POS ${pos.pos_code}`,
      category: "POS Terminal",
      shop_location: "Plaza Bali",
      brand_model: `${pos.pos_brand} - IP: ${pos.ip_address}`,
      serial_number: pos.pos_sn || "-",
      ip_address: pos.ip_address,
      status: pos.status === "CADANGAN" ? "CADANGAN" : "OPERASIONAL",
      notes: `Printer: ${pos.printer} • Barcode: ${pos.barcode_scanner} • Passport: ${pos.passport_scanner}`,
    };
    setSelectedAssetForTicket(assetObj);
  };

  // Open Add POS Modal
  const handleOpenAddPos = () => {
    setEditingPos(null);
    const defaultShop = selectedPosShop === "SAM" || user?.role === "SPV_SAM" ? "SAM" : "Plaza Bali";
    const defaultBrand = defaultShop === "SAM" ? "KASSEN" : "NCR";
    const defaultPrinter = defaultShop === "SAM" ? "KASSEN BT-P3100BT" : "EPSON TM-U220D";
    setPosFormData({
      pos_number: posList.length + 1,
      counter_no: 1,
      pos_code: "",
      shop_name: defaultShop,
      terminal: "Terminal 3",
      counter_zone: defaultShop === "SAM" ? "GGO01" : "DFD01",
      store_alias: defaultShop === "SAM" ? "Toko Garuda Go 1" : "Toko DF1",
      ip_address: "",
      pos_brand: defaultBrand,
      pos_sn: "-",
      processor: "-",
      ram: defaultShop === "SAM" ? "8GB" : "4GB",
      ssd: defaultShop === "SAM" ? "250GB" : "120GB",
      tsigunta_version: "-",
      passport_scanner: defaultShop === "SAM" ? "-" : "GEMALTO",
      barcode_scanner: "HONEYWELL",
      printer: defaultPrinter,
      fingerprint_scanner: "-",
      keyboard: "LOGITECH",
      mouse: "LOGITECH",
      cash_drawer: defaultShop === "SAM" ? "VSC" : "PANDA",
      monitor: "-",
      os_version: defaultShop === "SAM" ? "WINDOWS 10 PRO SP1 64BIT" : "WINDOWS 7 EMBEDDED STANDARD SP1 64BIT",
      status: "OPERASIONAL",
      notes: "",
    });
    setPosFormError(null);
    setIsPosFormOpen(true);
  };

  // Open Edit POS Modal
  const handleOpenEditPos = (pos: PosHardwareAsset) => {
    setEditingPos(pos);
    setPosFormData({ ...pos });
    setPosFormError(null);
    setIsPosFormOpen(true);
  };

  // Save POS
  const handleSavePos = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPos(true);
    setPosFormError(null);

    try {
      const url = editingPos ? `/api/pos-hardware/${editingPos.id}` : "/api/pos-hardware";
      const method = editingPos ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(posFormData),
      });

      const json = await res.json();
      if (json.success) {
        clearClientCache();
        setIsPosFormOpen(false);
        fetchPosHardware();
      } else {
        setPosFormError(json.message || "Gagal menyimpan data POS.");
      }
    } catch (err) {
      setPosFormError("Gagal menghubungi server database.");
    } finally {
      setIsSavingPos(false);
    }
  };

  // Delete POS
  const handleDeletePos = async (id: number, code: string) => {
    if (!confirm(`Yakin ingin menghapus data perangkat POS "${code}"?`)) return;

    try {
      const res = await fetch(`/api/pos-hardware/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        clearClientCache();
        fetchPosHardware();
      } else {
        alert(json.message || "Gagal menghapus data.");
      }
    } catch (err) {
      alert("Gagal menghapus.");
    }
  };

  // Export POS Hardware to CSV
  const handleExportPosCsv = () => {
    const headers = [
      "NO",
      "TOKO",
      "LOKASI_POS",
      "TERMINAL",
      "COUNTER_ZONE",
      "IP_ADDRESS",
      "TYPE_POS",
      "OS_VERSION",
      "PROCESSOR",
      "RAM",
      "STORAGE",
      "VERSI_PATCH_TSIGUNTA",
      "EDC_BCA_TID",
      "EDC_BRI_TID",
      "EDC_MANDIRI_TID",
      "EDC_BNI_TID",
      "PASSPORT_SCANNER",
      "BARCODE_SCANNER",
      "PRINTER",
      "SCANNER_JARI",
      "KEYBOARD",
      "MOUSE",
      "DRAWER",
      "MONITOR",
      "STATUS",
    ];

    const rows = posList.map((p, idx) => [
      idx + 1,
      `"${p.shop_name}"`,
      `"${p.pos_code}"`,
      `"${p.terminal}"`,
      `"${p.counter_zone}"`,
      `"${p.ip_address || "-"}"`,
      `"${p.pos_brand}"`,
      `"${p.os_version || "-"}"`,
      `"${p.processor || "-"}"`,
      `"${p.ram || "-"}"`,
      `"${p.ssd || "-"}"`,
      `"${p.tsigunta_version || "-"}"`,
      `"${p.bca_tid || "-"}"`,
      `"${p.bri_tid || "-"}"`,
      `"${p.mandiri_tid || "-"}"`,
      `"${p.bni_tid || "-"}"`,
      `"${p.passport_scanner || "-"}"`,
      `"${p.barcode_scanner || "-"}"`,
      `"${p.printer || "-"}"`,
      `"${p.fingerprint_scanner || "-"}"`,
      `"${p.keyboard || "-"}"`,
      `"${p.mouse || "-"}"`,
      `"${p.cash_drawer || "-"}"`,
      `"${p.monitor || "-"}"`,
      `"${p.status}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const shopLabel = selectedPosShop ? selectedPosShop.replace(/\s+/g, "_") : "SemuaToko";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_Perangkat_POS_${shopLabel}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics for POS
  const t3Count = posList.filter((p) => p.terminal === "Terminal 3").length;
  const t2Count = posList.filter((p) => p.terminal === "Terminal 2").length;
  const sbyCount = posList.filter((p) => p.terminal?.includes("Surabaya")).length;
  const sbyT1Count = posList.filter((p) => p.terminal === "Surabaya T1").length;
  const sbyT2Count = posList.filter((p) => p.terminal === "Surabaya T2").length;
  const pbCount = posList.filter((p) => p.shop_name === "Plaza Bali").length;
  const samCount = posList.filter((p) => p.shop_name === "SAM").length;
  const ncrCount = posList.filter((p) => p.pos_brand === "NCR").length;
  const kassenCount = posList.filter((p) => p.pos_brand === "KASSEN").length;
  const iwareCount = posList.filter((p) => p.pos_brand === "IWARE").length;
  const toshibaCount = posList.filter((p) => p.pos_brand === "TOSHIBA").length;

  // Custom Dropdown Options for POS Filters
  const shopOptions: DropdownOption[] = useMemo(() => [
    ...(isMIS ? [{ value: "", label: "Semua Toko (PB & SAM)", badge: `${posList.length} POS`, dot: "bg-slate-400" }] : []),
    { value: "Plaza Bali", label: "Toko Plaza Bali", badge: `${pbCount || 38} POS`, dot: "bg-[#006622]" },
    { value: "SAM", label: "Toko SAM", badge: `${samCount || 17} POS`, dot: "bg-blue-500" },
  ], [isMIS, posList.length, pbCount, samCount]);

  const terminalOptions: DropdownOption[] = useMemo(() => [
    { value: "", label: "Semua Terminal / Lokasi", badge: `${posList.length} POS`, dot: "bg-slate-400" },
    { value: "Terminal 3", label: "Terminal 3 Soekarno-Hatta", badge: `${t3Count || 34} POS`, dot: "bg-emerald-500" },
    { value: "Terminal 2", label: "Terminal 2 Soekarno-Hatta", badge: `${t2Count || 21} POS`, dot: "bg-blue-500" },
    { value: "Surabaya T1", label: "Surabaya T1 Juanda", badge: `${sbyT1Count || 6} POS`, dot: "bg-purple-500" },
    { value: "Surabaya T2", label: "Surabaya T2 Juanda", badge: `${sbyT2Count || 7} POS`, dot: "bg-violet-500" },
  ], [posList.length, t3Count, t2Count, sbyT1Count, sbyT2Count]);

  const zoneOptions: DropdownOption[] = useMemo(() => [
    { value: "", label: "Semua Counter Kasir", dot: "bg-slate-300" },
    { value: "DFD01", label: "DFD01 — Duty Free", badge: "5 titik", dot: "bg-emerald-500", group: "Plaza Bali · Terminal 3" },
    { value: "DFD02", label: "DFD02 — Duty Free", badge: "6 titik", dot: "bg-emerald-500", group: "Plaza Bali · Terminal 3" },
    { value: "DFD03", label: "DFD03 — Duty Free", badge: "9 titik", dot: "bg-emerald-500", group: "Plaza Bali · Terminal 3" },
    { value: "DFD04", label: "DFD04 — Duty Free", badge: "14 titik", dot: "bg-emerald-500", group: "Plaza Bali · Terminal 3" },
    { value: "DFA02", label: "DFA02 — Arrival", badge: "2 titik", dot: "bg-teal-500", group: "Plaza Bali · Terminal 3" },
    { value: "DPD03", label: "DPD03 — Departure", badge: "3 titik", dot: "bg-blue-500", group: "Plaza Bali · Terminal 2" },
    { value: "DFD05", label: "DFD05 — Duty Free", badge: "8 titik", dot: "bg-blue-500", group: "Plaza Bali · Terminal 2" },
    { value: "DPD06", label: "DPD06 — Departure", badge: "1 titik", dot: "bg-blue-400", group: "Plaza Bali · Terminal 2" },
    { value: "SUBDPD01", label: "BBV LT 1", badge: "2 titik", dot: "bg-purple-500", group: "Surabaya · Juanda T1 & T2" },
    { value: "SUBDPD02", label: "BOOTH", badge: "1 titik", dot: "bg-purple-400", group: "Surabaya · Juanda T1 & T2" },
    { value: "SUBDPD03", label: "BBV LT 2", badge: "2 titik", dot: "bg-purple-500", group: "Surabaya · Juanda T1 & T2" },
    { value: "SUBDPD04", label: "AZZARIA HAJJ", badge: "1 titik", dot: "bg-purple-400", group: "Surabaya · Juanda T1 & T2" },
    { value: "SUBDF01", label: "DF01 T2", badge: "2 titik", dot: "bg-violet-500", group: "Surabaya · Juanda T1 & T2" },
    { value: "SUBDF02", label: "DF02 T2", badge: "2 titik", dot: "bg-violet-500", group: "Surabaya · Juanda T1 & T2" },
    { value: "SUBDF03", label: "DF03 T2", badge: "2 titik", dot: "bg-violet-500", group: "Surabaya · Juanda T1 & T2" },
    { value: "SUBDFA01", label: "DFA Arrival T2", badge: "1 titik", dot: "bg-violet-400", group: "Surabaya · Juanda T1 & T2" },
    { value: "GGO01", label: "GGO01 — Garuda", badge: "multi", dot: "bg-amber-500", group: "SAM · Terminal 3" },
    { value: "GGO02", label: "GGO02 — Garuda", badge: "1 titik", dot: "bg-amber-400", group: "SAM · Terminal 3" },
    { value: "MMH01", label: "MMH01 — Merpati", badge: "multi", dot: "bg-orange-500", group: "SAM · Terminal 3" },
    { value: "BBV01", label: "BBV01 — Bebas Bea", badge: "1 titik", dot: "bg-rose-500", group: "SAM · Terminal 2" },
    { value: "SSR01", label: "SSR01 — Self Service", badge: "multi", dot: "bg-rose-400", group: "SAM · Terminal 2" },
    { value: "OLR01", label: "OLR01 — Online", badge: "multi", dot: "bg-pink-500", group: "SAM · Terminal 2" },
    { value: "EAD01", label: "EAD01 — Eatery", badge: "multi", dot: "bg-red-400", group: "SAM · Terminal 2" },
    { value: "DDD01", label: "DDD01 — Duty Paid", badge: "1 titik", dot: "bg-red-500", group: "SAM · Terminal 2" },
    { value: "WSD01", label: "WSD01 — Wholesale", badge: "multi", dot: "bg-orange-400", group: "SAM · Terminal 2" },
    { value: "GGO03", label: "GGO03 — Garuda", badge: "2 titik", dot: "bg-amber-500", group: "SAM · Terminal 2" },
  ], []);

  const brandOptions: DropdownOption[] = useMemo(() => [
    { value: "", label: "Semua Brand Unit POS", dot: "bg-slate-300" },
    { value: "NCR", label: "NCR", badge: `${ncrCount || 21} unit`, dot: "bg-indigo-500" },
    { value: "KASSEN", label: "KASSEN", badge: `${kassenCount || 17} unit`, dot: "bg-amber-500" },
    { value: "IWARE", label: "IWARE", badge: `${iwareCount || 18} unit`, dot: "bg-blue-500" },
    { value: "TOSHIBA", label: "TOSHIBA", badge: `${toshibaCount || 2} unit`, dot: "bg-rose-500" },
  ], [ncrCount, kassenCount, iwareCount, toshibaCount]);

  const passportOptions: DropdownOption[] = useMemo(() => [
    { value: "", label: "Semua Scanner Paspor", dot: "bg-slate-300" },
    { value: "GEMALTO", label: "Gemalto", dot: "bg-emerald-500" },
    { value: "3M", label: "3M", dot: "bg-blue-500" },
    { value: "PLUSTEK", label: "Plustek 100X", dot: "bg-purple-500" },
    { value: "NONE", label: "Tanpa Scanner Paspor", dot: "bg-slate-400" },
  ], []);

  // Helper to split POS items into DF (Duty Free / Counter Zone) groups
  const buildZones = (items: PosHardwareAsset[]) => {
    const zones: {
      zoneName: string;
      shopName: string;
      items: PosHardwareAsset[];
    }[] = [];

    items.forEach((pos) => {
      const zoneName = pos.counter_zone || "Counter Umum";
      const shopName = pos.shop_name || "Plaza Bali";
      let existing = zones.find((z) => z.zoneName === zoneName && z.shopName === shopName);
      if (!existing) {
        existing = { zoneName, shopName, items: [] };
        zones.push(existing);
      }
      existing.items.push(pos);
    });

    return zones;
  };

  // Grouping by Terminal (Terminal 3, Terminal 2, Surabaya) and DF Area inside
  const groupedTerminals = useMemo(() => {
    if (selectedTerminal) {
      const isT3 = selectedTerminal === "Terminal 3";
      const isT2 = selectedTerminal === "Terminal 2";
      const isSby = selectedTerminal.includes("Surabaya");

      return [
        {
          name: isT3
            ? "TERMINAL 3 BANDARA SOEKARNO-HATTA"
            : isT2
            ? "TERMINAL 2 BANDARA SOEKARNO-HATTA"
            : isSby
            ? "SURABAYA (BANDARA JUANDA T1 & T2)"
            : selectedTerminal.toUpperCase(),
          items: posList,
          zones: buildZones(posList),
          color: isT3 ? "bg-[#006622]" : isT2 ? "bg-blue-600" : "bg-purple-600",
          badge: isT3
            ? "bg-emerald-50 text-[#006622] border-emerald-200"
            : isT2
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-purple-50 text-purple-700 border-purple-200",
          summary: isT3
            ? "Area Counter DFD01 - DFD04, DFA02 (PB) & GGO01, MMH01 (SAM)"
            : isT2
            ? "Area Counter DPD03, DFD05, DPD06 (PB) & BBV01, SSR01, OLR01, EAD01, WSD01 (SAM)"
            : isSby
            ? "Area Counter BBV LT 1 & 2, BOOTH, DF01 - DF03, DFA Arrival"
            : "Data Kasir Terpilih",
        },
      ];
    }

    const t3 = posList.filter((p) => p.terminal === "Terminal 3");
    const t2 = posList.filter((p) => p.terminal === "Terminal 2");
    const sby = posList.filter((p) => p.terminal?.includes("Surabaya"));
    const others = posList.filter(
      (p) => p.terminal !== "Terminal 3" && p.terminal !== "Terminal 2" && !p.terminal?.includes("Surabaya")
    );

    const groups = [];
    if (t3.length > 0) {
      groups.push({
        name: "TERMINAL 3 BANDARA SOEKARNO-HATTA",
        items: t3,
        zones: buildZones(t3),
        color: "bg-[#006622]",
        badge: "bg-emerald-50 text-[#006622] border-emerald-200/80",
        summary: "Area Counter DFD01 - DFD04, DFA02 (PB) & GGO01, MMH01 (SAM)",
      });
    }
    if (t2.length > 0) {
      groups.push({
        name: "TERMINAL 2 BANDARA SOEKARNO-HATTA",
        items: t2,
        zones: buildZones(t2),
        color: "bg-blue-600",
        badge: "bg-blue-50 text-blue-700 border-blue-200/80",
        summary: "Area Counter DPD03, DFD05, DPD06 (PB) & BBV01, SSR01, OLR01, EAD01, WSD01 (SAM)",
      });
    }
    if (sby.length > 0) {
      groups.push({
        name: "SURABAYA (BANDARA JUANDA T1 & T2)",
        items: sby,
        zones: buildZones(sby),
        color: "bg-purple-600",
        badge: "bg-purple-50 text-purple-700 border-purple-200/80",
        summary: "Area Counter BBV LT 1 & 2, BOOTH, DF01 - DF03, DFA Arrival",
      });
    }
    if (others.length > 0) {
      groups.push({
        name: "LOKASI LAINNYA",
        items: others,
        zones: buildZones(others),
        color: "bg-slate-600",
        badge: "bg-slate-50 text-slate-700 border-slate-200",
        summary: "Perangkat Kasir Tambahan",
      });
    }
    return groups;
  }, [posList, selectedTerminal]);

  return (
    <SidebarLayout onOpenScanner={() => setIsScannerOpen(true)}>
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-2.5 sm:px-4 py-5 space-y-4">
        {/* Tab Navigation Switcher & Clean Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("pos")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "pos"
                  ? "bg-[#006622] text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80"
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Perangkat Kasir POS ({posList.length} Unit)</span>
            </button>
            <button
              onClick={() => setActiveTab("hardware")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "hardware"
                  ? "bg-[#006622] text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80"
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>Master Inventory Hardware & Network</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "pos" && (
              <>
                <button
                  onClick={handleExportPosCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export CSV</span>
                </button>
                {isMIS && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsAnydeskConfigOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                      title="Pengaturan Password Otomatis AnyDesk Kasir"
                    >
                      <ScreenShare className="w-3.5 h-3.5 text-rose-600" />
                      <span>Setting AnyDesk</span>
                    </button>

                    <button
                      onClick={handleOpenAddPos}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#006622] hover:bg-[#00551c] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah POS</span>
                    </button>
                  </>
                )}
              </>
            )}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium pl-2 border-l border-slate-200">
              <span className="font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                {isMIS ? "MIS IT Support (Semua Toko)" : userShopLocation}
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: PERANGKAT KASIR POS PLAZA BALI & SAM              */}
        {/* ======================================================== */}
        {activeTab === "pos" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Clean Terminal Grouping KPI Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              <div
                onClick={() => setSelectedTerminal(selectedTerminal === "Terminal 3" ? "" : "Terminal 3")}
                className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                  selectedTerminal === "Terminal 3"
                    ? "bg-emerald-50/60 border-[#006622] ring-1 ring-[#006622]/30"
                    : "bg-white border-slate-200/80 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                  <span className="uppercase tracking-wider text-[11px] font-bold text-slate-700">Terminal 3 CGK</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#006622] flex items-center justify-center">
                    <Store className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">{t3Count || 34} <span className="text-xs font-normal text-slate-400">POS</span></div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">
                  29 Plaza Bali • 5 SAM (T3)
                </div>
              </div>

              <div
                onClick={() => setSelectedTerminal(selectedTerminal === "Terminal 2" ? "" : "Terminal 2")}
                className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                  selectedTerminal === "Terminal 2"
                    ? "bg-blue-50/60 border-blue-600 ring-1 ring-blue-600/30"
                    : "bg-white border-slate-200/80 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                  <span className="uppercase tracking-wider text-[11px] font-bold text-slate-700">Terminal 2 CGK</span>
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">{t2Count || 21} <span className="text-xs font-normal text-slate-400">POS</span></div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">
                  9 Plaza Bali • 12 SAM (T2)
                </div>
              </div>

              <div
                onClick={() => setSelectedTerminal(selectedTerminal.startsWith("Surabaya") ? "" : "Surabaya T1")}
                className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                  selectedTerminal.startsWith("Surabaya")
                    ? "bg-purple-50/60 border-purple-600 ring-1 ring-purple-600/30"
                    : "bg-white border-slate-200/80 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                  <span className="uppercase tracking-wider text-[11px] font-bold text-slate-700">Surabaya Juanda</span>
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">{sbyCount || 13} <span className="text-xs font-normal text-slate-400">POS</span></div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">
                  6 Juanda T1 • 7 Juanda T2
                </div>
              </div>

              <div
                onClick={() => setSelectedTerminal("")}
                className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                  selectedTerminal === ""
                    ? "bg-slate-50/80 border-slate-400"
                    : "bg-white border-slate-200/80 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                  <span className="uppercase tracking-wider text-[11px] font-bold text-slate-700">Total Semua POS</span>
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Laptop className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">{posList.length} <span className="text-xs font-normal text-slate-400">Unit</span></div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium truncate" title={`${ncrCount} NCR • ${kassenCount} Kassen • ${iwareCount} Iware • ${toshibaCount} Toshiba`}>
                  {ncrCount} NCR • {kassenCount} Kassen • {iwareCount} Iware
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={posSearch}
                    onChange={(e) => setPosSearch(e.target.value)}
                    placeholder="Cari POS, IP, Brand, EDC..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                {/* 1. Shop Filter */}
                <CustomDropdown
                  value={selectedPosShop}
                  onChange={setSelectedPosShop}
                  options={shopOptions}
                  placeholder="Semua Toko"
                  icon={<Store className="w-3.5 h-3.5" />}
                  disabled={!isMIS}
                />

                {/* 2. Terminal Filter (Modern Custom Dropdown) */}
                <CustomDropdown
                  value={selectedTerminal}
                  onChange={setSelectedTerminal}
                  options={terminalOptions}
                  placeholder="Semua Terminal / Lokasi"
                  icon={<MapPin className="w-3.5 h-3.5" />}
                  clearable
                />

                {/* 3. Counter Zone Filter */}
                <CustomDropdown
                  value={selectedZone}
                  onChange={setSelectedZone}
                  options={zoneOptions}
                  placeholder="Semua Counter Kasir"
                  icon={<Layers className="w-3.5 h-3.5" />}
                  dropdownWidth="w-80"
                  clearable
                />

                {/* 4. Brand Filter */}
                <CustomDropdown
                  value={selectedBrand}
                  onChange={setSelectedBrand}
                  options={brandOptions}
                  placeholder="Semua Brand POS"
                  icon={<Cpu className="w-3.5 h-3.5" />}
                  clearable
                />

                {/* 5. Passport Filter */}
                <CustomDropdown
                  value={selectedPassport}
                  onChange={setSelectedPassport}
                  options={passportOptions}
                  placeholder="Scanner Paspor"
                  icon={<CreditCard className="w-3.5 h-3.5" />}
                  clearable
                />

                {/* Tombol Uji Live Ping Seluruh Kasir Real-Time */}
                <button
                  type="button"
                  onClick={() => handlePingAllPos()}
                  disabled={isPingingAllPos || isPosLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#006622] border border-emerald-200/80 text-xs font-bold shadow-2xs transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                  title="Ping seluruh IP kasir POS secara serentak untuk cek status koneksi live"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPingingAllPos ? "animate-spin text-[#006622]" : ""}`} />
                  <span>{isPingingAllPos ? "Menguji Koneksi..." : "Live Ping Real-Time"}</span>
                </button>
              </div>
            </div>

            {/* Master Table of POS Hardware */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm relative">
              {isPosLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Memuat data perangkat kasir POS Plaza Bali...
                </div>
              ) : posList.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <Laptop className="w-8 h-8 text-slate-300" />
                  <span>Tidak ada perangkat POS yang cocok dengan filter pencarian.</span>
                </div>
              ) : (
                <div className="w-full rounded-2xl">
                  <table className="w-full table-fixed text-left border-separate border-spacing-0 text-[10px]">
                    <colgroup>
                      {/* 1-3: Identitas & Jaringan POS (20.2%) */}
                      <col className="w-[2.3%]" />
                      <col className="w-[9.7%]" />
                      <col className="w-[8.2%]" />
                      {/* 4-9: Spesifikasi PC & Sistem Aplikasi (27.4%) */}
                      <col className="w-[4.6%]" />
                      <col className="w-[5.8%]" />
                      <col className="w-[4.2%]" />
                      <col className="w-[3.8%]" />
                      <col className="w-[4.8%]" />
                      <col className="w-[4.2%]" />
                      {/* 10-15: Periferal & Scanner Kasir (34.4%) */}
                      <col className="w-[6.9%]" />
                      <col className="w-[5.5%]" />
                      <col className="w-[5.5%]" />
                      <col className="w-[6.1%]" />
                      <col className="w-[5.8%]" />
                      <col className="w-[4.6%]" />
                      {/* 16: Mesin EDC (9.8%) */}
                      <col className="w-[9.8%]" />
                      {/* 17: Aksi (8.2%) */}
                      <col className="w-[8.2%]" />
                    </colgroup>
                    <thead>
                      {/* Tier 1: Kategori Kelompok Kolom - Sticky tepat di bawah navbar atas (top-14 = 56px) */}
                      <tr className="text-[10px] font-extrabold tracking-wide whitespace-nowrap h-[28px]">
                        <th
                          colSpan={3}
                          className="sticky top-14 z-20 px-1 py-1 text-center bg-slate-100 text-slate-800 border-b border-r border-slate-200 select-none shadow-2xs rounded-tl-2xl"
                        >
                          Identitas & Jaringan POS
                        </th>
                        <th
                          colSpan={6}
                          className="sticky top-14 z-20 px-1 py-1 text-center bg-blue-100 text-blue-900 border-b border-r border-slate-200 select-none shadow-2xs"
                        >
                          Spesifikasi PC & Sistem Aplikasi
                        </th>
                        <th
                          colSpan={6}
                          className="sticky top-14 z-20 px-1 py-1 text-center bg-emerald-100 text-[#006622] border-b border-r border-slate-200 select-none shadow-2xs"
                        >
                          Periferal & Scanner Kasir
                        </th>
                        <th
                          colSpan={1}
                          className="sticky top-14 z-20 px-1 py-1 text-center bg-amber-100 text-amber-900 border-b border-r border-slate-200 select-none shadow-2xs"
                        >
                          Mesin EDC
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
                        <th className="sticky top-[84px] z-20 px-1.5 py-1 bg-slate-50 border-b border-r border-slate-200/80 select-none">
                          <div className="flex items-center gap-1">
                            <span>Lokasi POS</span>
                            <span className="inline-flex items-center gap-0.5 text-[8.5px] font-normal text-slate-400 font-sans" title="🟢 Titik Hijau: Terhubung (Online) • 🔴 Titik Merah: Mati (Rusak / Offline)">
                              (🟢/🔴)
                            </span>
                          </div>
                        </th>
                        <th className="sticky top-[84px] z-20 px-1 py-1 text-center bg-slate-50 border-b border-r border-slate-200 select-none">IP Address</th>

                        <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-r border-slate-200/80 select-none">Unit POS</th>
                        <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-slate-200/80 select-none">OS</th>
                        <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-slate-200/80 select-none">Proc</th>
                        <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-slate-200/80 select-none">RAM</th>
                        <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-slate-200/80 select-none">Storage</th>
                        <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-blue-50 text-blue-900 border-b border-slate-200 select-none">Patch</th>

                        <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-emerald-50 text-emerald-950 border-b border-r border-slate-200/80 select-none">Keyboard</th>
                        <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-emerald-50 text-emerald-950 border-b border-r border-slate-200/80 select-none">Mouse</th>
                        <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-emerald-50 text-emerald-950 border-b border-r border-slate-200/80 select-none">Passport</th>
                        <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-emerald-50 text-emerald-950 border-b border-r border-slate-200/80 select-none">Barcode</th>
                        <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-emerald-50 text-emerald-950 border-b border-r border-slate-200/80 select-none">Printer</th>
                        <th className="sticky top-[84px] z-20 px-0.5 py-1 text-center bg-emerald-50 text-emerald-950 border-b border-r border-slate-200 select-none">Drawer</th>

                        <th className="sticky top-[84px] z-20 px-1 py-1 text-center bg-amber-50 text-amber-950 border-b border-r border-slate-200 select-none">EDC Bank</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupedTerminals.map((group, gIdx) => (
                        <Fragment key={gIdx}>
                          {/* 1. Terminal Section Header */}
                          <tr className="bg-slate-100/90 border-t border-b border-slate-300">
                            <td colSpan={17} className="px-3 py-2">
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
                                    {group.items.length} POS AKTIF • {group.zones.length} Area DF
                                  </span>
                                </div>
                                {/* Counter Zones Tags */}
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline mr-0.5">
                                    Area DF:
                                  </span>
                                  {group.zones.map((zone) => (
                                    <span
                                      key={`${zone.shopName}-${zone.zoneName}`}
                                      className="px-1.5 py-0.2 rounded bg-white border border-slate-200/90 text-slate-700 font-mono font-bold text-[9.5px] shadow-2xs"
                                    >
                                      {zone.zoneName} ({zone.items.length})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* 2. Sub-group per DF (Duty Free / Counter Zone) */}
                          {group.zones.map((zone, zIdx) => (
                            <Fragment key={`${zone.shopName}-${zone.zoneName}-${zIdx}`}>
                              {/* DF Sub-header Row */}
                              <tr className="bg-slate-50/90 border-t border-b border-slate-200/70">
                                <td colSpan={17} className="px-3 py-1.5 bg-slate-50/70">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className={`w-1.5 h-1.5 rounded-full ${zone.shopName === "SAM" ? "bg-blue-600" : "bg-[#006622]"}`} />
                                      <span className="font-mono font-black text-slate-900 text-[11px] tracking-wider uppercase">
                                        AREA DF: {zone.zoneName}
                                      </span>
                                      {zone.items[0]?.store_alias && zone.items[0]?.store_alias !== "-" && (
                                        <span
                                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                            zone.shopName === "SAM"
                                              ? "bg-blue-50 text-blue-700 border-blue-200/80"
                                              : "bg-emerald-50 text-[#006622] border-emerald-200/80"
                                          }`}
                                        >
                                          {zone.items[0].store_alias}
                                        </span>
                                      )}
                                      <span className="text-slate-500 font-semibold text-[10.5px]">
                                        • {zone.items.length} Unit Kasir
                                      </span>
                                    </div>
                                    <div className="text-[9.5px] font-mono text-slate-400 hidden sm:inline pr-1">
                                      Titik Kasir: {zone.items[0]?.pos_code} {zone.items.length > 1 ? `s/d ${zone.items[zone.items.length - 1]?.pos_code}` : ""}
                                    </div>
                                  </div>
                                </td>
                              </tr>

                              {/* 3. Kasir POS Items inside this DF (17 Compact Columns Fit to Screen) */}
                              {zone.items.map((pos, index) => (
                                <tr key={pos.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors group">
                                  {/* 1. NO */}
                                  <td className="px-0.5 py-1 text-center font-mono text-[10px] text-slate-400 font-semibold border-r border-slate-100">
                                    {index + 1}
                                  </td>

                                  {/* 2. LOKASI POS */}
                                  <td className="px-1.5 py-1 whitespace-nowrap border-r border-slate-100 overflow-hidden">
                                    {(() => {
                                      const ip = pos.ip_address && pos.ip_address !== "-" ? pos.ip_address.trim() : null;
                                      const ping = ip ? posPingState[ip] : undefined;
                                      const isTesting = ping?.status === "TESTING";
                                      // Real-time online determination:
                                      // 1) Ping sukses ONLINE -> Hijau
                                      // 2) Ping gagal OFFLINE -> Merah
                                      // 3) Default: jika ada IP & status OPERASIONAL -> Hijau, jika tidak -> Merah
                                      const isOnline = ping ? ping.status === "ONLINE" : (pos.status === "OPERASIONAL" && !!ip);

                                      return (
                                        <div className="flex items-center gap-1.5">
                                          {/* Indikator Real-Time Live Ping: Hijau Kedap-kedip = Terhubung, Merah = Mati */}
                                          {isTesting ? (
                                            <button
                                              type="button"
                                              onClick={() => ip && handlePingPos(ip)}
                                              title={`Sedang ping ke IP ${ip}...`}
                                              className="relative flex h-2 w-2 shrink-0 cursor-pointer focus:outline-none"
                                            >
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-xs shadow-amber-500/50"></span>
                                            </button>
                                          ) : isOnline ? (
                                            <button
                                              type="button"
                                              onClick={() => ip ? handlePingPos(ip) : handleTogglePosStatus(pos)}
                                              title={`Status: Terhubung (Online ${ping?.latency ? `${ping.latency}ms` : ""}) • IP: ${pos.ip_address} • Klik untuk tes ping ulang`}
                                              className="relative flex h-2 w-2 shrink-0 cursor-pointer group/dot focus:outline-none"
                                            >
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-xs shadow-emerald-500/50 group-hover/dot:scale-125 transition-transform"></span>
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => ip ? handlePingPos(ip) : handleTogglePosStatus(pos)}
                                              title={`Status: Mati (${ping ? "Offline / RTO" : (pos.status || "Tidak Terhubung")}) • IP: ${pos.ip_address || "Belum ada IP"} • Klik untuk uji ping`}
                                              className="relative flex h-2 w-2 shrink-0 cursor-pointer group/dot focus:outline-none"
                                            >
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 shadow-xs shadow-rose-600/50 group-hover/dot:scale-125 transition-transform"></span>
                                            </button>
                                          )}

                                          <span className="font-mono font-bold text-slate-900 text-[10.5px] tracking-tight">
                                            {pos.pos_code}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => copyToClipboard(pos.pos_code, `code-${pos.id}`)}
                                            title="Salin Kode POS"
                                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-emerald-700 p-0.5 shrink-0"
                                          >
                                            {copiedKey === `code-${pos.id}` ? (
                                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                                            ) : (
                                              <Copy className="w-2.5 h-2.5" />
                                            )}
                                          </button>
                                        </div>
                                      );
                                    })()}
                                  </td>

                                  {/* 3. IP ADDRESS */}
                                  <td className="px-1 py-1 text-center whitespace-nowrap border-r border-slate-200/80">
                                    {pos.ip_address && pos.ip_address !== "-" ? (
                                      <div className="inline-flex items-center gap-0.5">
                                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[10px] tracking-tight">
                                          {pos.ip_address}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => copyToClipboard(pos.ip_address || "", `ip-${pos.id}`)}
                                          title="Salin IP"
                                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-emerald-700 p-0.5 shrink-0"
                                        >
                                          {copiedKey === `ip-${pos.id}` ? (
                                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                                          ) : (
                                            <Copy className="w-2.5 h-2.5" />
                                          )}
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-slate-300 font-mono text-[10px]">-</span>
                                    )}
                                  </td>

                                  {/* 4. UNIT POS */}
                                  <td className="px-0.5 py-1 text-center whitespace-nowrap bg-blue-50/10 border-r border-slate-100">
                                    <span
                                      className={`inline-block px-1 py-0.2 rounded text-[9.5px] font-black cursor-pointer hover:ring-1 hover:ring-blue-400 transition-all ${
                                        pos.pos_brand === "NCR"
                                          ? "bg-blue-100 text-blue-800"
                                          : pos.pos_brand === "KASSEN"
                                          ? "bg-purple-100 text-purple-800"
                                          : pos.pos_brand === "IWARE"
                                          ? "bg-amber-100 text-amber-800"
                                          : pos.pos_brand === "TOSHIBA"
                                          ? "bg-rose-100 text-rose-800"
                                          : "bg-slate-100 text-slate-500"
                                      }`}
                                      onMouseEnter={(e) => handleShowDetail(e, "Unit Mesin POS", pos.pos_brand, pos)}
                                      onMouseLeave={handleHideDetail}
                                    >
                                      {pos.pos_brand || "-"}
                                    </span>
                                  </td>

                                  {/* 5. OS */}
                                  <td className="px-0.5 py-1 text-center whitespace-nowrap bg-blue-50/10 border-r border-slate-100 overflow-hidden">
                                    {pos.os_version && pos.os_version !== "-" ? (
                                      <span
                                        className="text-[9.5px] text-slate-700 font-mono font-semibold inline-block max-w-full truncate cursor-pointer hover:text-blue-600 transition-colors"
                                        onMouseEnter={(e) => handleShowDetail(e, "Operating System (OS)", pos.os_version, pos)}
                                        onMouseLeave={handleHideDetail}
                                      >
                                        {pos.os_version
                                          .replace("WINDOWS 7 EMBEDDED STANDARD SP1 64BIT", "Win7 Emb")
                                          .replace("WINDOWS 7 ULTIMATE SP1 64BIT", "Win7 Ult")
                                          .replace("WINDOWS 7 ULT SP1 64BIT", "Win7 Ult")
                                          .replace("WINDOWS 7 PRO SP1 64BIT", "Win7 Pro")
                                          .replace("WINDOWS 10 PRO SP1 64BIT", "Win10 Pro")
                                          .replace("WINDOWS 7", "Win7")
                                          .replace("WINDOWS 10", "Win10")
                                          .replace("64BIT", "")}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-mono text-[10px]">-</span>
                                    )}
                                  </td>

                                  {/* 6. PROC */}
                                  <td className="px-0.5 py-1 text-center whitespace-nowrap bg-blue-50/10 border-r border-slate-100 overflow-hidden">
                                    {pos.processor && pos.processor !== "-" ? (
                                      <span
                                        className="px-1 py-0.2 bg-slate-100 border border-slate-200/80 rounded text-[9.5px] font-mono font-semibold text-slate-700 inline-block max-w-full truncate cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all"
                                        onMouseEnter={(e) => handleShowDetail(e, "Processor / CPU", pos.processor, pos)}
                                        onMouseLeave={handleHideDetail}
                                      >
                                        {pos.processor}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-mono text-[10px]">-</span>
                                    )}
                                  </td>

                                  {/* 7. RAM */}
                                  <td className="px-0.5 py-1 text-center whitespace-nowrap bg-blue-50/10 border-r border-slate-100">
                                    {pos.ram && pos.ram !== "-" ? (
                                      <span
                                        className="px-1 py-0.2 bg-slate-100 border border-slate-200/80 rounded text-[9.5px] font-mono font-semibold text-slate-700 inline-block cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all"
                                        onMouseEnter={(e) => handleShowDetail(e, "Memory RAM", pos.ram, pos)}
                                        onMouseLeave={handleHideDetail}
                                      >
                                        {pos.ram}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-mono text-[10px]">-</span>
                                    )}
                                  </td>

                                  {/* 8. STORAGE */}
                                  <td className="px-0.5 py-1 text-center whitespace-nowrap bg-blue-50/10 border-r border-slate-100">
                                    {pos.ssd && pos.ssd !== "-" ? (
                                      <span
                                        className="px-1 py-0.2 bg-slate-100 border border-slate-200/80 rounded text-[9.5px] font-mono font-semibold text-slate-700 inline-block cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all"
                                        onMouseEnter={(e) => handleShowDetail(e, "Storage SSD / HDD", pos.ssd, pos)}
                                        onMouseLeave={handleHideDetail}
                                      >
                                        {pos.ssd}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-mono text-[10px]">-</span>
                                    )}
                                  </td>

                                  {/* 9. PATCH */}
                                  <td className="px-0.5 py-1 text-center whitespace-nowrap bg-blue-50/10 border-r border-slate-200/80 overflow-hidden">
                                    {pos.tsigunta_version && pos.tsigunta_version !== "-" ? (
                                      <span
                                        className="px-1 py-0.2 bg-emerald-50 border border-emerald-200/80 rounded text-[9.5px] font-mono font-bold text-[#006622] inline-block max-w-full truncate cursor-pointer hover:bg-emerald-100 transition-all"
                                        onMouseEnter={(e) => handleShowDetail(e, "Versi Patch Aplikasi", pos.tsigunta_version, pos)}
                                        onMouseLeave={handleHideDetail}
                                      >
                                        {pos.tsigunta_version}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-mono text-[10px]">-</span>
                                    )}
                                  </td>

                                  {/* 10. KEYBOARD */}
                                  <td className="px-0.5 py-1 text-center whitespace-nowrap bg-emerald-50/10 border-r border-slate-100 overflow-hidden">
                                    {pos.keyboard && pos.keyboard !== "-" ? (
                                      <span
                                        className="px-1 py-0.2 bg-slate-100 border border-slate-200/80 rounded text-[9.5px] font-mono font-semibold text-slate-700 inline-block max-w-full truncate cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-all"
                                        onMouseEnter={(e) => handleShowDetail(e, "Keyboard Kasir", pos.keyboard, pos)}
                                        onMouseLeave={handleHideDetail}
                                      >
                                        {pos.keyboard.replace("LOGITECH (PS2)", "LOGITECH PS2")}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-mono text-[10px]">-</span>
                                    )}
                                  </td>

                                  {/* 11. MOUSE */}
                                  <td className="px-0.5 py-1 text-center whitespace-nowrap bg-emerald-50/10 border-r border-slate-100 overflow-hidden">
                                    {pos.mouse && pos.mouse !== "-" ? (
                                      <span
                                        className="px-1 py-0.2 bg-slate-100 border border-slate-200/80 rounded text-[9.5px] font-mono font-semibold text-slate-700 inline-block max-w-full truncate cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-all"
                                        onMouseEnter={(e) => handleShowDetail(e, "Mouse Kasir", pos.mouse, pos)}
                                        onMouseLeave={handleHideDetail}
                                      >
                                        {pos.mouse}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-mono text-[10px]">-</span>
                                    )}
                                  </td>

                                  {/* 12. PASSPORT SCANNER */}
                                  <td className="px-0.5 py-1 text-center whitespace-nowrap bg-emerald-50/10 border-r border-slate-100 overflow-hidden">
                                    {pos.passport_scanner && pos.passport_scanner !== "-" ? (
                                      <span
                                        className={`px-1 py-0.2 rounded text-[9.5px] font-bold inline-block max-w-full truncate cursor-pointer hover:ring-1 hover:ring-emerald-400 transition-all ${
                                          pos.passport_scanner === "GEMALTO"
                                            ? "bg-indigo-100 text-indigo-800"
                                            : pos.passport_scanner === "3M"
                                            ? "bg-sky-100 text-sky-800"
                                            : "bg-teal-100 text-teal-800"
                                        }`}
                                        onMouseEnter={(e) => handleShowDetail(e, "Passport Scanner", pos.passport_scanner, pos)}
                                        onMouseLeave={handleHideDetail}
                                      >
                                        {pos.passport_scanner}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-mono text-[10px]">-</span>
                                    )}
                                  </td>

                                  {/* 13. BARCODE SCANNER */}
                                  <td className="px-0.5 py-1 text-center whitespace-nowrap bg-emerald-50/10 border-r border-slate-100 overflow-hidden">
                                    {pos.barcode_scanner && pos.barcode_scanner !== "-" ? (
                                      <span
                                        className="px-1 py-0.2 bg-slate-100 rounded text-[9.5px] font-mono font-semibold text-slate-700 inline-block max-w-full truncate cursor-pointer hover:bg-emerald-50 hover:border hover:border-emerald-300 hover:text-emerald-800 transition-all"
                                        onMouseEnter={(e) => handleShowDetail(e, "Barcode Scanner", pos.barcode_scanner, pos)}
                                        onMouseLeave={handleHideDetail}
                                      >
                                        {pos.barcode_scanner.replace("HONEYWELL (DUDUK)", "HONEYWELL")}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-mono text-[10px]">-</span>
                                    )}
                                  </td>

                                  {/* 14. PRINTER */}
                                  <td className="px-0.5 py-1 text-center whitespace-nowrap bg-emerald-50/10 border-r border-slate-100 overflow-hidden">
                                    {pos.printer && pos.printer !== "-" ? (
                                      <span
                                        className={`px-1 py-0.2 rounded text-[9.5px] font-mono font-bold inline-block max-w-full truncate cursor-pointer hover:ring-1 hover:ring-amber-400 transition-all ${
                                          pos.printer.includes("220D")
                                            ? "bg-amber-100 text-amber-900"
                                            : pos.printer.includes("220B")
                                            ? "bg-orange-100 text-orange-900"
                                            : "bg-teal-100 text-teal-900"
                                        }`}
                                        onMouseEnter={(e) => handleShowDetail(e, "Printer Kasir", pos.printer, pos)}
                                        onMouseLeave={handleHideDetail}
                                      >
                                        {pos.printer
                                          .replace("EPSON ", "")
                                          .replace("EPSON-", "")
                                          .replace("KASSEN:", "")
                                          .replace("KASSEN ", "")
                                          .trim()}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-mono text-[10px]">-</span>
                                    )}
                                  </td>

                                  {/* 15. CASH DRAWER */}
                                  <td className="px-0.5 py-1 text-center whitespace-nowrap bg-emerald-50/10 border-r border-slate-200/80 overflow-hidden">
                                    {pos.cash_drawer && pos.cash_drawer !== "-" ? (
                                      <span
                                        className="px-1 py-0.2 bg-slate-100 border border-slate-200/80 rounded text-[9.5px] font-mono font-semibold text-slate-700 inline-block max-w-full truncate cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-all"
                                        onMouseEnter={(e) => handleShowDetail(e, "Cash Drawer / Laci", pos.cash_drawer, pos)}
                                        onMouseLeave={handleHideDetail}
                                      >
                                        {pos.cash_drawer}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-mono text-[10px]">-</span>
                                    )}
                                  </td>

                                  {/* 16. EDC TERHUBUNG (DARI TABEL MESIN EDC BANK) */}
                                  <td className="px-1 py-1 text-center bg-amber-50/10 border-r border-slate-200/80 overflow-hidden">
                                    {(pos.bca_tid && pos.bca_tid !== "-") ||
                                    (pos.bni_tid && pos.bni_tid !== "-") ||
                                    (pos.mandiri_tid && pos.mandiri_tid !== "-") ||
                                    (pos.bri_tid && pos.bri_tid !== "-") ? (
                                      <div className="flex flex-col items-center gap-1 leading-none w-full max-w-[84px] mx-auto">
                                        {pos.bca_tid && pos.bca_tid !== "-" && (
                                          <div className="flex items-center w-full rounded overflow-hidden border border-blue-400 bg-blue-50/80 text-[9px] font-mono whitespace-nowrap shadow-2xs">
                                            <span className="w-6 py-0.5 text-center bg-blue-700 text-white font-black text-[8px] tracking-tight shrink-0">BCA</span>
                                            <span className="flex-1 text-center px-1 py-0.5 font-bold text-blue-950 truncate">{pos.bca_tid}</span>
                                          </div>
                                        )}
                                        {pos.mandiri_tid && pos.mandiri_tid !== "-" && (
                                          <div className="flex items-center w-full rounded overflow-hidden border border-amber-400 bg-amber-50/80 text-[9px] font-mono whitespace-nowrap shadow-2xs">
                                            <span className="w-6 py-0.5 text-center bg-amber-500 text-slate-950 font-black text-[8px] tracking-tight shrink-0">MDR</span>
                                            <span className="flex-1 text-center px-1 py-0.5 font-bold text-amber-950 truncate">{pos.mandiri_tid}</span>
                                          </div>
                                        )}
                                        {pos.bri_tid && pos.bri_tid !== "-" && (
                                          <div className="flex items-center w-full rounded overflow-hidden border border-purple-400 bg-purple-50/80 text-[9px] font-mono whitespace-nowrap shadow-2xs">
                                            <span className="w-6 py-0.5 text-center bg-purple-700 text-white font-black text-[8px] tracking-tight shrink-0">BRI</span>
                                            <span className="flex-1 text-center px-1 py-0.5 font-bold text-purple-950 truncate">{pos.bri_tid}</span>
                                          </div>
                                        )}
                                        {pos.bni_tid && pos.bni_tid !== "-" && (
                                          <div className="flex items-center w-full rounded overflow-hidden border border-orange-400 bg-orange-50/80 text-[9px] font-mono whitespace-nowrap shadow-2xs">
                                            <span className="w-6 py-0.5 text-center bg-orange-600 text-white font-black text-[8px] tracking-tight shrink-0">BNI</span>
                                            <span className="flex-1 text-center px-1 py-0.5 font-bold text-orange-950 truncate">{pos.bni_tid}</span>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-300 font-mono text-[10px]">-</span>
                                    )}
                                  </td>

                                  {/* 17. AKSI */}
                                  <td className="px-1 py-1 text-center whitespace-nowrap">
                                    <div className="inline-flex items-center justify-center gap-0.5">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoteAnydesk(pos)}
                                        title={`Remote AnyDesk (${pos.ip_address || "No IP"}) - Klik untuk koneksi langsung`}
                                        className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                      >
                                        <ScreenShare className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenPosSticker(pos)}
                                        title="Cetak Stiker Barcode"
                                        className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenReplaceModal(pos)}
                                        title="Replace / Ganti Perangkat Kasir"
                                        className="p-1 rounded text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditPos(pos)}
                                        title="Edit Spesifikasi POS"
                                        className="p-1 rounded text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePos(pos.id!, pos.pos_code)}
                                        title="Hapus POS"
                                        className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </Fragment>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: MASTER INVENTORY HARDWARE STANDAR                 */}
        {/* ======================================================== */}
        {activeTab === "hardware" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Laptop className="w-6 h-6 text-blue-600" />
                  Master Inventaris Hardware Standar
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Kelola seluruh unit hardware cadangan, printer thermal, barcode scanner, dan perangkat jaringan toko.
                </p>
              </div>

              <button
                onClick={() => {
                  const randomNum = Math.floor(100 + Math.random() * 900);
                  setEditingAsset(null);
                  setAssetFormData({
                    asset_code: `AST-POS-${randomNum}`,
                    name: "",
                    category: "POS Terminal",
                    shop_location: "Plaza Bali",
                    brand_model: "",
                    serial_number: "",
                    ip_address: "",
                    purchase_date: new Date().toISOString().split("T")[0],
                    status: "OPERASIONAL",
                    notes: "",
                  });
                  setAssetFormError(null);
                  setIsAssetFormOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 active:scale-95 transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Tambah Hardware Baru
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <input
                    type="text"
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    placeholder="Cari kode, nama, SN, brand..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Semua Kategori</option>
                  <option value="POS Terminal">POS Terminal</option>
                  <option value="Printer Thermal">Printer Thermal</option>
                  <option value="Barcode Scanner">Barcode Scanner</option>
                  <option value="Network / Router">Network / Router</option>
                  <option value="UPS / Kelistrikan">UPS / Kelistrikan</option>
                </select>

                <select
                  value={selectedShop}
                  onChange={(e) => setSelectedShop(e.target.value)}
                  disabled={!isMIS}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {isMIS && <option value="">Semua Lokasi Toko</option>}
                  <option value="Plaza Bali">Plaza Bali</option>
                  <option value="SAM">SAM</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Semua Status</option>
                  <option value="OPERASIONAL">Operasional</option>
                  <option value="PERBAIKAN">Perbaikan</option>
                  <option value="RUSAK">Rusak</option>
                  <option value="CADANGAN">Cadangan</option>
                </select>
              </div>
            </div>

            {/* Standard Assets Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {isAssetsLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Memuat data inventaris hardware...
                </div>
              ) : assets.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <Laptop className="w-8 h-8 text-slate-300" />
                  <span>Tidak ada aset yang cocok dengan filter pencarian.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                      <tr>
                        <th className="px-4 py-3">Kode Aset</th>
                        <th className="px-4 py-3">Nama Perangkat</th>
                        <th className="px-4 py-3">Kategori</th>
                        <th className="px-4 py-3">Lokasi Toko</th>
                        <th className="px-4 py-3">Brand & Model</th>
                        <th className="px-4 py-3">Serial Number</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-blue-600 whitespace-nowrap">
                            {asset.asset_code}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {asset.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                            {asset.category}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                            {asset.shop_location}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                            {asset.brand_model}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                            {asset.serial_number}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                asset.status === "OPERASIONAL"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : asset.status === "PERBAIKAN"
                                    ? "bg-amber-100 text-amber-800"
                                    : asset.status === "CADANGAN"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {asset.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedAssetForSticker(asset)}
                                title="Cetak Stiker Barcode"
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedAssetForTicket(asset)}
                                title="Buat Tiket Perbaikan"
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                              >
                                <LifeBuoy className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Form Modal: Add / Edit POS Hardware */}
      {isPosFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[95vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">
                  {editingPos ? `Edit Data POS: ${editingPos.pos_code}` : "Tambah Perangkat Kasir POS Baru"}
                </h3>
              </div>
              <button
                onClick={() => setIsPosFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePos} className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Toko / Store:
                  </label>
                  <select
                    value={posFormData.shop_name}
                    onChange={(e) => setPosFormData({ ...posFormData, shop_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Plaza Bali">Plaza Bali</option>
                    <option value="SAM">SAM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Lokasi POS: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={posFormData.pos_code}
                    onChange={(e) => setPosFormData({ ...posFormData, pos_code: e.target.value })}
                    placeholder="CGKT3DFD01-P01"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs uppercase font-mono font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Terminal Bandara:
                  </label>
                  <select
                    value={posFormData.terminal}
                    onChange={(e) => setPosFormData({ ...posFormData, terminal: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Terminal 3">Terminal 3 (CGK)</option>
                    <option value="Terminal 2">Terminal 2 (CGK)</option>
                    <option value="Surabaya T1">Surabaya T1 (Juanda)</option>
                    <option value="Surabaya T2">Surabaya T2 (Juanda)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Counter Zone:
                  </label>
                  <input
                    type="text"
                    value={posFormData.counter_zone}
                    onChange={(e) => setPosFormData({ ...posFormData, counter_zone: e.target.value })}
                    placeholder="DFD01"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs uppercase font-mono font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Sebutan Toko:
                  </label>
                  <input
                    type="text"
                    value={posFormData.store_alias || ""}
                    onChange={(e) => setPosFormData({ ...posFormData, store_alias: e.target.value })}
                    placeholder="Toko Jada 2 / Toko DF1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    IP Address POS:
                  </label>
                  <input
                    type="text"
                    value={posFormData.ip_address}
                    onChange={(e) => setPosFormData({ ...posFormData, ip_address: e.target.value })}
                    placeholder="172.19.20.11"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Type / Brand POS:
                  </label>
                  <select
                    value={posFormData.pos_brand}
                    onChange={(e) => setPosFormData({ ...posFormData, pos_brand: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="NCR">NCR</option>
                    <option value="KASSEN">KASSEN</option>
                    <option value="IWARE">IWARE</option>
                    <option value="TOSHIBA">TOSHIBA</option>
                    <option value="-">- (Cadangan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Kasir POS:
                  </label>
                  <select
                    value={posFormData.status}
                    onChange={(e: any) => setPosFormData({ ...posFormData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="OPERASIONAL">OPERASIONAL</option>
                    <option value="CADANGAN">CADANGAN</option>
                    <option value="PERBAIKAN">PERBAIKAN</option>
                    <option value="RUSAK">RUSAK</option>
                  </select>
                </div>
              </div>

              {/* Hardware Peripherals */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Spesifikasi Sistem, Periferal & Aplikasi:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Processor (Proc):</label>
                    <input
                      type="text"
                      value={posFormData.processor || ""}
                      onChange={(e) => setPosFormData({ ...posFormData, processor: e.target.value })}
                      placeholder="Intel Celeron / Core i3"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">RAM:</label>
                    <input
                      type="text"
                      value={posFormData.ram || ""}
                      onChange={(e) => setPosFormData({ ...posFormData, ram: e.target.value })}
                      placeholder="4GB"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Storage (SSD/HDD):</label>
                    <input
                      type="text"
                      value={posFormData.ssd || ""}
                      onChange={(e) => setPosFormData({ ...posFormData, ssd: e.target.value })}
                      placeholder="120GB SSD"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Patch:</label>
                    <input
                      type="text"
                      value={posFormData.tsigunta_version || ""}
                      onChange={(e) => setPosFormData({ ...posFormData, tsigunta_version: e.target.value })}
                      placeholder="v2.4.1 / Patch 2026"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block">OS Version:</label>
                    <input
                      type="text"
                      value={posFormData.os_version || ""}
                      onChange={(e) => setPosFormData({ ...posFormData, os_version: e.target.value })}
                      placeholder="WINDOWS 7 EMBEDDED STANDARD SP1 64BIT"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Passport Scanner:</label>
                    <input
                      type="text"
                      value={posFormData.passport_scanner || ""}
                      onChange={(e) => setPosFormData({ ...posFormData, passport_scanner: e.target.value })}
                      placeholder="GEMALTO / 3M"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Barcode Scanner:</label>
                    <input
                      type="text"
                      value={posFormData.barcode_scanner || ""}
                      onChange={(e) => setPosFormData({ ...posFormData, barcode_scanner: e.target.value })}
                      placeholder="HONEYWELL"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Printer:</label>
                    <input
                      type="text"
                      value={posFormData.printer || ""}
                      onChange={(e) => setPosFormData({ ...posFormData, printer: e.target.value })}
                      placeholder="EPSON TM-U220D"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Scanner Jari:</label>
                    <input
                      type="text"
                      value={posFormData.fingerprint_scanner || ""}
                      onChange={(e) => setPosFormData({ ...posFormData, fingerprint_scanner: e.target.value })}
                      placeholder="DIGITAL PERSONA / OK"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Keyboard:</label>
                    <input
                      type="text"
                      value={posFormData.keyboard || ""}
                      onChange={(e) => setPosFormData({ ...posFormData, keyboard: e.target.value })}
                      placeholder="LOGITECH"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Mouse:</label>
                    <input
                      type="text"
                      value={posFormData.mouse || ""}
                      onChange={(e) => setPosFormData({ ...posFormData, mouse: e.target.value })}
                      placeholder="LOGITECH"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Cash Drawer (Laci):</label>
                    <input
                      type="text"
                      value={posFormData.cash_drawer || ""}
                      onChange={(e) => setPosFormData({ ...posFormData, cash_drawer: e.target.value })}
                      placeholder="PANDA"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {posFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {posFormError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPosFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingPos}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isSavingPos ? "Menyimpan..." : "Simpan Spesifikasi POS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Replace / Ganti Perangkat Kasir */}
      {isReplaceModalOpen && replacingPos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                  <RefreshCw className={`w-5 h-5 ${isSavingReplace ? "animate-spin" : ""}`} />
                </div>
                <div>
                  <h3 className="font-bold text-base tracking-tight">Replace / Ganti Perangkat Kasir</h3>
                  <p className="text-xs text-emerald-100 font-medium">
                    {replacingPos.pos_code} • {replacingPos.store_alias || replacingPos.shop_name} ({replacingPos.counter_zone || replacingPos.terminal})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReplaceModalOpen(false)}
                className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveReplace} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {replaceError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{replaceError}</span>
                </div>
              )}

              {/* Info Box */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 leading-relaxed flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <p>
                  Pilih perangkat yang diganti dan isi data pengadaan baru. Data ini otomatis meng-update tabel POS dan <strong>detail popup hover</strong> pada perangkat tersebut.
                </p>
              </div>

              {/* Grid Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Komponen yang Diganti */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pilih Perangkat / Komponen yang Diganti <span className="text-rose-500">*</span>:
                  </label>
                  <select
                    value={replaceComponentKey}
                    onChange={(e) => handleComponentChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="keyboard">Keyboard Kasir</option>
                    <option value="mouse">Mouse Kasir</option>
                    <option value="printer">Printer Struk Kasir</option>
                    <option value="barcode_scanner">Barcode Scanner Kasir</option>
                    <option value="passport_scanner">Passport Scanner Kasir</option>
                    <option value="cash_drawer">Cash Drawer / Laci Uang</option>
                    <option value="pos_brand">Unit PC / Mesin POS</option>
                    <option value="ram">RAM Memory</option>
                    <option value="ssd">Storage SSD</option>
                  </select>
                </div>

                {/* 1.5 Integrasi Pencatatan Pembelian (Klop dengan Petugas Purchasing) */}
                <div className="sm:col-span-2 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <ShoppingCart className="w-4 h-4 text-emerald-600" />
                      <span>Pilih Dari Data Pembelian (Klop dengan Petugas Purchasing):</span>
                    </label>
                    {selectedPurchaseId && (
                      <span className="text-[9.5px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300 shadow-2xs">
                        ✓ Data Klop Terpilih
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedPurchaseId ? String(selectedPurchaseId) : "manual"}
                    onChange={(e) => handleSelectPurchaseItem(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="manual">-- Input Bebas / Manual (Bukan dari Data PO Pembelian) --</option>
                    {availablePurchases
                      .filter((p) => {
                        const isMatchComp =
                          p.component_type === replaceComponentKey ||
                          (replaceComponentKey === "keyboard" && p.item_name?.toLowerCase().includes("keyboard")) ||
                          (replaceComponentKey === "mouse" && p.item_name?.toLowerCase().includes("mouse")) ||
                          (replaceComponentKey === "printer" && p.item_name?.toLowerCase().includes("printer")) ||
                          (replaceComponentKey === "barcode_scanner" && p.item_name?.toLowerCase().includes("scanner")) ||
                          (replaceComponentKey === "passport_scanner" &&
                            (p.item_name?.toLowerCase().includes("passport") ||
                              p.item_name?.toLowerCase().includes("gemalto") ||
                              p.item_name?.toLowerCase().includes("3m"))) ||
                          (replaceComponentKey === "ssd" &&
                            (p.item_name?.toLowerCase().includes("ssd") || p.item_name?.toLowerCase().includes("storage"))) ||
                          (replaceComponentKey === "ram" && p.item_name?.toLowerCase().includes("ram")) ||
                          (replaceComponentKey === "cash_drawer" &&
                            (p.item_name?.toLowerCase().includes("drawer") || p.item_name?.toLowerCase().includes("laci")));
                        return isMatchComp || p.target_pos_code === replacingPos.pos_code;
                      })
                      .map((p) => {
                        const isTargetThisPos = p.target_pos_code === replacingPos.pos_code;
                        const isInstalled = p.installed_pos_code && p.installed_pos_code !== "-";
                        return (
                          <option key={p.id} value={p.id}>
                            {isTargetThisPos ? "★ [KHUSUS POS INI] " : ""}
                            {p.po_number}: {p.item_name} • {p.vendor} ({p.purchase_date || p.request_date})
                            {isInstalled ? ` [Sudah Dipasang di ${p.installed_pos_code}]` : " [Siap Pasang]"}
                          </option>
                        );
                      })}
                  </select>
                  <p className="text-[10px] text-emerald-800 leading-tight">
                    💡 <em>Memilih barang di atas akan otomatis mengisi nama model, harga, toko, tanggal pembelian, dan nomor serial sesuai catatan orang pembelian.</em>
                  </p>
                </div>

                {/* 2. Model / Tipe Baru */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama / Model Perangkat Baru <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={replaceFormData.newModel}
                    onChange={(e) => setReplaceFormData({ ...replaceFormData, newModel: e.target.value })}
                    placeholder="Contoh: LOGITECH K120"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* 3. Serial Number (S/N) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Serial Number (S/N) (Opsional):
                  </label>
                  <input
                    type="text"
                    value={replaceFormData.newSn}
                    onChange={(e) => setReplaceFormData({ ...replaceFormData, newSn: e.target.value })}
                    placeholder="Contoh: SN20261029883"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* 4. Harga Perangkat */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Harga Pembelian:
                  </label>
                  <input
                    type="text"
                    value={replaceFormData.price}
                    onChange={(e) => setReplaceFormData({ ...replaceFormData, price: e.target.value })}
                    placeholder="Contoh: Rp 165.000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-emerald-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* 5. Tanggal Pembelian */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Pembelian / Pemasangan:
                  </label>
                  <input
                    type="date"
                    value={replaceFormData.purchaseDate}
                    onChange={(e) => setReplaceFormData({ ...replaceFormData, purchaseDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* 6. Toko / Vendor Pembelian */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Toko / Vendor Pembelian:
                  </label>
                  <input
                    type="text"
                    value={replaceFormData.purchasedFrom}
                    onChange={(e) => setReplaceFormData({ ...replaceFormData, purchasedFrom: e.target.value })}
                    placeholder="Contoh: Logitech Official Store / Toko Komputer Harco"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* 7. Alasan Penggantian / Catatan */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alasan Penggantian / Keterangan:
                  </label>
                  <textarea
                    rows={2}
                    value={replaceFormData.reason}
                    onChange={(e) => setReplaceFormData({ ...replaceFormData, reason: e.target.value })}
                    placeholder="Contoh: Tombol spasi macet / peremajaan unit kasir"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReplaceModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingReplace}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${isSavingReplace ? "animate-spin" : ""}`} />
                  {isSavingReplace ? "Menyimpan Penggantian..." : "Simpan Penggantian Perangkat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Sticker Generator Modal */}
      <BarcodeGeneratorModal
        isOpen={!!selectedAssetForSticker || !!selectedPosForSticker}
        asset={selectedAssetForSticker}
        posHardware={selectedPosForSticker}
        onClose={() => {
          setSelectedAssetForSticker(null);
          setSelectedPosForSticker(null);
        }}
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

      {/* Floating Hover Mini Card Detail Perangkat (Light, Professional & Modern) */}
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
            <div className="p-2 bg-slate-50/90 border border-slate-200/80 rounded-xl mb-2 flex items-center justify-between">
              <span className="text-slate-500 font-medium text-[9px]">Model / Tipe:</span>
              <span className="font-mono font-black text-slate-900 text-[11px]">
                {hoverDetail.model}
              </span>
            </div>

            {/* Spec & Detail Metadata */}
            <div className="space-y-1.5 text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Harga:</span>
                <span className="font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded text-[10.5px]">
                  {hoverDetail.price}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-1.5">
                <span className="text-slate-400 font-medium shrink-0">Toko:</span>
                <span className="text-slate-800 font-semibold text-right text-[9.5px] truncate max-w-[150px]">
                  {hoverDetail.purchasedFrom}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Tanggal Pembelian:</span>
                <span className="font-mono text-slate-800 font-bold text-[9.5px]">
                  {hoverDetail.purchaseDate}
                </span>
              </div>
              {hoverDetail.sn && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Serial No (S/N):</span>
                  <span className="font-mono font-bold text-slate-800 text-[9.5px]">
                    {hoverDetail.sn}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-slate-400 font-medium">Terakhir Diganti / Update:</span>
                <span className="text-slate-800 font-bold font-mono text-[9.5px]">
                  {hoverDetail.lastChange}
                </span>
              </div>
              {hoverDetail.notes && (
                <div className="pt-1.5">
                  <div className="text-[9px] text-slate-600 bg-slate-50 border border-slate-200/80 p-1.5 rounded-lg leading-relaxed">
                    <strong className="text-slate-700 not-italic">Catatan: </strong>
                    {hoverDetail.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Arrow beak */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-white border-r border-b border-slate-200/90 rotate-45" />
          </div>
        </div>
      )}

      {/* Floating AnyDesk Quick Connect Banner */}
      {remoteToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700/80 max-w-sm flex items-start gap-3">
            <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-md shrink-0">
              <ScreenShare className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                  <span>{remoteToast.autoLogin ? "AnyDesk Otomatis Terhubung" : "Membuka AnyDesk"}</span>
                  {remoteToast.autoLogin && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30">
                      Auto Login
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setRemoteToast(null)}
                  className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-slate-300 mt-1">
                Unit: <strong className="text-white">{remoteToast.posCode}</strong> ({remoteToast.store})
              </p>

              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between bg-slate-800/90 rounded-lg px-2.5 py-1.5 border border-slate-700">
                  <span className="text-[10.5px] text-slate-300 font-mono font-bold">Target: {remoteToast.ip}</span>
                  <span className="text-[9.5px] font-bold text-emerald-400">✓ Siap Remote</span>
                </div>

                {remoteToast.password && (
                  <div className="flex items-center justify-between bg-slate-800/60 rounded-lg px-2.5 py-1 border border-slate-700/60 text-[10px]">
                    <span className="text-slate-400 font-mono">Password: ••••••••</span>
                    <span className="text-[9px] font-bold text-blue-400">✓ Auto-Piped / Tersalin</span>
                  </div>
                )}
              </div>

              {remoteToast.autoLogin ? (
                <p className="text-[10px] text-emerald-400 mt-2 font-medium leading-snug flex items-center gap-1">
                  <Check className="w-3 h-3 shrink-0" />
                  <span>Password telah otomatis dimasukkan oleh sistem via AnyDesk CLI. Anda langsung terhubung!</span>
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-2 leading-snug">
                  Password telah disalin ke clipboard. Jika jendela AnyDesk meminta password, cukup tekan <strong>Ctrl + V</strong> lalu <strong>Enter</strong>.
                </p>
              )}

              <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDownloadBat(remoteToast.ip, remoteToast.password || defaultAnydeskPassword, remoteToast.posCode)}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-bold hover:underline flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Unduh Launcher 1-Klik (.bat)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAnydeskConfigOpen(true)}
                  className="text-[10px] text-slate-400 hover:text-white underline"
                >
                  Ubah Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Password AnyDesk */}
      {isAnydeskConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                  <ScreenShare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Pengaturan Auto Login AnyDesk
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Otomatisasi Password Remote Kasir POS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAnydeskConfigOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div className="p-3 bg-gradient-to-r from-emerald-50 to-rose-50 border border-emerald-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>AnyDesk CLI Terpasang di Komputer Anda</span>
                </div>
                <p className="text-[10.5px] text-slate-600 leading-relaxed">
                  Sistem menggunakan perintah resmi AnyDesk:
                  <code className="block font-mono bg-white px-2 py-1 rounded border border-slate-200 text-purple-700 font-bold mt-1">
                    echo &lt;password&gt; | anydesk &lt;IP&gt; --with-password
                  </code>
                  Sehingga saat tombol remote diklik, AnyDesk langsung terbuka dan password otomatis terisi tanpa perlu mengetik manual!
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Password AnyDesk Seluruh Kasir POS:
                </label>
                <input
                  type="text"
                  value={defaultAnydeskPassword}
                  onChange={(e) => setDefaultAnydeskPassword(e.target.value)}
                  placeholder="Contoh: cupcake2020"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  *Password ini digunakan sebagai sandi default saat mengklik tombol remote AnyDesk pada kasir POS.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAnydeskConfigOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-100"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem("mis_anydesk_default_pwd", defaultAnydeskPassword);
                  } catch (e) {}
                  setIsAnydeskConfigOpen(false);
                  alert(`Default password AnyDesk berhasil disimpan: "${defaultAnydeskPassword}"`);
                }}
                className="px-5 py-2 bg-[#006622] hover:bg-[#00551c] text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all"
              >
                Simpan Password
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}

export default function AssetsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Memuat Data Perangkat POS...</div>}>
      <AssetsContent />
    </Suspense>
  );
}
