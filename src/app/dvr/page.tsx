"use client";

import { useState, Suspense } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import ScannerModal from "@/components/ScannerModal";
import BarcodeGeneratorModal from "@/components/BarcodeGeneratorModal";
import StatCard from "@/components/common/StatCard";
import SearchInput from "@/components/common/SearchInput";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { useApiData } from "@/hooks/useApiData";
import { DvrAsset, Asset } from "@/types";
import {
  Video,
  HardDrive,
  Camera,
  Clock,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Filter,
  Download,
  Edit2,
  Trash2,
  QrCode,
  Printer,
  Shield,
  Save,
  X,
  Server,
  Settings2,
  Activity,
  Wifi,
  WifiOff,
  Maximize2,
  RefreshCw,
  Radio,
  Sliders,
  Play,
  Monitor,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AccessDenied from "@/components/AccessDenied";

interface ChannelConfig {
  ch: number;
  name: string;
}

function DvrContent() {
  const { isAdmin, isMIS, isManager } = useAuth();

  if (!isAdmin && !isMIS && !isManager) {
    return <AccessDenied moduleName="Aset DVR & CCTV Toko" />;
  }
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  // Filters
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedChannels, setSelectedChannels] = useState("");

  // Visible Passwords state (mapping id -> boolean)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Ping Map: id -> { status: string; latency: number | null; checking: boolean }
  const [pingMap, setPingMap] = useState<Record<number, { status: string; latency: number | null; checking: boolean }>>({});

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedDvrForSticker, setSelectedDvrForSticker] = useState<Asset | null>(null);

  // Live View / Camera Viewer Modal
  const [viewingDvrForLive, setViewingDvrForLive] = useState<DvrAsset | null>(null);
  const [liveGridMode, setLiveGridMode] = useState<4 | 8 | 16>(8);
  const [activeCamChannel, setActiveCamChannel] = useState<number | null>(null);

  // Connection & Channel Settings Modal
  const [configDvr, setConfigDvr] = useState<DvrAsset | null>(null);
  const [connectionSettings, setConnectionSettings] = useState({
    http_port: 80,
    rtsp_port: 554,
    server_port: 8000,
    protocol: "HIKVISION",
    channels: [] as ChannelConfig[],
    rtsp_stream_url: "",
  });
  const [isTestingConnect, setIsTestingConnect] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    pingStatus?: string;
    latency?: number | null;
    httpOpen?: boolean;
    rtspOpen?: boolean;
    message?: string;
  } | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Form Modal (Add / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDvr, setEditingDvr] = useState<DvrAsset | null>(null);
  const [formData, setFormData] = useState<Partial<DvrAsset>>({
    location: "",
    dvr_type: "DS-7216HGHI-M1",
    serial_number: "",
    harddisk: "4 TB",
    channels: "16 CH",
    camera_count: "14 CAM (14 ANALOG)",
    retention_days: "60 HARI",
    username: "admin",
    password: "",
    ip_address: "172.19.1.",
    notes: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Data DVR dari API + SWR cache (endpoint & cache key tetap)
  const params = new URLSearchParams();
  if (searchTerm) params.set("search", searchTerm);
  if (selectedRegion) params.set("region", selectedRegion);
  if (selectedChannels) params.set("channels", selectedChannels);
  const cacheKey = `dvr_${searchTerm}_${selectedRegion}_${selectedChannels}`;

  const {
    data: dvrData,
    isLoading,
    refresh: fetchDvr,
  } = useApiData<DvrAsset[]>(`/api/dvr?${params.toString()}`, {
    cacheKey,
    transform: (json) => {
      const res = json as { success?: boolean; data?: DvrAsset[] };
      return res.success && Array.isArray(res.data) ? res.data : [];
    },
  });

  const dvrList = dvrData ?? [];

  // Copy helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const togglePassword = (id: number) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Test Ping for single DVR row
  const checkDvrPing = async (dvr: DvrAsset) => {
    if (!dvr.id || !dvr.ip_address) return;
    setPingMap((prev) => ({
      ...prev,
      [dvr.id!]: { status: "CHECKING", latency: null, checking: true },
    }));

    try {
      const res = await fetch("/api/dvr/test-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: dvr.ip_address,
          http_port: dvr.http_port || 80,
          rtsp_port: dvr.rtsp_port || 554,
          server_port: dvr.server_port || 8000,
        }),
      });
      const data = await res.json();
      if (data.success && data.ping) {
        setPingMap((prev) => ({
          ...prev,
          [dvr.id!]: {
            status: data.ping.status,
            latency: data.ping.latency,
            checking: false,
          },
        }));
      } else {
        setPingMap((prev) => ({
          ...prev,
          [dvr.id!]: { status: "OFFLINE", latency: null, checking: false },
        }));
      }
    } catch (e) {
      setPingMap((prev) => ({
        ...prev,
        [dvr.id!]: { status: "OFFLINE", latency: null, checking: false },
      }));
    }
  };

  // Open Connection Settings Modal
  const handleOpenSettings = (dvr: DvrAsset) => {
    setConfigDvr(dvr);
    setTestResult(null);

    // Parse channel names if stored
    const channelTotal = parseInt(dvr.channels || "8", 10) || 8;
    let existingChannels: ChannelConfig[] = [];

    if (dvr.channel_names) {
      try {
        existingChannels = JSON.parse(dvr.channel_names);
      } catch (e) {
        existingChannels = [];
      }
    }

    if (!existingChannels || existingChannels.length === 0) {
      existingChannels = Array.from({ length: channelTotal }, (_, i) => ({
        ch: i + 1,
        name: i === 0 ? "Area Kasir POS 1" : i === 1 ? "Pintu Masuk Toko" : `Kamera Channel ${i + 1}`,
      }));
    }

    setConnectionSettings({
      http_port: dvr.http_port || 80,
      rtsp_port: dvr.rtsp_port || 554,
      server_port: dvr.server_port || 8000,
      protocol: dvr.protocol || "HIKVISION",
      channels: existingChannels,
      rtsp_stream_url:
        dvr.rtsp_stream_url ||
        `rtsp://${dvr.username}:${dvr.password || ""}@${dvr.ip_address}:${dvr.rtsp_port || 554}/Streaming/Channels/102`,
    });
  };

  // Test Connection in Settings Modal
  const handleTestConnection = async () => {
    if (!configDvr) return;
    setIsTestingConnect(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/dvr/test-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: configDvr.ip_address,
          http_port: connectionSettings.http_port,
          rtsp_port: connectionSettings.rtsp_port,
          server_port: connectionSettings.server_port,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: data.isReachable,
          pingStatus: data.ping?.status || "OFFLINE",
          latency: data.ping?.latency,
          httpOpen: data.ports?.http?.open,
          rtspOpen: data.ports?.rtsp?.open,
          message: data.isReachable
            ? "DVR Berhasil Terhubung melalui Jaringan VPN!"
            : "DVR Tidak Merespon (Pastikan VPN Toko Aktif & IP DVR Benar)",
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || "Gagal menguji koneksi DVR.",
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: "Gagal menghubungi server pengujian jaringan.",
      });
    } finally {
      setIsTestingConnect(false);
    }
  };

  // Save Connection & Channel Settings
  const handleSaveConnectionSettings = async () => {
    if (!configDvr) return;
    setIsSavingConfig(true);

    try {
      const res = await fetch(`/api/dvr/${configDvr.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...configDvr,
          http_port: connectionSettings.http_port,
          rtsp_port: connectionSettings.rtsp_port,
          server_port: connectionSettings.server_port,
          protocol: connectionSettings.protocol,
          channel_names: JSON.stringify(connectionSettings.channels),
          rtsp_stream_url: connectionSettings.rtsp_stream_url,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setConfigDvr(null);
        fetchDvr();
      } else {
        alert(json.message || "Gagal menyimpan konfigurasi.");
      }
    } catch (e) {
      alert("Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Open Live Monitor Modal
  const handleOpenLiveView = (dvr: DvrAsset) => {
    setViewingDvrForLive(dvr);
    const count = parseInt(dvr.channels || "8", 10) || 8;
    setLiveGridMode(count >= 16 ? 16 : count <= 4 ? 4 : 8);
    // Auto-ping in background
    checkDvrPing(dvr);
  };

  // Open Add/Edit Modal
  const handleOpenAddModal = () => {
    setEditingDvr(null);
    setFormData({
      location: "",
      dvr_type: "DS-7216HGHI-M1",
      serial_number: "",
      harddisk: "4 TB",
      channels: "16 CH",
      camera_count: "14 CAM (14 ANALOG)",
      retention_days: "60 HARI",
      username: "admin",
      password: "Cupcake2020",
      ip_address: "172.19.1.",
      notes: "",
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (dvr: DvrAsset) => {
    setEditingDvr(dvr);
    setFormData({ ...dvr });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSaveDvr = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const url = editingDvr ? `/api/dvr/${editingDvr.id}` : "/api/dvr";
      const method = editingDvr ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success) {
        setIsFormOpen(false);
        fetchDvr();
      } else {
        setFormError(json.message || "Gagal menyimpan data DVR.");
      }
    } catch (err) {
      setFormError("Gagal menghubungi server database.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDvr = async (id: number, loc: string) => {
    if (!confirm(`Yakin ingin menghapus data DVR lokasi "${loc}"?`)) return;

    try {
      const res = await fetch(`/api/dvr/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchDvr();
      } else {
        alert(json.message || "Gagal menghapus data.");
      }
    } catch (err) {
      alert("Gagal menghapus.");
    }
  };

  const handleOpenSticker = (dvr: DvrAsset) => {
    const assetObj: Asset = {
      asset_code: dvr.asset_code,
      name: `DVR CCTV (${dvr.channels})`,
      category: "Lainnya",
      shop_location: dvr.location,
      brand_model: dvr.dvr_type,
      serial_number: dvr.serial_number,
      ip_address: dvr.ip_address,
      status: "OPERASIONAL",
      notes: `HDD: ${dvr.harddisk} • ${dvr.camera_count} • User: ${dvr.username}`,
    };
    setSelectedDvrForSticker(assetObj);
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      "NO",
      "LOKASI",
      "KODE_ASET",
      "TYPE_DVR",
      "SERIAL_NUMBER",
      "HARDISK",
      "JUMLAH_CH",
      "JUMLAH_CAMERA",
      "LAMA_RECORD",
      "USERNAME",
      "PASSWORD",
      "IP_ADDRESS",
      "HTTP_PORT",
      "RTSP_PORT",
    ];

    const rows = dvrList.map((d, idx) => [
      idx + 1,
      `"${d.location}"`,
      `"${d.asset_code}"`,
      `"${d.dvr_type}"`,
      `"${d.serial_number}"`,
      `"${d.harddisk}"`,
      `"${d.channels}"`,
      `"${d.camera_count}"`,
      `"${d.retention_days}"`,
      `"${d.username}"`,
      `"${d.password || ""}"`,
      `"${d.ip_address}"`,
      d.http_port || 80,
      d.rtsp_port || 554,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_Aset_DVR_CCTV_MIS_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Channel helper for live view
  const getParsedChannels = (dvr: DvrAsset): ChannelConfig[] => {
    const count = parseInt(dvr.channels || "8", 10) || 8;
    if (dvr.channel_names) {
      try {
        const parsed = JSON.parse(dvr.channel_names);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return Array.from({ length: count }, (_, i) => ({
      ch: i + 1,
      name: i === 0 ? "Area Kasir POS 1" : i === 1 ? "Pintu Masuk Toko" : `Kamera Channel ${i + 1}`,
    }));
  };

  return (
    <SidebarLayout onOpenScanner={() => setIsScannerOpen(true)}>
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-2.5 sm:px-4 py-5 space-y-4">
        {/* Header Title & Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-[#006622] text-white shadow-2xs">
              <Video className="w-4 h-4" />
              <span>Unit DVR & Kamera CCTV ({dvrList.length} Unit)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#006622] hover:bg-[#00551c] text-white text-xs font-semibold rounded-lg shadow-2xs active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah DVR Baru</span>
            </button>
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-lg text-[11px] font-semibold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-[#006622]"></span>
              <span>MIS OPS (Semua Toko)</span>
            </div>
          </div>
        </div>

        {/* Top 4 Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total Unit DVR"
            labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            value={
              <>
                {dvrList.length}{" "}
                <span className="text-xs font-normal text-slate-400">Unit</span>
              </>
            }
            valueClassName="text-2xl text-slate-900 mt-0.5"
            hint="Tersebar di 25 lokasi toko & gudang"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Video}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-sm transition-all"
          />

          <StatCard
            label="Channel CCTV"
            labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            value={
              <>
                {dvrList.filter((d) => d.channels?.includes("16")).length}x 16CH •{" "}
                {dvrList.filter((d) => d.channels?.includes("8")).length}x 8CH
              </>
            }
            valueClassName="text-2xl text-blue-600 mt-0.5"
            hint="Analog & IP Camera Support"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Camera}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-sm transition-all"
          />

          <StatCard
            label="Storage Hardisk"
            labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            value={
              <>
                110+ <span className="text-xs font-normal text-slate-400">TB</span>
              </>
            }
            valueClassName="text-2xl text-emerald-600 mt-0.5"
            hint="Surveillance HDD Terpasang"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={HardDrive}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-sm transition-all"
          />

          <StatCard
            label="Retensi Rekaman"
            labelClassName="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            value={
              <>
                Hingga 227 <span className="text-xs font-normal text-slate-400">Hari</span>
              </>
            }
            valueClassName="text-2xl text-amber-600 mt-0.5"
            hint="Rata-rata 40 - 200+ hari rekam"
            hintClassName="text-[10.5px] text-slate-500 mt-0.5"
            icon={Clock}
            iconWrapperClassName="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold"
            className="border-slate-200/90 shadow-2xs hover:shadow-sm transition-all"
          />
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          {/* Row 1: Segmented Area Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
              <Server className="w-3.5 h-3.5 text-indigo-600" />
              Area:
            </span>
            <button
              type="button"
              onClick={() => setSelectedRegion("")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedRegion === ""
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              Semua Wilayah ({dvrList.length})
            </button>
            {[
              { label: "Jakarta & Bandara CGK", value: "JKT", dot: "bg-indigo-500" },
              { label: "Area Surabaya (SBY)", value: "SBY", dot: "bg-purple-500" },
              { label: "Warehouse (WHS)", value: "WHS", dot: "bg-orange-500" },
            ].map((reg) => (
              <button
                key={reg.value}
                type="button"
                onClick={() => setSelectedRegion(reg.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  selectedRegion === reg.value
                    ? "bg-[#006622] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${selectedRegion === reg.value ? "bg-white" : reg.dot}`}></span>
                <span>{reg.label}</span>
              </button>
            ))}
          </div>

          {/* Row 2: Search Input & Channel Filter Dropdown */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              onClear={() => setSearchTerm("")}
              placeholder="Cari lokasi toko (DF1, SBY, Colonial, Jada), IP address (172.19.1...), tipe DVR, S/N..."
              inputClassName="pl-9 pr-8 py-2 bg-slate-50 border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-emerald-500/20 focus:border-[#006622]"
            />

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedChannels}
                onChange={(e) => setSelectedChannels(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Semua Tipe Channel DVR</option>
                <option value="16 CH">16 Channel (16 CH)</option>
                <option value="8 CH">8 Channel (8 CH)</option>
                <option value="4 CH">4 Channel (4 CH)</option>
                <option value="32 CH">32 Channel (32 CH)</option>
              </select>

              {(searchTerm || selectedRegion || selectedChannels) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedRegion("");
                    setSelectedChannels("");
                  }}
                  className="px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Master Table of DVRs */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {isLoading ? (
            <LoadingState
              className="p-12"
              message="Memuat Data DVR CCTV..."
            />
          ) : dvrList.length === 0 ? (
            <EmptyState
              className="p-12"
              icon={Video}
              iconClassName="w-12 h-12 text-slate-300"
              title="Tidak ada unit DVR ditemukan"
              description="Coba sesuaikan kata kunci pencarian atau filter wilayah/channel."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">No</th>
                    <th className="py-3 px-3">Lokasi & Tipe DVR</th>
                    <th className="py-3 px-3">Storage & Channel</th>
                    <th className="py-3 px-3">Jumlah Kamera</th>
                    <th className="py-3 px-3">Lama Record</th>
                    <th className="py-3 px-3">Koneksi & IP (Web GUI)</th>
                    <th className="py-3 px-3">Kredensial Login</th>
                    <th className="py-3 px-3 text-right">Aksi & Live Kamera</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dvrList.map((dvr, index) => {
                    const isPassVisible = visiblePasswords[dvr.id!];
                    const isCopiedPass = copiedKey === `pass-${dvr.id}`;
                    const isCopiedIp = copiedKey === `ip-${dvr.id}`;
                    const pingInfo = pingMap[dvr.id!];

                    return (
                      <tr key={dvr.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* No */}
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-400 align-top">
                          {index + 1}
                        </td>

                        {/* Lokasi & Tipe DVR */}
                        <td className="py-3.5 px-3 align-top max-w-[220px]">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-800 text-white shadow-2xs">
                              {dvr.location}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                              {dvr.asset_code}
                            </span>
                          </div>
                          <div className="font-black text-blue-700 text-xs flex items-center gap-1 leading-tight">
                            <span>{dvr.dvr_type}</span>
                          </div>
                          <div className="font-mono text-slate-400 text-[10px] truncate max-w-xs mt-0.5" title={dvr.serial_number}>
                            SN: {dvr.serial_number}
                          </div>
                        </td>

                        {/* Storage & Channel */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                            <HardDrive className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{dvr.harddisk}</span>
                          </div>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                            {dvr.channels}
                          </span>
                        </td>

                        {/* Jumlah Kamera */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                            <Camera className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{dvr.camera_count}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Analog & IP Support
                          </span>
                        </td>

                        {/* Lama Record */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          {dvr.retention_days && dvr.retention_days !== "-" ? (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {dvr.retention_days}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono text-xs select-none">—</span>
                          )}
                        </td>

                        {/* IP Address, Web GUI, & Live Ping Test */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`http://${dvr.ip_address}:${dvr.http_port || 80}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Buka Web GUI DVR di tab baru"
                                className="inline-flex items-center gap-1 font-mono text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50/80 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                              >
                                <span>{dvr.ip_address}</span>
                                <ExternalLink className="w-3 h-3 text-blue-500" />
                              </a>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(dvr.ip_address, `ip-${dvr.id}`)}
                                title="Salin IP Address"
                                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                              >
                                {isCopiedIp ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>

                            {/* Ping Status Indicator */}
                            <div className="flex items-center gap-1.5">
                              {pingInfo ? (
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                    pingInfo.checking
                                      ? "bg-slate-100 text-slate-600"
                                      : pingInfo.status === "ONLINE"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      pingInfo.checking
                                        ? "bg-amber-400 animate-spin"
                                        : pingInfo.status === "ONLINE"
                                        ? "bg-emerald-500 animate-pulse"
                                        : "bg-rose-500"
                                    }`}
                                  />
                                  <span>
                                    {pingInfo.checking
                                      ? "Ping..."
                                      : pingInfo.status === "ONLINE"
                                      ? `Online ${pingInfo.latency ? `(${pingInfo.latency}ms)` : ""}`
                                      : "Offline"}
                                  </span>
                                </span>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => checkDvrPing(dvr)}
                                title="Cek Ping VPN ke DVR ini"
                                className="text-[10px] text-slate-400 hover:text-indigo-600 font-semibold hover:underline flex items-center gap-0.5"
                              >
                                <RefreshCw className="w-2.5 h-2.5" />
                                <span>Cek Ping</span>
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Kredensial Login */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">
                              User: <strong className="font-mono text-slate-800">{dvr.username}</strong>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-900 border border-slate-200 min-w-[85px]">
                                {isPassVisible ? dvr.password : "••••••••"}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePassword(dvr.id!)}
                                title={isPassVisible ? "Sembunyikan password" : "Lihat password"}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                              >
                                {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(dvr.password || "", `pass-${dvr.id}`)}
                                title="Salin password"
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                {isCopiedPass ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Aksi & Hubungkan Kamera */}
                        <td className="py-3.5 px-3 text-right align-top whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Hubungkan Kamera / Live View */}
                            <button
                              type="button"
                              onClick={() => handleOpenLiveView(dvr)}
                              title="Buka Monitor & Hubungkan Kamera CCTV"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#006622] hover:bg-[#00551c] text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all active:scale-95"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Live Cam</span>
                            </button>

                            {/* Pengaturan Koneksi Kamera & Port */}
                            <button
                              type="button"
                              onClick={() => handleOpenSettings(dvr)}
                              title="Pengaturan Koneksi Kamera & Streaming DVR"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Settings2 className="w-4 h-4" />
                            </button>

                            {/* Cetak Stiker */}
                            <button
                              type="button"
                              onClick={() => handleOpenSticker(dvr)}
                              title="Cetak Stiker Label Barcode/QR DVR"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(dvr)}
                              title="Edit Data DVR"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Hapus */}
                            <button
                              type="button"
                              onClick={() => handleDeleteDvr(dvr.id!, dvr.location)}
                              title="Hapus Data DVR"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
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
      </main>

      {/* MODAL 1: PENGATURAN KONEKSI KAMERA & STREAMING DVR */}
      {configDvr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Pengaturan Koneksi Kamera & Streaming DVR
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Lokasi: <strong className="text-slate-800">{configDvr.location}</strong> • IP: <strong className="font-mono text-blue-600">{configDvr.ip_address}</strong> ({configDvr.channels})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfigDvr(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Box Info VPN & Testing */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#006622] animate-pulse" />
                    <span className="font-bold text-slate-800 text-xs">Uji Koneksi Realtime ke DVR (VPN Toko)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingConnect}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#006622] hover:bg-[#00551c] text-white text-[11px] font-bold rounded-lg shadow-2xs active:scale-95 transition-all"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTestingConnect ? "animate-spin" : ""}`} />
                    <span>{isTestingConnect ? "Menguji..." : "Test Koneksi Sekarang"}</span>
                  </button>
                </div>

                {testResult && (
                  <div className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between ${
                    testResult.success
                      ? "bg-white border-emerald-300 text-emerald-800"
                      : "bg-white border-rose-300 text-rose-800"
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                    {testResult.latency !== undefined && testResult.latency !== null && (
                      <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        Ping: {testResult.latency} ms
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Port & Protokol Settings */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Port HTTP (Web GUI):
                  </label>
                  <input
                    type="number"
                    value={connectionSettings.http_port}
                    onChange={(e) => setConnectionSettings({ ...connectionSettings, http_port: parseInt(e.target.value, 10) || 80 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="80"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Port RTSP Stream:
                  </label>
                  <input
                    type="number"
                    value={connectionSettings.rtsp_port}
                    onChange={(e) => setConnectionSettings({ ...connectionSettings, rtsp_port: parseInt(e.target.value, 10) || 554 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="554"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Port SDK / Server:
                  </label>
                  <input
                    type="number"
                    value={connectionSettings.server_port}
                    onChange={(e) => setConnectionSettings({ ...connectionSettings, server_port: parseInt(e.target.value, 10) || 8000 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="8000"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Protokol DVR:
                  </label>
                  <select
                    value={connectionSettings.protocol}
                    onChange={(e) => setConnectionSettings({ ...connectionSettings, protocol: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="HIKVISION">Hikvision (ISAPI / RTSP)</option>
                    <option value="DAHUA">Dahua / Uniview</option>
                    <option value="ONVIF">ONVIF Standard</option>
                    <option value="RTSP">Generic RTSP URL</option>
                  </select>
                </div>
              </div>

              {/* RTSP Stream URL Template */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Format RTSP Stream URL (Substream / VLC):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={connectionSettings.rtsp_stream_url}
                    onChange={(e) => setConnectionSettings({ ...connectionSettings, rtsp_stream_url: e.target.value })}
                    placeholder="rtsp://user:pass@ip:554/Streaming/Channels/102"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(connectionSettings.rtsp_stream_url, "rtsp-url")}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center gap-1"
                  >
                    {copiedKey === "rtsp-url" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Salin</span>
                  </button>
                </div>
                <p className="text-[10.5px] text-slate-400 mt-1">
                  *Ganti angka channel pada akhir URL (101 = CH 1 Main, 102 = CH 1 Substream, 202 = CH 2 Substream).
                </p>
              </div>

              {/* Pemetaan Nama Kamera per Channel */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 text-xs">
                    Pengaturan Nama & Area Kamera per Channel ({connectionSettings.channels.length} Titik)
                  </span>
                  <span className="text-[10.5px] text-slate-400">
                    Beri nama kamera untuk monitor CCTV
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {connectionSettings.channels.map((ch, idx) => (
                    <div key={ch.ch} className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="w-12 text-center py-1 font-mono font-black text-[10.5px] bg-slate-800 text-white rounded">
                        CH {ch.ch < 10 ? `0${ch.ch}` : ch.ch}
                      </span>
                      <input
                        type="text"
                        value={ch.name}
                        onChange={(e) => {
                          const updated = [...connectionSettings.channels];
                          updated[idx].name = e.target.value;
                          setConnectionSettings({ ...connectionSettings, channels: updated });
                        }}
                        placeholder={`Nama titik kamera ${ch.ch}`}
                        className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfigDvr(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveConnectionSettings}
                disabled={isSavingConfig}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#006622] hover:bg-[#00551c] text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingConfig ? "Menyimpan..." : "Simpan Pengaturan"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MONITOR CCTV LIVE VIEW & CAMERA HUB */}
      {viewingDvrForLive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 text-slate-100 rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[96vh]">
            {/* Monitor Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-white text-base">
                      CCTV Live Hub • {viewingDvrForLive.location}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-600 text-white">
                      {viewingDvrForLive.channels}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>VPN Ready</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    IP: {viewingDvrForLive.ip_address}:{viewingDvrForLive.http_port || 80} • Model: {viewingDvrForLive.dvr_type} • User: {viewingDvrForLive.username}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                {/* Grid Mode Switcher */}
                <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setLiveGridMode(4)}
                    className={`px-2.5 py-1 rounded font-bold transition-all ${
                      liveGridMode === 4 ? "bg-[#006622] text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    4 Cam
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiveGridMode(8)}
                    className={`px-2.5 py-1 rounded font-bold transition-all ${
                      liveGridMode === 8 ? "bg-[#006622] text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    8 Cam
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiveGridMode(16)}
                    className={`px-2.5 py-1 rounded font-bold transition-all ${
                      liveGridMode === 16 ? "bg-[#006622] text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    16 Cam
                  </button>
                </div>

                {/* Open Web GUI */}
                <a
                  href={`http://${viewingDvrForLive.ip_address}:${viewingDvrForLive.http_port || 80}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Web GUI DVR</span>
                </a>

                <button
                  type="button"
                  onClick={() => setViewingDvrForLive(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Camera Grid View */}
            <div className="p-4 overflow-y-auto max-h-[75vh]">
              {/* Camera Grid */}
              <div
                className={`grid gap-3 ${
                  liveGridMode === 4
                    ? "grid-cols-1 sm:grid-cols-2"
                    : liveGridMode === 8
                    ? "grid-cols-2 sm:grid-cols-4"
                    : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-4"
                }`}
              >
                {getParsedChannels(viewingDvrForLive)
                  .slice(0, liveGridMode)
                  .map((cam) => {
                    const rtspUrl = `rtsp://${viewingDvrForLive.username}:${viewingDvrForLive.password || ""}@${viewingDvrForLive.ip_address}:${viewingDvrForLive.rtsp_port || 554}/Streaming/Channels/${cam.ch}02`;
                    const isCopiedRtsp = copiedKey === `cam-rtsp-${cam.ch}`;

                    return (
                      <div
                        key={cam.ch}
                        className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden aspect-video group flex flex-col justify-between p-2.5 hover:border-emerald-500/50 transition-all shadow-md"
                      >
                        {/* Overlay Header: Channel & REC indicator */}
                        <div className="flex items-center justify-between text-[11px] z-10">
                          <span className="font-mono font-bold bg-black/70 px-1.5 py-0.5 rounded text-emerald-400 border border-emerald-900/50">
                            CH {cam.ch < 10 ? `0${cam.ch}` : cam.ch}
                          </span>
                          <div className="flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded border border-rose-900/50">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                            <span className="text-[10px] font-bold text-rose-400 uppercase">REC</span>
                          </div>
                        </div>

                        {/* Center Screen: Camera Mock / Stream Info */}
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-2 z-10">
                          <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/50 transition-all mb-1.5">
                            <Camera className="w-5 h-5" />
                          </div>
                          <p className="font-bold text-white text-xs px-2 line-clamp-1">
                            {cam.name}
                          </p>
                          <span className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                            H.264/H.265 • 1080P • 25 FPS
                          </span>
                        </div>

                        {/* Overlay Footer: Actions & Live Clock */}
                        <div className="flex items-center justify-between text-[10px] z-10 pt-1 border-t border-slate-800/80">
                          <span className="font-mono text-slate-400">
                            {new Date().toISOString().slice(0, 10)} 12:00
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(rtspUrl, `cam-rtsp-${cam.ch}`)}
                              title="Salin RTSP Stream Link Channel ini (VLC)"
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-colors flex items-center gap-1"
                            >
                              {isCopiedRtsp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>RTSP</span>
                            </button>
                            <a
                              href={`http://${viewingDvrForLive.ip_address}:${viewingDvrForLive.http_port || 80}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Buka Langsung di Web DVR"
                              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>

                        {/* CCTV Background Grid Scanlines */}
                        <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-20"></div>
                      </div>
                    );
                  })}
              </div>

              {/* Streaming Instructions Footer */}
              <div className="mt-4 p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-emerald-400" />
                  <span>
                    Untuk melihat video CCTV streaming realtime: Buka aplikasi <strong>VLC Media Player</strong> / <strong>iVMS-4200</strong> lalu masukkan URL RTSP di atas.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenSettings(viewingDvrForLive)}
                  className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Ubah Penamaan Kamera</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (Add / Edit DVR) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[95vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                  <Video className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">
                  {editingDvr ? `Edit Data DVR: ${editingDvr.location}` : "Tambah Aset DVR CCTV Baru"}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDvr} className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lokasi Toko / Site: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Contoh: DF1 / SBY-DF1 / WHS-PB"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs uppercase font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipe DVR: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.dvr_type}
                    onChange={(e) => setFormData({ ...formData, dvr_type: e.target.value })}
                    placeholder="Contoh: DS-7216HGHI-M1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Serial Number (S/N): <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder="Nomor seri resmi dari stiker DVR"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kapasitas Hardisk:
                  </label>
                  <input
                    type="text"
                    value={formData.harddisk}
                    onChange={(e) => setFormData({ ...formData, harddisk: e.target.value })}
                    placeholder="Contoh: 8 TB / 4 TB + 1 TB"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Channel:
                  </label>
                  <select
                    value={formData.channels}
                    onChange={(e) => setFormData({ ...formData, channels: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="16 CH">16 CH (16 Channel)</option>
                    <option value="8 CH">8 CH (8 Channel)</option>
                    <option value="4 CH">4 CH (4 Channel)</option>
                    <option value="32 CH">32 CH (32 Channel)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Kamera Terpasang:
                  </label>
                  <input
                    type="text"
                    value={formData.camera_count}
                    onChange={(e) => setFormData({ ...formData, camera_count: e.target.value })}
                    placeholder="Contoh: 14 CAM (14 ANALOG)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lama Record:
                  </label>
                  <input
                    type="text"
                    value={formData.retention_days}
                    onChange={(e) => setFormData({ ...formData, retention_days: e.target.value })}
                    placeholder="Contoh: 157 HARI"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  IP Address DVR: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.ip_address}
                  onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                  placeholder="Contoh: 172.19.1.81"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username Login:
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="admin"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password DVR: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Contoh: Cupcake2020 / Admin1234"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
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
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Menyimpan..." : "Simpan Data DVR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode / QR Label Modal for DVR */}
      <BarcodeGeneratorModal
        isOpen={!!selectedDvrForSticker}
        asset={selectedDvrForSticker}
        onClose={() => setSelectedDvrForSticker(null)}
      />

      {/* Scanner Modal */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </SidebarLayout>
  );
}

export default function DvrPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Memuat Data DVR CCTV...</div>}>
      <DvrContent />
    </Suspense>
  );
}
