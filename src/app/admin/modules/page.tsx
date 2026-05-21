'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Video, FileText, X, Loader2, Save } from 'lucide-react';

interface ModuleForm {
  title: string;
  videoUrl: string;
  content: string;
  order: number;
}

export default function AdminModulesPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pop-up və Form State-ləri
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const [form, setForm] = useState<ModuleForm>({
    title: '',
    videoUrl: '',
    content: '',
    order: 1
  });

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/modules');
      const result = await res.json();
      if (result.success) {
        setModules(result.data);
      }
    } catch (err) {
      console.error("Data çəkilərkən xəta:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setValidationError(null);
    setForm({
      title: '',
      videoUrl: '',
      content: '',
      order: modules.length + 1
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (mod: any) => {
    setEditingId(mod._id);
    setValidationError(null);
    setForm({
      title: mod.title,
      videoUrl: mod.videoUrl,
      content: mod.content,
      order: mod.order
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return; // API-yə data gedərkən pop-up bağlanmasın
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Sadə Front-end Validation
    if (!form.title.trim()) return setValidationError("Modulun başlığı mütləq daxil edilməlidir!");
    if (!form.videoUrl.startsWith("http")) return setValidationError("Düzgün bir video URL-i daxil edin (http/https)!");
    if (!form.content.trim()) return setValidationError("Dərs izahı mətni boş qala bilməz!");

    setIsSubmitting(true);
    const url = editingId ? `/api/admin/modules/${editingId}` : '/api/admin/modules';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await res.json();

      if (result.success) {
        setIsModalOpen(false);
        fetchModules();
      } else {
        setValidationError(result.message || "Xəta baş verdi.");
      }
    } catch (err) {
      setValidationError("Serverlə bağlantı qurula bilmədi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-800 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* SƏHİFƏ BAŞLIĞI VƏ YARATMA DÜYMƏSİ */}
        <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">📦 MODUL İDARƏETMƏSİ</h1>
            <p className="text-xs font-semibold text-slate-400 m-0 mt-0.5">Xəritədəki əsas ulduz mövzuların siyahısı və məzmunu</p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-3 rounded-xl uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} /> Yeni Modul Əlavə Et
          </button>
        </div>

        {/* NORMALLAŞDIRILMIŞ LİST / CƏDVƏL SƏHİFƏSİ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
              <span className="text-xs font-black uppercase tracking-wider">Modullar yüklənir...</span>
            </div>
          ) : modules.length === 0 ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400 italic">
              Sistemdə hələ heç bir modul qeydə alınmayıb.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-6 w-20 text-center">Sıra (Order)</th>
                  <th className="py-4 px-6">Modul Adı</th>
                  <th className="py-4 px-6">Video Linki</th>
                  <th className="py-4 px-6 w-28 text-center">Tapşırıqlar</th>
                  <th className="py-4 px-6 w-24 text-center">Əməliyyat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {modules.map((mod) => (
                  <tr key={mod._id} className="hover:bg-slate-50/50 transition-all">
                    <td className="py-4 px-6 text-center font-black text-slate-900 bg-slate-50/30 w-20 border-r border-slate-100">
                      #{mod.order}
                    </td>
                    <td className="py-4 px-6 font-black text-sm text-slate-900 max-w-xs truncate">
                      {mod.title}
                    </td>
                    <td className="py-4 px-6 text-slate-400 font-mono text-[11px] max-w-xs truncate">
                      <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md font-sans font-bold text-[10px] mr-1.5">
                        <Video size={10} /> Video
                      </span>
                      {mod.videoUrl}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-0.5 rounded-full text-[11px] font-black">
                        <FileText size={11} /> {mod.tasks?.length || 0} Task
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleOpenEditModal(mod)}
                        className="bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-200 transition-all shadow-sm uppercase tracking-wide text-[10px] font-black"
                      >
                        Redaktə
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* 🌟 ADD / EDIT ÜÇÜN DİNAMİK POP-UP (MODAL) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-up">
            
            {/* Pop-up Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  {editingId ? "📝 Modulu Yenilə" : "🚀 Yeni Modul Yarat"}
                </h2>
                <p className="text-[11px] font-bold text-slate-400 m-0">Zəhmət olmasa bütün sahələri tam doldurun.</p>
              </div>
              <button 
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-all disabled:opacity-30"
              >
                <X size={18} />
              </button>
            </div>

            {/* Pop-up Formu (Scroll edilə bilən gövdə) */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
              
              {/* Validation Error Qutusu */}
              {validationError && (
                <div className="bg-rose-50 border-2 border-rose-100 text-rose-700 px-4 py-2.5 rounded-xl font-bold text-xs">
                  ⚠️ {validationError}
                </div>
              )}

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase block mb-1">Modulun Başlığı</label>
                  <input 
                    type="text"
                    disabled={isSubmitting}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Məsələn: Bölmə 1: Dövr Operatorları (for, while)"
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase block mb-1">Sıra Nömrəsi</label>
                  <input 
                    type="number"
                    disabled={isSubmitting}
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-black text-xs outline-none focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase block mb-1">Dərs Videosu (YouTube URL)</label>
                <input 
                  type="url"
                  disabled={isSubmitting}
                  value={form.videoUrl}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-semibold text-xs outline-none focus:border-emerald-500 font-mono disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase block mb-1">Dərsin Geniş Mətn İzahı (Markdown formatında)</label>
                <textarea 
                  rows={8}
                  disabled={isSubmitting}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="# Başlıq bura yazılır...&#10;Dərsin əsas qaydalarını uşaqların başa düşəcəyi dildə izah et."
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-medium text-xs outline-none focus:border-emerald-500 font-mono leading-relaxed disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              {/* Pop-up Footer (Hərəkət düymələri) */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs px-5 py-3 rounded-xl uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  Ləğv Et
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-6 py-3 rounded-xl uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> GÖNDƏRİLİR...
                    </>
                  ) : (
                    <>
                      <Save size={14} /> {editingId ? "Yenilikləri Saxla" : "Məlumatı Yarat"}
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Effekt Animasiyaları */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}