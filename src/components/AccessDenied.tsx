"use client";

import { ShieldAlert, ArrowLeft, LifeBuoy, Sparkles, Lock } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import SidebarLayout from "@/components/SidebarLayout";

interface AccessDeniedProps {
  moduleName?: string;
}

export default function AccessDenied({ moduleName = "Data Inventaris & Aset Hardware" }: AccessDeniedProps) {
  const { user, switchRole } = useAuth();

  return (
    <SidebarLayout title="Akses Dibatasi">
      <div className="flex items-center justify-center py-8 px-2 max-w-xl mx-auto w-full">
        <div className="w-full bg-white border border-slate-200/90 rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          {/* Lock / Shield Icon */}
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
              <Lock className="w-3 h-3" />
              <span>Akses Khusus Tim MIS OPS</span>
            </span>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Akses Dibatasi
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              Halaman <strong className="text-slate-900 font-bold">{moduleName}</strong> merupakan data inventaris master hardware yang hanya diizinkan untuk diakses dan dikelola oleh <strong className="text-blue-700">MIS OPS</strong>.
            </p>
          </div>

          {/* Current User Role Notice */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 text-left space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Akun Anda saat ini:</span>
              <strong className="text-slate-900 font-bold">{user?.name || "SPV Toko"}</strong>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Wewenang Role:</span>
              <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 text-[10px]">
                Operasional Kasir Toko ({user?.shop_location})
              </span>
            </div>
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/80 leading-normal">
              💡 Sebagai SPV Toko, wewenang Anda adalah memantau kelancaran kasir dan menyampaikan laporan perbaikan teknis ke IT Support.
            </p>
          </div>

          {/* Action Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Link
              href="/dashboard"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Dashboard</span>
            </Link>

            <Link
              href="/tickets"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              <LifeBuoy className="w-4 h-4" />
              <span>Lapor Tiket Kendala</span>
            </Link>
          </div>

          {/* Quick Demo Switcher if user is evaluating/testing */}
          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => switchRole("MIS")}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Ganti Akun ke MIS IT Support (Testing Demo)</span>
            </button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

