"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import { useAuth } from "@/context/AuthContext";
import { KnowledgeBaseArticle } from "@/types";
import {
  BookOpen,
  Search,
  Plus,
  Pin,
  CheckCircle2,
  Clock,
  Eye,
  ThumbsUp,
  FileText,
  Copy,
  Printer,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Laptop,
  CreditCard,
  Layers,
  CheckSquare,
  Square,
  Share2,
  RefreshCw,
  FolderOpen,
  ShieldCheck,
  UserCheck
} from "lucide-react";

const CATEGORIES = [
  "Semua",
  "Mesin EDC",
  "Hardware POS",
  "Printer Kasir",
  "Scanner & Periferal",
  "SOP Operasional",
  "Jaringan & CCTV",
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  "Mesin EDC": {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    iconBg: "bg-blue-600",
  },
  "Hardware POS": {
    bg: "bg-emerald-50",
    text: "text-[#006622]",
    border: "border-emerald-200",
    iconBg: "bg-[#006622]",
  },
  "Printer Kasir": {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    iconBg: "bg-amber-600",
  },
  "Scanner & Periferal": {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    iconBg: "bg-purple-600",
  },
  "SOP Operasional": {
    bg: "bg-teal-50",
    text: "text-teal-800",
    border: "border-teal-200",
    iconBg: "bg-teal-600",
  },
  "Jaringan & CCTV": {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    iconBg: "bg-indigo-600",
  },
};

function KnowledgeBaseContent() {
  const { user, isAdmin, isMIS, isManager, isSPVPlazaBali, isSPVSam } = useAuth();

  // MIS OPS, ADMIN, and MANAGER have authoring/editing permissions
  const canEdit = isMIS || isAdmin || isManager;
  const isSPV = isSPVPlazaBali || isSPVSam;

  // Data states
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [stats, setStats] = useState({
    total_articles: 0,
    pinned_count: 0,
    total_views: 0,
    total_helpful: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScope, setSelectedScope] = useState("Semua");

  // Reader Modal State
  const [readingArticle, setReadingArticle] = useState<KnowledgeBaseArticle | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [hasVotedHelpful, setHasVotedHelpful] = useState<Record<number, boolean>>({});
  const [copyToast, setCopyToast] = useState(false);

  // Editor Modal State (For MIS OPS)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeBaseArticle | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Mesin EDC");
  const [formStoreScope, setFormStoreScope] = useState("Semua Toko");
  const [formSummary, setFormSummary] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formSteps, setFormSteps] = useState<string[]>([""]);
  const [formTags, setFormTags] = useState("");
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editorError, setEditorError] = useState("");

  // Delete State
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Fetch articles from API
  const fetchArticles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/knowledge-base");
      const data = await res.json();
      if (data.success) {
        setArticles(data.articles || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Error fetching knowledge base:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  // Filtered articles
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      // Category filter
      if (selectedCategory !== "Semua" && art.category !== selectedCategory) {
        return false;
      }
      // Scope filter
      if (
        selectedScope !== "Semua" &&
        art.store_scope !== "Semua Toko" &&
        art.store_scope !== selectedScope
      ) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = art.title.toLowerCase().includes(q);
        const inSummary = art.summary.toLowerCase().includes(q);
        const inContent = art.content.toLowerCase().includes(q);
        const inTags = art.tags ? art.tags.toLowerCase().includes(q) : false;
        return inTitle || inSummary || inContent || inTags;
      }
      return true;
    });
  }, [articles, selectedCategory, selectedScope, searchQuery]);

  // Open Article Reader
  const handleOpenReader = async (article: KnowledgeBaseArticle) => {
    setReadingArticle(article);
    setCompletedSteps({});
    // Trigger view count increment
    try {
      fetch(`/api/knowledge-base/${article.id}`);
      // Optimistic increment in local state
      setArticles((prev) =>
        prev.map((a) => (a.id === article.id ? { ...a, view_count: a.view_count + 1 } : a))
      );
    } catch (e) {}
  };

  // Mark Article as Helpful (SPV Feedback)
  const handleMarkHelpful = async (id: number) => {
    if (hasVotedHelpful[id]) return;
    try {
      const res = await fetch(`/api/knowledge-base/${id}/helpful`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setHasVotedHelpful((prev) => ({ ...prev, [id]: true }));
        setArticles((prev) =>
          prev.map((a) => (a.id === id ? { ...a, helpful_count: data.helpful_count } : a))
        );
        if (readingArticle && readingArticle.id === id) {
          setReadingArticle((prev) => (prev ? { ...prev, helpful_count: data.helpful_count } : null));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Step in Reader
  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Copy SOP Steps to Clipboard
  const handleCopySteps = () => {
    if (!readingArticle) return;
    let text = `*${readingArticle.title}*\n_${readingArticle.summary}_\n\n*Langkah Penanganan:* \n`;
    try {
      const steps: string[] = JSON.parse(readingArticle.steps || "[]");
      steps.forEach((step, i) => {
        text += `${i + 1}. ${step}\n`;
      });
    } catch (e) {
      text += readingArticle.content;
    }
    text += `\n_Diterbitkan oleh: ${readingArticle.author_name} (MIS OPS)_`;

    navigator.clipboard.writeText(text);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2500);
  };

  // Open Editor Modal (Create New or Edit)
  const handleOpenEditor = (article?: KnowledgeBaseArticle) => {
    setEditorError("");
    if (article) {
      setEditingArticle(article);
      setFormTitle(article.title);
      setFormCategory(article.category);
      setFormStoreScope(article.store_scope || "Semua Toko");
      setFormSummary(article.summary);
      setFormContent(article.content);
      try {
        const parsed = JSON.parse(article.steps || "[]");
        setFormSteps(Array.isArray(parsed) && parsed.length > 0 ? parsed : [""]);
      } catch (e) {
        setFormSteps([""]);
      }
      setFormTags(article.tags || "");
      setFormIsPinned(Boolean(article.is_pinned));
    } else {
      setEditingArticle(null);
      setFormTitle("");
      setFormCategory("Mesin EDC");
      setFormStoreScope("Semua Toko");
      setFormSummary("");
      setFormContent("");
      setFormSteps(["", ""]);
      setFormTags("");
      setFormIsPinned(false);
    }
    setIsEditorOpen(true);
  };

  // Add Step Row in Editor
  const handleAddStepRow = () => {
    setFormSteps((prev) => [...prev, ""]);
  };

  // Remove Step Row in Editor
  const handleRemoveStepRow = (idx: number) => {
    setFormSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  // Update Step Row in Editor
  const handleUpdateStepRow = (idx: number, val: string) => {
    setFormSteps((prev) => {
      const clone = [...prev];
      clone[idx] = val;
      return clone;
    });
  };

  // Save Article (Create or Update)
  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setEditorError("Judul panduan SOP wajib diisi");
      return;
    }
    if (!formContent.trim()) {
      setEditorError("Konten atau langkah panduan wajib diisi");
      return;
    }

    setIsSaving(true);
    setEditorError("");

    const cleanSteps = formSteps.filter((s) => s.trim().length > 0);

    const payload = {
      title: formTitle.trim(),
      category: formCategory,
      target_role: "SPV Toko",
      store_scope: formStoreScope,
      summary: formSummary.trim() || formTitle.trim(),
      content: formContent.trim(),
      steps: cleanSteps,
      tags: formTags.trim(),
      is_pinned: formIsPinned ? 1 : 0,
      is_published: 1,
      author_name: user?.name || "MIS OPS Team",
      author_role: user?.role || "MIS",
    };

    try {
      let res;
      if (editingArticle?.id) {
        res = await fetch(`/api/knowledge-base/${editingArticle.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/knowledge-base", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        setIsEditorOpen(false);
        fetchArticles();
      } else {
        setEditorError(data.error || "Gagal menyimpan panduan");
      }
    } catch (err: any) {
      setEditorError(err.message || "Terjadi kesalahan jaringan");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Article
  const handleDeleteArticle = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus panduan SOP ini?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/knowledge-base/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (readingArticle?.id === id) {
          setReadingArticle(null);
        }
        fetchArticles();
      } else {
        alert(data.error || "Gagal menghapus panduan");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Header Card */}
        <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-gradient-to-br from-emerald-100/40 via-teal-50/20 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-50 text-[#006622] border border-emerald-200">
                  <BookOpen className="w-3.5 h-3.5 text-[#006622]" />
                  Knowledge Base & SOP Toko
                </span>

                {canEdit ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Mode Editor (MIS OPS)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <UserCheck className="w-3.5 h-3.5" />
                    Mode Pembaca (Supervisor Toko)
                  </span>
                )}

                <span className="text-xs text-slate-500 font-medium">
                  {articles.length} Panduan Siap Pakai
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Pusat Solusi Teknis & Panduan Troubleshooting Kasir
              </h1>
              <p className="text-slate-600 text-sm mt-1.5 max-w-2xl leading-relaxed">
                {canEdit
                  ? "Dikelola langsung oleh tim MIS OPS untuk dokumentasi standar penanganan error hardware, printer, EDC, dan sistem aplikasi kasir bagi seluruh SPV Toko."
                  : "Panduan praktis langkah demi langkah untuk membantu Supervisor Toko menyelesaikan kendala EDC, printer kasir macet, scanner paspor, dan restart PC kasir."}
              </p>
            </div>

            {/* Actions for MIS OPS */}
            <div className="flex items-center gap-3">
              {canEdit && (
                <button
                  onClick={() => handleOpenEditor()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#006622] hover:bg-[#00521b] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  Buat Panduan SOP Baru
                </button>
              )}

              <button
                onClick={fetchArticles}
                disabled={isLoading}
                title="Muat ulang artikel"
                className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#006622]" : ""}`} />
              </button>
            </div>
          </div>

          {/* 4 KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
              <span className="text-xs font-medium text-slate-500 block">Total Panduan</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900">
                  {stats.total_articles}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Artikel SOP</span>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
              <span className="text-xs font-medium text-amber-800 block">SOP Utama (Pinned)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-black text-amber-900">
                  {stats.pinned_count}
                </span>
                <span className="text-[11px] text-amber-700 font-medium">Prioritas Kasir</span>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
              <span className="text-xs font-medium text-blue-800 block">Total Pembaca</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-black text-blue-900">
                  {stats.total_views}
                </span>
                <span className="text-[11px] text-blue-700 font-medium">Kali Dibaca</span>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-xs font-medium text-emerald-800 block">Solusi Membantu SPV</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-black text-[#006622]">
                  {stats.total_helpful}
                </span>
                <span className="text-[11px] text-emerald-700 font-medium">Upvote Jempol</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari solusi kendala (misal: EDC offline, printer macet, restart POS, scanner paspor)..."
                className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006622]/20 focus:border-[#006622] text-sm text-slate-800 placeholder:text-slate-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Scope Filter */}
            <div className="flex items-center gap-2">
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#006622]/20"
              >
                <option value="Semua">Semua Lokasi Toko</option>
                <option value="Terminal 3">Khusus Terminal 3</option>
                <option value="Terminal 2">Khusus Terminal 2</option>
                <option value="Plaza Bali">Plaza Bali</option>
                <option value="SAM">SAM</option>
              </select>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? "bg-[#006622] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Articles List / Grid */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#006622] animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-600">Memuat panduan Knowledge Base...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl p-8">
            <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Tidak ada panduan yang cocok</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Tidak ditemukan artikel untuk kata kunci atau kategori yang dipilih.
            </p>
            {canEdit && (
              <button
                onClick={() => handleOpenEditor()}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006622] text-white text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                Buat Panduan Untuk Topik Ini
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredArticles.map((article) => {
              const colorDef = CATEGORY_COLORS[article.category] || {
                bg: "bg-slate-50",
                text: "text-slate-700",
                border: "border-slate-200",
                iconBg: "bg-slate-600",
              };

              let stepsCount = 0;
              try {
                const parsed = JSON.parse(article.steps || "[]");
                stepsCount = Array.isArray(parsed) ? parsed.length : 0;
              } catch (e) {}

              return (
                <div
                  key={article.id}
                  className={`group relative bg-white border rounded-3xl p-5 sm:p-6 transition-all hover:shadow-md hover:border-slate-300 flex flex-col justify-between ${
                    article.is_pinned
                      ? "border-amber-200/90 shadow-sm ring-1 ring-amber-100"
                      : "border-slate-200/80"
                  }`}
                >
                  <div>
                    {/* Card Badges Row */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${colorDef.bg} ${colorDef.text} ${colorDef.border}`}
                        >
                          {article.category}
                        </span>

                        {article.store_scope && article.store_scope !== "Semua Toko" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {article.store_scope}
                          </span>
                        )}
                      </div>

                      {Boolean(article.is_pinned) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                          <Pin className="w-2.5 h-2.5 fill-amber-700 text-amber-700" />
                          SOP UTAMA
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      onClick={() => handleOpenReader(article)}
                      className="text-base font-bold text-slate-900 group-hover:text-[#006622] transition-colors cursor-pointer line-clamp-2 leading-snug"
                    >
                      {article.title}
                    </h3>

                    {/* Summary */}
                    <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                      {article.summary}
                    </p>

                    {/* Step badge if available */}
                    {stepsCount > 0 && (
                      <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        <CheckSquare className="w-3.5 h-3.5 text-[#006622]" />
                        <span>{stepsCount} Langkah Penyelesaian Cepat</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-3 font-medium">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1" title="Dilihat">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          {article.view_count || 0}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 text-emerald-700"
                          title="Dinilai membantu"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {article.helpful_count || 0}
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-400">
                        Oleh: <strong className="text-slate-600 font-semibold">{article.author_name}</strong>
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenReader(article)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-[#006622] hover:text-white text-slate-700 text-xs font-bold transition-all border border-slate-200/80 hover:border-[#006622]"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Baca Panduan
                      </button>

                      {/* Author Controls */}
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditor(article)}
                            title="Edit Panduan"
                            className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteArticle(article.id!)}
                            disabled={deletingId === article.id}
                            title="Hapus Panduan"
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* READER MODAL (SPV / All users view) */}
        {readingArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#006622]/10 text-[#006622]">
                      {readingArticle.category}
                    </span>
                    {Boolean(readingArticle.is_pinned) && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-100 text-amber-800">
                        📌 PANDUAN UTAMA
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      Cakupan: {readingArticle.store_scope || "Semua Toko"}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                    {readingArticle.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Diterbitkan oleh tim{" "}
                    <strong className="text-slate-700">{readingArticle.author_name}</strong> • Diperbarui:{" "}
                    {new Date(readingArticle.updated_at || Date.now()).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <button
                  onClick={() => setReadingArticle(null)}
                  className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-800 text-sm leading-relaxed">
                {/* Summary Alert */}
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-900 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-[#006622] shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-xs uppercase tracking-wider text-[#006622]">
                      Ringkasan Solusi Cepat:
                    </strong>
                    <p className="text-sm mt-0.5 text-emerald-950 font-medium">{readingArticle.summary}</p>
                  </div>
                </div>

                {/* Checklist Steps (If provided) */}
                {(() => {
                  let steps: string[] = [];
                  try {
                    steps = JSON.parse(readingArticle.steps || "[]");
                  } catch (e) {}

                  if (!Array.isArray(steps) || steps.length === 0) return null;

                  return (
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-[#006622]" />
                          Checklist Tindakan Kasir (Centang Saat Dilakukan)
                        </h4>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {Object.values(completedSteps).filter(Boolean).length} dari {steps.length} Selesai
                        </span>
                      </div>

                      <div className="space-y-2">
                        {steps.map((st, i) => {
                          const isDone = completedSteps[i];
                          return (
                            <div
                              key={i}
                              onClick={() => toggleStep(i)}
                              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                isDone
                                  ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                                  : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                              }`}
                            >
                              <button
                                type="button"
                                className="mt-0.5 text-[#006622] shrink-0 focus:outline-none"
                              >
                                {isDone ? (
                                  <CheckSquare className="w-4 h-4 text-[#006622]" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400" />
                                )}
                              </button>
                              <span
                                className={`text-xs sm:text-sm font-medium ${
                                  isDone ? "line-through text-slate-500" : ""
                                }`}
                              >
                                <strong>Langkah {i + 1}:</strong> {st}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Main Content Details */}
                <div className="prose prose-sm max-w-none space-y-4">
                  <div className="whitespace-pre-line text-slate-700 text-sm leading-relaxed font-normal">
                    {readingArticle.content}
                  </div>
                </div>

                {/* Tags */}
                {readingArticle.tags && (
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-medium">Kata Kunci:</span>
                    {readingArticle.tags.split(",").map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium"
                      >
                        #{t.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer / Helpful Vote / Copy / Print */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
                {/* Helpful feedback */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-semibold">
                    Apakah panduan ini membantu Anda?
                  </span>
                  <button
                    onClick={() => handleMarkHelpful(readingArticle.id!)}
                    disabled={hasVotedHelpful[readingArticle.id!]}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      hasVotedHelpful[readingArticle.id!]
                        ? "bg-emerald-100 text-[#006622] border border-emerald-300"
                        : "bg-white hover:bg-emerald-50 text-slate-700 hover:text-[#006622] border border-slate-200"
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>
                      {hasVotedHelpful[readingArticle.id!]
                        ? "Terima kasih! (+1)"
                        : `Membantu (${readingArticle.helpful_count || 0})`}
                    </span>
                  </button>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySteps}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copyToast ? "Tersalin ke Clipboard!" : "Salin Langkah"}</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak SOP</span>
                  </button>

                  <button
                    onClick={() => setReadingArticle(null)}
                    className="px-4 py-2 rounded-xl bg-[#006622] text-white text-xs font-bold hover:bg-[#00521b]"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EDITOR MODAL (For MIS OPS & Admin) */}
        {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#006622] text-white">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      {editingArticle ? "Edit Panduan SOP Toko" : "Buat Panduan SOP Baru"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Khusus Tim MIS OPS • Ditujukan kepada seluruh Supervisor Toko (SPV)
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveArticle} className="p-5 sm:p-6 overflow-y-auto space-y-4">
                {editorError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{editorError}</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Judul Panduan SOP <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Contoh: SOP Mengatasi Mesin EDC Offline & Line Error BCA/BRI"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006622]/20 focus:border-[#006622] text-sm text-slate-800 font-semibold"
                    required
                  />
                </div>

                {/* Category & Store Scope */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Kategori Perangkat
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006622]/20 text-sm font-medium text-slate-800 bg-white"
                    >
                      <option value="Mesin EDC">Mesin EDC</option>
                      <option value="Hardware POS">Hardware POS</option>
                      <option value="Printer Kasir">Printer Kasir</option>
                      <option value="Scanner & Periferal">Scanner & Periferal</option>
                      <option value="SOP Operasional">SOP Operasional</option>
                      <option value="Jaringan & CCTV">Jaringan & CCTV</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Cakupan Lokasi Toko
                    </label>
                    <select
                      value={formStoreScope}
                      onChange={(e) => setFormStoreScope(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006622]/20 text-sm font-medium text-slate-800 bg-white"
                    >
                      <option value="Semua Toko">Semua Toko (T2, T3 & Surabaya)</option>
                      <option value="Terminal 3">Khusus Terminal 3 Bandara</option>
                      <option value="Terminal 2">Khusus Terminal 2 Bandara</option>
                      <option value="Plaza Bali">Plaza Bali</option>
                      <option value="SAM">SAM</option>
                    </select>
                  </div>
                </div>

                {/* Quick Summary */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ringkasan Cepat (1-2 Kalimat)
                  </label>
                  <textarea
                    rows={2}
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    placeholder="Jelaskan ringkasan masalah dan solusi cepat yang langsung terbaca oleh SPV..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006622]/20 focus:border-[#006622] text-sm text-slate-800"
                  />
                </div>

                {/* Steps Checklist Builder */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Langkah Tindakan Kasir (Checklist SPV)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddStepRow}
                      className="text-xs font-bold text-[#006622] hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Langkah
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formSteps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-6 text-center text-xs font-bold text-slate-400">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={step}
                          onChange={(e) => handleUpdateStepRow(idx, e.target.value)}
                          placeholder={`Langkah ke-${idx + 1} (misal: Periksa kabel LAN, restart dengan Kuning + Titik)`}
                          className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#006622]"
                        />
                        {formSteps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStepRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Full Markdown Content */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Konten Lengkap & SOP Teknis <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={7}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Tuliskan panduan lengkap, gejala kendala, tombol shortcut, dan catatan peringatan teknis..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006622]/20 focus:border-[#006622] text-sm text-slate-800 font-mono"
                    required
                  />
                </div>

                {/* Tags & Pinned Toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Tag Pencarian (Dipisahkan Koma)
                    </label>
                    <input
                      type="text"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      placeholder="edc, bca, restart, offline, printer, paper"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-5">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsPinned}
                        onChange={(e) => setFormIsPinned(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006622]"></div>
                    </label>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Pin ke Bagian Atas
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Jadikan SOP Prioritas utama di beranda kasir
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-[#006622] hover:bg-[#00521b] text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                  >
                    {isSaving ? "Menyimpan..." : editingArticle ? "Simpan Perubahan" : "Terbitkan Panduan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

export default function KnowledgeBasePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Memuat...</div>}>
      <KnowledgeBaseContent />
    </Suspense>
  );
}

