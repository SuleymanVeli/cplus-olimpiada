'use client';

import { useState, useEffect } from 'react';
import {
  UserPlus, MessageSquare, Clock, Copy, ChevronDown, ChevronUp,
  ExternalLink, Check, Loader2, Search, X, Award, BookOpen, Flag,
  RefreshCw, RotateCcw, Calendar, CheckCircle2, Save
} from 'lucide-react';
import { map } from 'lodash';

export default function AdminStudents() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState<string | null>(null);
  const [updatingLimits, setUpdatingLimits] = useState<string | null>(null);

  // Şagird Seçimi və Akkordeon İndeksi
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [openExamIndex, setOpenExamIndex] = useState<number | null>(null);

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/admin/students');
      const data = await res.json();
      const studentList = data.students || [];
      setStudents(studentList);
      
      if (selectedStudent) {
        const updated = studentList.find((s: any) => s._id === selectedStudent._id);
        if (updated) setSelectedStudent(updated);
      }
    } catch (error) {
      console.error("Məlumat xətası:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  // Proqresləri Yenilə (Sync)
  const handleSyncProgress = async () => {
    if (!window.confirm("Bütün şagirdlərin proqresini yenidən hesablamaq istədiyinizdən əminsiniz?")) return;

    setSyncLoading(true);
    try {
      const res = await fetch('/api/admin/students/sync-progress', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        await fetchStudents();
      } else {
        alert("Xəta baş verdi: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Şəbəkə xətası baş verdi.");
    } finally {
      setSyncLoading(false);
    }
  };

  // Limitləri Dəyişmək (weeklyModuleLimit & weeklyLessonDays)
  const handleUpdateLimits = async (studentId: string, limits: { weeklyModuleLimit?: number; weeklyLessonDays?: number }) => {
    setUpdatingLimits(studentId);
    try {
      const res = await fetch(`/api/admin/students/update-limits`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, ...limits })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchStudents();
      } else {
        alert("Limitləri yeniləmək mümkün olmadı: " + (data.error || 'Xəta'));
      }
    } catch (error) {
      console.error(error);
      alert("Şəbəkə xətası baş verdi.");
    } finally {
      setUpdatingLimits(null);
    }
  };

  // Həftəlik Limiti Sıfırlamaq
  const handleResetWeeklyProgress = async (studentId: string, progressId?: string) => {
    if (!window.confirm("Bu şagirdin cari həftəlik keçdiyi mövzu sayını sıfırlamaq istədiyinizdən əminsiniz?")) return;

    setResetLoading(progressId || studentId);
    try {
      const res = await fetch('/api/admin/students/reset-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, progressId })
      });
      const data = await res.json();
      if (data.success) {
        alert("Həftəlik proqres sıfırlandı!");
        await fetchStudents();
      } else {
        alert("Xəta: " + (data.error || "Uğursuz oldu."));
      }
    } catch (error) {
      console.error(error);
      alert("Şəbəkə xətası baş verdi.");
    } finally {
      setResetLoading(null);
    }
  };

  const handleCopy = async (code: string, id: string) => {
    const fullLink = `${window.location.origin}/register?code=${code}`;
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Kopyalama xətası');
    }
  };

  // Qalan vaxtı hesablamaq funksiyası (Days & Hours)
  const calculateRemainingTime = (startDateStr: string, lessonDays: number = 7) => {
    if (!startDateStr) return "Məlumat yoxdur";
    const startDate = new Date(startDateStr);
    const nextWeekDate = new Date(startDate.getTime() + lessonDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = nextWeekDate.getTime() - now.getTime();

    if (diffMs <= 0) return "Həftə tamamlanıb (Açılıb)";

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days} gün ${hours} saat qalır`;
  };

  const filteredStudents = students.filter((s: any) =>
    s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.inviteCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-0 pb-10 mt-20 lg:mt-0">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">ŞAGİRDLƏR</h1>
          <p className="text-slate-500 text-sm font-medium">Tərəqqi və növbəti addım izləmə paneli</p>
        </div>
        <button
          onClick={handleSyncProgress}
          disabled={syncLoading || loading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          {syncLoading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          Proqresləri Yenilə (Sync)
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 mb-6 flex items-center gap-3 shadow-sm">
        <Search className="text-slate-400 ml-3" size={18} />
        <input
          type="text"
          placeholder="Ad və ya kod ilə axtar..."
          className="w-full bg-transparent outline-none text-sm font-bold py-2.5 text-slate-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* STUDENT LIST */}
      {loading ? (
        <div className="flex flex-col items-center py-20 text-slate-400 gap-3">
          <Loader2 className="animate-spin" size={32} />
          <p className="text-xs font-black uppercase tracking-widest">Yüklənir...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredStudents.map((student: any) => (
            <div
              key={student._id}
              className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              {/* 1. İSTİFADƏÇİ ADI & XP */}
              <div className="flex items-center gap-4 w-full lg:w-64 shrink-0">
                <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center relative shrink-0">
                  {student.isRegistered ? (
                    <img src={`/avatars/avatar-${student.avatar}.png`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Clock size={20} className="text-slate-300 animate-pulse" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-800 text-sm md:text-base truncate">
                    {student.isRegistered ? student.fullName : "Gözləyir..."}
                  </h3>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 mt-1 inline-block">
                    {student.level || 0}-ci Səviyyə
                  </span>
                </div>
              </div>

              {/* 2. DƏRS VƏ GÜN LİMİTİ AYARLARI (YENİ ƏLAVƏ) */}
              <div className="w-full lg:flex-1">
                {student.isRegistered ? (
                  <div className="flex flex-wrap items-center gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                    
                    {/* Həftəlik Gün Limiti */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black text-slate-500 uppercase">Gün:</span>
                      <select
                        value={student.weeklyLessonDays || 7}
                        disabled={updatingLimits === student._id}
                        onChange={(e) => handleUpdateLimits(student._id, { weeklyLessonDays: Number(e.target.value) })}
                        className="bg-white border border-slate-200 rounded-lg text-xs font-black px-2 py-1 text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 10, 14, 30, 100].map((d) => (
                          <option key={d} value={d}>{d} gün</option>
                        ))}
                      </select>
                    </div>

                    <span className="text-slate-300 font-bold hidden sm:inline">|</span>

                    {/* Həftəlik Mövzu Limiti */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black text-slate-500 uppercase">Mövzu Limit:</span>
                      <select
                        value={student.weeklyModuleLimit || 2}
                        disabled={updatingLimits === student._id}
                        onChange={(e) => handleUpdateLimits(student._id, { weeklyModuleLimit: Number(e.target.value) })}
                        className="bg-white border border-slate-200 rounded-lg text-xs font-black px-2 py-1 text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 10, 15, 20].map((m) => (
                          <option key={m} value={m}>{m} mövzu</option>
                        ))}
                      </select>
                    </div>

                    {updatingLimits === student._id && (
                      <Loader2 size={14} className="animate-spin text-indigo-600 ml-auto" />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-[10px] font-mono text-slate-400 truncate">
                      {`${window.location.origin}/register?code=${student.inviteCode}`}
                    </div>
                    <button onClick={() => handleCopy(student.inviteCode, student._id)} className="p-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:text-indigo-600">
                      {copiedId === student._id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                )}
              </div>

              {/* 3. DETAL DÜYMƏSİ */}
              <div className="w-full lg:w-auto shrink-0">
                <button
                  disabled={!student.isRegistered}
                  onClick={() => { setSelectedStudent(student); setOpenExamIndex(null); }}
                  className="w-full lg:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:bg-slate-100 disabled:text-slate-300 shadow-sm"
                >
                  Gedişat və Sınaqlar <ExternalLink size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- TAM EKRAN POPUP MODAL --- */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-0 md:p-6 transition-all">
          <div className="bg-white w-full h-full md:max-w-4xl md:h-[90vh] md:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-scale-up border border-slate-100">

            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <img src={`/avatars/avatar-${selectedStudent.avatar}.png`} alt="" className="w-14 h-14 rounded-2xl border border-slate-200 shadow-sm" />
                <div>
                  <h2 className="text-xl font-black text-slate-900">{selectedStudent.fullName}</h2>
                  <p className="text-xs text-slate-500 font-medium">{selectedStudent.email} • Qeydiyyat Kodu: {selectedStudent.inviteCode}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-all"
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">

              {/* BÖLMƏ 1: HƏFTƏLİK PROQRES VƏ TAYMER */}
              {map(selectedStudent.progresses, (progress, idx) => {
                const unlocked = progress?.unlockedModulesThisWeek || 0;
                const limit = selectedStudent.weeklyModuleLimit || 2;
                const isLimitReached = unlocked >= limit;
                const remainingTimeText = calculateRemainingTime(progress?.weekStartDate, selectedStudent.weeklyLessonDays);

                return (
                  <div key={idx} className="bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-white p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-5">
                    
                    {/* Əsas İzləmə Kartları */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-200"><BookOpen size={20} /></div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider">Hazırkı Mövzu</span>
                          <span className="text-xs font-black text-slate-800 truncate block">{progress?.currentModuleTitle || "Təyin edilməyib"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="p-3 bg-amber-500 rounded-xl text-white shadow-md shadow-amber-200"><Flag size={20} /></div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider">Mövzu Daxili Sıra</span>
                          <span className="text-xs font-black text-slate-800">{progress?.currentTaskOrder || 0}-ci addımda gözləyir</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="p-3 bg-emerald-500 rounded-xl text-white shadow-md shadow-emerald-200"><Award size={20} /></div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider">Ümumi Toplanan Xal</span>
                          <span className="text-xs font-black text-slate-800">{progress?.totalXp || 0} XP</span>
                        </div>
                      </div>
                    </div>

                    {/* HƏFTƏLİK LİMİT VƏ TAYMER BLOKU (YENİLƏNDİ) */}
                    <div className="bg-white p-5 rounded-2xl border border-indigo-100/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
                      
                      {/* Sol Tərəf: Mövzu Proqresi */}
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 size={16} className="text-indigo-600" /> Bu Həftə Tamamlanan Mövzu
                          </span>
                          <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${isLimitReached ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {unlocked} / {limit} Mövzu
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isLimitReached ? 'bg-rose-500' : 'bg-indigo-600'}`}
                            style={{ width: `${Math.min((unlocked / limit) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Orta Tərəf: Növbəti Həftə Taymeri */}
                      <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 shrink-0">
                        <Calendar size={18} className="text-indigo-600 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 font-black uppercase block">Növbəti Həftəyə Qalan Vaxt</span>
                          <span className="text-xs font-black text-slate-800">{remainingTimeText}</span>
                        </div>
                      </div>

                      {/* Sağ Tərəf: Sıfırlama Butonu */}
                      <button
                        onClick={() => handleResetWeeklyProgress(selectedStudent._id, progress?._id)}
                        disabled={resetLoading === (progress?._id || selectedStudent._id)}
                        className="flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 shrink-0"
                      >
                        {resetLoading === (progress?._id || selectedStudent._id) ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <RotateCcw size={16} />
                        )}
                        Limiti Sıfırla
                      </button>

                    </div>

                  </div>
                );
              })}

              {/* BÖLMƏ 2: SINAQLAR (AKKORDEON STİLİNDƏ) */}
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Award size={16} className="text-indigo-600" /> Şagirdin Qatıldığı Sınaqlar ({selectedStudent.exams?.length || 0})
                </h3>

                {selectedStudent.exams?.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold italic">
                    Bu şagird hələ heç bir sınaqda iştirak etməyib.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedStudent.exams.map((exam: any, idx: number) => {
                      const isExpanded = openExamIndex === idx;
                      return (
                        <div key={idx} className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm transition-all">

                          {/* Accordion Trigger Header */}
                          <button
                            onClick={() => setOpenExamIndex(isExpanded ? null : idx)}
                            className="w-full p-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 transition-all text-left"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-slate-900 text-white font-black text-xs px-2.5 py-1 rounded-lg">
                                {exam.totalScore} Bal
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{exam.contestTitle}</h4>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Tarix: {new Date(exam.updatedAt).toLocaleDateString('az-AZ')}
                                </span>
                              </div>
                            </div>
                            <div className="text-slate-400">
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                          </button>

                          {/* Accordion Content */}
                          {isExpanded && (
                            <div className="p-4 bg-white border-t border-slate-100 space-y-3 animate-slide-down">
                              {exam.questions.map((q: any, qIdx: number) => (
                                <div key={qIdx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl gap-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className="bg-slate-200 text-slate-800 font-black text-[11px] px-2 py-0.5 rounded">
                                      {q.codeName}
                                    </span>
                                    <span className="text-xs font-bold text-slate-700">{q.title}</span>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    {/* Test caselərin kiçik nöqtələrlə vizualı */}
                                    {q.testStatuses?.length > 0 && (
                                      <div className="flex gap-1">
                                        {q.testStatuses.map((status: string, sIdx: number) => (
                                          <span
                                            key={sIdx}
                                            className={`w-2.5 h-2.5 rounded-full ${status === 'passed' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                            title={`Test ${sIdx + 1}`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                    <span className={`text-xs font-black px-2 py-0.5 rounded ${q.score > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                      {q.score} / {q.pointsPerTest} Bal
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}