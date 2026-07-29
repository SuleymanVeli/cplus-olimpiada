'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Search, Edit2, Trash2, Eye, Award, 
  CheckCircle, Lock, Database, X, Code, Clock, AlertTriangle
} from 'lucide-react';

// --- INTERFACES (Mongoose Modelinə 100% Uyğun) ---
interface ISampleCase {
  input: string;
  output: string;
  explanation?: string;
}

interface ITestCase {
  input: string;
  expectedOutput: string;
  isSecret: boolean;
}

interface IQuestion {
  _id?: string;
  codeName: string; // 'A', 'B', 'C'
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[]; 
  pointsPerTest: number;
  totalTestCases: number;
  sampleCases: ISampleCase[];
  testCases: ITestCase[];
}

interface IContest {
  _id?: string;
  title: string;
  durationMinutes: number;
  startTime: string; 
  endTime: string;
  level?: number;      // Əlavə olundu (11 və ya 2)
  reqOrder?: number;   // Əlavə olundu (istənilən number)
  questions: IQuestion[];
}

export default function AdminContestGlobalJsonPage() {
  const router = useRouter();
  const [contests, setContests] = useState<IContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // --- POPUP STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedContestId, setSelectedContestId] = useState<string | null>(null);
  
  // Klassik mod üçün aktiv sual indeksi
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);

  // Form States
  const [formValues, setFormValues] = useState<IContest>({
    title: '', 
    durationMinutes: 120, 
    startTime: '', 
    endTime: '', 
    level: 1,
    reqOrder: 1,
    questions: []
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // --- GLOBAL CONTEST JSON MODE STATE ---
  const [isGlobalJsonMode, setIsGlobalJsonMode] = useState(false);
  const [globalJsonString, setGlobalJsonString] = useState('');
  const [globalJsonError, setGlobalJsonError] = useState<string | null>(null);

  const fetchContests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/contests');
      const result = await res.json();
      if (result.success) {
        setContests(result.data || []);
      }
    } catch (err) {
      console.error("Məlumat yüklənərkən xəta:", err);
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchContests(); 
  }, []);

  // --- FORM VALIDATION ---
  const validateForm = (): boolean => {
    let tempErrors: { [key: string]: string } = {};
    
    if (isGlobalJsonMode) {
      if (globalJsonError) {
        tempErrors.globalJson = "Zəhmət olmasa əvvəlcə JSON sintaksis xətasını düzəldin.";
      }
      if (!formValues.title?.trim()) {
        tempErrors.title = "JSON daxilində Contest başlığı (title) mütləqdir.";
      }
    } else {
      if (!formValues.title.trim()) tempErrors.title = "Contest başlığı mütləqdir.";
      if (!formValues.startTime) tempErrors.startTime = "Başlama tarixi seçilməyib.";
      if (!formValues.endTime) tempErrors.endTime = "Bitmə tarixi seçilməyib.";
      if (!formValues.questions || formValues.questions.length === 0) {
        tempErrors.questions = "Ən azı 1 sual əlavə edilməlidir.";
      }
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  // --- MODAL AÇMA FUNKSİYALARI ---
  const openCreateModal = () => {
    setModalMode('create');
    setSelectedContestId(null);
    
    const defaultContest: IContest = {
      title: '',
      durationMinutes: 120,
      startTime: '',
      endTime: '',
      level: 1,
      reqOrder: 1,
      questions: [
        {
          codeName: 'A',
          title: '',
          description: '',
          inputFormat: '',
          outputFormat: '',
          constraints: ['Time Limit: 1.0s', 'Memory: 256MB'],
          pointsPerTest: 20,
          totalTestCases: 0,
          sampleCases: [],
          testCases: []
        }
      ]
    };
    
    setFormValues(defaultContest);
    setActiveQuestionIndex(0);
    setGlobalJsonString(JSON.stringify(defaultContest, null, 2));
    setErrors({});
    setGlobalJsonError(null);
    setIsGlobalJsonMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (contest: IContest) => {
    setModalMode('edit');
    setSelectedContestId(contest._id || null);
    
    // Tarixləri datetime-local inputuna uyğun formata salırıq
    const formattedContest = {
      ...contest,
      level: contest.level ?? 1,
      reqOrder: contest.reqOrder ?? 1,
      startTime: contest.startTime ? new Date(contest.startTime).toISOString().slice(0, 16) : '',
      endTime: contest.endTime ? new Date(contest.endTime).toISOString().slice(0, 16) : '',
    };
    
    setFormValues(formattedContest);
    setActiveQuestionIndex(0);
    setGlobalJsonString(JSON.stringify(formattedContest, null, 2));
    setErrors({});
    setGlobalJsonError(null);
    setIsGlobalJsonMode(false);
    setIsModalOpen(true);
  };

  // --- GLOBAL JSON LIVE VALIDATION & SYNCHRONIZATION ---
  const handleGlobalJsonChange = (val: string) => {
    setGlobalJsonString(val);
    try {
      const parsed: IContest = JSON.parse(val);
      
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        // Hər sualın test massivinə görə totalTestCases sayını avtomatik hesabla
        if (parsed.questions && Array.isArray(parsed.questions)) {
          parsed.questions = parsed.questions.map(q => ({
            ...q,
            totalTestCases: q.testCases ? q.testCases.length : 0
          }));
        }
        
        setFormValues(parsed);
        setGlobalJsonError(null);
      } else {
        setGlobalJsonError("Contest məlumatları düzgün bir JSON Obyekti { ... } olmalıdır.");
      }
    } catch (e: any) {
      setGlobalJsonError(`Sintaksis Xətası: ${e.message}`);
    }
  };

  // Klassik modda yeni sual əlavə edəndə həm də JSON stringi yeniləyirik
  const addNewQuestionToContest = () => {
    const nextLetter = String.fromCharCode(65 + (formValues.questions?.length || 0));
    const newQ: IQuestion = {
      codeName: nextLetter, title: '', description: '', inputFormat: '', outputFormat: '',
      constraints: ['Time Limit: 1.0s'], pointsPerTest: 20, totalTestCases: 0, sampleCases: [], testCases: []
    };
    const updatedQs = formValues.questions ? [...formValues.questions, newQ] : [newQ];
    const newContestState = { ...formValues, questions: updatedQs };
    
    setFormValues(newContestState);
    setActiveQuestionIndex(updatedQs.length - 1);
    setGlobalJsonString(JSON.stringify(newContestState, null, 2));
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      const url = modalMode === 'create' ? '/api/admin/contests' : `/api/admin/contests?id=${selectedContestId}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(formValues)
      });
      const result = await res.json();
      if (result.success) { 
        setIsModalOpen(false); 
        fetchContests(); 
      } else { 
        alert(result.message || "Xəta baş verdi."); 
      }
    } catch (err) { 
      alert("Server xətası baş verdi."); 
    }
  };

  const filteredContests = contests.filter(c =>
    c.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-700">
      
      {/* HEADER */}
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight m-0">🏆 CONTEST / SINAQ PANELDƏN IDARƏETMƏ</h1>
          <p className="text-slate-400 font-semibold text-xs m-0 mt-0.5">Bütün sınağı tam vahid JSON strukturu ilə sürətli şəkildə qurun.</p>
        </div>
        <button onClick={openCreateModal} className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm border-b-4 border-sky-700 active:border-b-0 active:translate-y-[4px] transition-all">+ Yeni Olimpiada</button>
      </div>

      {/* SEARCH */}
      <div className="max-w-5xl mx-auto mb-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Axtar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-2 border-slate-200 pl-9 pr-4 py-2 rounded-xl text-xs font-bold outline-none focus:border-sky-400"
          />
        </div>
      </div>

      {/* LIST TABLE */}
      <div className="max-w-5xl mx-auto bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 border-b-2 border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <th className="p-4">Olimpiada / Sınaq Adı</th>
              <th className="p-4 text-center">Level / Sıra</th>
              <th className="p-4 text-center">Zaman</th>
              <th className="p-4 text-center">Suallar</th>
              <th className="p-4 text-center w-24">Əməliyyat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-semibold">
            {loading ? (
              <tr><td colSpan={5} className="p-6 text-center text-slate-400 animate-pulse uppercase text-xs font-bold">Yüklənir...</td></tr>
            ) : filteredContests.length > 0 ? (
              filteredContests.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-black text-slate-800">{c.title}</td>
                  <td className="p-4 text-center font-mono text-xs">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold border border-slate-200 mr-1">Lvl: {c.level ?? 1}</span>
                    <span className="bg-amber-50 px-2 py-0.5 rounded text-amber-700 font-bold border border-amber-200">Ord: {c.reqOrder ?? 1}</span>
                  </td>
                  <td className="p-4 text-center font-mono text-xs text-slate-500">{c.durationMinutes} dəq</td>
                  <td className="p-4 text-center"><span className="bg-purple-50 text-purple-600 px-2.5 py-0.5 rounded-full text-xs font-black border border-purple-200">{c.questions?.length || 0} Sual</span></td>
                  <td className="p-4 text-center"><button onClick={() => openEditModal(c)} className="p-1.5 text-sky-500 bg-sky-50 hover:bg-sky-500 hover:text-white border border-sky-200 rounded-lg cursor-pointer"><Edit2 size={14} /></button></td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400 uppercase text-xs font-bold">Heç bir sınaq tapılmadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ==================== GLOBAL JSON & LINEAR MODAL POPUP ==================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[94vh] overflow-hidden shadow-2xl border-2 border-slate-300 flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 border-b-2 border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-tight m-0">
                {modalMode === 'create' ? '✨ Olimpiada Sistemi' : '📝 Olimpiada Parametrləri'}
              </h2>
              
              {/* GLOBAL JSON MODE SWITCHER */}
              <button
                type="button"
                onClick={() => {
                  setIsGlobalJsonMode(!isGlobalJsonMode);
                  setGlobalJsonString(JSON.stringify(formValues, null, 2));
                  setGlobalJsonError(null);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer ${isGlobalJsonMode ? 'bg-amber-500 border-amber-600 text-white shadow-md' : 'bg-slate-900 border-slate-950 text-emerald-400'}`}
              >
                <Code size={14} /> {isGlobalJsonMode ? "Klassik Form Modu" : "Bütün Sınağı JSON Modu ilə Yaz"}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 text-left">
              
              {isGlobalJsonMode ? (
                /* ==================== REJİM 1: GLOBAL CONTEST JSON EDİTORU ==================== */
                <div className="space-y-2 bg-slate-900 p-4 rounded-2xl border-2 border-slate-950 flex flex-col min-h-[480px]">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono font-bold border-b border-slate-800 pb-2 mb-2">
                    <span>📋 Mongoose Modelinə Uyğun Tam Struktur (title, durationMinutes, startTime, endTime, level, reqOrder, questions)</span>
                    <span className="text-amber-400 uppercase font-sans text-[10px]">Global JSON Mode Active</span>
                  </div>
                  <textarea
                    value={globalJsonString}
                    onChange={(e) => handleGlobalJsonChange(e.target.value)}
                    className="w-full bg-transparent text-emerald-400 font-mono text-xs outline-none resize-none leading-relaxed flex-1 min-h-[380px]"
                    placeholder='{\n  "title": "Sınaq imtahanı",\n  "durationMinutes": 120,\n  "startTime": "2026-05-24T10:00",\n  "endTime": "2026-05-24T12:00",\n  "level": 11,\n  "reqOrder": 1,\n  "questions": []\n}'
                  />
                  {globalJsonError && (
                    <div className="bg-rose-950/50 border border-rose-800 text-rose-400 p-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 mt-2">
                      <AlertTriangle size={14} /> {globalJsonError}
                    </div>
                  )}
                </div>
              ) : (
                
                /* ==================== REJİM 2: YUXARIDAN AŞAĞIYA LINEAR KLASSİK FORM ==================== */
                <div className="space-y-6">
                  {/* Contest Başlıq və Zamanları */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">1. Sınağın Ümumi Parametrləri</span>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Sınağın / Olimpiadanın Adı *</label>
                      <input
                        type="text"
                        value={formValues.title}
                        onChange={(e) => {
                          const updated = { ...formValues, title: e.target.value };
                          setFormValues(updated);
                          setGlobalJsonString(JSON.stringify(updated, null, 2));
                        }}
                        className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-sky-400"
                        placeholder="Məs: Azercell Cup Hazırlıq Sınağı"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Müddət (Dəqiqə)</label>
                        <input
                          type="number"
                          value={formValues.durationMinutes}
                          onChange={(e) => {
                            const updated = { ...formValues, durationMinutes: parseInt(e.target.value) || 0 };
                            setFormValues(updated);
                            setGlobalJsonString(JSON.stringify(updated, null, 2));
                          }}
                          className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none"
                        />
                      </div>
                      
                      {/* LEVEL SEÇİMİ (11 və ya 2) */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Level (Səviyyə)</label>
                        <select
                          value={formValues.level ?? 1}
                          onChange={(e) => {
                            const updated = { ...formValues, level: parseInt(e.target.value) };
                            setFormValues(updated);
                            setGlobalJsonString(JSON.stringify(updated, null, 2));
                          }}
                          className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none cursor-pointer"
                        >
                          <option value={1}>Level 1</option>
                          <option value={2}>Level 2</option>
                        </select>
                      </div>

                      {/* REQORDER (İstənilən Number) */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">reqOrder (Sıra)</label>
                        <input
                          type="number"
                          value={formValues.reqOrder ?? 1}
                          onChange={(e) => {
                            const updated = { ...formValues, reqOrder: parseInt(e.target.value) || 0 };
                            setFormValues(updated);
                            setGlobalJsonString(JSON.stringify(updated, null, 2));
                          }}
                          className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Başlama Tarixi</label>
                        <input
                          type="datetime-local"
                          value={formValues.startTime}
                          onChange={(e) => {
                            const updated = { ...formValues, startTime: e.target.value };
                            setFormValues(updated);
                            setGlobalJsonString(JSON.stringify(updated, null, 2));
                          }}
                          className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Bitmə Tarixi</label>
                        <input
                          type="datetime-local"
                          value={formValues.endTime}
                          onChange={(e) => {
                            const updated = { ...formValues, endTime: e.target.value };
                            setFormValues(updated);
                            setGlobalJsonString(JSON.stringify(updated, null, 2));
                          }}
                          className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sualların siyahısı */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">2. Olimpiada Sualları Axışı</span>
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        {formValues.questions?.map((q, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveQuestionIndex(idx)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${activeQuestionIndex === idx ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}
                          >
                            Sual {q.codeName || String.fromCharCode(65 + idx)}
                          </button>
                        ))}
                        <button type="button" onClick={addNewQuestionToContest} className="px-2.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black flex items-center gap-1 border border-dashed border-emerald-300 cursor-pointer">+ Yeni Sual</button>
                      </div>
                    </div>

                    {/* Aktiv Sual Detalları (Yuxarıdan-Aşağıya Düz Xətt) */}
                    {formValues.questions?.[activeQuestionIndex] && (
                      <div className="space-y-4 bg-white border border-slate-100 p-1 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">Kod (Code Name)</label>
                            <input
                              type="text"
                              value={formValues.questions[activeQuestionIndex].codeName}
                              onChange={(e) => {
                                const copy = [...formValues.questions]; copy[activeQuestionIndex].codeName = e.target.value.toUpperCase();
                                const updated = { ...formValues, questions: copy }; setFormValues(updated); setGlobalJsonString(JSON.stringify(updated, null, 2));
                              }}
                              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-center font-mono outline-none"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">Sualın Adı *</label>
                            <input
                              type="text"
                              value={formValues.questions[activeQuestionIndex].title}
                              onChange={(e) => {
                                const copy = [...formValues.questions]; copy[activeQuestionIndex].title = e.target.value;
                                const updated = { ...formValues, questions: copy }; setFormValues(updated); setGlobalJsonString(JSON.stringify(updated, null, 2));
                              }}
                              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Məsələ Şərti (Description)</label>
                          <textarea
                            rows={3}
                            value={formValues.questions[activeQuestionIndex].description}
                            onChange={(e) => {
                              const copy = [...formValues.questions]; copy[activeQuestionIndex].description = e.target.value;
                              const updated = { ...formValues, questions: copy }; setFormValues(updated); setGlobalJsonString(JSON.stringify(updated, null, 2));
                            }}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">Giriş Formatı (Input Format)</label>
                            <input type="text" value={formValues.questions[activeQuestionIndex].inputFormat} onChange={(e) => {
                              const copy = [...formValues.questions]; copy[activeQuestionIndex].inputFormat = e.target.value;
                              const updated = { ...formValues, questions: copy }; setFormValues(updated); setGlobalJsonString(JSON.stringify(updated, null, 2));
                            }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-mono" />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">Çıxış Formatı (Output Format)</label>
                            <input type="text" value={formValues.questions[activeQuestionIndex].outputFormat} onChange={(e) => {
                              const copy = [...formValues.questions]; copy[activeQuestionIndex].outputFormat = e.target.value;
                              const updated = { ...formValues, questions: copy }; setFormValues(updated); setGlobalJsonString(JSON.stringify(updated, null, 2));
                            }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-mono" />
                          </div>
                        </div>

                        {/* Məhdudiyyətlər və Test Başına Xal */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">Test Başına Xal (pointsPerTest)</label>
                            <input type="number" value={formValues.questions[activeQuestionIndex].pointsPerTest} onChange={(e) => {
                              const copy = [...formValues.questions]; copy[activeQuestionIndex].pointsPerTest = parseInt(e.target.value) || 0;
                              const updated = { ...formValues, questions: copy }; setFormValues(updated); setGlobalJsonString(JSON.stringify(updated, null, 2));
                            }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-mono font-bold" />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">Məhdudiyyətlər (Constraints)</label>
                            <input type="text" value={formValues.questions[activeQuestionIndex].constraints?.join(', ') || ''} onChange={(e) => {
                              const copy = [...formValues.questions]; copy[activeQuestionIndex].constraints = e.target.value.split(',').map(s => s.trim());
                              const updated = { ...formValues, questions: copy }; setFormValues(updated); setGlobalJsonString(JSON.stringify(updated, null, 2));
                            }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold" placeholder="Time Limit: 1.0s, Memory: 256MB" />
                          </div>
                        </div>

                        {/* Nümunələr (Sample Cases) */}
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                          <span className="text-[11px] font-black text-slate-500 uppercase block">👀 Şagird Nümunələri (sampleCases)</span>
                          {formValues.questions[activeQuestionIndex].sampleCases?.map((sc, scIdx) => (
                            <div key={scIdx} className="flex gap-2 bg-white p-2 border rounded-xl text-xs font-mono">
                              <input type="text" placeholder="In" value={sc.input} onChange={(e) => {
                                const copy = [...formValues.questions]; copy[activeQuestionIndex].sampleCases[scIdx].input = e.target.value; setFormValues({ ...formValues, questions: copy });
                              }} className="w-1/4 border p-1 rounded" />
                              <input type="text" placeholder="Out" value={sc.output} onChange={(e) => {
                                const copy = [...formValues.questions]; copy[activeQuestionIndex].sampleCases[scIdx].output = e.target.value; setFormValues({ ...formValues, questions: copy });
                              }} className="w-1/4 border p-1 rounded" />
                              <input type="text" placeholder="İzah" value={sc.explanation || ''} onChange={(e) => {
                                const copy = [...formValues.questions]; copy[activeQuestionIndex].sampleCases[scIdx].explanation = e.target.value; setFormValues({ ...formValues, questions: copy });
                              }} className="flex-1 border p-1 rounded font-sans text-[11px]" />
                            </div>
                          ))}
                          <button type="button" onClick={() => {
                            const copy = [...formValues.questions]; copy[activeQuestionIndex].sampleCases.push({ input: '', output: '', explanation: '' });
                            const updated = { ...formValues, questions: copy }; setFormValues(updated); setGlobalJsonString(JSON.stringify(updated, null, 2));
                          }} className="w-full py-1.5 bg-white text-slate-500 border border-dashed rounded-xl font-bold text-xs">+ Nümunə Əlavə Et</button>
                        </div>

                        {/* Gizli Real Testlər (Test Cases) */}
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                          <span className="text-[11px] font-black text-slate-500 uppercase block">🔒 Sistem Yoxlanış Testləri (testCases)</span>
                          {formValues.questions[activeQuestionIndex].testCases?.map((tc, tcIdx) => (
                            <div key={tcIdx} className="flex gap-2 bg-white p-2 border rounded-xl text-xs font-mono">
                              <input type="text" placeholder="Input" value={tc.input} onChange={(e) => {
                                const copy = [...formValues.questions]; copy[activeQuestionIndex].testCases[tcIdx].input = e.target.value; setFormValues({ ...formValues, questions: copy });
                              }} className="flex-1 border p-1 rounded" />
                              <input type="text" placeholder="Expected" value={tc.expectedOutput} onChange={(e) => {
                                const copy = [...formValues.questions]; copy[activeQuestionIndex].testCases[tcIdx].expectedOutput = e.target.value; setFormValues({ ...formValues, questions: copy });
                              }} className="flex-1 border p-1 rounded" />
                              <label className="flex items-center gap-1 font-sans text-[11px] font-bold text-slate-400">
                                <input type="checkbox" checked={tc.isSecret} onChange={(e) => {
                                  const copy = [...formValues.questions]; copy[activeQuestionIndex].testCases[tcIdx].isSecret = e.target.checked; setFormValues({ ...formValues, questions: copy });
                                }} /> Gizli
                              </label>
                            </div>
                          ))}
                          <button type="button" onClick={() => {
                            const copy = [...formValues.questions]; copy[activeQuestionIndex].testCases.push({ input: '', expectedOutput: '', isSecret: true });
                            copy[activeQuestionIndex].totalTestCases = copy[activeQuestionIndex].testCases.length;
                            const updated = { ...formValues, questions: copy }; setFormValues(updated); setGlobalJsonString(JSON.stringify(updated, null, 2));
                          }} className="w-full py-1.5 bg-white text-slate-500 border border-dashed rounded-xl font-bold text-xs">+ Sistem Testi Əlavə Et</button>
                        </div>

                      </div>
                    )}
                  </div>

              </div>
                )}
              
              {/* Errors Block */}
              {Object.keys(errors).length > 0 && (
                <div className="text-rose-500 font-black text-xs mt-3 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  ⚠️ {Object.values(errors)[0]}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
              <button type="button" onClick={() => setIsModalOpen(false)} className="bg-white border text-slate-500 px-4 py-2 rounded-xl text-xs font-black uppercase cursor-pointer">Ləğv Et</button>
              <button type="button" onClick={handleSave} className="bg-sky-500 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider border-b-4 border-sky-700 active:border-b-0 active:translate-y-[4px] transition-all cursor-pointer shadow-sm">Olimpiadanı Saxla 🚀</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}