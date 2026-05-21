'use client';

import { useState, useEffect, use } from 'react';
import Editor from '@monaco-editor/react';
import { ArrowLeft, MessageSquare, CloudCheck, Loader2, Sparkles, Trophy, ShieldAlert, Cpu } from 'lucide-react';
import Link from 'next/link';

// 🦊 Sizin Xüsusi Heyvan Mentor Siyahınız
const animalsData = [
  { id: 1, nameAz: "Canavar", nameEn: "Wolf", image: "1.jpg" },
  { id: 2, nameAz: "Kirpi", nameEn: "Hedgehog", image: "2.jpg" },
  { id: 3, nameAz: "Ayı", nameEn: "Bear", image: "3.jpg" },
  { id: 4, nameAz: "Tısbağa", nameEn: "Turtle", image: "4.jpg" },
  { id: 5, nameAz: "Bəbir", nameEn: "Leopard", image: "5.jpg" },
  { id: 6, nameAz: "Sincab (Zolaqlı)", nameEn: "Chipmunk", image: "6.jpg" },
  { id: 7, nameAz: "Maral", nameEn: "Deer", image: "7.jpg" },
  { id: 8, nameAz: "Bayquş", nameEn: "Owl", image: "8.jpg" },
  { id: 9, nameAz: "Sığın", nameEn: "Moose", image: "9.jpg" },
  { id: 10, nameAz: "Dələ", nameEn: "Squirrel", image: "10.jpg" },
  { id: 11, nameAz: "Bizon", nameEn: "Bison", image: "11.jpg" },
  { id: 12, nameAz: "Tənbəllər", nameEn: "Sloth", image: "12.jpg" },
  { id: 13, nameAz: "Surikat", nameEn: "Meerkat", image: "13.jpg" }
];

export default function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [submission, setSubmission] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("");

  useEffect(() => {
    fetch(`/api/submissions/${id}`)
      .then(res => res.json())
      .then(data => {
        setSubmission(data?.data);
        if (data?.data?.answers?.length > 0) {
          setAnswers(data.data.answers);
        } else {
          const initialAnswers = data?.data?.taskId?.tasks.map((t: any) => ({
            questionId: t._id,
            questionTitle: t.title,
            studentCode: "",
            adminNote: ""
          }));
          setAnswers(initialAnswers || []);
        }
      });
  }, [id]);

  useEffect(() => {
    if (!submission || answers.length === 0) return;
    const delayDebounceFn = setTimeout(() => autoSave(), 1500);
    return () => clearTimeout(delayDebounceFn);
  }, [answers]);

  const autoSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/student/submit-task', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: id, answers })
      });
      if (res.ok) setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCodeChange = (index: number, val: string) => {
    const updated = [...answers];
    updated[index].studentCode = val;
    setAnswers(updated);
  };

  if (!submission) {
    return (
      <div className="min-h-screen bg-[#0f172a] p-8 flex flex-col justify-center items-center">
        <div className="w-full max-w-[1000px] animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded-lg w-32" />
          <div className="h-40 bg-slate-800 rounded-2xl" />
          <div className="h-72 bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 md:px-8 bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a] text-slate-100 font-sans antialiased selection:bg-indigo-500/30">
      
      {/* ☁️ TOP FLOATING NOTIFICATION BAR (Duolingo Style Animation) */}
      <div className="fixed top-6 left-0 right-0 z-[500] flex justify-center pointer-events-none px-4">
        <div className={`
          flex items-center gap-3 px-6 py-3 rounded-2xl border backdrop-blur-md shadow-[0_15px_40px_rgba(0,0,0,0.5)] transition-all duration-500 pointer-events-auto transform
          ${isSaving 
            ? 'bg-indigo-600/90 border-indigo-400 text-white translate-y-0 scale-100 opacity-100' 
            : lastSaved 
              ? 'bg-emerald-600/90 border-emerald-400 text-white translate-y-0 scale-100 opacity-100' 
              : 'opacity-0 -translate-y-12 scale-95 pointer-events-none'}
        `}>
          {isSaving ? (
            <Loader2 className="animate-spin text-indigo-200" size={18} />
          ) : (
            <CloudCheck className="text-emerald-200 animate-bounce" size={18} />
          )}
          <span className="text-xs font-black uppercase tracking-widest font-mono">
            {isSaving ? "Kod Buluda Yazılır..." : `Sinxronlaşdı: ${lastSaved}`}
          </span>
        </div>
      </div>

      <div className="max-w-[1050px] mx-auto relative">
        
        {/* BACK ACTION */}
        <Link href="/student/dashboard" className="inline-flex items-center gap-2.5 text-slate-400 hover:text-indigo-400 mb-8 transition-all font-black text-xs tracking-widest group bg-slate-800/40 px-4 py-2 rounded-xl border border-slate-700/50 hover:bg-slate-800">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> ARENAYA QAYIT
        </Link>

        {/* MAIN TITLE HEADER */}
        <header className="mb-10 relative bg-slate-800/40 border border-slate-700/40 rounded-3xl p-6 md:p-8 backdrop-blur-sm overflow-hidden shadow-xl">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-3">
             <div className="h-[2px] w-8 bg-indigo-500" />
             <span className="text-xs font-black uppercase tracking-[0.25em] text-indigo-400">KODLAMA ARENASI • MODUL 04</span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight mb-4 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            {submission.taskId.title}
          </h1>
          
          <div className="flex flex-wrap gap-2.5">
             <div className="bg-slate-900/60 border border-slate-700/60 px-4 py-2 rounded-xl flex items-center gap-2 text-slate-300">
                <Cpu size={14} className="text-indigo-400" />
                <span className="text-xs font-black uppercase tracking-wider font-mono">GCC C++ 17</span>
             </div>
             <div className="bg-indigo-950/40 border border-indigo-800/50 px-4 py-2 rounded-xl flex items-center gap-2 text-indigo-300">
                <Sparkles size={14} className="text-indigo-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider font-mono">Avtomatik Saxlama Aktiv</span>
             </div>
          </div>
        </header>

        {/* 📖 CONTEXT / THEORY BOX */}
        <section className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-indigo-950 rounded-3xl p-6 md:p-8 mb-12 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
          
          <h2 className="text-white text-lg font-black flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Trophy size={18} />
            </div>
            Ustad Köməkçisi (Nəzəriyyə)
          </h2>
          
          <div 
            dangerouslySetInnerHTML={{ __html: submission.taskId.lessonHtml }} 
            className="prose prose-invert max-w-none text-slate-300 leading-relaxed font-medium text-sm md:text-base prose-headings:text-white prose-a:text-indigo-400"
          />
        </section>

        {/* ⚔️ QUEST TASKS ITERATION */}
        <div className="space-y-14">
          {answers.map((ans: any, index: number) => {
            // Sıraya görə dinamik heyvan seçimi
            const assignedAnimal = animalsData[index % animalsData.length];

            return (
              <article key={index} className="relative group/task">
                
                {/* Task Numbering Header Ribbon */}
                <div className="flex items-center gap-4 mb-4">
                   <div className="text-3xl md:text-4xl font-black text-indigo-500/20 group-hover/task:text-indigo-500/40 transition-colors font-mono tabular-nums">
                     0{index + 1}
                   </div>
                   <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-700 to-transparent" />
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-800/50 border border-slate-700/30 px-3 py-1 rounded-md">
                     {ans.questionTitle}
                   </h3>
                </div>

                {/* RPG Main Interaction Container */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl backdrop-blur-xs group-hover/task:border-slate-700 transition-all duration-300">
                  
                  {/* 💬 QUEST DIALOGUE BOX (Animal Mentor Asks the Question) */}
                  <div className="p-6 md:p-8 bg-gradient-to-r from-slate-950/40 via-slate-900/40 to-transparent border-b border-slate-800/80 flex flex-col sm:flex-row gap-5 items-start">
                    
                    {/* Animal Figure */}
                    <div className="flex flex-col items-center flex-shrink-0 mx-auto sm:mx-0">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-4 border-slate-800 bg-slate-900 shadow-md transition-transform group-hover/task:scale-105 duration-300 relative">
                        <img 
                          src={`/animals/${assignedAnimal.image}`} 
                          alt={assignedAnimal.nameAz}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-[10px] font-black mt-2 bg-indigo-950 text-indigo-300 border border-indigo-900 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {assignedAnimal.nameAz}
                      </span>
                    </div>

                    {/* Speech Bubble Content */}
                    <div className="flex-1 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative w-full shadow-inner">
                      {/* Left Arrow for Desktop Bubble */}
                      <div className="hidden sm:block absolute top-6 -left-1.5 w-3 h-3 bg-slate-900 border-l border-b border-slate-800 rotate-45" />
                      
                      <div 
                        dangerouslySetInnerHTML={{ __html: submission.taskId.tasks[index]?.html }} 
                        className="text-slate-200 text-sm md:text-base font-semibold leading-relaxed font-sans prose-strong:text-yellow-400 prose-code:bg-slate-800 prose-code:p-1 prose-code:rounded"
                      />
                    </div>
                  </div>

                  {/* 💻 MONACO CODE EDITOR ENVIRONMENT */}
                  <div className="p-2 bg-[#1e1e1e] relative border-b border-slate-800">
                    {/* Cyber Neon Accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-transparent opacity-40" />
                    
                    <Editor
                      height="380px"
                      defaultLanguage="cpp"
                      theme="vs-dark"
                      value={ans.studentCode}
                      onChange={(val) => handleCodeChange(index, val || '')}
                      options={{ 
                        fontSize: 15, 
                        minimap: { enabled: false },
                        padding: { top: 16, bottom: 16 },
                        fontFamily: 'Fira Code, Menlo, Monaco, Consolas, monospace',
                        lineNumbers: "on",
                        renderLineHighlight: "all",
                        cursorBlinking: "smooth",
                        cursorSmoothCaretAnimation: "on",
                        scrollbar: { vertical: 'visible', horizontal: 'auto', verticalScrollbarSize: 8 },
                        automaticLayout: true,
                        roundedSelection: true,
                      }}
                    />
                  </div>

                  {/* 👨‍🏫 INSTRUCTOR FEEDBACK CRADLE (If active) */}
                  {ans.adminNote && (
                    <div className="p-6 bg-gradient-to-r from-amber-950/20 to-transparent border-t border-amber-900/30 flex gap-4 items-start animate-fade-in">
                      <div className="bg-amber-500 text-slate-950 p-2.5 rounded-xl shadow-lg shadow-amber-500/10 flex-shrink-0">
                        <MessageSquare size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1 text-amber-400">
                          <ShieldAlert size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest font-mono">Süleyman Müəllimin Rəyi:</span>
                        </div>
                        <p className="text-slate-300 text-sm font-semibold italic leading-relaxed">
                          "{ans.adminNote}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* BOTTOM EXTRA SPACER */}
        <div className="h-24" />
      </div>
    </div>
  );
}