"use client";

import { useEffect, useState, useMemo, Fragment, Suspense } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import ScannerModal from "@/components/ScannerModal";
import BarcodeGeneratorModal from "@/components/BarcodeGeneratorModal";
import { EdcAsset, Asset } from "@/types";
import {
  CreditCard,
  Search,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  Plus,
  Filter,
  Download,
  Edit2,
  Trash2,
  Printer,
  Shield,
  Save,
  X,
  Store,
  Layers,
  Sparkles,
  Building2,
  MapPin,
  Laptop,
  CheckCheck,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Zap,
  Wifi
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import { getClientCache, setClientCache, clearClientCache } from "@/lib/cache";
import CustomDropdown, { DropdownOption } from "@/components/CustomDropdown";

// Helper function to extract terminal and area zone from POS code
function parsePosLocation(posLoc: string, shopName: string) {
  let terminal = "Terminal 3";
  let zone = "Counter Umum";
  let storeAlias = "";

  if (posLoc.includes("T3") || posLoc.startsWith("CGKT3")) {
    terminal = "Terminal 3";
  } else if (posLoc.includes("T2") || posLoc.startsWith("CGKT2")) {
    terminal = "Terminal 2";
  } else if (posLoc.includes("SUB")) {
    terminal = "Surabaya Juanda";
  }

  const match = posLoc.match(/(DFD\d+|DFA\d+|DPD\d+|GGO\d+|MMH\d+|BBV\d+|SSR\d+|OLR\d+|EAD\d+|WSD\d+|DDD\d+|SUB\w+)/i);
  if (match) {
    zone = match[1].toUpperCase();
  }

  if (zone === "DFA02") storeAlias = "Toko Jada 2";
  else if (zone === "DFD01") storeAlias = "Toko DF1";
  else if (zone === "DFD02") storeAlias = "Toko DF2";
  else if (zone === "DFD03") storeAlias = "Toko DF3";
  else if (zone === "DFD04") storeAlias = "Toko DF4";
  else if (zone === "DFD05") storeAlias = "Toko DF5";
  else if (zone === "DFD06") storeAlias = "Toko DF6";
  else if (zone === "DFD07") storeAlias = "Toko DF7";
  else if (zone === "GGO01") storeAlias = "Toko Garuda Go 1";
  else if (zone === "GGO02") storeAlias = "Toko Garuda Go 2";
  else if (zone === "GGO03") storeAlias = "Toko Garuda Go 3";
  else if (zone === "GGO04") storeAlias = "Toko Garuda Go 4";
  else if (zone === "MMH01") storeAlias = "Toko Merpati";
  else if (zone === "BBV01") storeAlias = "Toko Bebas Bea";
  else if (zone === "SSR01") storeAlias = "Toko Self Service";
  else if (zone === "OLR01") storeAlias = "Toko Online Retail";
  else if (zone === "EAD01") storeAlias = "Toko Eatery & Drink";
  else if (zone === "WSD01") storeAlias = "Toko Wholesale DF";
  else if (zone === "DDD01") storeAlias = "Toko Duty Paid";

  return { terminal, zone, storeAlias };
}

// Helper untuk menghitung IP EDC BRI otomatis dari kode POS
// Contoh: DFD01-P01 -> 172.19.21.11, P02 -> 172.19.21.12, DF2 P01 -> 172.19.21.21, dst.
function getBriEdcIp(posLoc: string): string {
  if (!posLoc) return "172.19.21.11";
  const clean = posLoc.toUpperCase().trim();

  // Pattern 1: DFD01-P01 s/d DFD07-P09 (DF1 = 11..19, DF2 = 21..29, DF3 = 31..39, DF4 = 41..49)
  const dfMatch = clean.match(/DFD0?(\d+)-P0?(\d+)/i);
  if (dfMatch) {
    const dfNum = parseInt(dfMatch[1], 10);
    const posNum = parseInt(dfMatch[2], 10);
    const lastOctet = dfNum * 10 + posNum;
    return `172.19.21.${lastOctet}`;
  }

  // Pattern 2: DFA02-P01 s/d P02 (Jada 2 = 51, 52)
  const dfaMatch = clean.match(/DFA0?(\d+)-P0?(\d+)/i);
  if (dfaMatch) {
    const posNum = parseInt(dfaMatch[2], 10);
    return `172.19.21.${50 + posNum}`;
  }

  // Pattern 3: Generic fallback berdasarkan nomor POS
  const pMatch = clean.match(/-P0?(\d+)/i);
  if (pMatch) {
    const pNum = parseInt(pMatch[1], 10);
    const octet = pNum < 10 ? 10 + pNum : pNum;
    return `172.19.21.${octet}`;
  }

  return "172.19.21.11";
}

function EdcContent() {
  const { user, isAdmin, isMIS, isManager, isProcurement, userShopLocation } = useAuth();

  if (!user) {
    return <AccessDenied moduleName="Mesin EDC Kasir Bank" />;
  }
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  // View Mode: 'pos' (Master per POS) vs 'recap' (Rekapitulasi Bank Mitra)
  const [activeTab, setActiveTab] = useState<"pos" | "recap">("pos");

  const [edcList, setEdcList] = useState<EdcAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedShop, setSelectedShop] = useState(isMIS || isAdmin || isManager ? "" : userShopLocation);
  const [selectedTerminal, setSelectedTerminal] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedActive, setSelectedActive] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedDfTab, setSelectedDfTab] = useState("ALL");
  const [collapsedDfs, setCollapsedDfs] = useState<Record<string, boolean>>({});

  const toggleDfCollapse = (key: string) => {
    setCollapsedDfs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (user?.role === "SPV_PLAZABALI_T3") {
      setSelectedShop("Plaza Bali");
      setSelectedTerminal("Terminal 3");
    } else if (user?.role === "SPV_PLAZABALI_T2") {
      setSelectedShop("Plaza Bali");
      setSelectedTerminal("Terminal 2");
    } else if (user?.role === "SPV_SAM_T3") {
      setSelectedShop("SAM");
      setSelectedTerminal("Terminal 3");
    } else if (user?.role === "SPV_SAM_T2") {
      setSelectedShop("SAM");
      setSelectedTerminal("Terminal 2");
    } else if (user?.role === "SPV_PLAZABALI") {
      setSelectedShop("Plaza Bali");
    } else if (user?.role === "SPV_SAM") {
      setSelectedShop("SAM");
    } else if (!isMIS && !isAdmin && !isManager && userShopLocation !== "Semua Toko") {
      setSelectedShop(userShopLocation);
    }
  }, [user, isMIS, isAdmin, isManager, userShopLocation]);

  // Copy feedback tracking
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedEdcForSticker, setSelectedEdcForSticker] = useState<Asset | null>(null);

  // Form Modal (Add / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEdc, setEditingEdc] = useState<EdcAsset | null>(null);
  const [formData, setFormData] = useState<Partial<EdcAsset>>({
    pos_location: "",
    shop_name: isMIS ? "Plaza Bali" : userShopLocation,
    is_active: "Y",
    bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "", bca_mid: "885000533981",
    bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
    mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
    bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "", bri_mid: "1999258659",
    notes: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchEdc = async () => {
    const cacheKey = `edc_${searchTerm}_${selectedShop}_${selectedActive}_${selectedZone}`;
    const cached = getClientCache<EdcAsset[]>(cacheKey);
    if (cached) {
      setEdcList(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (selectedShop) params.set("shop", selectedShop);
      if (selectedActive) params.set("active", selectedActive);
      if (selectedZone) params.set("zone", selectedZone);

      const res = await fetch(`/api/edc?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setEdcList(json.data);
        setClientCache(cacheKey, json.data);
      }
    } catch (err) {
      console.error("Failed to load EDC assets", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEdc();
  }, [searchTerm, selectedShop, selectedActive, selectedZone]);

  const copyToClipboard = (text: string, key: string) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Live Ping State untuk Mesin EDC BRI (Status per IP address)
  const [briPingState, setBriPingState] = useState<
    Record<string, { status: "ONLINE" | "OFFLINE" | "TESTING"; latency?: number | null }>
  >({});
  const [isPingingGroup, setIsPingingGroup] = useState<Record<string, boolean>>({});

  // Handler: Ping 1 mesin EDC BRI berdasarkan lokasi POS
  const handlePingBri = async (posLoc: string) => {
    const ip = getBriEdcIp(posLoc);
    setBriPingState((prev) => ({
      ...prev,
      [ip]: { status: "TESTING" },
    }));

    try {
      const res = await fetch("/api/edc/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, pos_location: posLoc }),
      });
      const json = await res.json();
      if (json.success) {
        setBriPingState((prev) => ({
          ...prev,
          [ip]: {
            status: json.status,
            latency: json.latency,
          },
        }));
      } else {
        setBriPingState((prev) => ({
          ...prev,
          [ip]: { status: "OFFLINE", latency: null },
        }));
      }
    } catch {
      setBriPingState((prev) => ({
        ...prev,
        [ip]: { status: "OFFLINE", latency: null },
      }));
    }
  };

  // Handler: Ping batch seluruh mesin EDC BRI dalam satu kelompok DF
  const handlePingBriGroup = async (groupKey: string, items: EdcAsset[]) => {
    const ips = items.map((item) => getBriEdcIp(item.pos_location));
    setIsPingingGroup((prev) => ({ ...prev, [groupKey]: true }));
    setBriPingState((prev) => {
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
        setBriPingState((prev) => ({
          ...prev,
          ...json.results,
        }));
      }
    } catch {
      setBriPingState((prev) => {
        const updated = { ...prev };
        ips.forEach((ip) => {
          updated[ip] = { status: "OFFLINE", latency: null };
        });
        return updated;
      });
    } finally {
      setIsPingingGroup((prev) => ({ ...prev, [groupKey]: false }));
    }
  };

  const handleOpenAddModal = () => {
    setEditingEdc(null);
    setFormData({
      pos_location: "",
      shop_name: selectedShop === "SAM" ? "SAM" : "Plaza Bali",
      is_active: "Y",
      bca_credit: "OK", bca_debit: "OK", bca_qr: "-", bca_tid: "", bca_mid: "885000533981",
      bni_credit: "OK", bni_debit: "OK", bni_qr: "-", bni_tid: "-", bni_mid: "-",
      mandiri_credit: "OK", mandiri_debit: "OK", mandiri_qr: "-", mandiri_tid: "-", mandiri_mid: "-",
      bri_credit: "OK", bri_debit: "OK", bri_qr: "-", bri_tid: "", bri_mid: "1999258659",
      notes: "",
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (edc: EdcAsset) => {
    setEditingEdc(edc);
    setFormData({ ...edc });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSaveEdc = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const url = editingEdc ? `/api/edc/${editingEdc.id}` : "/api/edc";
      const method = editingEdc ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success) {
        clearClientCache();
        setIsFormOpen(false);
        fetchEdc();
      } else {
        setFormError(json.message || "Gagal menyimpan data EDC.");
      }
    } catch (err) {
      setFormError("Gagal menghubungi server database.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEdc = async (id: number, pos: string) => {
    if (!confirm(`Yakin ingin menghapus data EDC POS "${pos}"?`)) return;

    try {
      const res = await fetch(`/api/edc/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        clearClientCache();
        fetchEdc();
      } else {
        alert(json.message || "Gagal menghapus data.");
      }
    } catch (err) {
      alert("Gagal menghapus.");
    }
  };

  const handleOpenSticker = (edc: EdcAsset) => {
    const assetObj: Asset = {
      asset_code: edc.pos_location,
      name: `Mesin EDC Kasir ${edc.pos_location}`,
      category: "EDC / Payment",
      shop_location: edc.shop_name || "Plaza Bali",
      brand_model: "Multi-Bank (BCA/Mandiri/BRI/BNI)",
      serial_number: `TID-BCA:${edc.bca_tid || '-'} • TID-BRI:${edc.bri_tid || '-'}`,
      ip_address: null,
      status: edc.is_active === "Y" ? "OPERASIONAL" : "CADANGAN",
      notes: `Toko: ${edc.shop_name} • BCA: ${edc.bca_tid || '-'} • Mandiri: ${edc.mandiri_tid || '-'} • BRI: ${edc.bri_tid || '-'} • BNI: ${edc.bni_tid || '-'}`,
    };
    setSelectedEdcForSticker(assetObj);
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      "NO",
      "TOKO",
      "LOKASI_POS",
      "ACTIVE",
      "BCA_CREDIT", "BCA_DEBIT", "BCA_TID", "BCA_MID",
      "BNI_CREDIT", "BNI_DEBIT", "BNI_TID", "BNI_MID",
      "MANDIRI_CREDIT", "MANDIRI_DEBIT", "MANDIRI_TID", "MANDIRI_MID",
      "BRI_CREDIT", "BRI_DEBIT", "BRI_TID", "BRI_MID",
    ];

    const rows = filteredEdcList.map((e, idx) => [
      idx + 1,
      `"${e.shop_name}"`,
      `"${e.pos_location}"`,
      `"${e.is_active}"`,
      `"${e.bca_credit || "-"}"`, `"${e.bca_debit || "-"}"`, `"${e.bca_tid || "-"}"`, `"${e.bca_mid || "-"}"`,
      `"${e.bni_credit || "-"}"`, `"${e.bni_debit || "-"}"`, `"${e.bni_tid || "-"}"`, `"${e.bni_mid || "-"}"`,
      `"${e.mandiri_credit || "-"}"`, `"${e.mandiri_debit || "-"}"`, `"${e.mandiri_tid || "-"}"`, `"${e.mandiri_mid || "-"}"`,
      `"${e.bri_credit || "-"}"`, `"${e.bri_debit || "-"}"`, `"${e.bri_tid || "-"}"`, `"${e.bri_mid || "-"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const shopLabel = selectedShop ? selectedShop.replace(/\s+/g, "_") : "SemuaToko";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_Aset_EDC_${shopLabel}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Counts & Filter logic
  const pbCount = edcList.filter((e) => e.shop_name === "Plaza Bali").length;
  const samCount = edcList.filter((e) => e.shop_name === "SAM").length;
  
  const t3Total = edcList.filter((e) => parsePosLocation(e.pos_location, e.shop_name).terminal === "Terminal 3").length;
  const t2Total = edcList.filter((e) => parsePosLocation(e.pos_location, e.shop_name).terminal === "Terminal 2").length;
  const activeCount = edcList.filter((e) => e.is_active === "Y").length;
  const inactiveCount = edcList.filter((e) => e.is_active === "N").length;

  const bcaTidCount = edcList.filter((e) => e.bca_tid && e.bca_tid !== "-").length;
  const mandiriTidCount = edcList.filter((e) => e.mandiri_tid && e.mandiri_tid !== "-").length;
  const briTidCount = edcList.filter((e) => e.bri_tid && e.bri_tid !== "-").length;
  const bniTidCount = edcList.filter((e) => e.bni_tid && e.bni_tid !== "-").length;

  // Filtered List based on client-side terminal & bank filter
  const filteredEdcList = useMemo(() => {
    return edcList.filter((item) => {
      const { terminal } = parsePosLocation(item.pos_location, item.shop_name);
      if (selectedTerminal && terminal !== selectedTerminal) return false;
      if (selectedBank) {
        if (selectedBank === "BCA" && (!item.bca_tid || item.bca_tid === "-")) return false;
        if (selectedBank === "MANDIRI" && (!item.mandiri_tid || item.mandiri_tid === "-")) return false;
        if (selectedBank === "BRI" && (!item.bri_tid || item.bri_tid === "-")) return false;
        if (selectedBank === "BNI" && (!item.bni_tid || item.bni_tid === "-")) return false;
      }
      return true;
    });
  }, [edcList, selectedTerminal, selectedBank]);

  // Dropdown Options
  const shopOptions: DropdownOption[] = useMemo(() => [
    ...(isMIS ? [{ value: "", label: "Semua Toko (PB & SAM)", badge: `${edcList.length} POS`, dot: "bg-slate-400" }] : []),
    { value: "Plaza Bali", label: "Toko Plaza Bali", badge: `${pbCount || 33} POS`, dot: "bg-[#006622]" },
    { value: "SAM", label: "Toko SAM", badge: `${samCount || 20} POS`, dot: "bg-blue-500" },
  ], [isMIS, edcList.length, pbCount, samCount]);

  const terminalOptions: DropdownOption[] = useMemo(() => [
    { value: "", label: "Semua Terminal / Lokasi", badge: `${edcList.length} POS`, dot: "bg-slate-400" },
    { value: "Terminal 3", label: "Terminal 3 Soekarno-Hatta", badge: `${t3Total || 33} POS`, dot: "bg-emerald-500" },
    { value: "Terminal 2", label: "Terminal 2 Soekarno-Hatta", badge: `${t2Total || 20} POS`, dot: "bg-blue-500" },
  ], [edcList.length, t3Total, t2Total]);

  const zoneOptions: DropdownOption[] = useMemo(() => [
    { value: "", label: "Semua Zona Counter POS", dot: "bg-slate-300" },
    { value: "DFA02", label: "DFA02 — Toko Jada 2", badge: "2 titik", dot: "bg-teal-500", group: "Plaza Bali · Terminal 3" },
    { value: "DFD01", label: "DFD01 — Toko DF1", badge: "5 titik", dot: "bg-emerald-500", group: "Plaza Bali · Terminal 3" },
    { value: "DFD02", label: "DFD02 — Toko DF2", badge: "6 titik", dot: "bg-emerald-500", group: "Plaza Bali · Terminal 3" },
    { value: "DFD03", label: "DFD03 — Toko DF3", badge: "9 titik", dot: "bg-emerald-500", group: "Plaza Bali · Terminal 3" },
    { value: "DFD04", label: "DFD04 — Toko DF4", badge: "7 titik", dot: "bg-emerald-500", group: "Plaza Bali · Terminal 3" },
    { value: "DFD05", label: "DFD05 — Toko DF5", badge: "2 titik", dot: "bg-emerald-500", group: "Plaza Bali · Terminal 3" },
    { value: "DFD06", label: "DFD06 — Toko DF6", badge: "3 titik", dot: "bg-emerald-500", group: "Plaza Bali · Terminal 3" },
    { value: "DFD07", label: "DFD07 — Toko DF7", badge: "2 titik", dot: "bg-emerald-500", group: "Plaza Bali · Terminal 3" },
    { value: "GGO01", label: "GGO01 — Garuda Go 1", badge: "multi", dot: "bg-amber-500", group: "SAM · Terminal 3" },
    { value: "MMH01", label: "MMH01 — Merpati", badge: "multi", dot: "bg-orange-500", group: "SAM · Terminal 3" },
    { value: "BBV01", label: "BBV01 — Bebas Bea", badge: "multi", dot: "bg-indigo-500", group: "SAM · Terminal 2" },
    { value: "SSR01", label: "SSR01 — Self Service", badge: "multi", dot: "bg-blue-500", group: "SAM · Terminal 2" },
    { value: "OLR01", label: "OLR01 — Online Retail", badge: "multi", dot: "bg-blue-400", group: "SAM · Terminal 2" },
    { value: "EAD01", label: "EAD01 — Eatery & Drink", badge: "multi", dot: "bg-purple-500", group: "SAM · Terminal 2" },
    { value: "WSD01", label: "WSD01 — Wholesale DF", badge: "multi", dot: "bg-rose-500", group: "SAM · Terminal 2" },
  ], []);

  const activeOptions: DropdownOption[] = useMemo(() => [
    { value: "", label: "Semua Status Operasional", dot: "bg-slate-300" },
    { value: "Y", label: "Aktif (Y) — Siap Transaksi", badge: `${activeCount} POS`, dot: "bg-emerald-500" },
    { value: "N", label: "Non-Aktif (N) — Standby / Off", badge: `${inactiveCount} POS`, dot: "bg-rose-500" },
  ], [activeCount, inactiveCount]);

  const bankOptions: DropdownOption[] = useMemo(() => [
    { value: "", label: "Semua Bank Mitra", dot: "bg-slate-300" },
    { value: "BCA", label: "EDC Bank BCA", badge: `${bcaTidCount} unit`, dot: "bg-blue-600" },
    { value: "MANDIRI", label: "EDC Bank Mandiri", badge: `${mandiriTidCount} unit`, dot: "bg-amber-600" },
    { value: "BRI", label: "EDC Bank BRI", badge: `${briTidCount} unit`, dot: "bg-sky-600" },
    { value: "BNI", label: "EDC Bank BNI", badge: `${bniTidCount} unit`, dot: "bg-orange-600" },
  ], [bcaTidCount, mandiriTidCount, briTidCount, bniTidCount]);

  // Helper untuk mengekstrak daftar Bank, TID, dan MID terpasang pada satu titik POS
  interface BankEntry {
    bank: "BCA" | "Mandiri" | "BRI" | "BNI";
    tid: string;
    mid: string;
  }

  const getInstalledBanks = (item: EdcAsset): BankEntry[] => {
    const list: BankEntry[] = [];
    if (item.bca_tid && item.bca_tid.trim() !== "" && item.bca_tid !== "-") {
      list.push({
        bank: "BCA",
        tid: item.bca_tid,
        mid: item.bca_mid && item.bca_mid !== "-" ? item.bca_mid : "-",
      });
    }
    if (item.bri_tid && item.bri_tid.trim() !== "" && item.bri_tid !== "-") {
      list.push({
        bank: "BRI",
        tid: item.bri_tid,
        mid: item.bri_mid && item.bri_mid !== "-" ? item.bri_mid : "-",
      });
    }
    if (item.mandiri_tid && item.mandiri_tid.trim() !== "" && item.mandiri_tid !== "-") {
      list.push({
        bank: "Mandiri",
        tid: item.mandiri_tid,
        mid: item.mandiri_mid && item.mandiri_mid !== "-" ? item.mandiri_mid : "-",
      });
    }
    if (item.bni_tid && item.bni_tid.trim() !== "" && item.bni_tid !== "-") {
      list.push({
        bank: "BNI",
        tid: item.bni_tid,
        mid: item.bni_mid && item.bni_mid !== "-" ? item.bni_mid : "-",
      });
    }
    return list;
  };

  const getBankBadgeClass = (bank: string): string => {
    switch (bank) {
      case "BCA":
        return "bg-blue-600 text-white font-black";
      case "BRI":
        return "bg-sky-700 text-white font-black";
      case "Mandiri":
        return "bg-amber-600 text-white font-black";
      case "BNI":
        return "bg-orange-600 text-white font-black";
      default:
        return "bg-slate-700 text-white font-black";
    }
  };

  const renderFeatureBadge = (val?: string) => {
    if (val === "OK") {
      return (
        <span className="inline-block px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-extrabold text-[9px] border border-emerald-200/80 shadow-2xs">
          OK
        </span>
      );
    }
    return <span className="text-slate-300 font-mono text-xs select-none">-</span>;
  };

  const renderCodeCell = (
    code: string | undefined,
    type: "tid" | "mid",
    edcId: number | undefined,
    bank: string
  ) => {
    if (!code || code === "-" || code.trim() === "") {
      return <span className="text-slate-300 font-mono text-xs select-none">-</span>;
    }
    const key = `${type}-${edcId}-${bank}`;
    const isCopied = copiedKey === key;

    return (
      <div className="flex items-center justify-between gap-1 px-1.5 py-0.5 bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-slate-300 rounded text-[10px] font-mono shadow-2xs transition-colors">
        <span className={type === "tid" ? "font-black text-slate-900 tracking-tight" : "font-semibold text-slate-700"}>
          {code}
        </span>
        <button
          type="button"
          onClick={() => copyToClipboard(code, key)}
          title={`Salin ${type.toUpperCase()} ${bank}`}
          className="text-slate-400 hover:text-[#006622] p-0.5 rounded transition-colors"
        >
          {isCopied ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
        </button>
      </div>
    );
  };

  // Helper pengelompokan DF (Duty Free / Counter Zone)
  interface DfGroup {
    key: string;
    tabLabel: string;
    title: string;
    subtitle: string;
    terminal: string;
    shop: string;
    badgeColor: string;
    tagColor: string;
    items: EdcAsset[];
  }

  const getDfInfo = (item: EdcAsset) => {
    const parsed = parsePosLocation(item.pos_location, item.shop_name);
    const zone = parsed.zone;
    const terminal = parsed.terminal;
    const shop = item.shop_name;

    if (zone === "DFD01") {
      return {
        key: "DF1",
        tabLabel: "DF1",
        title: "TOKO DF1 (DFD01)",
        subtitle: "Plaza Bali • Terminal 3 Bandara Soekarno-Hatta",
        terminal: "Terminal 3",
        shop: "Plaza Bali",
        badgeColor: "from-emerald-600 to-[#006622]",
        tagColor: "bg-emerald-50 text-[#006622] border-emerald-200",
      };
    }
    if (zone === "DFD02") {
      return {
        key: "DF2",
        tabLabel: "DF2",
        title: "TOKO DF2 (DFD02)",
        subtitle: "Plaza Bali • Terminal 3 Bandara Soekarno-Hatta",
        terminal: "Terminal 3",
        shop: "Plaza Bali",
        badgeColor: "from-emerald-600 to-[#006622]",
        tagColor: "bg-emerald-50 text-[#006622] border-emerald-200",
      };
    }
    if (zone === "DFD03") {
      return {
        key: "DF3",
        tabLabel: "DF3",
        title: "TOKO DF3 (DFD03)",
        subtitle: "Plaza Bali • Terminal 3 Bandara Soekarno-Hatta",
        terminal: "Terminal 3",
        shop: "Plaza Bali",
        badgeColor: "from-emerald-600 to-[#006622]",
        tagColor: "bg-emerald-50 text-[#006622] border-emerald-200",
      };
    }
    if (zone === "DFD04") {
      return {
        key: "DF4",
        tabLabel: "DF4",
        title: "TOKO DF4 (DFD04)",
        subtitle: "Plaza Bali • Terminal 3 Bandara Soekarno-Hatta",
        terminal: "Terminal 3",
        shop: "Plaza Bali",
        badgeColor: "from-emerald-600 to-[#006622]",
        tagColor: "bg-emerald-50 text-[#006622] border-emerald-200",
      };
    }
    if (zone === "DFD05") {
      return {
        key: "DF5",
        tabLabel: "DF5",
        title: "TOKO DF5 (DFD05)",
        subtitle: "Plaza Bali • Terminal 3 Bandara Soekarno-Hatta",
        terminal: "Terminal 3",
        shop: "Plaza Bali",
        badgeColor: "from-emerald-600 to-[#006622]",
        tagColor: "bg-emerald-50 text-[#006622] border-emerald-200",
      };
    }
    if (zone === "DFD06") {
      return {
        key: "DF6",
        tabLabel: "DF6",
        title: "TOKO DF6 (DFD06)",
        subtitle: "Plaza Bali • Terminal 3 Bandara Soekarno-Hatta",
        terminal: "Terminal 3",
        shop: "Plaza Bali",
        badgeColor: "from-emerald-600 to-[#006622]",
        tagColor: "bg-emerald-50 text-[#006622] border-emerald-200",
      };
    }
    if (zone === "DFD07") {
      return {
        key: "DF7",
        tabLabel: "DF7",
        title: "TOKO DF7 (DFD07)",
        subtitle: "Plaza Bali • Terminal 3 Bandara Soekarno-Hatta",
        terminal: "Terminal 3",
        shop: "Plaza Bali",
        badgeColor: "from-emerald-600 to-[#006622]",
        tagColor: "bg-emerald-50 text-[#006622] border-emerald-200",
      };
    }
    if (zone === "DFA02") {
      return {
        key: "JADA2",
        tabLabel: "Jada 2 (DFA02)",
        title: "TOKO JADA 2 (DFA02)",
        subtitle: "Plaza Bali • Terminal 3 Bandara Soekarno-Hatta",
        terminal: "Terminal 3",
        shop: "Plaza Bali",
        badgeColor: "from-teal-600 to-emerald-700",
        tagColor: "bg-teal-50 text-teal-800 border-teal-200",
      };
    }
    if (
      shop === "SAM" ||
      zone.startsWith("GGO") ||
      zone.startsWith("MMH") ||
      zone.startsWith("BBV") ||
      zone.startsWith("SSR") ||
      zone.startsWith("OLR") ||
      zone.startsWith("EAD") ||
      zone.startsWith("WSD") ||
      zone.startsWith("DDD")
    ) {
      if (terminal === "Terminal 3") {
        return {
          key: "SAM_T3",
          tabLabel: "SAM T3",
          title: "TOKO SAM TERMINAL 3",
          subtitle: "SAM • Terminal 3 Bandara Soekarno-Hatta (Garuda Go / Merpati)",
          terminal: "Terminal 3",
          shop: "SAM",
          badgeColor: "from-indigo-600 to-blue-700",
          tagColor: "bg-indigo-50 text-indigo-800 border-indigo-200",
        };
      } else {
        return {
          key: "SAM_T2",
          tabLabel: "SAM T2",
          title: "TOKO SAM TERMINAL 2",
          subtitle: "SAM • Terminal 2 Bandara Soekarno-Hatta (BBV, SSR, OLR, EAD, WSD)",
          terminal: "Terminal 2",
          shop: "SAM",
          badgeColor: "from-blue-600 to-sky-700",
          tagColor: "bg-blue-50 text-blue-800 border-blue-200",
        };
      }
    }

    return {
      key: "OTHER",
      tabLabel: "Lainnya",
      title: `AREA TOKO ${zone || "LAINNYA"}`,
      subtitle: `${shop} • ${terminal}`,
      terminal: terminal,
      shop: shop,
      badgeColor: "from-slate-600 to-slate-800",
      tagColor: "bg-slate-100 text-slate-800 border-slate-200",
    };
  };

  // Mengelompokkan seluruh data berdasarkan DF
  const groupedDfList = useMemo(() => {
    const groupsMap = new Map<string, DfGroup>();
    const order = ["DF1", "DF2", "DF3", "DF4", "DF5", "DF6", "DF7", "JADA2", "SAM_T3", "SAM_T2", "OTHER"];

    filteredEdcList.forEach((item) => {
      const info = getDfInfo(item);
      if (!groupsMap.has(info.key)) {
        groupsMap.set(info.key, {
          key: info.key,
          tabLabel: info.tabLabel,
          title: info.title,
          subtitle: info.subtitle,
          terminal: info.terminal,
          shop: info.shop,
          badgeColor: info.badgeColor,
          tagColor: info.tagColor,
          items: [],
        });
      }
      groupsMap.get(info.key)!.items.push(item);
    });

    const result: DfGroup[] = [];
    order.forEach((k) => {
      if (groupsMap.has(k)) {
        result.push(groupsMap.get(k)!);
      }
    });

    groupsMap.forEach((v, k) => {
      if (!order.includes(k)) {
        result.push(v);
      }
    });

    return result;
  }, [filteredEdcList]);

  // DF Groups yang sedang aktif difilter oleh Tab DF
  const displayedDfGroups = useMemo(() => {
    if (selectedDfTab === "ALL") return groupedDfList;
    return groupedDfList.filter((g) => g.key === selectedDfTab);
  }, [groupedDfList, selectedDfTab]);

  return (
    <SidebarLayout onOpenScanner={() => setIsScannerOpen(true)}>
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-2.5 sm:px-4 py-5 space-y-4">
        {/* Tab Navigation Switcher & Clean Top Actions (Sama persis dengan Kasir POS) */}
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
              <CreditCard className="w-4 h-4" />
              <span>Perangkat Mesin EDC Kasir ({edcList.length} Titik)</span>
            </button>
            <button
              onClick={() => setActiveTab("recap")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "recap"
                  ? "bg-[#006622] text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Rekapitulasi Bank Mitra & MID</span>
            </button>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
            {(isAdmin || isMIS) && (
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#006622] hover:bg-[#00551c] text-white text-xs font-semibold rounded-lg shadow-2xs active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah POS EDC</span>
              </button>
            )}
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-lg text-[11px] font-semibold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-[#006622]"></span>
              <span>{isMIS ? "MIS OPS (Semua Toko)" : userShopLocation}</span>
            </div>
          </div>
        </div>

        {/* 4 Kartu Metrik KPI Modern yang Ramping & Elegan */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Terminal 3 */}
          <div
            onClick={() => setSelectedTerminal(selectedTerminal === "Terminal 3" ? "" : "Terminal 3")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-sm ${
              selectedTerminal === "Terminal 3"
                ? "bg-emerald-50/70 border-[#006622] ring-2 ring-[#006622]/20"
                : "bg-white border-slate-200/90 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span className="uppercase tracking-wider text-[11px] font-bold text-slate-700">Terminal 3 CGK</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#006622] flex items-center justify-center">
                <Store className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {t3Total || 38} <span className="text-xs font-normal text-slate-400">POS EDC</span>
            </div>
            <div className="text-[10.5px] text-slate-500 mt-1.5 font-medium flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[#006622] bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded">
                33 Plaza Bali
              </span>
              <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.2 rounded">
                5 SAM T3
              </span>
            </div>
          </div>

          {/* Card 2: Terminal 2 */}
          <div
            onClick={() => setSelectedTerminal(selectedTerminal === "Terminal 2" ? "" : "Terminal 2")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-sm ${
              selectedTerminal === "Terminal 2"
                ? "bg-blue-50/70 border-blue-600 ring-2 ring-blue-600/20"
                : "bg-white border-slate-200/90 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span className="uppercase tracking-wider text-[11px] font-bold text-slate-700">Terminal 2 CGK</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {t2Total || 15} <span className="text-xs font-normal text-slate-400">POS EDC</span>
            </div>
            <div className="text-[10.5px] text-slate-500 mt-1.5 font-medium flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded">
                Area Toko SAM T2 & Plaza Bali
              </span>
            </div>
          </div>

          {/* Card 3: Bank Support */}
          <div
            onClick={() => setSelectedActive(selectedActive === "Y" ? "" : "Y")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-sm ${
              selectedActive === "Y"
                ? "bg-emerald-50/60 border-emerald-600 ring-2 ring-emerald-600/20"
                : "bg-white border-slate-200/90 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span className="uppercase tracking-wider text-[11px] font-bold text-slate-700">Status Operasional</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700 tracking-tight">
              {activeCount} <span className="text-xs font-normal text-slate-400">Aktif ({inactiveCount} Standby)</span>
            </div>
            <div className="flex items-center gap-1 mt-1.5 flex-wrap text-[10px]">
              <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-extrabold border border-blue-200/80">
                BCA: {bcaTidCount}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 font-extrabold border border-sky-200/80">
                BRI: {briTidCount}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-extrabold border border-amber-200/80">
                MDR: {mandiriTidCount}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-orange-50 text-orange-700 font-extrabold border border-orange-200/80">
                BNI: {bniTidCount}
              </span>
            </div>
          </div>

          {/* Card 4: Total Titik POS */}
          <div
            onClick={() => {
              setSelectedTerminal("");
              setSelectedShop(isMIS ? "" : userShopLocation);
              setSelectedActive("");
              setSelectedZone("");
              setSelectedBank("");
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-sm ${
              selectedTerminal === "" && selectedBank === "" && selectedActive === ""
                ? "bg-slate-50/90 border-slate-400 ring-2 ring-slate-400/20"
                : "bg-white border-slate-200/90 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span className="uppercase tracking-wider text-[11px] font-bold text-slate-700">Total Semua EDC POS</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {edcList.length} <span className="text-xs font-normal text-slate-400">Titik Kasir</span>
            </div>
            <div className="text-[10.5px] text-slate-500 mt-1.5 font-medium flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[#006622] bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded">
                {pbCount} Plaza Bali
              </span>
              <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.2 rounded">
                {samCount} Toko SAM
              </span>
            </div>
          </div>
        </div>

        {/* Tab 1: MASTER TABEL EDC POS */}
        {activeTab === "pos" && (
          <>
            {/* Filter and Search Bar (Sama persis dengan Kasir POS) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari POS, TID BCA, BRI, MID..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                {/* 1. Shop Filter */}
                <CustomDropdown
                  value={selectedShop}
                  onChange={setSelectedShop}
                  options={shopOptions}
                  placeholder="Semua Toko"
                  icon={<Store className="w-3.5 h-3.5" />}
                  disabled={!isMIS}
                />

                {/* 2. Terminal Filter */}
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
                  placeholder="Semua Zona Counter POS"
                  icon={<Layers className="w-3.5 h-3.5" />}
                  dropdownWidth="w-80"
                  clearable
                />

                {/* 4. Bank Filter */}
                <CustomDropdown
                  value={selectedBank}
                  onChange={setSelectedBank}
                  options={bankOptions}
                  placeholder="Semua Bank Mitra"
                  icon={<CreditCard className="w-3.5 h-3.5" />}
                  clearable
                />
              </div>
            </div>

            {/* Quick DF Segmented Filter & Controls Bar */}
            <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedDfTab("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    selectedDfTab === "ALL"
                      ? "bg-[#006622] text-white shadow-sm ring-1 ring-[#006622]/30"
                      : "bg-white/90 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-200/60"
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Semua DF</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      selectedDfTab === "ALL" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {filteredEdcList.length}
                  </span>
                </button>
                {groupedDfList.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setSelectedDfTab(g.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      selectedDfTab === g.key
                        ? "bg-[#006622] text-white shadow-sm ring-1 ring-[#006622]/30"
                        : "bg-white/90 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-200/60"
                    }`}
                  >
                    <span>{g.tabLabel}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        selectedDfTab === g.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {g.items.length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Expand / Collapse All Switcher */}
              <div className="flex items-center gap-1 self-end md:self-auto flex-shrink-0 px-1">
                <button
                  type="button"
                  onClick={() => setCollapsedDfs({})}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-[#006622] hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200/80"
                >
                  Buka Semua
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => {
                    const allCol: Record<string, boolean> = {};
                    groupedDfList.forEach((g) => (allCol[g.key] = true));
                    setCollapsedDfs(allCol);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-[#006622] hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200/80"
                >
                  Ciutkan Semua
                </button>
              </div>
            </div>

            {/* Content: Loading / Empty / DF Grouped Cards */}
            {isLoading ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm py-16 text-center text-xs text-slate-400">
                Memuat data mesin EDC Bank...
              </div>
            ) : filteredEdcList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <CreditCard className="w-8 h-8 text-slate-300" />
                <span>Tidak ada data EDC yang cocok dengan filter pencarian.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedDfGroups.map((group) => {
                  const isCollapsed = !!collapsedDfs[group.key];
                  const firstPos = group.items[0]?.pos_location || "";
                  const lastPos = group.items[group.items.length - 1]?.pos_location || "";
                  const rangeLabel = group.items.length > 1 ? `${firstPos} s/d ${lastPos}` : firstPos;

                  const totalBca = group.items.filter((i) => i.bca_tid && i.bca_tid !== "-").length;
                  const totalBri = group.items.filter((i) => i.bri_tid && i.bri_tid !== "-").length;
                  const totalMandiri = group.items.filter((i) => i.mandiri_tid && i.mandiri_tid !== "-").length;
                  const totalBni = group.items.filter((i) => i.bni_tid && i.bni_tid !== "-").length;

                  return (
                    <div
                      key={group.key}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all overflow-hidden"
                    >
                      {/* DF Card Header (Clickable Accordion) */}
                      <div
                        onClick={() => toggleDfCollapse(group.key)}
                        className="px-4 py-3 bg-gradient-to-r from-slate-50/90 via-slate-50/60 to-white border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer select-none hover:bg-slate-100/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${group.badgeColor} text-white flex items-center justify-center font-black text-xs shadow-2xs`}
                          >
                            {group.key.startsWith("DF") ? group.key : group.key.slice(0, 3)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                                {group.title}
                              </h3>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${group.tagColor}`}>
                                {group.shop}
                              </span>
                              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Online Aktif
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5">
                              <span>{group.subtitle}</span>
                              <span>•</span>
                              <span className="font-mono text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-200/70 text-[10.5px]">
                                Rentang: {rangeLabel}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Summary Badges for this DF & Chevron Toggle */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#006622] font-black text-[11px] border border-emerald-200/80">
                              {group.items.length} Titik Kasir
                            </span>
                            {totalBca > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[10.5px] border border-blue-200/80">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                {totalBca} BCA
                              </span>
                            )}
                            {totalBri > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 text-sky-700 font-bold text-[10.5px] border border-sky-200/80">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                                {totalBri} BRI
                              </span>
                            )}
                            {totalMandiri > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold text-[10.5px] border border-amber-200/80">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                {totalMandiri} Mandiri
                              </span>
                            )}
                            {totalBni > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 text-orange-700 font-bold text-[10.5px] border border-orange-200/80">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                {totalBni} BNI
                              </span>
                            )}

                            {/* Tombol Cepat: Uji Ping Seluruh EDC BRI di DF ini */}
                            {totalBri > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePingBriGroup(group.key, group.items);
                                }}
                                disabled={isPingingGroup[group.key]}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[10.5px] font-bold shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                title="Uji koneksi ping seluruh EDC BRI pada kelompok ini"
                              >
                                <RefreshCw className={`w-3 h-3 ${isPingingGroup[group.key] ? "animate-spin text-sky-700" : ""}`} />
                                <span>{isPingingGroup[group.key] ? "Pinging..." : "Tes Ping Semua BRI"}</span>
                              </button>
                            )}
                          </div>

                          <div className="p-1 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-700">
                            {isCollapsed ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronUp className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Master Multi-Bank Matrix Table (BCA, BNI, MANDIRI, BRI) - Tanpa Garis Kaku (Modern Clean) */}
                      {!isCollapsed && (
                        <div className="w-full overflow-x-auto">
                          <table className="w-full text-left text-[10px] min-w-[1540px]">
                            <thead>
                              {/* Tier 1 Header */}
                              <tr className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                                <th
                                  rowSpan={2}
                                  className="px-2.5 py-2.5 text-center bg-slate-100/90 text-slate-700 font-extrabold w-12 border-b border-slate-200"
                                >
                                  NO
                                </th>
                                <th
                                  rowSpan={2}
                                  className="px-3 py-2.5 text-left bg-slate-100/90 text-slate-700 font-extrabold w-44 border-b border-slate-200"
                                >
                                  LOKASI-POS
                                </th>
                                <th
                                  rowSpan={2}
                                  className="px-2 py-2.5 text-center bg-slate-100/90 text-slate-700 font-extrabold w-16 border-b border-slate-200"
                                >
                                  ACTIVE
                                </th>

                                {/* MESIN EDC BCA */}
                                <th
                                  colSpan={5}
                                  className="px-3 py-2 text-center bg-blue-600 text-white font-black shadow-2xs rounded-t-lg border-b border-blue-700"
                                >
                                  MESIN EDC BCA
                                </th>

                                {/* MESIN EDC BNI */}
                                <th
                                  colSpan={5}
                                  className="px-3 py-2 text-center bg-orange-600 text-white font-black shadow-2xs rounded-t-lg border-b border-orange-700"
                                >
                                  MESIN EDC BNI
                                </th>

                                {/* MESIN EDC MANDIRI */}
                                <th
                                  colSpan={5}
                                  className="px-3 py-2 text-center bg-amber-600 text-white font-black shadow-2xs rounded-t-lg border-b border-amber-700"
                                >
                                  MESIN EDC MANDIRI
                                </th>

                                {/* MESIN EDC BRI (Now with ONLINE column -> colSpan 6) */}
                                <th
                                  colSpan={6}
                                  className="px-3 py-2 text-center bg-sky-700 text-white font-black shadow-2xs rounded-t-lg border-b border-sky-800"
                                >
                                  MESIN EDC BRI
                                </th>

                                <th
                                  rowSpan={2}
                                  className="px-2 py-2.5 text-center text-slate-700 bg-slate-100/90 font-extrabold border-b border-slate-200 w-24"
                                >
                                  AKSI
                                </th>
                              </tr>

                              {/* Tier 2 Sub-Columns Header - Clean tanpa garis vertikal kaku */}
                              <tr className="text-[9.5px] font-extrabold uppercase border-b border-slate-200">
                                {/* BCA */}
                                <th className="px-1 py-1.5 text-center bg-blue-50/70 text-blue-900 w-12">CREDIT</th>
                                <th className="px-1 py-1.5 text-center bg-blue-50/70 text-blue-900 w-12">DEBIT</th>
                                <th className="px-1 py-1.5 text-center bg-blue-50/70 text-blue-900 w-10">QR</th>
                                <th className="px-2 py-1.5 text-center bg-blue-100/50 text-blue-950 font-black w-28">TID</th>
                                <th className="px-2 py-1.5 text-center bg-blue-100/50 text-blue-950 font-black w-32">MID</th>

                                {/* BNI */}
                                <th className="px-1 py-1.5 text-center bg-orange-50/70 text-orange-900 w-12">CREDIT</th>
                                <th className="px-1 py-1.5 text-center bg-orange-50/70 text-orange-900 w-12">DEBIT</th>
                                <th className="px-1 py-1.5 text-center bg-orange-50/70 text-orange-900 w-10">QR</th>
                                <th className="px-2 py-1.5 text-center bg-orange-100/50 text-orange-950 font-black w-28">TID</th>
                                <th className="px-2 py-1.5 text-center bg-orange-100/50 text-orange-950 font-black w-32">MID</th>

                                {/* MANDIRI */}
                                <th className="px-1 py-1.5 text-center bg-amber-50/70 text-amber-900 w-12">CREDIT</th>
                                <th className="px-1 py-1.5 text-center bg-amber-50/70 text-amber-900 w-12">DEBIT</th>
                                <th className="px-1 py-1.5 text-center bg-amber-50/70 text-amber-900 w-10">QR</th>
                                <th className="px-2 py-1.5 text-center bg-amber-100/50 text-amber-950 font-black w-28">TID</th>
                                <th className="px-2 py-1.5 text-center bg-amber-100/50 text-amber-950 font-black w-32">MID</th>

                                {/* BRI (Kolom ONLINE sebagai sub-kolom pertama) */}
                                <th className="px-2 py-1.5 text-center bg-sky-100/70 text-sky-950 font-black w-28">ONLINE</th>
                                <th className="px-1 py-1.5 text-center bg-sky-50/70 text-sky-900 w-12">CREDIT</th>
                                <th className="px-1 py-1.5 text-center bg-sky-50/70 text-sky-900 w-12">DEBIT</th>
                                <th className="px-1 py-1.5 text-center bg-sky-50/70 text-sky-900 w-10">QR</th>
                                <th className="px-2 py-1.5 text-center bg-sky-100/50 text-sky-950 font-black w-28">TID</th>
                                <th className="px-2 py-1.5 text-center bg-sky-100/50 text-sky-950 font-black w-32">MID</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {group.items.map((edc, idx) => {
                                const globalIdx = filteredEdcList.indexOf(edc) + 1;
                                const briIp = getBriEdcIp(edc.pos_location);
                                const briPing = briPingState[briIp];

                                return (
                                  <tr
                                    key={edc.id || idx}
                                    className="hover:bg-slate-50/90 transition-colors border-b border-slate-100/80"
                                  >
                                    {/* 1. NO */}
                                    <td className="px-2 py-2 text-center font-mono text-slate-400 font-semibold text-xs">
                                      {globalIdx}
                                    </td>

                                    {/* 2. LOKASI-POS */}
                                    <td className="px-3 py-2 whitespace-nowrap">
                                      <div className="flex items-center gap-1.5">
                                        {/* Titik Hijau Kedap-kedip untuk Terhubung, Merah untuk Mati */}
                                        {edc.is_active === "Y" ? (
                                          <span
                                            className="relative flex h-2 w-2 shrink-0"
                                            title="Status: Terhubung (Online / Aktif)"
                                          >
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
                                          </span>
                                        ) : (
                                          <span
                                            className="relative flex h-2 w-2 shrink-0"
                                            title="Status: Mati (Non-Aktif / Terputus)"
                                          >
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 shadow-xs shadow-rose-600/50"></span>
                                          </span>
                                        )}
                                        <span className="font-mono font-black text-slate-900 text-xs tracking-tight">
                                          {edc.pos_location}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => copyToClipboard(edc.pos_location, `pos-${edc.id}`)}
                                          title="Salin Kode POS"
                                          className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                                        >
                                          {copiedKey === `pos-${edc.id}` ? (
                                            <Check className="w-3 h-3 text-emerald-600" />
                                          ) : (
                                            <Copy className="w-3 h-3" />
                                          )}
                                        </button>
                                      </div>
                                      <div className="mt-0.5 flex items-center gap-1">
                                        <span
                                          className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                            edc.shop_name === "SAM"
                                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                              : "bg-emerald-50 text-[#006622] border border-emerald-200"
                                          }`}
                                        >
                                          {edc.shop_name}
                                        </span>
                                      </div>
                                    </td>

                                    {/* 3. ACTIVE */}
                                    <td className="px-2 py-2 text-center">
                                      <span
                                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9.5px] font-black ${
                                          edc.is_active === "Y"
                                            ? "bg-emerald-50 text-[#006622] border border-emerald-200"
                                            : "bg-slate-100 text-slate-400 border border-slate-200"
                                        }`}
                                      >
                                        {edc.is_active || "Y"}
                                      </span>
                                    </td>

                                    {/* 4. MESIN EDC BCA - Bersih tanpa garis vertikal kaku */}
                                    <td className="px-1 py-2 text-center">{renderFeatureBadge(edc.bca_credit)}</td>
                                    <td className="px-1 py-2 text-center">{renderFeatureBadge(edc.bca_debit)}</td>
                                    <td className="px-1 py-2 text-center">{renderFeatureBadge(edc.bca_qr)}</td>
                                    <td className="px-1.5 py-2">{renderCodeCell(edc.bca_tid, "tid", edc.id, "BCA")}</td>
                                    <td className="px-1.5 py-2">{renderCodeCell(edc.bca_mid, "mid", edc.id, "BCA")}</td>

                                    {/* 5. MESIN EDC BNI */}
                                    <td className="px-1 py-2 text-center">{renderFeatureBadge(edc.bni_credit)}</td>
                                    <td className="px-1 py-2 text-center">{renderFeatureBadge(edc.bni_debit)}</td>
                                    <td className="px-1 py-2 text-center">{renderFeatureBadge(edc.bni_qr)}</td>
                                    <td className="px-1.5 py-2">{renderCodeCell(edc.bni_tid, "tid", edc.id, "BNI")}</td>
                                    <td className="px-1.5 py-2">{renderCodeCell(edc.bni_mid, "mid", edc.id, "BNI")}</td>

                                    {/* 6. MESIN EDC MANDIRI */}
                                    <td className="px-1 py-2 text-center">{renderFeatureBadge(edc.mandiri_credit)}</td>
                                    <td className="px-1 py-2 text-center">{renderFeatureBadge(edc.mandiri_debit)}</td>
                                    <td className="px-1 py-2 text-center">{renderFeatureBadge(edc.mandiri_qr)}</td>
                                    <td className="px-1.5 py-2">{renderCodeCell(edc.mandiri_tid, "tid", edc.id, "MDR")}</td>
                                    <td className="px-1.5 py-2">{renderCodeCell(edc.mandiri_mid, "mid", edc.id, "MDR")}</td>

                                    {/* 7. MESIN EDC BRI (ONLINE PING IP + FITUR + TID + MID) */}
                                    <td className="px-2 py-2 text-center whitespace-nowrap bg-sky-50/20">
                                      <div className="inline-flex flex-col items-center gap-0.5">
                                        {briPing?.status === "TESTING" ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                            <span>Ping...</span>
                                          </span>
                                        ) : briPing?.status === "ONLINE" ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-[#006622] border border-emerald-200 shadow-2xs">
                                            <span className="relative flex h-1.5 w-1.5">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                            </span>
                                            <span>Online {briPing.latency ? `(${briPing.latency}ms)` : ""}</span>
                                          </span>
                                        ) : briPing?.status === "OFFLINE" ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                            <span>Offline</span>
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handlePingBri(edc.pos_location)}
                                            title={`Klik untuk uji live ping ke ${briIp}`}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 transition-all shadow-2xs hover:border-sky-300 active:scale-95 cursor-pointer"
                                          >
                                            <Zap className="w-2.5 h-2.5 fill-sky-600 text-sky-600" />
                                            <span>Tes Ping</span>
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handlePingBri(edc.pos_location)}
                                          title="Klik untuk uji ping ke IP ini"
                                          className="font-mono text-[9px] text-slate-400 hover:text-sky-700 font-semibold cursor-pointer tracking-tight"
                                        >
                                          {briIp}
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-1 py-2 text-center">{renderFeatureBadge(edc.bri_credit)}</td>
                                    <td className="px-1 py-2 text-center">{renderFeatureBadge(edc.bri_debit)}</td>
                                    <td className="px-1 py-2 text-center">{renderFeatureBadge(edc.bri_qr)}</td>
                                    <td className="px-1.5 py-2">{renderCodeCell(edc.bri_tid, "tid", edc.id, "BRI")}</td>
                                    <td className="px-1.5 py-2">{renderCodeCell(edc.bri_mid, "mid", edc.id, "BRI")}</td>

                                    {/* 8. AKSI */}
                                    <td className="px-2 py-2 text-center whitespace-nowrap">
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenSticker(edc)}
                                          title="Cetak Stiker Barcode & QR Label EDC"
                                          className="p-1 rounded-lg text-slate-400 hover:text-[#006622] hover:bg-emerald-50 transition-colors"
                                        >
                                          <Printer className="w-3.5 h-3.5" />
                                        </button>
                                        {(isAdmin || isMIS) && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditModal(edc)}
                                            title="Edit Master TID & MID EDC"
                                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {(isAdmin || isMIS) && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteEdc(edc.id!, edc.pos_location)}
                                            title="Hapus Data EDC POS"
                                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Tab 2: REKAPITULASI BANK MITRA & MERCHANT MID */}
        {activeTab === "recap" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Rekap BCA */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-blue-600 text-white font-mono font-black text-xs">
                      BCA
                    </span>
                    <h3 className="font-bold text-slate-800 text-sm">Bank BCA</h3>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    {bcaTidCount} Titik
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Default MID Merchant:</span>
                    <span className="font-mono font-bold text-slate-900">885000533981</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Fitur Transaksi:</span>
                    <span className="font-semibold text-emerald-700">Debit BCA • Kartu Kredit</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Status Operasional:</span>
                    <span className="font-semibold text-[#006622]">100% Online & Aktif</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Terpasang di seluruh titik kasir Plaza Bali Terminal 3 & SAM.
                </p>
              </div>

              {/* Rekap Mandiri */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-amber-600 text-white font-mono font-black text-xs">
                      MANDIRI
                    </span>
                    <h3 className="font-bold text-slate-800 text-sm">Bank Mandiri</h3>
                  </div>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {mandiriTidCount} Titik
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Default MID Merchant:</span>
                    <span className="font-mono font-bold text-slate-900">80949170</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Fitur Transaksi:</span>
                    <span className="font-semibold text-emerald-700">Debit Mandiri • VISA / Master</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Status Operasional:</span>
                    <span className="font-semibold text-[#006622]">100% Online & Aktif</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Mendukung settlement otomatis harian dan kartu debit non-tunai.
                </p>
              </div>

              {/* Rekap BRI */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-sky-700 text-white font-mono font-black text-xs">
                      BRI
                    </span>
                    <h3 className="font-bold text-slate-800 text-sm">Bank BRI</h3>
                  </div>
                  <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                    {briTidCount} Titik
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Default MID Merchant:</span>
                    <span className="font-mono font-bold text-slate-900">1999258659</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Fitur Transaksi:</span>
                    <span className="font-semibold text-emerald-700">Kartu Debit BRI • GPN • Kredit</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Status Operasional:</span>
                    <span className="font-semibold text-[#006622]">100% Online & Aktif</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Melayani transaksi kartu BRI nasabah domestik & mancanegara.
                </p>
              </div>

              {/* Rekap BNI */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-orange-600 text-white font-mono font-black text-xs">
                      BNI
                    </span>
                    <h3 className="font-bold text-slate-800 text-sm">Bank BNI</h3>
                  </div>
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                    {bniTidCount} Titik
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Default MID Merchant:</span>
                    <span className="font-mono font-bold text-slate-900">Per Counter</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Fitur Transaksi:</span>
                    <span className="font-semibold text-emerald-700">Debit BNI • JCB • Amex</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Status Operasional:</span>
                    <span className="font-semibold text-emerald-600">Titik Tertentu & Standby</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Unit EDC BNI cadangan dan standby khusus counter internasional.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Form Modal (Tambah / Edit EDC POS) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[95vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-[#006622] rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">
                  {editingEdc ? `Edit Master EDC: ${editingEdc.pos_location}` : "Tambah EDC POS Kasir Baru"}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdc} className="p-5 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Lokasi & Toko */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Lokasi / Kode POS <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: CGKT3DFD01-P01"
                    value={formData.pos_location || ""}
                    onChange={(e) => setFormData({ ...formData, pos_location: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Toko / Perusahaan
                  </label>
                  <select
                    value={formData.shop_name || "Plaza Bali"}
                    onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="Plaza Bali">Plaza Bali</option>
                    <option value="SAM">SAM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Status Operasional
                  </label>
                  <select
                    value={formData.is_active || "Y"}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value as "Y" | "N" })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="Y">Aktif (Y) - Digunakan Transaksi</option>
                    <option value="N">Non-Aktif (N) - Standby</option>
                  </select>
                </div>
              </div>

              {/* Bank BCA */}
              <div className="p-3.5 bg-blue-50/40 border border-blue-200/80 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>Mesin EDC Bank BCA</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">TID BCA</label>
                    <input
                      type="text"
                      placeholder="misal: C2IG6748"
                      value={formData.bca_tid || ""}
                      onChange={(e) => setFormData({ ...formData, bca_tid: e.target.value.toUpperCase() })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">MID BCA</label>
                    <input
                      type="text"
                      placeholder="885000533981"
                      value={formData.bca_mid || ""}
                      onChange={(e) => setFormData({ ...formData, bca_mid: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Mandiri */}
              <div className="p-3.5 bg-amber-50/40 border border-amber-200/80 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  <span>Mesin EDC Bank Mandiri</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">TID Mandiri</label>
                    <input
                      type="text"
                      placeholder="misal: 80949170"
                      value={formData.mandiri_tid || ""}
                      onChange={(e) => setFormData({ ...formData, mandiri_tid: e.target.value.toUpperCase() })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">MID Mandiri</label>
                    <input
                      type="text"
                      placeholder="80949170"
                      value={formData.mandiri_mid || ""}
                      onChange={(e) => setFormData({ ...formData, mandiri_mid: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bank BRI */}
              <div className="p-3.5 bg-sky-50/40 border border-sky-200/80 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-sky-900 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                  <span>Mesin EDC Bank BRI</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">TID BRI</label>
                    <input
                      type="text"
                      placeholder="misal: 15101686"
                      value={formData.bri_tid || ""}
                      onChange={(e) => setFormData({ ...formData, bri_tid: e.target.value.toUpperCase() })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">MID BRI</label>
                    <input
                      type="text"
                      placeholder="1999258659"
                      value={formData.bri_mid || ""}
                      onChange={(e) => setFormData({ ...formData, bri_mid: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bank BNI */}
              <div className="p-3.5 bg-orange-50/40 border border-orange-200/80 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-orange-950 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-orange-600"></span>
                  <span>Mesin EDC Bank BNI</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">TID BNI</label>
                    <input
                      type="text"
                      placeholder="misal: 10567259"
                      value={formData.bni_tid || ""}
                      onChange={(e) => setFormData({ ...formData, bni_tid: e.target.value.toUpperCase() })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">MID BNI</label>
                    <input
                      type="text"
                      placeholder="MID BNI"
                      value={formData.bni_mid || ""}
                      onChange={(e) => setFormData({ ...formData, bni_mid: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Catatan posisi kabel LAN / SIM Card EDC..."
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#006622] hover:bg-[#00551c] text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Menyimpan..." : "Simpan Data EDC"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode & QR Label Sticker Generator Modal */}
      {selectedEdcForSticker && (
        <BarcodeGeneratorModal
          isOpen={!!selectedEdcForSticker}
          onClose={() => setSelectedEdcForSticker(null)}
          asset={selectedEdcForSticker}
        />
      )}

      {/* Barcode Scanner Modal */}
      {isScannerOpen && (
        <ScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onSelectAsset={(asset) => {
            setSearchTerm(asset.asset_code);
            setIsScannerOpen(false);
          }}
        />
      )}
    </SidebarLayout>
  );
}

export default function EdcPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-slate-400 text-xs">
          Memuat Mesin EDC Kasir Bank...
        </div>
      }
    >
      <EdcContent />
    </Suspense>
  );
}
