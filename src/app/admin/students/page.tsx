'use client';

import { useState, useEffect } from 'react';
import { 
  UserPlus, MessageSquare, Clock, Copy, ChevronDown, ChevronUp,
  ExternalLink, Check, Loader2, Search, X, Award, BookOpen, Flag
} from 'lucide-react';

export default function AdminStudents() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Şagird Seçimi və Akkordeon İndeksi
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [openExamIndex, setOpenExamIndex] = useState<number | null>(null);

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/admin/students');
      const data = await res.json();
      setStudents(data.students || []);
      if (selectedStudent) {
        const updated = data.students.find((s: any) => s._id === selectedStudent._id);
        if (updated) setSelectedStudent(updated);
      }
    } catch (error) {
      console.error("Məlumat xətası:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

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
              className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              {/* 1. İSTİFADƏÇİ ADI & XP */}
              <div className="flex items-center gap-4 w-full md:w-72 shrink-0">
                <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center relative">
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
                    {student.progress?.totalXp || 0} XP
                  </span>
                </div>
              </div>

              {/* 2. DAHA SADƏLƏŞMİŞ VIZUAL TƏRƏQQİ */}
              <div className="w-full flex-1">
                {student.isRegistered ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Hazırkı Mövzu</span>
                      <p className="text-xs font-black text-slate-700 truncate">
                        {student.progress?.currentModuleTitle || "Məlumat yoxdur"}
                      </p>
                    </div>
                    <div className="shrink-0 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg text-right">
                      <span className="text-[9px] text-indigo-400 font-bold uppercase block">Cari Addım</span>
                      <span className="text-xs font-black text-indigo-700">
                        {student.progress?.currentTaskOrder || 0}-ci Tapşırıq
                      </span>
                    </div>
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
              <div className="w-full md:w-auto shrink-0">
                <button 
                  disabled={!student.isRegistered}
                  onClick={() => { setSelectedStudent(student); setOpenExamIndex(null); }}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:bg-slate-100 disabled:text-slate-300"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-50 flex items-center justify-center p-0 md:p-6 transition-all">
          <div className="bg-white w-full h-full md:max-w-4xl md:h-[90vh] md:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <img src={`/avatars/avatar-${selectedStudent.avatar}.png`} alt="" className="w-14 h-14 rounded-xl border border-slate-200" />
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
              
              {/* BÖLMƏ 1: KURSDAKI YERİ */}
              <div className="bg-gradient-to-r from-indigo-50 to-slate-50 p-5 rounded-2xl border border-indigo-100/50 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-600 rounded-xl text-white"><BookOpen size={20}/></div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Hazırkı Mövzu</span>
                    <span className="text-xs font-black text-slate-800">{selectedStudent.progress?.currentModuleTitle}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500 rounded-xl text-white"><Flag size={20}/></div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Mövzu Daxili Sıra</span>
                    <span className="text-xs font-black text-slate-800">{selectedStudent.progress?.currentTaskOrder || 0}-ci addımda gözləyir</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500 rounded-xl text-white"><Award size={20}/></div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Ümumi Toplanan Xal</span>
                    <span className="text-xs font-black text-slate-800">{selectedStudent.progress?.totalXp || 0} XP</span>
                  </div>
                </div>
              </div>

              {/* BÖLMƏ 2: SINAQLAR (AKKORDEON STİLİNDƏ) */}
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Award size={16} className="text-indigo-600" /> Şagirdin Qatıldığı Sınaqlar ({selectedStudent.exams?.length || 0})
                </h3>

                {selectedStudent.exams?.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold italic">
                    Bu şagird hələ heç bir sınaqda iştirak etməyib.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedStudent.exams.map((exam: any, idx: number) => {
                      const isExpanded = openExamIndex === idx;
                      return (
                        <div key={idx} className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm transition-all">
                          
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
                                <span className="text-[10px] text-slate-400">
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
                                            className={`w-2.5 h-2.5 rounded-full ${
                                              status === 'passed' ? 'bg-emerald-500' : 'bg-rose-500'
                                            }`}
                                            title={`Test ${sIdx + 1}`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                    <span className={`text-xs font-black px-2 py-0.5 rounded ${
                                      q.score > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
                                    }`}>
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