'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, X, Loader2, Save, Folder, Layers, AlignLeft, Info, HelpCircle } from 'lucide-react';

interface TopicForm {
  name: string;
  description: string;
  icon: string;
  order: number;
}

export default function AdminTopicsPage() {
  const [topics, setTopics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [form, setForm] = useState<TopicForm>({
    name: '',
    description: '',
    icon: 'forest-icon',
    order: 1
  });

  // Mövzuları bazadan yükləyirik
  useEffect(() => {
    async function loadTopics() {
      try {
        const res = await fetch('/api/admin/topics');
        const data = await res.json();
        if (data) {
          // Sıralamaya görə (order) düzürük
          const sorted = data.sort((a: any, b: any) => a.order - b.order);
          setTopics(sorted);
        }
      } catch (err) {
        console.error("Mövzular yüklənərkən xəta:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadTopics();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingTopicId(null);
    setValidationError(null);
    setForm({
      name: '',
      description: '',
      icon: 'forest-icon',
      order: topics.length + 1 // Avtomatik növbəti nömrəni verir
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (topic: any) => {
    setEditingTopicId(topic._id);
    setValidationError(null);
    setForm({
      name: topic.name,
      description: topic.description || '',
      icon: topic.icon || 'forest-icon',
      order: topic.order || 1
    });
    setIsModalOpen(true);
  };

  const handleDeleteTopic = async (id: string, name: string) => {
    if (!confirm(`"${name}" mövzusunu silmək istədiyinizdən əminsiniz? Bu mövzuya aid levellər xətalı qala bilər!`)) return;

    try {
      const res = await fetch(`/api/admin/topics?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTopics(prev => prev.filter(t => t._id !== id));
      } else {
        alert("Silinmə zamanı xəta baş verdi.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!form.name.trim()) return setValidationError("Mövzu adı mütləqdir!");

    setIsSubmitting(true);
    const url = editingTopicId ? `/api/admin/topics?id=${editingTopicId}` : '/api/admin/topics';
    const method = editingTopicId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setIsModalOpen(false);
        window.location.reload(); // Siyahını yeniləmək üçün səhifəni refresh edirik
      } else {
        const r = await res.json();
        setValidationError(r.error || "Xəta baş verdi.");
      }
    } catch {
      setValidationError("Serverlə əlaqə qurularkən xəta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* TOP PANEL */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <h1 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Layers className="text-emerald-600" size={20} /> MagiForest Mövzuları (Topics)
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">C++ və Python kurs xəritəsinin ana mövzularının siyahısı və nizamlanması</p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} /> Yeni Mövzu Əlavə Et
          </button>
        </div>

        {/* LIST TABLE / LOADING STATE */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border p-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="animate-spin text-emerald-600" size={24} />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mövzular Yüklənir...</span>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs font-bold text-slate-700">
              <thead className="bg-slate-50/70 text-[10px] text-slate-400 uppercase tracking-wider border-b">
                <tr>
                  <th className="p-4 text-center w-20">Sıra (Order)</th>
                  <th className="p-4 w-16 text-center">İkon</th>
                  <th className="p-4">Mövzu Adı</th>
                  <th className="p-4">Açıqlama</th>
                  <th className="p-4 text-center w-32">Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topics.map((topic) => (
                  <tr key={topic._id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4 text-center font-mono text-slate-400">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-bold">
                        #{topic.order}
                      </span>
                    </td>
                    <td className="p-4 text-center text-base">
                      <span className="bg-emerald-50 text-emerald-700 p-2 rounded-xl inline-block border border-emerald-100">
                        🌳
                      </span>
                    </td>
                    <td className="p-4 font-black text-slate-900 text-sm">
                      {topic.name}
                    </td>
                    <td className="p-4 text-slate-500 font-normal max-w-xs truncate">
                      {topic.description || <span className="text-slate-300 italic">Açıqlama yoxdur</span>}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex gap-1.5 justify-center">
                        <button
                          onClick={() => handleOpenEditModal(topic)}
                          className="bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-700 p-2 rounded-xl border border-slate-200 hover:border-sky-200 transition-all"
                          title="Redaktə et"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteTopic(topic._id, topic.name)}
                          className="bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 p-2 rounded-xl border border-slate-200 hover:border-rose-200 transition-all"
                          title="Sil"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {topics.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                      Hələ ki heç bir mövzu əlavə edilməyib.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                {editingTopicId ? "Mövzunu Redaktə Et" : "Yeni Mövzu Yarat"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {validationError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs font-bold">
                  ⚠️ {validationError}
                </div>
              )}

              {/* MÖVZU ADI */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Folder size={11} /> Mövzu Adı (Unikal)
                </label>
                <input
                  type="text"
                  placeholder="Məs: Dəyişənlər və Operatorlar"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              {/* SIRALAMA VƏ İKON */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <AlignLeft size={11} /> Sıralama nömrəsi
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-center bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <HelpCircle size={11} /> UI İkon adı
                  </label>
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono text-center bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              {/* AÇIQLAMA */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Info size={11} /> Qısa Açıqlama (Açıq sözlər)
                </label>
                <textarea
                  rows={3}
                  placeholder="Bu bölmədə uşaqlar int, string tiplərini və riyazi operatorları öyrənir..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-xs font-medium resize-none focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* DÜYMƏLƏR */}
              <div className="flex justify-end gap-2 border-t pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 text-slate-600 font-bold text-xs px-4 py-2 rounded-xl"
                >
                  Ləğv Et
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />} 
                  {editingTopicId ? "Dəyişiklikləri Saxla" : "Mövzunu Yarat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}