"use client";

import { useState, useEffect } from "react";
import { X, Send, LifeBuoy, AlertTriangle, CheckCircle } from "lucide-react";
import { Asset } from "@/types";
import { useAuth } from "@/context/AuthContext";

interface TicketModalProps {
  isOpen: boolean;
  asset?: Asset | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TicketModal({
  isOpen,
  asset,
  onClose,
  onSuccess,
}: TicketModalProps) {
  const { user, isMIS, userShopLocation } = useAuth();

  const [formData, setFormData] = useState({
    asset_code: asset?.asset_code || "",
    shop_location: asset?.shop_location || (userShopLocation !== "Semua Toko" ? userShopLocation : "Plaza Bali"),
    reporter_name: user?.name || "",
    urgency: "SEDANG" as "RENDAH" | "SEDANG" | "TINGGI" | "DARURAT",
    problem_title: "",
    problem_desc: "",
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        shop_location: asset?.shop_location || (userShopLocation !== "Semua Toko" ? userShopLocation : prev.shop_location),
        reporter_name: user.name,
      }));
    }
  }, [user, asset, userShopLocation]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultTicketNumber, setResultTicketNumber] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          asset_code: asset?.asset_code || formData.asset_code,
          shop_location: asset?.shop_location || formData.shop_location,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setResultTicketNumber(json.ticket_number);
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(json.message || "Gagal membuat tiket.");
      }
    } catch (err: any) {
      setErrorMsg("Gagal menghubungi server. Pastikan komputer IT aktif.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setResultTicketNumber(null);
    setFormData({
      asset_code: "",
      shop_location: "Toko Senayan",
      reporter_name: "",
      urgency: "SEDANG",
      problem_title: "",
      problem_desc: "",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Lapor Masalah / Tiket IT</h3>
              <p className="text-xs text-slate-500">Kirim laporan kendala teknis toko langsung ke IT Support</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {resultTicketNumber ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Tiket Berhasil Terkirim!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Nomor Referensi Tiket Bantuan:
                </p>
                <div className="mt-2 inline-block px-4 py-2 bg-slate-100 rounded-xl font-mono font-bold text-blue-700 text-base border border-slate-300">
                  {resultTicketNumber}
                </div>
              </div>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Tim IT Support di komputer server telah menerima notifikasi tiket ini dan akan segera menindaklanjuti.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-4 px-6 py-2.5 bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700"
              >
                Kembali ke Beranda
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Asset Pre-filled Card jika ada */}
              {asset && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-blue-600 font-semibold block uppercase">Aset Terkait:</span>
                    <strong className="text-blue-950 font-bold">{asset.name}</strong> ({asset.asset_code})
                    <p className="text-blue-700 text-[11px]">{asset.shop_location} • {asset.brand_model}</p>
                  </div>
                </div>
              )}

              {!asset && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Aset: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.asset_code}
                    onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                    placeholder="Contoh: AST-POS-001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs uppercase font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Pelapor (SPV/Kasir): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.reporter_name}
                    onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                    placeholder="Nama SPV / Kasir"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tingkat Urgensi:
                  </label>
                  <select
                    value={formData.urgency}
                    onChange={(e: any) => setFormData({ ...formData, urgency: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="RENDAH">Rendah (Pertanyaan / Minor)</option>
                    <option value="SEDANG">Sedang (Kendala Parsial)</option>
                    <option value="TINGGI">Tinggi (Mengganggu Transaksi)</option>
                    <option value="DARURAT">Darurat (POS Mati Total)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Kendala: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.problem_title}
                  onChange={(e) => setFormData({ ...formData, problem_title: e.target.value })}
                  placeholder="Contoh: Kertas printer kasir 1 macet / POS tidak bisa cetak QRIS"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Detail Penjelasan Masalah: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.problem_desc}
                  onChange={(e) => setFormData({ ...formData, problem_desc: e.target.value })}
                  placeholder="Jelaskan kronologi kejadian, pesan error di layar POS, atau tindakan yang sudah dicoba..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                ></textarea>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-semibold text-xs rounded-xl shadow-md shadow-rose-600/20 active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? "Mengirim Laporan..." : "Kirim Tiket ke IT Support"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

