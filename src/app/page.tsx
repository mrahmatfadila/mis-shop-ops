"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Server,
  Layers,
  KeyRound,
  Store,
  Users
} from "lucide-react";
import Link from "next/link";

export default function RootLoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    if (!username.trim()) {
      setErrorMsg("Silakan masukkan Username atau NIK Anda.");
      return;
    }
    if (!password) {
      setErrorMsg("Silakan masukkan kata sandi akun Anda.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await login(username.trim().toLowerCase(), password);
      if (success) {
        router.push("/dashboard");
      } else {
        setErrorMsg("Username/NIK atau kata sandi tidak cocok.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kendala saat proses autentikasi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick helper to fill admin credentials for testing
  const handleQuickFillAdmin = () => {
    setUsername("admin");
    setPassword("admin");
    setErrorMsg("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100/60 to-emerald-50/20 text-slate-800 flex flex-col justify-between font-sans selection:bg-[#006622] selection:text-white">
      {/* Top Header Bar */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        {/* Brand with Official Plaza Bali Logo */}
        <div className="flex items-center gap-3">
          <img
            src="/logo-plazabali.png"
            alt="Plaza Bali"
            className="h-9 w-auto object-contain flex-shrink-0"
            style={{ height: "36px", width: "auto" }}
          />
          <div className="hidden xs:block border-l border-slate-200 pl-3">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[#006622] font-black text-sm tracking-tight">MIS</span>
              <span className="font-extrabold text-slate-900 text-sm tracking-tight">SHOP OPS</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">
              PT Plaza Bali Prima
            </p>
          </div>
        </div>

        {/* System Online Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/90 text-xs font-mono text-[11px] shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-semibold text-slate-700">Sistem & Database Aktif</span>
        </div>
      </header>

      {/* Main Login Workspace */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-14 max-w-4xl mx-auto w-full">
        {/* Title & Welcome Section */}
        <div className="text-center max-w-lg mx-auto mb-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[#006622] text-xs font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#006622]" />
            <span>Portal Masuk Manajemen Kasir & Inventaris IT</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Masuk ke{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#006622] via-[#00802b] to-teal-800">
              MIS Shop Ops
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            Sistem operasional kasir POS, mesin EDC, PC kantor, dan pencatatan pembelian PT Plaza Bali Prima.
          </p>
        </div>

        {/* Active Session Notice if already logged in */}
        {user && (
          <div className="w-full max-w-md mb-4 p-3 rounded-2xl bg-emerald-50/90 border border-emerald-300 flex items-center justify-between text-xs shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <div className="truncate">
                <span className="text-slate-500">Sesi tersimpan:</span>{" "}
                <strong className="text-slate-900 font-bold">{user.name}</strong>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="flex-shrink-0 inline-flex items-center gap-1 font-bold text-[#006622] hover:text-emerald-900 bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs transition-colors"
            >
              <span>Buka Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* ELEGANT ENTERPRISE LOGIN CARD */}
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6 relative">
          {/* Card Header Branding */}
          <div className="flex flex-col items-center justify-center text-center space-y-2 pb-4 border-b border-slate-100">
            <img
              src="/logo-plazabali.png"
              alt="Plaza Bali Official Logo"
              className="h-11 w-auto object-contain mx-auto"
              style={{ height: "44px", width: "auto" }}
            />
            <div className="pt-0.5">
              <p className="text-sm font-black text-slate-800 tracking-tight">
                Autentikasi Akun Pengguna
              </p>
              <p className="text-[11px] font-medium text-slate-400">
                Gunakan Username Akun atau NIK Karyawan
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / NIK Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username / NIK Karyawan
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin atau NIK SPV / IT..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006622] focus:border-transparent transition-all shadow-2xs font-mono"
                  disabled={isSubmitting}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006622] focus:border-transparent transition-all shadow-2xs"
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-[#006622]" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#006622] via-[#007327] to-emerald-700 hover:from-[#00521b] hover:to-emerald-800 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Dev Admin Helper Box */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>Akun Pengujian Dev (Superadmin):</span>
                </span>
                <button
                  type="button"
                  onClick={handleQuickFillAdmin}
                  className="px-2 py-0.5 rounded bg-purple-100 hover:bg-purple-200 text-purple-800 text-[10px] font-bold transition-colors"
                >
                  Isi Otomatis
                </button>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                User: <strong className="text-purple-700 font-bold">admin</strong> • Sandi: <strong className="text-purple-700 font-bold">admin</strong>
              </p>
              <p className="text-[10px] text-slate-400">
                Masuk sebagai Admin untuk melihat seluruh menu dan mengaktifkan fitur ganti role di sidebar.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-emerald-900 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#006622]" />
                <span>Akun SPV Toko & Tim IT Support Ops:</span>
              </p>
              <p className="text-[10px] text-slate-500">
                Gunakan NIK Karyawan terdaftar sebagai username (contoh NIK SPV: <code className="font-mono font-bold text-slate-700">1112040001</code>, NIK IT: <code className="font-mono font-bold text-slate-700">8117110002</code>, sandi default: <code className="font-mono font-bold text-slate-700">123</code> atau NIK).
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Corporate Clean Footer */}
      <footer className="border-t border-slate-200 bg-white py-3.5 px-4 text-center text-xs text-slate-400">
        <span>© {new Date().getFullYear()} PT Plaza Bali Prima — Management Information System (MIS) Operations</span>
      </footer>
    </div>
  );
}
