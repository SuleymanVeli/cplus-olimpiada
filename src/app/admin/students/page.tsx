'use client';

import { useState, useEffect } from 'react';
import { 
  UserPlus, MessageSquare, Clock, Copy, 
  ExternalLink, Check, Loader2, Search 
} from 'lucide-react';
import Link from 'next/link';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/admin/students');
      const data = await res.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error("Məlumat xətası:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  const generateLink = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/generate-invite', { method: 'POST' });
      if (res.ok) await fetchStudents();
    } catch (error) {
      alert("Link yaradılmadı");
    } finally {
      setActionLoading(false);
    }
  };

  const updateNote = async (studentId: string, currentNote: string) => {
    const newNote = prompt("Şagird qeydi:", currentNote || "");
    if (newNote !== null && newNote !== currentNote) {
      try {
        const res = await fetch(`/api/admin/students/note`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, note: newNote })
        });
        if (res.ok) fetchStudents();
      } catch (error) {
        alert("Xəta baş verdi");
      }
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

  const filteredStudents = students.filter((s: any) => 
    s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.inviteCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-0 pb-10 mt-20 lg:mt-0">
      
      {/* HEADER & ACTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">ŞAGİRDLƏR</h1>
          <p className="text-slate-500 text-sm font-medium">Qeydiyyat və tərəqqi izləmə paneli</p>
        </div>
        <button 
          onClick={generateLink}
          disabled={actionLoading}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
        >
          {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
          <span className="text-sm">{actionLoading ? 'Yaradılır...' : 'Yeni Link '}</span>
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 mb-6 flex items-center gap-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
        <Search className="text-slate-400 ml-3" size={18} />
        <input 
          type="text"
          placeholder="Ad və ya kod ilə axtar..."
          className="w-full bg-transparent outline-none text-sm font-bold py-2.5 text-slate-700 placeholder:font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* LIST SECTION */}
      {loading ? (
        <div className="flex flex-col items-center py-20 text-slate-400 gap-3">
          <Loader2 className="animate-spin" size={32} />
          <p className="text-xs font-black uppercase tracking-widest">Yüklənir...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredStudents.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-100 text-slate-400 text-sm font-bold italic">
              Heç bir şagird tapılmadı.
            </div>
          )}
          
          {filteredStudents.map((student: any) => (
            <div 
              key={student._id} 
              className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center gap-5 hover:border-indigo-300 hover:shadow-md transition-all group relative overflow-hidden"
            >
              {/* 1. PROFIL & STATUS */}
              <div className="flex items-center gap-4 w-full md:w-64 shrink-0">
                <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner">
                  {student.isRegistered ? (
                    <img src={`/avatars/avatar-${student.avatar}.png`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Clock size={22} className="text-slate-300 animate-pulse" />
                  )}
                  {student.isRegistered && (
                     <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-800 text-sm md:text-base truncate leading-tight">
                    {student.isRegistered ? student.fullName : "Gözləyir..."}
                  </h3>
                  <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded mt-1 inline-block border border-indigo-100/50">
                    KOD: {student.inviteCode}
                  </span>
                </div>
              </div>

              {/* 2. DİNAMİK MƏZMUN (LİNK VƏ YA QEYD) */}
              <div className="w-full flex-1">
                {!student.isRegistered ? (
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-100 text-[10px] font-mono text-slate-400 truncate">
                      {`${window.location.origin}/register?code=${student.inviteCode}`}
                    </div>
                    <button 
                      onClick={() => handleCopy(student.inviteCode, student._id)}
                      className={`shrink-0 p-2.5 rounded-lg transition-all border ${
                        copiedId === student._id 
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-500 hover:text-indigo-600 shadow-sm'
                      }`}
                    >
                      {copiedId === student._id ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => updateNote(student._id, student.globalNote)}
                    className="w-full text-left flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 border border-transparent hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group/note"
                  >
                    <MessageSquare size={16} className="text-slate-300 group-hover/note:text-indigo-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-slate-600 italic font-medium line-clamp-1">
                      {student.globalNote || "Şagird haqqında qeyd yazın..."}
                    </span>
                  </button>
                )}
              </div>

              {/* 3. AKSİYALAR */}
              <div className="flex items-center gap-2 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-50">
                <button 
                  onClick={() => updateNote(student._id, student.globalNote)}
                  disabled={!student.isRegistered}
                  className="flex-1 md:flex-none p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all disabled:opacity-10"
                >
                  <MessageSquare size={20} />
                </button>

                <Link href={student.isRegistered ? `/admin/students/${student._id}` : "#"} className="flex-[2] md:flex-none">
                  <button 
                    disabled={!student.isRegistered}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md active:scale-95 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none"
                  >
                    Detallar <ExternalLink size={14} />
                  </button>
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}