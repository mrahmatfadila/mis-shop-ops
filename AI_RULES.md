# 🏛️ STANDAR PENGEMBANGAN SISTEM: DATABASE-FIRST, CLEAN CODE & DESAIN MODERN
> **Dokumen Panduan Wajib AI & Tim Pengembang**  
> **Fokus Utama:**  
> 1. **DATABASE-FIRST ARCHITECTURE:** Semua data bisnis & tampilan wajib masuk ke database SQLite (`shop_ops.db`), dilarang di-hardcode di kode atau landing page.  
> 2. **CLEAN CODE & ZERO DUPLICATION:** Kode bersih, modular, ringkas, tanpa duplikasi (DRY).  
> 3. **HIGH PERFORMANCE (ZERO LAG):** Kecepatan respon tinggi (< 30ms) dengan SQLite WAL mode dan SWR memory cache.  
> 4. **MODERN & PROFESSIONAL DESIGN:** Standar UI/UX korporat modern berkelas dunia (Hijau Emerald Plaza Bali, Slate-900, clean layout).

---

## 🗄️ BAGIAN I: ATURAN MUTLAK DATA (DATABASE-FIRST — ZERO HARDCODING)

Semua data wajib berpusat di **Database SQLite (`shop_ops.db`)**. Dilarang keras menjadikan file kode `.tsx` atau landing page sebagai tempat penampungan data statis.

### 1. Dilarang Menaruh Data Statis di File Komponen / Landing Page
* ❌ **DILARANG KERAS:**
  * Menulis array objek data statis (mock data, dummy list, daftar aset, daftar akun) di dalam file `.tsx` atau `.ts`.
  * Mengetik angka counter manual di teks landing page/dashboard (contoh: *"Tersedia 68 unit kasir"* secara statis di JSX).
* ✅ **WAJIB:**
  * Semua data wajib diambil dari endpoint API (`/api/...`) yang mengeksekusi query ke database SQLite.
  * Angka statistik wajib berasal dari query dinamis `SELECT COUNT(*) FROM ...` di database.
  * Komponen `.tsx` dan Landing Page hanya bertindak murni sebagai **Visual Renderer (UI Template)** yang menerima data dari database melalui `fetch()` atau `props`.

### 2. Standar Penambahan Entitas & Data Baru
Ketika membuat fitur atau modul baru:
1. **Langkah 1 (Database Schema):** Buat tabel baru atau tambahkan kolom di `src/lib/db.ts` (`CREATE TABLE IF NOT EXISTS ...`).
2. **Langkah 2 (Data Seeding / Migration):** Masukkan data awal langsung ke dalam tabel database SQLite.
3. **Langkah 3 (API Endpoint):** Buat REST API route di `src/app/api/[modul]/route.ts` yang membaca dan memanipulasi data di tabel tersebut.
4. **Langkah 4 (UI Consumption):** Di komponen Next.js/React, panggil API tersebut dan tampilkan data secara dinamis ke layar.

### 3. Kecepatan Akses Database (Anti Lemot)
* Gunakan koneksi **global singleton** (`globalThis.__db`) untuk mencegah re-inisialisasi koneksi berulang kali.
* Aktifkan `PRAGMA journal_mode = WAL;` dan `PRAGMA cache_size = -64000;` agar pembacaan database non-blocking dan berlangsung dalam hitungan mikrodetik.
* Gunakan *client-side in-memory cache* (`stale-while-revalidate`) di frontend agar perpindahan halaman dan load data terasa instan (**< 30 ms**).

---

## 🎨 BAGIAN II: STANDAR DESAIN MODERN & PROFESIONAL (UI/UX KORPORAT)

Setiap halaman wajib menerapkan prinsip desain korporat kelas enterprise:

### 1. Palet Warna & Identitas Visual
* **Warna Utama (Primary Brand):** Hijau Emerald Korporat Plaza Bali (`#006622` / `emerald-700` hingga `emerald-900`).
* **Latar Belakang Bersih (Canvas):** Gunakan *off-white* netral berkelas (`bg-slate-50` / `bg-[#F8FAFC]`), hindari putih polos menyilaukan atau warna abu-abu kusam.
* **Tipografi Tajam:**
  * Judul Utama: `text-slate-900 font-black` (tegas, kontras tinggi).
  * Deskripsi/Body: `text-slate-600` (nyaman dibaca, tidak silau).
  * Metadata / Label: `text-slate-400 text-xs` atau `text-[11px] font-mono`.
* **Badge Status Subdued (Elegan, Bukan Warna Norak):**
  * Normal / Aktif: `bg-emerald-50 text-emerald-700 border-emerald-200/80`
  * Warning / Pending: `bg-amber-50 text-amber-700 border-amber-200/80`
  * Darurat / Rusak: `bg-rose-50 text-rose-700 border-rose-200/80`
  * Info / Netral: `bg-blue-50 text-blue-700 border-blue-200/80`

### 2. Struktur Kartu & Kontainer Modern
* **Rounded Corners Ramah:** `rounded-2xl` (16px) untuk kartu standar, `rounded-3xl` (24px) untuk hero card/panel utama, dan `rounded-xl` (12px) untuk tombol/input.
* **Border & Shadow Halus:**
  * Border presisi: `border border-slate-200/80`.
  * Bayangan lembut: `shadow-xs` atau `shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200`.

### 3. Tata Letak Bernapas (Visual Breathing Room)
* Padding dan spasi lega (`p-6`, `gap-4`, `space-y-6`). Dilarang menumpuk teks tanpa pemisah (*no text-walls*).
* Padukan teks dengan ikon Lucide (`w-4 h-4` atau `w-5 h-5`) dalam kontainer membulat senada (`w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center`).

### 4. Micro-Interactions & State Ramah
* Efek klik tombol aktif: `active:scale-[0.98] transition-all`.
* Hover baris tabel: `hover:bg-slate-50/80 cursor-pointer transition-colors`.
* Sediakan *Empty State* dengan ikon minimalis dan pesan yang jelas ketika data dari database kosong.

---

## ⚡ BAGIAN III: STANDAR CLEAN CODE & PENAMAAN RINGKAS

### 1. Prinsip DRY (Don't Repeat Yourself)
* Dilarang menulis ulang format tanggal, mata uang rupiah, sanitasi input, atau badge status di banyak file. Pindahkan ke fungsi reusable di [`src/lib/utils.ts`](file:///c:/Users/Lenovo/Documents/Project%20Coding/MIS%20SHOP%20OPS/src/lib/utils.ts).
* Komponen UI berulang (Modal, Search Bar, Empty State) dipusatkan di `src/components/common/`.
* Maksimal **150 - 200 baris per file**. Pecah file besar menjadi sub-komponen terpisah.

### 2. Aturan Penamaan Ringkas & Efisien (No Stuttering / No Verbose Naming)
* ❌ **SALAH (Boros memori & bertele-tele):**
  ```ts
  const userAssetPosTerminalHardwareDetailListState = [];
  function handleOpenUserAssetPosTerminalHardwareModalDialog() {}
  ```
* ✅ **BENAR (Ringkas, padat, ekspresif):**
  ```ts
  const [posList, setPosList] = useState<Asset[]>([]);
  function openModal() {}
  ```
* Gunakan boolean singkat: `isMIS`, `isOpen`, `isLoading`, `hasAccess`.

### 3. Tree-Shaking & Surgical Edits
* Import ikon spesifik: `import { Server, Database } from "lucide-react";`.
* AI wajib melakukan **Surgical Edits** (edit presisi pada bagian yang diubah saja), dilarang menulis ulang file ratusan baris secara keseluruhan tanpa alasan mendesak.

---

## 📋 CONTOH BOILERPLATE STANDAR: DATABASE-FIRST & CLEAN DESIGN

```tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Database } from "lucide-react";
import type { Asset } from "@/types";

export default function AssetListPage() {
  // 1. Data murni bersumber dari Database melalui API
  const [items, setItems] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    // Ambil data langsung dari database SQLite via API
    fetch("/api/assets")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setItems(data.data);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          {/* Angka total dinamis dari database, bukan hardcoded */}
          <h1 className="text-xl font-black text-slate-900">
            Daftar Aset ({items.length} Unit)
          </h1>
          <p className="text-xs text-slate-500">Tersinkronisasi dengan Database SQLite</p>
        </div>

        <button className="px-4 py-2 bg-[#006622] hover:bg-[#00521b] text-white rounded-xl text-xs font-bold active:scale-95 transition-all">
          Tambah Data
        </button>
      </div>
    </div>
  );
}
```

---

## 💡 PERINTAH SINGKAT UNTUK PROMPT AI
Salin dan gunakan kalimat ini saat memberikan tugas ke AI:
> *"Terapkan aturan di `AI_RULES.md`: arsitektur Database-First (semua data wajib masuk ke database SQLite, jangan di-hardcode di kode atau landing page), clean code tanpa duplikasi, dan desain UI modern profesional."*
