"use client";

import { useEffect, useState, Suspense } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import ScannerModal from "@/components/ScannerModal";
import TicketModal from "@/components/TicketModal";
import PageHeader from "@/components/common/PageHeader";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import Modal from "@/components/common/Modal";
import { useApiData } from "@/hooks/useApiData";
import { Ticket } from "@/types";
import { LifeBuoy, Plus, CheckCircle, Wrench, Save, UserCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function TicketsContent() {
  const { user, isAdmin, isMIS, isManager, isProcurement, userShopLocation } = useAuth();
  const isGlobalRole = isAdmin || isMIS || isManager || isProcurement;
  const canRespondTicket = isAdmin || isMIS || isManager;
  const searchParams = useSearchParams();
  const filterId = searchParams.get("id");

  // Filters
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedUrgency, setSelectedUrgency] = useState("");
  const [selectedShop, setSelectedShop] = useState(isGlobalRole ? "" : userShopLocation);

  useEffect(() => {
    if (!isGlobalRole && userShopLocation !== "Semua Toko") {
      setSelectedShop(userShopLocation);
    }
  }, [isGlobalRole, userShopLocation]);

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

  // IT Update Status Modal
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>("DIPROSES");
  const [updateAssetStatus, setUpdateAssetStatus] = useState<string>("PERBAIKAN");
  const [itNotes, setItNotes] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Query string & cache key mengikuti filter; endpoint tetap /api/tickets
  const params = new URLSearchParams();
  if (selectedStatus) params.set("status", selectedStatus);
  if (selectedUrgency) params.set("urgency", selectedUrgency);
  if (selectedShop) params.set("shop", selectedShop);
  const cacheKey = `tickets_${selectedStatus}_${selectedUrgency}_${selectedShop}`;

  const {
    data: ticketsData,
    isLoading,
    refresh: fetchTickets,
  } = useApiData<Ticket[]>(`/api/tickets?${params.toString()}`, {
    cacheKey,
    transform: (json) => {
      const res = json as { success?: boolean; data?: Ticket[] };
      return res.success && Array.isArray(res.data) ? res.data : [];
    },
  });

  const tickets = ticketsData ?? [];

  const handleOpenUpdateModal = (ticket: Ticket) => {
    setActiveTicket(ticket);
    setUpdateStatus(ticket.status === "MENUNGGU" ? "DIPROSES" : ticket.status);
    setUpdateAssetStatus(ticket.status === "SELESAI" ? "OPERASIONAL" : "PERBAIKAN");
    setItNotes(ticket.it_notes || "");
  };

  const handleSaveTicketUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tickets/${activeTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: updateStatus,
          asset_status: updateStatus === "SELESAI" ? "OPERASIONAL" : updateAssetStatus,
          it_notes: itNotes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActiveTicket(null);
        fetchTickets();
      } else {
        alert(json.message || "Gagal mengupdate tiket");
      }
    } catch (err) {
      alert("Gagal menghubungi server");
    } finally {
      setIsUpdating(false);
    }
  };

  // Buka otomatis tiket dari query ?id= setelah data termuat
  useEffect(() => {
    if (!filterId || !ticketsData) return;
    const match = ticketsData.find((t) => t.id === Number(filterId));
    if (match) handleOpenUpdateModal(match);
  }, [filterId, ticketsData]);

  return (
    <SidebarLayout onOpenScanner={() => setIsScannerOpen(true)}>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Helpdesk & Tiket Kendala SPV Toko"
          description="Pantau laporan kerusakan perangkat kasir, tindak lanjuti oleh IT Support, dan catat histori perbaikan."
          icon={LifeBuoy}
          iconClassName="text-rose-600"
          actions={
            <button
              onClick={() => setIsNewTicketOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              Buat Tiket Kendala Baru
            </button>
          }
        />

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Semua Status Penanganan</option>
              <option value="MENUNGGU">MENUNGGU (Belum Ditangani)</option>
              <option value="DIPROSES">DIPROSES (Sedang Dikerjakan)</option>
              <option value="SELESAI">SELESAI</option>
              <option value="DIBATALKAN">DIBATALKAN</option>
            </select>

            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Semua Tingkat Urgensi</option>
              <option value="DARURAT">DARURAT (POS Mati Total)</option>
              <option value="TINGGI">TINGGI (Mengganggu Transaksi)</option>
              <option value="SEDANG">SEDANG (Kendala Parsial)</option>
              <option value="RENDAH">RENDAH (Pertanyaan / Minor)</option>
            </select>

            <select
              value={selectedShop}
              disabled={!isGlobalRole}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 text-slate-800"
            >
              {isGlobalRole && <option value="">Semua Lokasi Toko</option>}
              <option value="Plaza Bali">Plaza Bali</option>
              <option value="SAM">SAM</option>
              <option value="Gudang Utama">Gudang Utama</option>
              <option value="Head Office">Head Office</option>
            </select>
          </div>
        </div>

        {/* Tickets Grid / List */}
        <div className="space-y-3">
          {isLoading ? (
            <LoadingState message="Memuat data tiket bantuan..." />
          ) : tickets.length === 0 ? (
            <EmptyState
              className="bg-white rounded-2xl border border-slate-200 p-12"
              icon={CheckCircle}
              iconClassName="text-emerald-500"
              title="Tidak ada tiket yang cocok dengan kriteria filter."
            />
          ) : (
            tickets.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-300 transition-all"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {t.ticket_number}
                    </span>

                    <StatusBadge
                      status={t.urgency}
                      variant="urgency"
                      label={`Urgensi: ${t.urgency}`}
                      className={t.urgency === "DARURAT" ? "animate-pulse" : undefined}
                    />

                    <StatusBadge status={t.status} label={`Status: ${t.status}`} />

                    <span className="text-[11px] text-slate-400 ml-auto hidden sm:inline">
                      {t.created_at}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      {t.problem_title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap">
                      {t.problem_desc}
                    </p>
                  </div>

                  {/* Context Info */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                    <div>
                      <span className="text-slate-400">Aset: </span>
                      <strong className="text-blue-700 font-mono">{t.asset_code}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Lokasi: </span>
                      <strong className="text-slate-700">{t.shop_location}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Pelapor: </span>
                      <strong className="text-slate-700">{t.reporter_name}</strong>
                    </div>
                  </div>

                  {/* IT Notes jika sudah ada tanggapan */}
                  {t.it_notes && (
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                      <UserCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-blue-800 font-semibold block text-[11px]">
                          Catatan Tindakan IT Support:
                        </strong>
                        <p className="mt-0.5 text-blue-950">{t.it_notes}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Action Button for IT/Manager vs Status for SPV */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  {canRespondTicket ? (
                    <button
                      onClick={() => handleOpenUpdateModal(t)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Tindak Lanjuti (IT)</span>
                    </button>
                  ) : (
                    <span className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 font-semibold text-slate-700 border border-slate-200">
                      {t.status === "SELESAI" ? "✓ Sudah Selesai" : t.status === "DIPROSES" ? "⏳ Sedang Dikerjakan IT" : "⏱ Menunggu Respon IT"}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* IT Support Action Modal */}
      <Modal
        isOpen={!!activeTicket}
        onClose={() => setActiveTicket(null)}
        title="Tindak Lanjuti Tiket IT"
        description={
          activeTicket ? (
            <span className="font-mono">{activeTicket.ticket_number}</span>
          ) : undefined
        }
        icon={Wrench}
        iconClassName="bg-blue-100 text-blue-600"
        size="md"
        bodyClassName="p-0"
      >
        {activeTicket && (
          <form onSubmit={handleSaveTicketUpdate} className="p-5 overflow-y-auto space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-800">{activeTicket.problem_title}</div>
                <div className="text-slate-500">{activeTicket.shop_location} • Aset: {activeTicket.asset_code}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ubah Status Tiket:
                </label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="DIPROSES">DIPROSES (Sedang Dikerjakan / Dicek IT)</option>
                  <option value="SELESAI">SELESAI (Masalah Berhasil Diatasi)</option>
                  <option value="DIBATALKAN">DIBATALKAN (False Alarm / Salah Lapor)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sinkronkan Status Aset ({activeTicket.asset_code}):
                </label>
                <select
                  value={updateStatus === "SELESAI" ? "OPERASIONAL" : updateAssetStatus}
                  disabled={updateStatus === "SELESAI"}
                  onChange={(e) => setUpdateAssetStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                >
                  <option value="OPERASIONAL">OPERASIONAL (Siap Digunakan)</option>
                  <option value="PERBAIKAN">PERBAIKAN (Sedang Diservis)</option>
                  <option value="RUSAK">RUSAK (Menunggu Part Pengganti)</option>
                  <option value="CADANGAN">CADANGAN (Disimpan di Gudang)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Jika status tiket diubah ke SELESAI, aset otomatis kembali ke status OPERASIONAL.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Teknisi IT Support: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={itNotes}
                  onChange={(e) => setItNotes(e.target.value)}
                  placeholder="Contoh: Sudah dibersihkan head printer dan diganti kabel USB. Test print struk kasir berhasil normal."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTicket(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isUpdating ? "Menyimpan..." : "Simpan Penanganan IT"}
                </button>
              </div>
            </form>
        )}
      </Modal>

      {/* New Ticket Modal */}
      <TicketModal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        onSuccess={fetchTickets}
      />

      {/* Scanner Modal */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onRequestTicket={() => setIsNewTicketOpen(true)}
      />
    </SidebarLayout>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Memuat Tiket...</div>}>
      <TicketsContent />
    </Suspense>
  );
}

