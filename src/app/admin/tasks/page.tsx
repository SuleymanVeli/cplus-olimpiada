'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, X, Loader2, Save, Layers, HelpCircle } from 'lucide-react';

interface TestCaseForm {
  input: string;
  output: string;
  isSample: boolean;
}

interface TaskForm {
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  points: number;
  order: number;
}

export default function AdminTasksPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // Pop-up və Form State-ləri
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [form, setForm] = useState<TaskForm>({
    title: '',
    description: '',
    inputFormat: '',
    outputFormat: '',
    constraints: '',
    points: 10,
    order: 1,
  });
  
  const [testCases, setTestCases] = useState<TestCaseForm[]>([
    { input: '', output: '', isSample: false }
  ]);

  // İlk növbədə filtrləmə üçün modulları API-dən çəkirik
  useEffect(() => {
    async function loadModules() {
      try {
        const res = await fetch('/api/admin/modules');
        const result = await res.json();
        if (result.success && result.data.length > 0) {
          setModules(result.data);
          setSelectedModuleId(result.data[0]._id);
        }
      } catch (err) {
        console.error("Modullar yüklənərkən xəta:", err);
      }
    }
    loadModules();
  }, []);

  // Seçilmiş modul dəyişdikdə tapşırıq siyahısını yeniləyirik
  useEffect(() => {
    if (selectedModuleId) {
      fetchTasks(selectedModuleId);
    }
  }, [selectedModuleId]);

  const fetchTasks = async (modId: string) => {
    setIsLoadingTasks(true);
    try {
      const res = await fetch(`/api/admin/tasks?moduleId=${modId}`);
      const result = await res.json();
      if (result.success) setTasks(result.data);
    } catch (err) {
      console.error("Tasklar gətirilərkən xəta:", err);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingTaskId(null);
    setValidationError(null);
    setForm({
      title: '',
      description: '',
      inputFormat: '',
      outputFormat: '',
      constraints: '',
      points: 10,
      order: tasks.length + 1,
    });
    setTestCases([{ input: '', output: '', isSample: false }]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: any) => {
    setEditingTaskId(task._id);
    setValidationError(null);
    setForm({
      title: task.title,
      description: task.description,
      inputFormat: task.inputFormat,
      outputFormat: task.outputFormat,
      constraints: task.constraints || '',
      points: task.points,
      order: task.order,
    });
    setTestCases(task.testCases || [{ input: '', output: '', isSample: false }]);
    setIsModalOpen(true);
  };

  // Dinamik Test Case Sətirlərinin İdarəsi
  const handleAddTestCaseRow = () => {
    setTestCases([...testCases, { input: '', output: '', isSample: false }]);
  };

  const handleRemoveTestCaseRow = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleTestCaseChange = (index: number, field: keyof TestCaseForm, value: any) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Form Validasiyası
    if (!form.title.trim()) return setValidationError("Tapşırıq adı boş qala bilməz!");
    if (!form.description.trim()) return setValidationError("Məsələnin şərti mütləq daxil edilməlidir!");
    if (!form.inputFormat.trim()) return setValidationError("Giriş verilənlərinin formatı qeyd olunmalıdır!");
    if (!form.outputFormat.trim()) return setValidationError("Çıxış verilənlərinin formatı qeyd olunmalıdır!");
    
    // Test Case Validasiyası
    for (let i = 0; i < testCases.length; i++) {
      if (!testCases[i].input.trim() || !testCases[i].output.trim()) {
        return setValidationError(`Test Case #${i + 1}-in giriş və ya çıxış sahəsi boş qala bilməz!`);
      }
    }

    setIsSubmitting(true);
    const url = editingTaskId ? `/api/admin/tasks/${editingTaskId}` : '/api/admin/tasks';
    const method = editingTaskId ? 'PUT' : 'POST';

    const payload = {
      ...form,
      moduleId: selectedModuleId,
      testCases: testCases.map(tc => ({
        input: tc.input.trim(),
        output: tc.output.trim(),
        isSample: tc.isSample
      }))
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result.success) {
        setIsModalOpen(false);
        fetchTasks(selectedModuleId);
      } else {
        setValidationError(result.message || "Xəta baş verdi.");
      }
    } catch (err) {
      setValidationError("Serverlə bağlantı xətası.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-800 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ÜST FİLTR BAR-I VƏ ƏLAVƏ ET DÜYMƏSİ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-sky-50 p-2.5 rounded-xl text-sky-600 border border-sky-100">
              <Layers size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Aktiv Mövzu Filtri</span>
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="py-1 border-b-2 border-slate-200 text-sm font-black bg-transparent text-slate-800 outline-none focus:border-sky-500 cursor-pointer pr-4"
              >
                {modules.map(m => (
                  <option key={m._id} value={m._id}>{m.order}. {m.title}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleOpenCreateModal}
            disabled={modules.length === 0}
            className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white font-black text-xs px-5 py-3 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40"
          >
            <Plus size={15} /> Yeni Arena Tapşırığı Qur
          </button>
        </div>

        {/* NORMALLAŞDIRILMIŞ TAPŞIRIQ CƏDVƏLİ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoadingTasks ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="animate-spin text-sky-500" size={32} />
              <span className="text-xs font-black uppercase tracking-wider">Tapşırıqlar yüklənir...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400 italic">
              Seçilmiş mövzuya aid hələ heç bir arena tapşırığı əlavə edilməyib.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-6 w-20 text-center">Arena No</th>
                  <th className="py-4 px-6">Tapşırığın Adı</th>
                  <th className="py-4 px-6">Xal (Points)</th>
                  <th className="py-4 px-6 w-32 text-center">Sınaq Testləri</th>
                  <th className="py-4 px-6 w-24 text-center">Əməliyyat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {tasks.map((task) => (
                  <tr key={task._id} className="hover:bg-slate-50/50 transition-all">
                    <td className="py-4 px-6 text-center font-black text-slate-900 bg-slate-50/30 w-20 border-r border-slate-100">
                      #{task.order}
                    </td>
                    <td className="py-4 px-6 font-black text-sm text-slate-900 max-w-xs truncate">
                      {task.title}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                        +{task.points} XP
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md text-[11px] font-black font-mono">
                        {task.testCases?.length || 0} Cases
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleOpenEditModal(task)}
                        className="bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-sky-200 transition-all shadow-sm uppercase tracking-wide text-[10px] font-black"
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

      {/* 🌟 ADD / EDIT ÜÇÜN BÖYÜK TAPŞIRIQ POP-UP-I */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden max-h-[92vh] flex flex-col animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  {editingTaskId ? "📝 Tapşırığı Redaktə Et" : "⚔️ Yeni Arena Məsələsi Yarat"}
                </h2>
                <p className="text-[11px] font-bold text-slate-400 m-0">Wandbox kompilyatoru üçün test case-ləri tam dəqiq yazın.</p>
              </div>
              <button 
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-all disabled:opacity-30"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
              
              {validationError && (
                <div className="bg-rose-50 border-2 border-rose-100 text-rose-700 px-4 py-2.5 rounded-xl font-bold text-xs">
                  ⚠️ {validationError}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase block mb-1">Məsələnin Adı (Title)</label>
                  <input 
                    type="text" disabled={isSubmitting}
                    value={form.title}
                    onChange={(e) => setForm({...form, title: e.target.value})}
                    placeholder="Məsələn: İki ədədin cəmi"
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-sky-500 disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase block mb-1">Modul İçi Sıra (Order)</label>
                  <input 
                    type="number" disabled={isSubmitting}
                    value={form.order}
                    onChange={(e) => setForm({...form, order: Number(e.target.value)})}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-black text-xs outline-none focus:border-sky-500 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase block mb-1">Məsələnin Şərti / Nağılı (Description)</label>
                <textarea 
                  rows={4} disabled={isSubmitting}
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  placeholder="Sehrli meşədə iki sincab qoz toplayır..."
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-medium text-xs outline-none focus:border-sky-500 font-mono leading-relaxed disabled:bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase block mb-1">Giriş Formatı (Input Format)</label>
                  <input 
                    type="text" disabled={isSubmitting}
                    value={form.inputFormat}
                    onChange={(e) => setForm({...form, inputFormat: e.target.value})}
                    placeholder="Girişdə iki tam ədəd daxil edilir."
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-semibold text-xs outline-none focus:border-sky-500 disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase block mb-1">Çıxış Formatı (Output Format)</label>
                  <input 
                    type="text" disabled={isSubmitting}
                    value={form.outputFormat}
                    onChange={(e) => setForm({...form, outputFormat: e.target.value})}
                    placeholder="Ekrana ədədlərin cəmini çıxarın."
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-semibold text-xs outline-none focus:border-sky-500 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase block mb-1">Məhdudiyyətlər (Constraints)</label>
                  <input 
                    type="text" disabled={isSubmitting}
                    value={form.constraints}
                    onChange={(e) => setForm({...form, constraints: e.target.value})}
                    placeholder="Məsələn: 1 <= A, B <= 10^5"
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-sky-500 font-mono disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase block mb-1">XP / Mükafat Balı</label>
                  <input 
                    type="number" disabled={isSubmitting}
                    value={form.points}
                    onChange={(e) => setForm({...form, points: Number(e.target.value)})}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-black text-xs outline-none focus:border-sky-500 disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* DİNAMİK SUBDOCUMENT TEST CASE SƏTİRLƏRİ */}
              <div className="border-2 border-dashed border-slate-200 p-4 rounded-2xl space-y-3 bg-slate-50/50">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black text-slate-500 tracking-wider uppercase flex items-center gap-1">
                    <HelpCircle size={14} className="text-sky-500" /> WANDBOX REALLIĞI: TEST CASE-LƏR
                  </span>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleAddTestCaseRow}
                    className="bg-white hover:bg-sky-50 text-sky-600 border border-slate-200 font-black text-[10px] px-2.5 py-1.5 rounded-lg uppercase tracking-wide transition-all flex items-center gap-1 disabled:opacity-50"
                  >
                    + Yeni Test Əlavə Et
                  </button>
                </div>

                {testCases.map((tc, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 items-end sm:items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex-1 w-full">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase mb-0.5">Giriş (Input)</span>
                      <textarea
                        rows={1} required disabled={isSubmitting}
                        value={tc.input}
                        onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                        placeholder="Məs: 5 10"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-sky-400 disabled:bg-slate-50"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase mb-0.5">Gözlənilən Çıxış (Output)</span>
                      <textarea
                        rows={1} required disabled={isSubmitting}
                        value={tc.output}
                        onChange={(e) => handleTestCaseChange(index, 'output', e.target.value)}
                        placeholder="Məs: 15"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-sky-400 disabled:bg-slate-50"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 sm:pt-4">
                      <div className="flex items-center gap-1 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200">
                        <input
                          type="checkbox"
                          disabled={isSubmitting}
                          checked={tc.isSample}
                          id={`modal-sample-${index}`}
                          onChange={(e) => handleTestCaseChange(index, 'isSample', e.target.checked)}
                          className="w-3.5 h-3.5 text-sky-600 border-slate-300 rounded"
                        />
                        <label htmlFor={`modal-sample-${index}`} className="text-[10px] font-black text-slate-400 cursor-pointer select-none whitespace-nowrap">Nümunə</label>
                      </div>

                      {testCases.length > 1 && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleRemoveTestCaseRow(index)}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-all disabled:opacity-30"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Pop-up Footer Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 bg-white">
                <button
                  type="button"
                  onClick={() => !isSubmitting && setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs px-5 py-3 rounded-xl uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  İmtina Et
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-black text-xs px-6 py-3 rounded-xl uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> SAXLANILIR...
                    </>
                  ) : (
                    <>
                      <Save size={14} /> {editingTaskId ? "Dəyişiklikləri Yenilə" : "Məsələni Yarat"}
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Pop-up Animasiyaları */}
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}