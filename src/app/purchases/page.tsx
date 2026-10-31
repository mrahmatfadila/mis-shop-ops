"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import { PurchaseItem, PurchaseStatus } from "@/types";
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Download,
  Copy,
  Check,
  Edit2,
  Trash2,
  X,
  Save,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  DollarSign,
  Building2,
  Package,
  Layers,
  Sparkles,
  ArrowUpDown,
  Calendar,
  UserCheck,
  TrendingUp,
  Monitor,
  RefreshCw,
  Send,
  CheckSquare,
  Truck,
  ExternalLink,
  Image as ImageIcon,
  Eye,
  Store,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  Tag,
  Info,
  BadgeCheck,
  HelpCircle,
  Link as LinkIcon,
  Zap
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import { getClientCache, setClientCache } from "@/lib/cache";

const CATEGORIES = [
  "Hardware POS",
  "Office PC",
  "CCTV & DVR",
  "Network",
  "Consumable & Ribbon",
  "Periferal & Sparepart",
];

const LOCATIONS = [
  "Plaza Bali (CGK)",
  "Toko SAM (CGK)",
  "Office Terminal 2",
  "Office Terminal 3",
  "Head Office",
  "Warehouse (WHS)",
  "Cabang Surabaya",
];

const STATUS_PIPELINE: {
  value: PurchaseStatus;
  label: string;
  badgeLabel: string;
  step: number;
  bg: string;
  color: string;
  border: string;
  dot: string;
}[] = [
  {
    value: "PENGAJUAN",
    label: "1. Menunggu Approval Manager",
    badgeLabel: "Review Manager",
    step: 1,
    bg: "bg-amber-50",
    color: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  {
    value: "DISETUJUI_MANAGER",
    label: "2. Disetujui (Tunggu CAPEX Proc)",
    badgeLabel: "Siap Buat CAPEX",
    step: 2,
    bg: "bg-blue-50",
    color: "text-blue-800",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  {
    value: "PROSES_ORDER",
    label: "3. Proses Order di Toko",
    badgeLabel: "Sedang Dipesan",
    step: 3,
    bg: "bg-purple-50",
    color: "text-purple-800",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  {
    value: "SUDAH_DATANG",
    label: "4. Barang Tiba di Procurement",
    badgeLabel: "Tiba di Proc",
    step: 4,
    bg: "bg-indigo-50",
    color: "text-indigo-800",
    border: "border-indigo-200",
    dot: "bg-indigo-500",
  },
  {
    value: "SIAP_KIRIM_T3",
    label: "5. Siap Dikirim ke T3 / Toko",
    badgeLabel: "Siap Kirim T3",
    step: 5,
    bg: "bg-cyan-50",
    color: "text-cyan-800",
    border: "border-cyan-200",
    dot: "bg-cyan-500",
  },
  {
    value: "DITERIMA_T3",
    label: "6. Diterima di T3 (Selesai)",
    badgeLabel: "Diterima di T3",
    step: 6,
    bg: "bg-emerald-50",
    color: "text-emerald-800",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    value: "DITOLAK_MANAGER",
    label: "Ditolak / Perlu Revisi",
    badgeLabel: "Ditolak Manager",
    step: 0,
    bg: "bg-rose-50",
    color: "text-rose-800",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
];

interface ItemStepInfo {
  step: number; // 0..6
  label: string;
  shortLabel: string;
  sublabel: string;
  picRole: string;
  nextStepName: string;
  progressPercent: number;
  theme: {
    textColor: string;
    bgColor: string;
    borderColor: string;
    badgeBg: string;
    dotBg: string;
    ringColor: string;
  };
}

function getItemStepInfo(status: PurchaseStatus): ItemStepInfo {
  switch (status) {
    case "PENGAJUAN":
      return {
        step: 1,
        label: "Tahap 1: Pengajuan (Review Manager)",
        shortLabel: "1. Pengajuan Awal",
        sublabel: "Menunggu persetujuan & arahan dari MIS Manager",
        picRole: "MIS Manager",
        nextStepName: "Persetujuan Supervisi & Input CAPEX",
        progressPercent: 17,
        theme: {
          textColor: "text-amber-800",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-300",
          badgeBg: "bg-amber-500",
          dotBg: "bg-amber-500",
          ringColor: "ring-amber-400/30",
        },
      };
    case "DISETUJUI_MANAGER":
      return {
        step: 2,
        label: "Tahap 2: Disetujui (Siap CAPEX & Order)",
        shortLabel: "2. Disetujui Manager",
        sublabel: "Telah disetujui, siap diinput No CAPEX & toko oleh Procurement",
        picRole: "MIS Procurement Support",
        nextStepName: "Pemesanan Barang & Input Link Toko",
        progressPercent: 35,
        theme: {
          textColor: "text-blue-800",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-300",
          badgeBg: "bg-blue-600",
          dotBg: "bg-blue-600",
          ringColor: "ring-blue-400/30",
        },
      };
    case "PROSES_ORDER":
      return {
        step: 3,
        label: "Tahap 3: Proses Pembelian di Toko",
        shortLabel: "3. Sedang Dipesan",
        sublabel: "Barang sudah dipesan ke toko/supplier, menunggu pengiriman fisik",
        picRole: "MIS Procurement & Vendor",
        nextStepName: "Penerimaan & QC di Procurement",
        progressPercent: 52,
        theme: {
          textColor: "text-purple-800",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-300",
          badgeBg: "bg-purple-600",
          dotBg: "bg-purple-600",
          ringColor: "ring-purple-400/30",
        },
      };
    case "SUDAH_DATANG":
      return {
        step: 4,
        label: "Tahap 4: Tiba di Procurement (QC)",
        shortLabel: "4. QC Procurement",
        sublabel: "Fisik barang tiba di procurement, pemeriksaan spesifikasi & packing",
        picRole: "MIS Procurement",
        nextStepName: "Ekspedisi / Pengiriman ke Lokasi",
        progressPercent: 68,
        theme: {
          textColor: "text-indigo-800",
          bgColor: "bg-indigo-50",
          borderColor: "border-indigo-300",
          badgeBg: "bg-indigo-600",
          dotBg: "bg-indigo-600",
          ringColor: "ring-indigo-400/30",
        },
      };
    case "SIAP_KIRIM_T3":
      return {
        step: 5,
        label: "Tahap 5: Dalam Pengiriman ke Lokasi",
        shortLabel: "5. Dalam Pengiriman",
        sublabel: "Barang sedang dibawa kurir/teknisi menuju toko / terminal tujuan",
        picRole: "Kurir / MIS Support Lapangan",
        nextStepName: "Penerimaan Fisik & Pemasangan POS",
        progressPercent: 85,
        theme: {
          textColor: "text-cyan-800",
          bgColor: "bg-cyan-50",
          borderColor: "border-cyan-300",
          badgeBg: "bg-cyan-600",
          dotBg: "bg-cyan-600",
          ringColor: "ring-cyan-400/30",
        },
      };
    case "DITERIMA_T3":
      return {
        step: 6,
        label: "Tahap 6: Diterima di Lokasi & Selesai",
        shortLabel: "6. Selesai Terpasang",
        sublabel: "Barang telah diterima operasional toko & terpasang di POS",
        picRole: "MIS OPS Toko",
        nextStepName: "Selesai (Operasional Penuh)",
        progressPercent: 100,
        theme: {
          textColor: "text-emerald-800",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-300",
          badgeBg: "bg-[#006622]",
          dotBg: "bg-[#006622]",
          ringColor: "ring-emerald-400/30",
        },
      };
    case "DITOLAK_MANAGER":
    default:
      return {
        step: 0,
        label: "Ditolak / Perlu Revisi",
        shortLabel: "Ditolak Manager",
        sublabel: "Pengajuan ditolak oleh Manager, silakan cek catatan revisi",
        picRole: "MIS OPS (Revisi Pengajuan)",
        nextStepName: "Revisi / Pengajuan Ulang",
        progressPercent: 0,
        theme: {
          textColor: "text-rose-800",
          bgColor: "bg-rose-50",
          borderColor: "border-rose-300",
          badgeBg: "bg-rose-600",
          dotBg: "bg-rose-600",
          ringColor: "ring-rose-400/30",
        },
      };
  }
}

function PurchasesContent() {
  const { user, isAdmin, isMIS, isManager, isProcurement } = useAuth();

  if (!isAdmin && !isMIS && !isManager && !isProcurement) {
    return <AccessDenied moduleName="Pengajuan Barang IT & Pengadaan Aset" />;
  }

  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialStatus = searchParams.get("status") || "";

  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [posList, setPosList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [isProcOrderModalOpen, setIsProcOrderModalOpen] = useState(false);
  const [isArrivedModalOpen, setIsArrivedModalOpen] = useState(false);
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [invoicePreviewUrl, setInvoicePreviewUrl] = useState<string | null>(null);

  const [activeItem, setActiveItem] = useState<PurchaseItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form States
  // 1. New Request by MIS OPS
  const [newRequestData, setNewRequestData] = useState({
    item_name: "",
    category: "Hardware POS",
    target_location: "Plaza Bali (CGK)",
    quantity: 1,
    unit: "Unit",
    estimated_price: 0,
    priority: "BIASA",
    notes: "",
    component_type: "Sparepart POS",
    target_pos_code: "-",
  });

  // 2. Manager Approval State
  const [managerDecision, setManagerDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [managerNotes, setManagerNotes] = useState("");

  // 3. Procurement Capex & Order State
  const [procCapexData, setProcCapexData] = useState({
    capex_number: "",
    brand_model: "",
    store_type: "ONLINE_SHOP" as "ONLINE_SHOP" | "TOKO_OFFLINE",
    store_name: "",
    store_link: "",
    item_price: 0,
    total_price: 0,
    arrival_date: "",
    invoice_url: "",
    notes: "",
  });

  // 4. Procurement Arrived State
  const [arrivedData, setArrivedData] = useState({
    arrival_date: new Date().toISOString().split("T")[0],
    serial_number: "",
    notes: "",
  });

  // 5. Procurement Ready to Ship State
  const [shipData, setShipData] = useState({
    shipped_to_t3_date: new Date().toISOString().split("T")[0],
    shipping_courier: "Zaenal Anwar (Teknisi MIS)",
    notes: "",
  });

  // 6. MIS OPS Receive at T3 State
  const [receiveData, setReceiveData] = useState({
    received_by_t3_at: new Date().toISOString().split("T")[0],
    installed_pos_code: "-",
    notes: "",
  });

  // Fetch POS Hardware List for Target Allocation
  const fetchPosList = async () => {
    try {
      const res = await fetch("/api/pos-hardware");
      const json = await res.json();
      if (json.success) {
        setPosList(json.data);
      }
    } catch (e) {
      console.error("Failed to load POS list", e);
    }
  };

  useEffect(() => {
    fetchPosList();
  }, []);

  // Fetch Purchases List
  const fetchPurchases = async () => {
    const cacheKey = `purchases_${search}_${selectedStatus}_${selectedLocation}_${selectedCategory}_${selectedPriority}`;
    const cached = getClientCache<PurchaseItem[]>(cacheKey);
    if (cached) {
      setPurchases(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedStatus) params.append("status", selectedStatus);
      if (selectedLocation) params.append("location", selectedLocation);
      if (selectedCategory) params.append("category", selectedCategory);
      if (selectedPriority) params.append("priority", selectedPriority);

      const res = await fetch(`/api/purchases?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // Map legacy statuses if necessary
        const mapped = json.data.map((item: any) => {
          let status = item.status;
          if (status === "DISETUJUI") status = "DISETUJUI_MANAGER";
          if (status === "PROSES_BELI") status = "PROSES_ORDER";
          if (status === "DITERIMA") status = "DITERIMA_T3";
          return { ...item, status };
        });
        setPurchases(mapped);
        setClientCache(cacheKey, mapped);
      }
    } catch (err) {
      console.error("Failed to load purchases", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [search, selectedStatus, selectedLocation, selectedCategory, selectedPriority]);

  const copyToClipboard = (text: string, key: string) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatRp = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = purchases.length;
    const pendingManager = purchases.filter((p) => p.status === "PENGAJUAN").length;
    const readyCapex = purchases.filter((p) => p.status === "DISETUJUI_MANAGER").length;
    const inOrder = purchases.filter((p) => p.status === "PROSES_ORDER").length;
    const arrivedProc = purchases.filter((p) => p.status === "SUDAH_DATANG").length;
    const readyShipT3 = purchases.filter((p) => p.status === "SIAP_KIRIM_T3").length;
    const completedT3 = purchases.filter((p) => p.status === "DITERIMA_T3" || p.status === "DITERIMA").length;
    const totalExpense = purchases
      .filter((p) => p.status !== "DITOLAK_MANAGER" && p.status !== "DIBATALKAN")
      .reduce((acc, curr) => acc + (curr.total_price || (curr.item_price || curr.estimated_price || 0) * (curr.quantity || 1)), 0);

    const pendingAmount = purchases
      .filter((p) => p.status === "PENGAJUAN")
      .reduce((acc, curr) => acc + (curr.total_price || (curr.item_price || curr.estimated_price || 0) * (curr.quantity || 1)), 0);

    const approvedAmount = purchases
      .filter((p) => p.status === "DISETUJUI_MANAGER")
      .reduce((acc, curr) => acc + (curr.total_price || (curr.item_price || curr.estimated_price || 0) * (curr.quantity || 1)), 0);

    const inOrderAmount = purchases
      .filter((p) => p.status === "PROSES_ORDER" || p.status === "SUDAH_DATANG" || p.status === "SIAP_KIRIM_T3")
      .reduce((acc, curr) => acc + (curr.total_price || (curr.item_price || curr.estimated_price || 0) * (curr.quantity || 1)), 0);

    return {
      total,
      pendingManager,
      readyCapex,
      inOrder,
      arrivedProc,
      readyShipT3,
      completedT3,
      totalExpense,
      pendingAmount,
      approvedAmount,
      inOrderAmount,
    };
  }, [purchases]);

  // Handler: Quick 1-Click Approve (Role Manager)
  const handleQuickApprove = async (item: PurchaseItem) => {
    if (!confirm(`Setujui pengajuan "${item.item_name}" (${formatRp(item.total_price || 0)}) dan teruskan ke MIS Procurement?`)) return;
    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/purchases/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DISETUJUI_MANAGER",
          manager_approved_at: nowIso,
          manager_approved_by: user?.name || "MIS MANAGER",
          manager_notes: "Disetujui langsung oleh MIS Manager. Teruskan ke MIS Procurement untuk pembuatan CAPEX dan pemesanan.",
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchPurchases();
      } else {
        alert(json.message || "Gagal menyetujui pengajuan.");
      }
    } catch (e: any) {
      alert(e.message || "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Batch Approve All Pending (Role Manager)
  const handleBatchApproveAllPending = async () => {
    const pendingItems = purchases.filter((p) => p.status === "PENGAJUAN");
    if (pendingItems.length === 0) {
      alert("Tidak ada pengajuan yang berstatus Menunggu Approval Manager.");
      return;
    }
    const totalEst = pendingItems.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
    if (!confirm(`Apakah Anda yakin ingin menyetujui sekaligus ${pendingItems.length} pengajuan dengan total estimasi anggaran ${formatRp(totalEst)}?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString().split("T")[0];
      for (const item of pendingItems) {
        await fetch(`/api/purchases/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "DISETUJUI_MANAGER",
            manager_approved_at: nowIso,
            manager_approved_by: user?.name || "MIS MANAGER",
            manager_notes: "Disetujui via Batch Approval Eksekutif MIS Manager. Teruskan ke MIS Procurement.",
          }),
        });
      }
      fetchPurchases();
      alert(`Berhasil menyetujui ${pendingItems.length} pengajuan barang IT.`);
    } catch (e: any) {
      alert(e.message || "Gagal memproses batch approval.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: 1. Submit New Request (MIS OPS)
  const handleSubmitNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newRequestData.item_name) {
      setFormError("Nama barang kebutuhan wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const year = new Date().getFullYear();
      const count = purchases.length + 1;
      const po_number = `REQ-${year}-${String(count).padStart(3, "0")}`;

      const payload = {
        po_number,
        item_name: newRequestData.item_name,
        category: newRequestData.category,
        target_location: newRequestData.target_location,
        quantity: Number(newRequestData.quantity) || 1,
        unit: newRequestData.unit || "Unit",
        estimated_price: Number(newRequestData.estimated_price) || 0,
        total_price: (Number(newRequestData.estimated_price) || 0) * (Number(newRequestData.quantity) || 1),
        priority: newRequestData.priority,
        notes: newRequestData.notes,
        component_type: newRequestData.component_type,
        target_pos_code: newRequestData.target_pos_code,
        requester: user?.name || "MIS OPS",
        status: "PENGAJUAN", // Status awal: Menunggu Approval Manager
      };

      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setIsNewRequestOpen(false);
        fetchPurchases();
        // Reset form
        setNewRequestData({
          item_name: "",
          category: "Hardware POS",
          target_location: "Plaza Bali (CGK)",
          quantity: 1,
          unit: "Unit",
          estimated_price: 0,
          priority: "BIASA",
          notes: "",
          component_type: "Sparepart POS",
          target_pos_code: "-",
        });
      } else {
        setFormError(json.message || "Gagal membuat pengajuan.");
      }
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: 2. Manager Approval / Rejection
  const handleSubmitManagerDecision = async () => {
    if (!activeItem) return;
    setIsSubmitting(true);
    try {
      const nextStatus = managerDecision === "APPROVE" ? "DISETUJUI_MANAGER" : "DITOLAK_MANAGER";
      const nowIso = new Date().toISOString().split("T")[0];

      const res = await fetch(`/api/purchases/${activeItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          manager_approved_at: nowIso,
          manager_approved_by: user?.name || "MIS MANAGER",
          manager_notes: managerNotes || (managerDecision === "APPROVE" ? "Disetujui. Teruskan ke MIS Procurement untuk pembuatan CAPEX." : "Pengajuan ditolak / perlu revisi."),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsManagerModalOpen(false);
        setActiveItem(null);
        fetchPurchases();
      } else {
        alert(json.message || "Gagal memproses persetujuan manager.");
      }
    } catch (err: any) {
      alert(err.message || "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: 3. Procurement Input CAPEX & Order
  const handleSubmitProcCapex = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    if (!procCapexData.capex_number) {
      alert("Nomor CAPEX wajib diisi oleh MIS Procurement.");
      return;
    }
    if (!procCapexData.store_name) {
      alert("Nama Toko / Vendor pembelian wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const qty = activeItem.quantity || 1;
      const itemPrice = Number(procCapexData.item_price) || 0;
      const totalPrice = itemPrice * qty;
      const nowIso = new Date().toISOString().split("T")[0];

      const res = await fetch(`/api/purchases/${activeItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PROSES_ORDER",
          capex_number: procCapexData.capex_number,
          brand_model: procCapexData.brand_model || activeItem.item_name,
          store_type: procCapexData.store_type,
          store_name: procCapexData.store_name,
          store_link: procCapexData.store_link,
          item_price: itemPrice,
          total_price: totalPrice,
          invoice_url: procCapexData.invoice_url,
          arrival_date: procCapexData.arrival_date || null,
          purchase_date: nowIso,
          notes: procCapexData.notes || activeItem.notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsProcOrderModalOpen(false);
        setActiveItem(null);
        fetchPurchases();
      } else {
        alert(json.message || "Gagal menyimpan data CAPEX & Order.");
      }
    } catch (err: any) {
      alert(err.message || "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: 4. Procurement Goods Arrived Confirmation
  const handleSubmitArrived = async () => {
    if (!activeItem) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/purchases/${activeItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "SUDAH_DATANG",
          arrival_date: arrivedData.arrival_date,
          serial_number: arrivedData.serial_number || activeItem.serial_number,
          received_date: arrivedData.arrival_date,
          notes: arrivedData.notes
            ? `${activeItem.notes || ""}\n[Tiba di Proc]: ${arrivedData.notes}`
            : activeItem.notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsArrivedModalOpen(false);
        setActiveItem(null);
        fetchPurchases();
      } else {
        alert(json.message || "Gagal menyimpan konfirmasi kedatangan barang.");
      }
    } catch (err: any) {
      alert(err.message || "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: 5. Procurement Ready to Ship to T3
  const handleSubmitShipToT3 = async () => {
    if (!activeItem) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/purchases/${activeItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "SIAP_KIRIM_T3",
          shipped_to_t3_date: shipData.shipped_to_t3_date,
          shipping_courier: shipData.shipping_courier,
          notes: shipData.notes
            ? `${activeItem.notes || ""}\n[Kirim ke T3]: ${shipData.notes}`
            : activeItem.notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsShipModalOpen(false);
        setActiveItem(null);
        fetchPurchases();
      } else {
        alert(json.message || "Gagal memperbarui status pengiriman ke T3.");
      }
    } catch (err: any) {
      alert(err.message || "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: 6. MIS OPS Confirm Received at T3
  const handleSubmitReceiveT3 = async () => {
    if (!activeItem) return;
    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const res = await fetch(`/api/purchases/${activeItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DITERIMA_T3",
          received_by_t3_at: receiveData.received_by_t3_at,
          installed_pos_code: receiveData.installed_pos_code !== "-" ? receiveData.installed_pos_code : activeItem.installed_pos_code,
          installed_by: user?.name || "MIS OPS",
          installed_at: receiveData.installed_pos_code !== "-" ? nowIso : null,
          notes: receiveData.notes
            ? `${activeItem.notes || ""}\n[Diterima di T3]: ${receiveData.notes}`
            : activeItem.notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsReceiveModalOpen(false);
        setActiveItem(null);
        fetchPurchases();
      } else {
        alert(json.message || "Gagal mengonfirmasi penerimaan barang di T3.");
      }
    } catch (err: any) {
      alert(err.message || "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Image Upload Helper for Invoice
  const handleInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran gambar maksimal 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProcCapexData((prev) => ({
          ...prev,
          invoice_url: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to get status object
  const getStatusObj = (status: PurchaseStatus) => {
    return (
      STATUS_PIPELINE.find((s) => s.value === status) || {
        value: status,
        label: status,
        badgeLabel: status,
        step: 1,
        bg: "bg-slate-100",
        color: "text-slate-800",
        border: "border-slate-200",
        dot: "bg-slate-400",
      }
    );
  };

  return (
    <SidebarLayout>
      <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* 1. Header & Workflow Hero Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-emerald-50/60 via-amber-50/40 to-transparent rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

          <div className="space-y-2 relative z-10">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-[#006622] border border-emerald-200/60 shadow-2xs">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Pengajuan Barang IT & Pengadaan Aset
                  </h1>
                  {isManager && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                      <Zap className="w-3 h-3 fill-amber-600 text-amber-600" />
                      MIS MANAGER · Superadmin Eksekutif
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Alur: MIS OPS ➔ MIS Manager ➔ MIS Procurement ➔ T3 Bandara
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    PT Plaza Bali Prime · Terminal 3 Soekarno-Hatta
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Pusat kendali persetujuan & tracking belanja sparepart POS, PC Office, CCTV, dan jaringan. Otorisasi MIS Manager membuka wewenang tim MIS Procurement untuk penerbitan CAPEX dan pemesanan.
            </p>
          </div>

          {/* Action Buttons: Manager Batch Approve & Create Request */}
          <div className="flex flex-wrap items-center gap-2.5 relative z-10 shrink-0">
            <button
              type="button"
              onClick={fetchPurchases}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-2xs transition-all active:scale-95"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#006622]" : ""}`} />
            </button>

            {/* Quick Batch Approval for MIS Manager */}
            {(isManager || isAdmin) && stats.pendingManager > 0 && (
              <button
                type="button"
                onClick={handleBatchApproveAllPending}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black transition-all shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                title="Setujui seluruh pengajuan pending sekaligus"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Setujui Semua Pending ({stats.pendingManager})</span>
              </button>
            )}

            {/* Create New IT Request */}
            {(isMIS || isAdmin || isManager) && (
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setIsNewRequestOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#006622] hover:bg-[#00521b] text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/10 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Ajukan Barang IT Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Executive Manager Alert Callout Banner (Visible when Manager has pending tasks) */}
        {(isManager || isAdmin) && stats.pendingManager > 0 && (
          <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50/50 rounded-2xl border-2 border-amber-300 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md shrink-0 animate-pulse">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900">
                    Otorisasi Diperlukan
                  </span>
                  <span className="text-xs font-extrabold text-amber-800">
                    {stats.pendingManager} Pengajuan Menunggu Keputusan MIS Manager
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                  Terdapat total estimasi anggaran <span className="font-mono font-black text-amber-900 bg-amber-100/80 px-1.5 py-0.5 rounded">{formatRp(stats.pendingAmount)}</span> yang menunggu persetujuan Anda untuk dilanjutkan ke proses CAPEX MIS Procurement.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={() => setSelectedStatus("PENGAJUAN")}
                className="px-3 py-2 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-bold transition-all shadow-2xs"
              >
                Filter Antrian ({stats.pendingManager})
              </button>
              <button
                type="button"
                onClick={handleBatchApproveAllPending}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md shadow-amber-600/30 transition-all active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Setujui Semua ({stats.pendingManager})</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Executive KPI Metric Cards (Matching Plaza Bali standard) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Perlu Keputusan Manager */}
          <div
            onClick={() => setSelectedStatus(selectedStatus === "PENGAJUAN" ? "" : "PENGAJUAN")}
            className={`cursor-pointer bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition-all hover:shadow-md ${
              selectedStatus === "PENGAJUAN"
                ? "border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20"
                : "border-slate-200/90 hover:border-amber-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Perlu Keputusan Manager
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {stats.pendingManager}
              </span>
              <span className="text-xs font-bold text-amber-700">Pengajuan Pending</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Estimasi Anggaran:</span>
              <span className="font-mono font-black text-amber-800">{formatRp(stats.pendingAmount)}</span>
            </div>
          </div>

          {/* Card 2: Disetujui & Siap CAPEX */}
          <div
            onClick={() => setSelectedStatus(selectedStatus === "DISETUJUI_MANAGER" ? "" : "DISETUJUI_MANAGER")}
            className={`cursor-pointer bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition-all hover:shadow-md ${
              selectedStatus === "DISETUJUI_MANAGER"
                ? "border-[#006622] ring-2 ring-emerald-500/20 bg-emerald-50/20"
                : "border-slate-200/90 hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Disetujui Manager
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-[#006622] border border-emerald-200/60">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {stats.readyCapex}
              </span>
              <span className="text-xs font-bold text-[#006622]">Siap Input CAPEX</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Disetujui:</span>
              <span className="font-mono font-black text-[#006622]">{formatRp(stats.approvedAmount)}</span>
            </div>
          </div>

          {/* Card 3: Proses Order & Ekspedisi */}
          <div
            onClick={() => setSelectedStatus(selectedStatus === "PROSES_ORDER" ? "" : "PROSES_ORDER")}
            className={`cursor-pointer bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition-all hover:shadow-md ${
              selectedStatus === "PROSES_ORDER" || selectedStatus === "SUDAH_DATANG" || selectedStatus === "SIAP_KIRIM_T3"
                ? "border-purple-400 ring-2 ring-purple-400/20 bg-purple-50/20"
                : "border-slate-200/90 hover:border-purple-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Proses PO & Pengiriman
              </span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/60">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {stats.inOrder + stats.arrivedProc + stats.readyShipT3}
              </span>
              <span className="text-xs font-bold text-purple-700">Barang Berjalan</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Nilai Order:</span>
              <span className="font-mono font-black text-purple-800">{formatRp(stats.inOrderAmount)}</span>
            </div>
          </div>

          {/* Card 4: Pengadaan Selesai di T3 */}
          <div
            onClick={() => setSelectedStatus(selectedStatus === "DITERIMA_T3" ? "" : "DITERIMA_T3")}
            className={`cursor-pointer bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition-all hover:shadow-md ${
              selectedStatus === "DITERIMA_T3"
                ? "border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20"
                : "border-slate-200/90 hover:border-teal-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Selesai Diterima di T3
              </span>
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200/60">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {stats.completedT3}
              </span>
              <span className="text-xs font-bold text-teal-700">Unit Operasional</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Status Aset:</span>
              <span className="font-bold text-teal-800">100% Terpasang di POS</span>
            </div>
          </div>
        </div>

        {/* 4. Total Pipeline Funnel Cards (Company-Wide Distribution Filter) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm overflow-x-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-emerald-100 text-[#006622] font-black text-[11px]">
                  Σ
                </span>
                <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Distribusi Total Pipeline Pengadaan (Klik Tahap Untuk Filter)
                </p>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Statistik akumulasi seluruh pengadaan kantor berjalan berdasarkan 6 siklus perolehan barang (Bukan progress 1 barang)
              </p>
            </div>
            {selectedStatus && (
              <button
                type="button"
                onClick={() => setSelectedStatus("")}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-all self-start sm:self-auto cursor-pointer"
              >
                <span>Hapus Filter ({selectedStatus})</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between min-w-[760px] gap-2">
            {[
              {
                step: 1,
                statusCode: "PENGAJUAN",
                title: "1. Pengajuan",
                role: "MIS OPS",
                count: stats.pendingManager,
                activeTheme: "bg-amber-50/70 border-amber-300 hover:bg-amber-100/70",
                badgeActive: "bg-amber-500 text-white",
                stepColor: "text-amber-700 font-bold",
              },
              {
                step: 2,
                statusCode: "DISETUJUI_MANAGER",
                title: "2. Disetujui",
                role: "MIS Manager",
                count: stats.readyCapex,
                activeTheme: "bg-blue-50/70 border-blue-300 hover:bg-blue-100/70",
                badgeActive: "bg-blue-600 text-white",
                stepColor: "text-blue-700 font-bold",
              },
              {
                step: 3,
                statusCode: "PROSES_ORDER",
                title: "3. CAPEX & Order",
                role: "MIS Proc",
                count: stats.inOrder,
                activeTheme: "bg-purple-50/70 border-purple-300 hover:bg-purple-100/70",
                badgeActive: "bg-purple-600 text-white",
                stepColor: "text-purple-700 font-bold",
              },
              {
                step: 4,
                statusCode: "SUDAH_DATANG",
                title: "4. QC Barang",
                role: "MIS Proc",
                count: stats.arrivedProc,
                activeTheme: "bg-indigo-50/70 border-indigo-300 hover:bg-indigo-100/70",
                badgeActive: "bg-indigo-600 text-white",
                stepColor: "text-indigo-700 font-bold",
              },
              {
                step: 5,
                statusCode: "SIAP_KIRIM_T3",
                title: "5. Siap Kirim T3",
                role: "MIS Proc",
                count: stats.readyShipT3,
                activeTheme: "bg-cyan-50/70 border-cyan-300 hover:bg-cyan-100/70",
                badgeActive: "bg-cyan-600 text-white",
                stepColor: "text-cyan-700 font-bold",
              },
              {
                step: 6,
                statusCode: "DITERIMA_T3",
                title: "6. Diterima T3",
                role: "MIS OPS",
                count: stats.completedT3,
                activeTheme: "bg-emerald-50/70 border-emerald-300 hover:bg-emerald-100/70",
                badgeActive: "bg-[#006622] text-white",
                stepColor: "text-[#006622] font-bold",
              },
            ].map((st, idx) => {
              const isCurrentFilter = selectedStatus === st.statusCode;
              const hasItems = st.count > 0;
              return (
                <div key={st.step} className="flex-1 flex items-center">
                  <button
                    type="button"
                    onClick={() => setSelectedStatus(isCurrentFilter ? "" : st.statusCode)}
                    className={`flex-1 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isCurrentFilter
                        ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/30"
                        : hasItems
                        ? `${st.activeTheme} ring-1 ring-slate-900/5`
                        : "bg-slate-50/60 border-slate-200/80 text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black ${isCurrentFilter ? "text-emerald-300" : hasItems ? st.stepColor : "text-slate-400"}`}>
                        Step {st.step}
                      </span>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                          isCurrentFilter
                            ? "bg-emerald-500 text-white"
                            : hasItems
                            ? st.badgeActive
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {st.count} Dokumen
                      </span>
                    </div>
                    <p className={`text-xs font-bold mt-1 leading-tight truncate ${isCurrentFilter ? "text-white" : hasItems ? "text-slate-900 font-extrabold" : "text-slate-500"}`}>
                      {st.title}
                    </p>
                    <p className={`text-[10px] font-medium truncate mt-0.5 ${isCurrentFilter ? "text-slate-300" : "text-slate-500"}`}>
                      PIC: {st.role}
                    </p>
                  </button>
                  {idx < 5 && (
                    <ChevronRight className="w-4 h-4 text-slate-300 mx-1 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Filter Bar & Search */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari No REQ, CAPEX, Nama Barang, Toko, atau Pemohon..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-[#006622] transition-all"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
              >
                <option value="">Semua Kategori</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Location Filter */}
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
              >
                <option value="">Semua Lokasi</option>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>

              {/* Reset Filter Button */}
              {(search || selectedStatus || selectedCategory || selectedLocation) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedStatus("");
                    setSelectedCategory("");
                    setSelectedLocation("");
                  }}
                  className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Status Tabs Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedStatus("")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                !selectedStatus
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              Semua ({stats.total})
            </button>
            {STATUS_PIPELINE.map((st) => {
              const isActive = selectedStatus === st.value;
              const count =
                st.value === "PENGAJUAN"
                  ? stats.pendingManager
                  : st.value === "DISETUJUI_MANAGER"
                  ? stats.readyCapex
                  : st.value === "PROSES_ORDER"
                  ? stats.inOrder
                  : st.value === "SUDAH_DATANG"
                  ? stats.arrivedProc
                  : st.value === "SIAP_KIRIM_T3"
                  ? stats.readyShipT3
                  : st.value === "DITERIMA_T3"
                  ? stats.completedT3
                  : purchases.filter((p) => p.status === st.value).length;

              return (
                <button
                  key={st.value}
                  onClick={() => setSelectedStatus(st.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[#006622] text-white shadow-2xs"
                      : `${st.bg} ${st.color} hover:opacity-90`
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? "bg-white" : st.dot}`} />
                  <span>{st.badgeLabel}</span>
                  <span className="opacity-75 font-mono text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Purchases Main Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {isLoading && purchases.length === 0 ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-[#006622] animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-800">Memuat data pengajuan barang...</p>
            </div>
          ) : purchases.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-800">Belum ada pengajuan barang IT</p>
              <p className="text-xs text-slate-400 mt-1">
                Gunakan tombol "+ Ajukan Barang IT Baru" untuk memulai alur pengadaan.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">No. Dokumen & Status</th>
                    <th className="px-4 py-3">Barang & Kategori</th>
                    <th className="px-4 py-3">Lokasi / Target Kasir</th>
                    <th className="px-4 py-3">Data CAPEX & Toko Pembelian</th>
                    <th className="px-4 py-3">Harga & Total</th>
                    <th className="px-4 py-3">Timeline Pengadaan</th>
                    <th className="px-4 py-3 text-right">Aksi Wewenang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchases.map((item) => {
                    const stObj = getStatusObj(item.status);
                    const itemStep = getItemStepInfo(item.status);
                    const qty = item.quantity || 1;
                    const finalPrice = item.item_price || item.estimated_price || 0;
                    const totalPrice = item.total_price || finalPrice * qty;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/80 transition-colors group ${
                          item.status === "PENGAJUAN" ? "border-l-4 border-l-amber-500 bg-amber-50/20" : ""
                        }`}
                      >
                        {/* 1. Document & Status */}
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                            <span>{item.po_number}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.po_number, `po-${item.id}`)}
                              className="text-slate-400 hover:text-slate-700"
                              title="Salin No Request"
                            >
                              {copiedKey === `po-${item.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${stObj.bg} ${stObj.color} ${stObj.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${stObj.dot}`} />
                              {stObj.badgeLabel}
                            </span>
                          </div>

                          {/* Mini Per-Item Step Stepper (Pintar & Canggih) */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 max-w-[170px]">
                            <div className="flex items-center justify-between text-[10px] mb-1 font-semibold">
                              <span className={itemStep.step > 0 ? itemStep.theme.textColor : "text-rose-600"}>
                                {itemStep.step > 0 ? `Step ${itemStep.step} / 6` : "Ditolak"}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400">
                                {itemStep.progressPercent}%
                              </span>
                            </div>
                            
                            {/* 6-Segment Visual Bar */}
                            <div className="grid grid-cols-6 gap-1 w-full">
                              {[1, 2, 3, 4, 5, 6].map((stNum) => {
                                const isPassed = itemStep.step > stNum;
                                const isCurrent = itemStep.step === stNum;
                                return (
                                  <div
                                    key={stNum}
                                    title={`Tahap ${stNum}`}
                                    className={`h-1.5 rounded-xs transition-all ${
                                      isCurrent
                                        ? `${itemStep.theme.badgeBg} animate-pulse ring-1 ring-offset-0.5 ${itemStep.theme.ringColor}`
                                        : isPassed
                                        ? "bg-emerald-500"
                                        : "bg-slate-200"
                                    }`}
                                  />
                                );
                              })}
                            </div>
                            
                            <p className="text-[10px] text-slate-500 font-medium mt-1 truncate" title={itemStep.label}>
                              {itemStep.step === 1
                                ? "⏳ Review Manager"
                                : itemStep.step === 2
                                ? "📝 Input No CAPEX"
                                : itemStep.step === 3
                                ? "🛍️ Sedang Dipesan"
                                : itemStep.step === 4
                                ? "📦 Tiba di Proc"
                                : itemStep.step === 5
                                ? "🚚 Kirim ke Lokasi"
                                : itemStep.step === 6
                                ? "✅ Terpasang di POS"
                                : "❌ Perlu Revisi"}
                            </p>
                          </div>

                          <p className="text-[10px] text-slate-400 mt-1.5">
                            Oleh: <span className="font-semibold text-slate-600">{item.requester}</span>
                          </p>
                        </td>

                        {/* 2. Item & Category */}
                        <td className="px-4 py-3.5 align-top max-w-[220px]">
                          <p className="font-bold text-slate-900 text-xs leading-tight">
                            {item.item_name}
                          </p>
                          {item.brand_model && item.brand_model !== "-" && (
                            <p className="text-[11px] text-blue-700 font-semibold mt-0.5 truncate">
                              Model: {item.brand_model}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {item.category}
                            </span>
                            <span className="text-[10px] font-bold text-slate-700">
                              {qty} {item.unit || "Unit"}
                            </span>
                          </div>
                          {item.notes && (
                            <p className="text-[10px] text-slate-400 italic mt-1 line-clamp-2">
                              "{item.notes}"
                            </p>
                          )}
                        </td>

                        {/* 3. Target Location & POS Code */}
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <p className="font-bold text-slate-800 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.target_location}</span>
                          </p>
                          {item.target_pos_code && item.target_pos_code !== "-" && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                                Target: {item.target_pos_code}
                              </span>
                            </div>
                          )}
                          {item.installed_pos_code && item.installed_pos_code !== "-" && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded">
                                Terpasang: {item.installed_pos_code}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 4. CAPEX & Store Data (Procurement) */}
                        <td className="px-4 py-3.5 align-top max-w-[200px]">
                          {item.capex_number && item.capex_number !== "-" ? (
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-bold text-purple-700 text-[11px] bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                  {item.capex_number}
                                </span>
                              </div>
                              <p className="text-[11px] font-bold text-slate-800 mt-1 flex items-center gap-1 truncate">
                                <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{item.store_name}</span>
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-[9px] font-bold px-1 rounded bg-slate-100 text-slate-500">
                                  {item.store_type === "ONLINE_SHOP" ? "Online Shop" : "Toko Offline"}
                                </span>
                                {item.store_link && item.store_link !== "-" && (
                                  <a
                                    href={item.store_link.startsWith("http") ? item.store_link : `https://${item.store_link}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-bold"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Buka</span>
                                  </a>
                                )}
                              </div>
                              {/* Invoice thumbnail */}
                              {item.invoice_url && item.invoice_url !== "-" && (
                                <button
                                  type="button"
                                  onClick={() => setInvoicePreviewUrl(item.invoice_url || null)}
                                  className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                                >
                                  <ImageIcon className="w-3 h-3" />
                                  <span>Lihat Invoice</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Menunggu input CAPEX & Toko oleh MIS Proc
                            </span>
                          )}
                        </td>

                        {/* 5. Price & Total */}
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <p className="font-mono font-extrabold text-slate-900 text-xs">
                            {formatRp(totalPrice)}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            @ {formatRp(finalPrice)} / unit
                          </p>
                          {item.priority === "CRITICAL" ? (
                            <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-800">
                              CRITICAL
                            </span>
                          ) : item.priority === "URGENT" ? (
                            <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-800">
                              URGENT
                            </span>
                          ) : null}
                        </td>

                        {/* 6. Timeline Milestone */}
                        <td className="px-4 py-3.5 align-top text-[11px] text-slate-500 whitespace-nowrap space-y-0.5">
                          <p>
                            Diajukan: <b>{item.request_date || "-"}</b>
                          </p>
                          {item.manager_approved_at && (
                            <p className="text-blue-700 font-medium">
                              Approve Mgr: {item.manager_approved_at}
                            </p>
                          )}
                          {item.arrival_date && (
                            <p className="text-purple-700 font-medium">
                              Tiba Proc: {item.arrival_date}
                            </p>
                          )}
                          {item.shipped_to_t3_date && (
                            <p className="text-cyan-700 font-medium">
                              Kirim T3: {item.shipped_to_t3_date}
                            </p>
                          )}
                        </td>

                        {/* 7. Role Actions */}
                        <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                          <div className="flex flex-col items-end gap-1.5">
                            {/* Action: 1. Manager Review (If PENGAJUAN) */}
                            {item.status === "PENGAJUAN" && (isManager || isAdmin) && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveItem(item);
                                    setManagerDecision("APPROVE");
                                    setManagerNotes("");
                                    setIsManagerModalOpen(true);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition-all active:scale-95"
                                  title="Buka form review lengkap dan catatan instruksi"
                                >
                                  <CheckSquare className="w-3.5 h-3.5" />
                                  <span>Review & Putuskan</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleQuickApprove(item)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-[#006622] hover:bg-[#00521b] text-white shadow-2xs transition-all active:scale-95"
                                  title="1-Klik Setujui Cepat & Teruskan ke Procurement"
                                >
                                  <Zap className="w-3 h-3 fill-white" />
                                  <span>Setuju Cepat</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveItem(item);
                                    setManagerDecision("REJECT");
                                    setManagerNotes("");
                                    setIsManagerModalOpen(true);
                                  }}
                                  className="p-1 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all active:scale-95"
                                  title="Tolak / Minta Revisi Spesifikasi"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Manager Status Indicator & Re-evaluate if DISETUJUI_MANAGER */}
                            {item.status === "DISETUJUI_MANAGER" && (isManager || isAdmin) && (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-[#006622]" />
                                  <span>Disetujui Anda</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveItem(item);
                                    setManagerDecision("APPROVE");
                                    setManagerNotes(item.manager_notes || "");
                                    setIsManagerModalOpen(true);
                                  }}
                                  className="text-[10px] font-bold text-amber-700 hover:text-amber-900 hover:bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
                                  title="Ubah Keputusan atau Perbarui Catatan Manager"
                                >
                                  Ubah Keputusan
                                </button>
                              </div>
                            )}

                            {/* Action: 2. Proc CAPEX & Order (If DISETUJUI_MANAGER) */}
                            {item.status === "DISETUJUI_MANAGER" && (isProcurement || isAdmin) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveItem(item);
                                  const year = new Date().getFullYear();
                                  setProcCapexData({
                                    capex_number: item.capex_number && item.capex_number !== "-" ? item.capex_number : `CPX-${year}-IT-${String(item.id).padStart(3, "0")}`,
                                    brand_model: item.brand_model && item.brand_model !== "-" ? item.brand_model : item.item_name,
                                    store_type: (item.store_type as any) || "ONLINE_SHOP",
                                    store_name: item.store_name && item.store_name !== "-" ? item.store_name : "",
                                    store_link: item.store_link && item.store_link !== "-" ? item.store_link : "",
                                    item_price: item.item_price || item.estimated_price || 0,
                                    total_price: item.total_price || (item.estimated_price || 0) * (item.quantity || 1),
                                    arrival_date: item.arrival_date || "",
                                    invoice_url: item.invoice_url && item.invoice_url !== "-" ? item.invoice_url : "",
                                    notes: item.notes || "",
                                  });
                                  setIsProcOrderModalOpen(true);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition-all active:scale-95"
                              >
                                <Store className="w-3.5 h-3.5" />
                                <span>Input CAPEX & Order</span>
                              </button>
                            )}

                            {/* Action: 3. Proc Confirm Arrived (If PROSES_ORDER) */}
                            {item.status === "PROSES_ORDER" && (isProcurement || isAdmin) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveItem(item);
                                  setArrivedData({
                                    arrival_date: new Date().toISOString().split("T")[0],
                                    serial_number: item.serial_number && item.serial_number !== "-" ? item.serial_number : "",
                                    notes: "",
                                  });
                                  setIsArrivedModalOpen(true);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all active:scale-95"
                              >
                                <Package className="w-3.5 h-3.5" />
                                <span>Barang Sudah Datang</span>
                              </button>
                            )}

                            {/* Action: 4. Proc Ready to Ship to T3 (If SUDAH_DATANG) */}
                            {item.status === "SUDAH_DATANG" && (isProcurement || isAdmin) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveItem(item);
                                  setShipData({
                                    shipped_to_t3_date: new Date().toISOString().split("T")[0],
                                    shipping_courier: "Zaenal Anwar (Teknisi MIS)",
                                    notes: "",
                                  });
                                  setIsShipModalOpen(true);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-2xs transition-all active:scale-95"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Siap Kirim ke T3</span>
                              </button>
                            )}

                            {/* Action: 5. MIS OPS Confirm Received at T3 (If SIAP_KIRIM_T3) */}
                            {item.status === "SIAP_KIRIM_T3" && (isMIS || isAdmin) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveItem(item);
                                  setReceiveData({
                                    received_by_t3_at: new Date().toISOString().split("T")[0],
                                    installed_pos_code: item.target_pos_code || "-",
                                    notes: "Barang telah diterima di Terminal 3 dalam kondisi baik.",
                                  });
                                  setIsReceiveModalOpen(true);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#006622] hover:bg-[#00521b] text-white shadow-2xs transition-all active:scale-95"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Terima Barang di T3</span>
                              </button>
                            )}

                            {/* Universal Detail Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveItem(item);
                                setIsDetailModalOpen(true);
                              }}
                              className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2 py-0.5 rounded transition-colors"
                            >
                              <Eye className="w-3 h-3 text-slate-400" />
                              <span>Lihat Detail</span>
                            </button>
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

        {/* ======================================================== */}
        {/* MODAL 1: Form Pengajuan Barang IT Baru (MIS OPS) */}
        {/* ======================================================== */}
        {isNewRequestOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-[#006622] rounded-xl">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      Form Pengajuan Barang IT Baru
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Diajukan oleh MIS OPS langsung ke MIS Manager untuk approval
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewRequestOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitNewRequest} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Barang / Kebutuhan IT <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SSD SATA 512GB untuk Kasir Terminal 3"
                    value={newRequestData.item_name}
                    onChange={(e) => setNewRequestData({ ...newRequestData, item_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-[#006622] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kategori</label>
                    <select
                      value={newRequestData.category}
                      onChange={(e) => setNewRequestData({ ...newRequestData, category: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white outline-none"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Prioritas</label>
                    <select
                      value={newRequestData.priority}
                      onChange={(e) => setNewRequestData({ ...newRequestData, priority: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white outline-none"
                    >
                      <option value="BIASA">Biasa (Standar)</option>
                      <option value="URGENT">Urgent (Mendesak)</option>
                      <option value="CRITICAL">Critical (Kasir Terhenti)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Lokasi Target</label>
                    <select
                      value={newRequestData.target_location}
                      onChange={(e) => setNewRequestData({ ...newRequestData, target_location: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white outline-none"
                    >
                      {LOCATIONS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Kasir POS (Opsional)</label>
                    <select
                      value={newRequestData.target_pos_code}
                      onChange={(e) => setNewRequestData({ ...newRequestData, target_pos_code: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white outline-none"
                    >
                      <option value="-">Tidak Terikat Kasir Spesifik</option>
                      {posList.map((p) => (
                        <option key={p.pos_code} value={p.pos_code}>
                          {p.pos_code} ({p.shop_name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jumlah (Qty)</label>
                    <input
                      type="number"
                      min="1"
                      value={newRequestData.quantity}
                      onChange={(e) => setNewRequestData({ ...newRequestData, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white outline-none text-center"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Satuan</label>
                    <input
                      type="text"
                      placeholder="Unit / Pcs / Box"
                      value={newRequestData.unit}
                      onChange={(e) => setNewRequestData({ ...newRequestData, unit: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white outline-none text-center"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Estimasi Harga (Rp)</label>
                    <input
                      type="number"
                      placeholder="Contoh: 450000"
                      value={newRequestData.estimated_price}
                      onChange={(e) => setNewRequestData({ ...newRequestData, estimated_price: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white outline-none text-right font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Alasan Kebutuhan & Spesifikasi Teknis
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Jelaskan alasan penggantian / kebutuhan hardware, misal: Harddisk lama bad sector sehingga kasir lemot..."
                    value={newRequestData.notes}
                    onChange={(e) => setNewRequestData({ ...newRequestData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white outline-none text-xs"
                  />
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Setelah diajukan, status akan menjadi <b>Menunggu Approval Manager</b>. Jika disetujui, pengajuan langsung masuk ke antrean kerja MIS Procurement untuk pembuatan dokumen CAPEX.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsNewRequestOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#006622] hover:bg-[#00521b] text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? "Mengirim..." : "Kirim Pengajuan ke Manager"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 2: Review & Approval MIS Manager (Executive Decision Sheet) */}
        {/* ======================================================== */}
        {isManagerModalOpen && activeItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md">
                    <Zap className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 text-sm">
                        Otorisasi Eksekutif MIS Manager
                      </h3>
                      <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {activeItem.po_number}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Evaluasi kebutuhan barang IT sebelum diteruskan ke MIS Procurement
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManagerModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Item Summary Card */}
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Barang Yang Diajukan</span>
                    <p className="font-black text-slate-900 text-sm mt-0.5 leading-snug">{activeItem.item_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">
                        {activeItem.category}
                      </span>
                      <span className="text-slate-500 font-medium">
                        Diajukan oleh: <b className="text-slate-800">{activeItem.requester}</b> ({activeItem.request_date || "-"})
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Estimasi</span>
                    <p className="font-mono font-black text-slate-900 text-base mt-0.5">
                      {formatRp(activeItem.total_price || 0)}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {activeItem.quantity} {activeItem.unit} @ {formatRp(activeItem.estimated_price || activeItem.item_price || 0)}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Lokasi / Target Kasir:</span>
                  <span className="font-bold text-slate-800">
                    {activeItem.target_location} {activeItem.target_pos_code && activeItem.target_pos_code !== "-" ? `• POS: ${activeItem.target_pos_code}` : ""}
                  </span>
                </div>

                {activeItem.notes && (
                  <div className="pt-2 border-t border-slate-200/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Alasan Kebutuhan (MIS OPS):</span>
                    <p className="text-slate-700 italic mt-0.5 bg-white p-2 rounded-lg border border-slate-200/60">
                      "{activeItem.notes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Decision Selector */}
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="block font-black text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">
                    Pilih Keputusan Manager:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setManagerDecision("APPROVE")}
                      className={`p-3 rounded-xl border text-left font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                        managerDecision === "APPROVE"
                          ? "bg-emerald-50 border-[#006622] text-[#006622] ring-2 ring-emerald-500/20 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5 text-[#006622] shrink-0" />
                      <div>
                        <p className="font-black text-xs">Setujui Pengajuan</p>
                        <p className="text-[10px] text-emerald-700/80 font-medium">Teruskan ke MIS Proc untuk CAPEX</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setManagerDecision("REJECT")}
                      className={`p-3 rounded-xl border text-left font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                        managerDecision === "REJECT"
                          ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      <div>
                        <p className="font-black text-xs">Tolak / Revisi Spek</p>
                        <p className="text-[10px] text-rose-600/80 font-medium">Minta penyesuaian anggaran</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-black text-slate-700 uppercase tracking-wider text-[10px]">
                      Catatan & Instruksi Manager {managerDecision === "REJECT" && <span className="text-rose-500">*</span>}:
                    </label>
                    <span className="text-[10px] text-slate-400">Instruksi akan dibaca MIS Procurement</span>
                  </div>
                  <textarea
                    rows={2}
                    placeholder={
                      managerDecision === "APPROVE"
                        ? "Contoh: Disetujui garansi resmi distributor. Harap segera diproses CAPEX dan pemesanan..."
                        : "Sebutkan alasan penolakan atau petunjuk revisi spesifikasi..."
                    }
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-[#006622] outline-none text-xs transition-all"
                  />

                  {/* Quick Suggestion Chips */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {managerDecision === "APPROVE" ? (
                      <>
                        {[
                          "Garansi resmi distributor",
                          "Prioritas kasir Terminal 3",
                          "Segera proses order & CAPEX",
                          "Pilih official store Tokopedia",
                        ].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              setManagerNotes((prev) =>
                                prev ? `${prev} • ${chip}` : `Disetujui. ${chip}.`
                              );
                            }}
                            className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-[#006622] border border-emerald-200 text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            + {chip}
                          </button>
                        ))}
                      </>
                    ) : (
                      <>
                        {[
                          "Spesifikasi terlalu tinggi, ajukan alternatif",
                          "Tunda pengadaan ke periode anggaran berikutnya",
                          "Gunakan stok sparepart cadangan MIS di WHS",
                        ].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              setManagerNotes((prev) =>
                                prev ? `${prev} • ${chip}` : `Ditolak/Revisi: ${chip}.`
                              );
                            }}
                            className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            + {chip}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManagerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitManagerDecision}
                  className={`flex items-center gap-1.5 px-4 py-2 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 ${
                    managerDecision === "APPROVE" ? "bg-[#006622] hover:bg-[#00521b]" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? "Menyimpan..." : managerDecision === "APPROVE" ? "Setujui & Teruskan ke Procurement" : "Tolak Pengajuan"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 3: Input CAPEX & Proses Order (MIS Procurement Support) */}
        {/* ======================================================== */}
        {isProcOrderModalOpen && activeItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      Pembuatan CAPEX & Input Pembelian Toko
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Wewenang: MIS Procurement Support (PO: {activeItem.po_number})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProcOrderModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitProcCapex} className="mt-4 space-y-3.5 text-xs">
                {/* Manager Approval Banner */}
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-blue-600 uppercase">Telah Disetujui Manager</p>
                    <p className="font-bold text-blue-900">{activeItem.manager_approved_by} • {activeItem.manager_approved_at}</p>
                    {activeItem.manager_notes && (
                      <p className="text-[10px] text-blue-700 italic mt-0.5">"{activeItem.manager_notes}"</p>
                    )}
                  </div>
                  <BadgeCheck className="w-6 h-6 text-blue-600 shrink-0" />
                </div>

                {/* Nomor CAPEX & Model Spesifik */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nomor Dokumen CAPEX <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: CPX-2026-IT-008"
                      value={procCapexData.capex_number}
                      onChange={(e) => setProcCapexData({ ...procCapexData, capex_number: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold uppercase focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Brand / Model Riil yang Dibeli <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kingston A400 480GB SATA3"
                      value={procCapexData.brand_model}
                      onChange={(e) => setProcCapexData({ ...procCapexData, brand_model: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white outline-none"
                    />
                  </div>
                </div>

                {/* Toko Pembelian: Jenis & Nama */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800">Jenis Toko Pembelian:</label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                        <input
                          type="radio"
                          name="store_type"
                          value="ONLINE_SHOP"
                          checked={procCapexData.store_type === "ONLINE_SHOP"}
                          onChange={() => setProcCapexData({ ...procCapexData, store_type: "ONLINE_SHOP" })}
                          className="text-purple-600"
                        />
                        <span>Online Shop (Tokopedia / Shopee dll)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 ml-2">
                        <input
                          type="radio"
                          name="store_type"
                          value="TOKO_OFFLINE"
                          checked={procCapexData.store_type === "TOKO_OFFLINE"}
                          onChange={() => setProcCapexData({ ...procCapexData, store_type: "TOKO_OFFLINE" })}
                          className="text-purple-600"
                        />
                        <span>Toko Fisik / Offline</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Nama Toko / Merchant <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={procCapexData.store_type === "ONLINE_SHOP" ? "Contoh: Tokopedia - Kingston Official" : "Contoh: Toko Enterkomputer Mangga Dua"}
                        value={procCapexData.store_name}
                        onChange={(e) => setProcCapexData({ ...procCapexData, store_name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {procCapexData.store_type === "ONLINE_SHOP" ? "Link URL Pembelian" : "Alamat Toko Offline"}
                      </label>
                      <input
                        type="text"
                        placeholder={procCapexData.store_type === "ONLINE_SHOP" ? "https://tokopedia.com/..." : "Mall Mangga Dua Lt. 3 No. 42"}
                        value={procCapexData.store_link}
                        onChange={(e) => setProcCapexData({ ...procCapexData, store_link: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Harga Beli & Estimasi Datang */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Harga Satuan Riil (Rp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="Contoh: 420000"
                      value={procCapexData.item_price}
                      onChange={(e) => setProcCapexData({ ...procCapexData, item_price: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Total: <b>{formatRp((procCapexData.item_price || 0) * (activeItem.quantity || 1))}</b> ({activeItem.quantity} unit)
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Estimasi Tanggal Barang Tiba
                    </label>
                    <input
                      type="date"
                      value={procCapexData.arrival_date}
                      onChange={(e) => setProcCapexData({ ...procCapexData, arrival_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                    />
                  </div>
                </div>

                {/* Upload Foto / URL Invoice Nota Pembelian */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Foto / Lampiran Invoice & Nota Pembelian
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleInvoiceUpload}
                      className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer"
                    />
                    <span className="text-slate-400">atau</span>
                    <input
                      type="text"
                      placeholder="Paste link gambar invoice..."
                      value={procCapexData.invoice_url}
                      onChange={(e) => setProcCapexData({ ...procCapexData, invoice_url: e.target.value })}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl outline-none text-xs"
                    />
                  </div>

                  {procCapexData.invoice_url && procCapexData.invoice_url !== "-" && (
                    <div className="mt-2 p-2 bg-slate-50 border rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-emerald-600" />
                        <span className="text-[11px] font-bold text-slate-700">Foto Invoice Terlampir</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInvoicePreviewUrl(procCapexData.invoice_url)}
                        className="text-[11px] text-blue-600 font-bold hover:underline"
                      >
                        Pratinjau
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catatan Pengadaan</label>
                  <textarea
                    rows={2}
                    placeholder="Catatan garansi, nama sales, atau instruksi pengiriman..."
                    value={procCapexData.notes}
                    onChange={(e) => setProcCapexData({ ...procCapexData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsProcOrderModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSubmitting ? "Menyimpan..." : "Simpan CAPEX & Ubah ke Proses Order"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 4: Konfirmasi Barang Sudah Datang (MIS Proc) */}
        {/* ======================================================== */}
        {isArrivedModalOpen && activeItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      Konfirmasi Barang Tiba di Procurement
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Verifikasi fisik barang yang telah dikirim toko
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsArrivedModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-900">{activeItem.brand_model || activeItem.item_name}</p>
                  <p className="text-[11px] text-slate-500">
                    Toko: <b>{activeItem.store_name}</b> • CAPEX: <b>{activeItem.capex_number}</b>
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tanggal Kedatangan Fisik
                  </label>
                  <input
                    type="date"
                    value={arrivedData.arrival_date}
                    onChange={(e) => setArrivedData({ ...arrivedData, arrival_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Serial Number (SN) Unit (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: SN-849204928"
                    value={arrivedData.serial_number}
                    onChange={(e) => setArrivedData({ ...arrivedData, serial_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kondisi Fisik & Catatan Penerimaan
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Barang tiba lengkap, segel utuh, kardus rapi..."
                    value={arrivedData.notes}
                    onChange={(e) => setArrivedData({ ...arrivedData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsArrivedModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitArrived}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? "Menyimpan..." : "Konfirmasi Sudah Datang"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 5: Siap Dikirim ke Terminal 3 / Toko (MIS Proc) */}
        {/* ======================================================== */}
        {isShipModalOpen && activeItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-cyan-50 text-cyan-700 rounded-xl">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      Siap Dikirim ke Terminal 3 / Toko
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      MIS Proc menyerahkan barang untuk dibawa ke lokasi toko
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsShipModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tanggal Siap Kirim
                  </label>
                  <input
                    type="date"
                    value={shipData.shipped_to_t3_date}
                    onChange={(e) => setShipData({ ...shipData, shipped_to_t3_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Kurir / Teknisi Pembawa Barang
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Zaenal Anwar (Teknisi MIS) atau Kurir Internal"
                    value={shipData.shipping_courier}
                    onChange={(e) => setShipData({ ...shipData, shipping_courier: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Catatan Pengiriman ke T3
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Barang dibawa siang ini setelah jam istirahat..."
                    value={shipData.notes}
                    onChange={(e) => setShipData({ ...shipData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsShipModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitShipToT3}
                  className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <Truck className="w-4 h-4" />
                  <span>{isSubmitting ? "Menyimpan..." : "Ubah ke Siap Kirim T3"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 6: Konfirmasi Terima Barang di T3 (MIS OPS) */}
        {/* ======================================================== */}
        {isReceiveModalOpen && activeItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-[#006622] rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      Konfirmasi Penerimaan di Terminal 3
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Wewenang: MIS OPS di Lapangan Toko
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                  <p className="font-bold text-emerald-900">{activeItem.brand_model || activeItem.item_name}</p>
                  <p className="text-[11px] text-emerald-700">
                    Kurir Pembawa: <b>{activeItem.shipping_courier}</b>
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Toko Pembelian: <b>{activeItem.store_name}</b> (CAPEX: {activeItem.capex_number})
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tanggal Diterima di Lokasi T3
                  </label>
                  <input
                    type="date"
                    value={receiveData.received_by_t3_at}
                    onChange={(e) => setReceiveData({ ...receiveData, received_by_t3_at: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Alokasikan Langsung ke Kasir POS (Opsional)
                  </label>
                  <select
                    value={receiveData.installed_pos_code}
                    onChange={(e) => setReceiveData({ ...receiveData, installed_pos_code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  >
                    <option value="-">Simpan Sebagai Sparepart Cadangan</option>
                    {posList.map((p) => (
                      <option key={p.pos_code} value={p.pos_code}>
                        Langsung Pasang di {p.pos_code} ({p.shop_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Catatan Verifikasi Penerimaan
                  </label>
                  <textarea
                    rows={2}
                    value={receiveData.notes}
                    onChange={(e) => setReceiveData({ ...receiveData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitReceiveT3}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#006622] hover:bg-[#00521b] text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? "Menyimpan..." : "Konfirmasi Selesai Diterima di T3"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 7: Detail Dossier Lengkap Pengadaan Barang IT */}
        {/* ======================================================== */}
        {isDetailModalOpen && activeItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                    {activeItem.po_number}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-base mt-1">
                    {activeItem.item_name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Intelligent Lifecycle Stepper Container */}
              {(() => {
                const detailStep = getItemStepInfo(activeItem.status);
                const isRejected = activeItem.status === "DITOLAK_MANAGER";

                return (
                  <div className="space-y-4">
                    {/* 1. Header Progress Bar & Stepper Visualizer */}
                    <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-md border border-slate-800 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Tracking Progres Dokumen
                            </span>
                            <span className="text-xs font-bold text-slate-300">
                              {isRejected ? "Status Pengajuan: DITOLAK" : `Tahap ${detailStep.step} dari 6`}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-white mt-1">
                            {detailStep.label}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {detailStep.sublabel}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-emerald-400">
                            {detailStep.progressPercent}%
                          </span>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Kelengkapan Siklus
                          </p>
                        </div>
                      </div>

                      {/* 6-Node Horizontal Stepper */}
                      <div className="pt-2">
                        <div className="relative flex items-center justify-between">
                          {/* Background connecting line */}
                          <div className="absolute left-4 right-4 top-3.5 h-1 bg-slate-800 -z-0" />
                          {/* Active filled connecting line */}
                          <div
                            className="absolute left-4 top-3.5 h-1 bg-emerald-500 transition-all duration-500 -z-0"
                            style={{
                              width:
                                detailStep.step > 1
                                  ? `${Math.min(100, ((detailStep.step - 1) / 5) * 100)}%`
                                  : "0%",
                            }}
                          />

                          {[
                            { stepNum: 1, name: "Pengajuan", role: "MIS OPS" },
                            { stepNum: 2, name: "Approval", role: "Manager" },
                            { stepNum: 3, name: "CAPEX", role: "Proc" },
                            { stepNum: 4, name: "QC Tiba", role: "Proc" },
                            { stepNum: 5, name: "Kirim", role: "Kurir" },
                            { stepNum: 6, name: "Terpasang", role: "MIS OPS" },
                          ].map((node) => {
                            const isDone = detailStep.step > node.stepNum;
                            const isCurrent = detailStep.step === node.stepNum;
                            return (
                              <div
                                key={node.stepNum}
                                className="flex flex-col items-center relative z-10"
                              >
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                    isDone
                                      ? "bg-[#006622] text-white ring-2 ring-emerald-400/40"
                                      : isCurrent
                                      ? isRejected
                                        ? "bg-rose-600 text-white ring-4 ring-rose-500/30 animate-pulse"
                                        : `${detailStep.theme.badgeBg} text-white ring-4 ${detailStep.theme.ringColor} animate-pulse scale-110`
                                      : "bg-slate-800 text-slate-500 border border-slate-700"
                                  }`}
                                >
                                  {isDone ? (
                                    <Check className="w-4 h-4 stroke-[3]" />
                                  ) : (
                                    <span>{node.stepNum}</span>
                                  )}
                                </div>
                                <span
                                  className={`text-[9px] mt-1.5 font-bold whitespace-nowrap ${
                                    isCurrent
                                      ? "text-emerald-300"
                                      : isDone
                                      ? "text-slate-300"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {node.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Info PIC & Langkah Selanjutnya */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-2">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span className="text-slate-500">Penanggung Jawab Aksi:</span>
                          <span className="font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {detailStep.picRole}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span className="text-slate-500">Langkah Berikutnya:</span>
                          <span className="font-semibold text-slate-200">
                            {detailStep.nextStepName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contextual Action Bar (Tombol Cepat Langsung) */}
                    {activeItem.status === "PENGAJUAN" && (isManager || isAdmin) && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-amber-900">
                            Tindakan Supervisi Diperlukan (MIS Manager):
                          </p>
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            Permintaan ini masih di Step 1. Klik tombol di samping untuk menyetujui atau menolak.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailModalOpen(false);
                            setIsManagerModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Putuskan Persetujuan</span>
                        </button>
                      </div>
                    )}

                    {activeItem.status === "DISETUJUI_MANAGER" && (isProcurement || isAdmin) && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-blue-900">
                            Tindakan Tim Procurement (Step 2):
                          </p>
                          <p className="text-[11px] text-blue-700 mt-0.5">
                            Pengajuan telah disetujui Manager. Silakan input nomor CAPEX & toko pembelian.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailModalOpen(false);
                            setIsProcOrderModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
                        >
                          <Store className="w-4 h-4" />
                          <span>Input CAPEX & Toko</span>
                        </button>
                      </div>
                    )}

                    {activeItem.status === "PROSES_ORDER" && (isProcurement || isAdmin) && (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-purple-900">
                            Tindakan Tim Procurement (Step 3):
                          </p>
                          <p className="text-[11px] text-purple-700 mt-0.5">
                            Bila pesanan barang fisik telah tiba di kantor Procurement, konfirmasikan kedatangan.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailModalOpen(false);
                            setIsArrivedModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
                        >
                          <Package className="w-4 h-4" />
                          <span>Konfirmasi Tiba di Proc</span>
                        </button>
                      </div>
                    )}

                    {activeItem.status === "SUDAH_DATANG" && (isProcurement || isAdmin) && (
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-indigo-900">
                            Tindakan Tim Procurement (Step 4):
                          </p>
                          <p className="text-[11px] text-indigo-700 mt-0.5">
                            Barang sudah lulus QC. Siapkan data pengiriman kurir menuju lokasi toko / terminal.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailModalOpen(false);
                            setIsShipModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
                        >
                          <Truck className="w-4 h-4" />
                          <span>Proses Kirim ke Lokasi</span>
                        </button>
                      </div>
                    )}

                    {activeItem.status === "SIAP_KIRIM_T3" && (isMIS || isAdmin) && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-emerald-900">
                            Tindakan Tim MIS OPS (Step 5):
                          </p>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Fisik barang telah tiba di lokasi. Konfirmasi penerimaan dan pasang ke sistem POS toko.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailModalOpen(false);
                            setIsReceiveModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-[#006622] hover:bg-[#00521b] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Konfirmasi Terima & Pasang</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="mt-4 space-y-4 text-xs">

                {/* Section 1: Pengajuan MIS OPS */}
                <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>1. Data Pengajuan Awal (MIS OPS)</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-400">Pemohon:</span> <b>{activeItem.requester}</b>
                    </div>
                    <div>
                      <span className="text-slate-400">Tanggal Pengajuan:</span> <b>{activeItem.request_date || "-"}</b>
                    </div>
                    <div>
                      <span className="text-slate-400">Lokasi / Kasir:</span> <b>{activeItem.target_location} ({activeItem.target_pos_code || "-"})</b>
                    </div>
                    <div>
                      <span className="text-slate-400">Jumlah & Kategori:</span> <b>{activeItem.quantity} {activeItem.unit} • {activeItem.category}</b>
                    </div>
                  </div>
                  {activeItem.notes && (
                    <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-200/60 mt-1">
                      Catatan: "{activeItem.notes}"
                    </p>
                  )}
                </div>

                {/* Section 2: Persetujuan Manager */}
                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-2">
                  <h4 className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>2. Persetujuan Supervisi (MIS Manager)</span>
                  </h4>
                  {activeItem.manager_approved_at ? (
                    <div className="text-[11px] space-y-1">
                      <p>Disetujui Oleh: <b>{activeItem.manager_approved_by}</b> pada <b>{activeItem.manager_approved_at}</b></p>
                      {activeItem.manager_notes && (
                        <p className="text-blue-800 italic bg-white/80 p-2 rounded-lg border border-blue-100">
                          Catatan Manager: "{activeItem.manager_notes}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Belum diproses persetujuan oleh Manager</p>
                  )}
                </div>

                {/* Section 3: Data Pembelian Toko & CAPEX (MIS Procurement) */}
                <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200/80 space-y-2">
                  <h4 className="font-bold text-purple-900 flex items-center gap-1.5 text-xs">
                    <Store className="w-4 h-4 text-purple-600" />
                    <span>3. Data Pengadaan & Toko (MIS Procurement Support)</span>
                  </h4>
                  {activeItem.capex_number && activeItem.capex_number !== "-" ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-purple-600 font-semibold">Nomor CAPEX:</span>{" "}
                          <b className="font-mono text-purple-900">{activeItem.capex_number}</b>
                        </div>
                        <div>
                          <span className="text-purple-600 font-semibold">Model Spesifik:</span>{" "}
                          <b>{activeItem.brand_model}</b>
                        </div>
                        <div>
                          <span className="text-purple-600 font-semibold">Nama Toko:</span>{" "}
                          <b>{activeItem.store_name}</b> ({activeItem.store_type === "ONLINE_SHOP" ? "Online" : "Offline"})
                        </div>
                        <div>
                          <span className="text-purple-600 font-semibold">Harga Riil:</span>{" "}
                          <b className="font-mono text-slate-900">
                            {formatRp(activeItem.total_price || 0)} (@ {formatRp(activeItem.item_price || 0)})
                          </b>
                        </div>
                      </div>

                      {activeItem.store_link && activeItem.store_link !== "-" && (
                        <div className="text-[11px] flex items-center gap-1 text-blue-700 font-medium">
                          <span>Link Toko:</span>
                          <a
                            href={activeItem.store_link.startsWith("http") ? activeItem.store_link : `https://${activeItem.store_link}`}
                            target="_blank"
                            rel="noreferrer"
                            className="underline truncate hover:text-blue-900"
                          >
                            {activeItem.store_link}
                          </a>
                        </div>
                      )}

                      {/* Invoice Attachment Button */}
                      {activeItem.invoice_url && activeItem.invoice_url !== "-" && (
                        <div className="pt-2 border-t border-purple-100 flex items-center justify-between">
                          <span className="text-[11px] text-purple-800 font-bold">Bukti Foto / Nota Pembelian:</span>
                          <button
                            type="button"
                            onClick={() => setInvoicePreviewUrl(activeItem.invoice_url || null)}
                            className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-200 text-xs font-bold transition-colors"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                            <span>Lihat Foto Invoice</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Belum diinput data CAPEX & Toko oleh MIS Procurement</p>
                  )}
                </div>

                {/* Section 4: Log Pengiriman & Penerimaan T3 */}
                <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-2">
                  <h4 className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span>4. Log Pengiriman & Penerimaan Terminal 3</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400">Tiba di Procurement:</span> <b>{activeItem.arrival_date || "-"}</b>
                    </div>
                    <div>
                      <span className="text-slate-400">Kirim ke T3:</span> <b>{activeItem.shipped_to_t3_date || "-"}</b>
                    </div>
                    <div>
                      <span className="text-slate-400">Kurir / Pembawa:</span> <b>{activeItem.shipping_courier || "-"}</b>
                    </div>
                    <div>
                      <span className="text-slate-400">Diterima di T3:</span> <b>{activeItem.received_by_t3_at || "-"}</b>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 8: Pratinjau Foto Invoice Nota Pembelian */}
        {/* ======================================================== */}
        {invoicePreviewUrl && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-4 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#006622]" />
                  <h3 className="font-bold text-slate-900 text-sm">Pratinjau Foto Invoice / Nota Pembelian</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInvoicePreviewUrl(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl my-3 flex items-center justify-center max-h-[70vh] overflow-auto">
                <img
                  src={invoicePreviewUrl}
                  alt="Invoice Pembelian"
                  className="max-h-[65vh] w-auto object-contain rounded shadow"
                />
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setInvoicePreviewUrl(null)}
                  className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl"
                >
                  Tutup Pratinjau
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

export default function PurchasesPage() {
  return (
    <Suspense
      fallback={
        <SidebarLayout>
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-[#006622] animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-800">Memuat halaman pengadaan barang IT...</p>
          </div>
        </SidebarLayout>
      }
    >
      <PurchasesContent />
    </Suspense>
  );
}
