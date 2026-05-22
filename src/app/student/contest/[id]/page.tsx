'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import confetti from 'canvas-confetti';
import { useTransition } from '@/src/context/TransitionContext';
import { useUser } from '@/src/context/UserContext';
import { ArrowLeft, Code2, Play, Smile, Clock, ChevronRight, ChevronLeft, Database, FileText, Loader2 } from 'lucide-react';

const animalsData = [
  { id: 1, nameAz: "Canavar", image: "1.jpg" },
  { id: 2, nameAz: "Kirpi", image: "2.jpg" },
  { id: 3, nameAz: "Ayı", image: "3.jpg" },
  { id: 4, nameAz: "Tısbağa", image: "4.jpg" }
];

interface QuestionData {
  _id: string;
  id: string;
  codeName: string;
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  pointsPerTest: number;
  totalTestCases: number;
  sampleCases: Array<{ input: string; output: string; explanation?: string }>;
}

interface ContestData {
  _id: string;
  title: string;
  durationMinutes: number;
  endTime: string | Date;
  questions: QuestionData[];
}

interface QuestionProgress {
  code: string;
  testStatuses: string[];
  compilerError: string | null;
  validationMessage: string | null;
  userPassedCount: number;
}

function useConditionalTypewriter(text: string, enabled: boolean, speed: number = 6) {
  const [displayedText, setDisplayedText] = useState(enabled ? '' : text);
  const [isFinished, setIsFinished] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsFinished(true);
      return;
    }
    setDisplayedText('');
    setIsFinished(false);
  }, [text, enabled]);

  useEffect(() => {
    if (!enabled || !text || isFinished) return;
    let index = displayedText.length;
    const timer = setInterval(() => {
      setDisplayedText((prev) => {
        if (prev.length < text.length) return text.slice(0, prev.length + 1);
        return prev;
      });
      index++;
      if (index >= text.length) {
        clearInterval(timer);
        setIsFinished(true);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, isFinished, enabled, displayedText.length, speed]);

  return { displayedText, isFinished };
}

export default function DynamicArenaPage() {
  const params = useParams();
  const contestId = params?.id as string;

  const { navigateTo, endTransition } = useTransition();
  const { userData } = useUser();
  
  const [isLoading, setIsLoading] = useState(true);
  const [contest, setContest] = useState<ContestData | null>(null);
  const [dynamicState, setDynamicState] = useState<Record<string, QuestionProgress>>({});
  const [activeId, setActiveId] = useState<string>("");
  const [totalScore, setTotalScore] = useState(0);
  
  const [timeLeftStr, setTimeLeftStr] = useState('00:00:00');
  const [timePercent, setTimePercent] = useState(100);
  const [hasIntroduced, setHasIntroduced] = useState(false);

  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const mentorSpeechText = `Yarış başladı! Suallar arasında sərbəst gəzə bilərsən. Yazdığın kodlar növbəti məsələyə keçəndə tam qorunacaq! Ox oxu, uğurlar! 🚀`;
  const speechAnim = useConditionalTypewriter(mentorSpeechText, !hasIntroduced && !isLoading, 4);

  // 1. DATA FETCHING (Baza İnteqrasiyası)
  useEffect(() => {
    async function initArena() {
      try {
        const res = await fetch(`/api/contests/${contestId}`);
        if (!res.ok) throw new Error("Məlumatlar yüklənmədi");
        
        const data = await res.json();
        const fetchedContest: ContestData = data.contest;
        const submission = data.studentSubmission;

        setContest(fetchedContest);
        setTotalScore(submission?.totalScore || 0);

        // Hər bir sual üçün ilkin state-i formalaşdırırıq (Bazada köhnə kod varsa bura oturur)
        const initialState: Record<string, QuestionProgress> = {};
        fetchedContest.questions.forEach((q) => {
          const savedProgress = submission?.progress?.[q._id];
          initialState[q._id] = {
            code: savedProgress?.code || `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Tapşırıq ${q.codeName} üçün kodunuzu bura yazın 📝\n    return 0;\n}`,
            testStatuses: savedProgress?.testStatuses || new Array(q.totalTestCases).fill('waiting'),
            compilerError: savedProgress?.compilerError || null,
            validationMessage: savedProgress?.userPassedCount === q.totalTestCases ? "Möhtəşəm! Bütün testlər uğurla keçdi! 🎉" : null,
            userPassedCount: savedProgress?.userPassedCount || 0
          };
        });

        setDynamicState(initialState);
        if (fetchedContest.questions.length > 0) {
          setActiveId(submission?.activeQuestionId || fetchedContest.questions[0]._id);
        }
      } catch (err) {
        console.error("Arena yüklənmə xətası:", err);
      } finally {
        setIsLoading(false);
        endTransition();
      }
    }

    if (contestId) initArena();
  }, [contestId]);

  useEffect(() => {
    if (!hasIntroduced && speechAnim.isFinished) {
      setHasIntroduced(true);
    }
  }, [speechAnim.isFinished, hasIntroduced]);

  // 2. TAYMER SİZTEMİ
  useEffect(() => {
    if (!contest) return;
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(contest.endTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeftStr("00:00:00");
        setTimePercent(0);
        clearInterval(timer);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeftStr(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        const totalDurationMs = contest.durationMinutes * 60 * 1000;
        setTimePercent(Math.min(Math.max((diff / totalDurationMs) * 100, 0), 100));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [contest]);

  // 3. AUTO-SAVE NEXUS (Debounce mexanizmi ilə bazaya səssiz yazılma)
  const syncCodeToBackend = async (qId: string, currentCode: string) => {
    try {
      await fetch('/api/submissions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contestId, questionId: qId, code: currentCode }),
      });
    } catch (err) {
      console.error("Avtomatik mentin yadda saxlanmasında xəta:", err);
    }
  };

  const handleCodeChange = (newCode: string) => {
    setDynamicState(prev => ({ ...prev, [activeId]: { ...prev[activeId], code: newCode } }));

    if (saveTimeoutRef.current[activeId]) {
      clearTimeout(saveTimeoutRef.current[activeId]);
    }

    saveTimeoutRef.current[activeId] = setTimeout(() => {
      syncCodeToBackend(activeId, newCode);
    }, 1000); 
  };

  const handleTabChange = async (nextId: string) => {
    if (saveTimeoutRef.current[activeId]) {
      clearTimeout(saveTimeoutRef.current[activeId]);
    }
    // Tab dəyişəndə gözləmədən anında mövcud kodu bazaya atır
    await syncCodeToBackend(activeId, dynamicState[activeId].code);
    setActiveId(nextId);
  };

  // 4. REAL KOD SINAQI (Backend Validation API)
  const [isValidating, setIsValidating] = useState(false);
  const validateCode = async () => {
    if (!contest || !activeId) return;
    
    setIsValidating(true);
    setDynamicState(prev => ({
      ...prev,
      [activeId]: { 
        ...prev[activeId], 
        compilerError: null, 
        testStatuses: prev[activeId].testStatuses.fill('checking'),
        validationMessage: "Kod bulud serverlərində sınaqdan keçirilir... ⏳" 
      }
    }));

    try {
      const response = await fetch('/api/submissions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contestId,
          questionId: activeId,
          code: dynamicState[activeId].code
        })
      });

      const result = await response.json();

      setDynamicState(prev => ({
        ...prev,
        [activeId]: {
          code: prev[activeId].code,
          testStatuses: result.testStatuses || prev[activeId].testStatuses.fill('failed'),
          compilerError: result.compilerError || null,
          userPassedCount: result.userPassedCount ?? 0,
          validationMessage: result.compilerError 
            ? "Sintaksis xətası tapıldı. Kodu yenidən yoxla! 🛠️" 
            : result.userPassedCount === result.testStatuses.length 
              ? "Möhtəşəm! Bütün testlər uğurla keçdi! 🎉" 
              : "Bəzi xətalar var, alqoritmini təkmilləşdir. 🦊"
        }
      }));

      if (result.totalScore !== undefined) {
        setTotalScore(result.totalScore);
      }

      if (!result.compilerError && result.userPassedCount === result.testStatuses.length) {
        confetti({ particleCount: 90, spread: 60 });
      }

    } catch (err) {
      console.error("Yoxlama zamanı gözlənilməz xəta:", err);
    } finally {
      setIsValidating(false);
    }
  };

  if (isLoading || !contest) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-cyan-500" size={32} />
        <span className="font-mono text-xs font-black text-slate-500 uppercase tracking-widest">Yarış Arenası Hazırlanır...</span>
      </div>
    );
  }

  const currentIndex = contest.questions.findIndex(q => q._id === activeId);
  const currentQuestion = contest.questions[currentIndex];
  const currentProgress = dynamicState[activeId] || { code: '', testStatuses: [], compilerError: null, validationMessage: null, userPassedCount: 0 };
  const maxPossibleScore = contest.questions.reduce((sum, q) => sum + (q.totalTestCases * q.pointsPerTest), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef9f1] via-[#f4fbf7] to-[#ffffff] text-slate-700 font-sans select-none pb-20 relative w-full overflow-x-hidden">
      
      {/* 🔴 SLIDER TAYMER */}
      <div className="w-full h-3 bg-slate-200 sticky top-0 z-50 overflow-hidden shadow-inner flex">
        <div 
          className="h-full bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 transition-all duration-1000 ease-linear relative"
          style={{ width: `${timePercent}%` }}
        >
          <div className="absolute right-0 top-0 h-full w-2 bg-white/40 animate-pulse" />
        </div>
      </div>

      {/* 1. NAVBAR */}
      <div className={`bg-white/95 border-b-4 border-slate-200 backdrop-blur-md px-6 py-3 flex items-center justify-between sticky top-3 z-40 shadow-sm w-full ${!hasIntroduced ? 'animate-step-nav' : ''}`}>
        <button
          onClick={() => navigateTo('/student/learning')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-black text-xs bg-white border-2 border-slate-200 px-4 py-2 rounded-xl border-b-4 active:border-b-0 active:translate-y-[4px] transition-all cursor-pointer uppercase tracking-wider"
        >
          <ArrowLeft size={14} /> ÇIXIŞ
        </button>

        <div className="flex items-center gap-2 bg-slate-950 text-cyan-400 font-mono font-black text-xs px-4 py-1.5 rounded-full border-2 border-cyan-400 shadow-md">
          <Clock size={14} className="animate-pulse" /> {timeLeftStr}
        </div>

        <span className="font-black text-cyan-600 text-xs bg-cyan-50 border-2 border-cyan-200 px-4 py-1.5 rounded-xl uppercase tracking-wide font-mono">
          🏆 {contest.title} (Xal: {totalScore}/{maxPossibleScore})
        </span>
      </div>

      {/* ƏSAS KONTENT */}
      <div className="w-full max-w-7xl mx-auto px-6 mt-6 space-y-6 flex flex-col">
        
        {/* 2. TAB PANELİ */}
        <div className={`w-full bg-white border-3 border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-sm ${!hasIntroduced ? 'animate-step-tabs' : ''}`}>
          <button
            disabled={currentIndex === 0}
            onClick={() => handleTabChange(contest.questions[currentIndex - 1]._id)}
            className="p-2 bg-slate-100 border-2 border-slate-300 rounded-xl font-black text-xs text-slate-600 disabled:opacity-40 flex items-center gap-1 active:scale-95 transition-all enabled:cursor-pointer"
          >
            <ChevronLeft size={16} /> ƏVVƏLKİ
          </button>
          
          <div className="flex gap-2">
            {contest.questions.map((q, idx) => {
              const isCurrent = q._id === activeId;
              const isSolved = (dynamicState[q._id]?.userPassedCount || 0) === q.totalTestCases;
              return (
                <button
                  key={q._id}
                  onClick={() => handleTabChange(q._id)}
                  className={`px-5 h-11 rounded-xl font-black text-xs border-2 transition-all flex items-center gap-2 border-b-4 ${
                    isCurrent
                      ? 'bg-cyan-500 border-cyan-600 text-white scale-105'
                      : isSolved
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span>Məsələ {q.codeName}</span>
                  <span className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded font-mono">
                    {dynamicState[q._id]?.userPassedCount || 0}/{q.totalTestCases}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            disabled={currentIndex === contest.questions.length - 1}
            onClick={() => handleTabChange(contest.questions[currentIndex + 1]._id)}
            className="p-2 bg-slate-100 border-2 border-slate-300 rounded-xl font-black text-xs text-slate-600 disabled:opacity-40 flex items-center gap-1 active:scale-95 transition-all enabled:cursor-pointer"
          >
            NÖVBƏTİ <ChevronRight size={16} />
          </button>
        </div>

        {/* 3. MENTOR VƏ SUAL KONTENTİ */}
        <div className={`w-full flex items-start gap-4 ${!hasIntroduced ? 'animate-step-mentor' : ''}`}>
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-14 h-14 rounded-full overflow-hidden border-4 border-cyan-400 bg-white shadow-md">
              <img src={`/animals/${animalsData[currentIndex % animalsData.length].image}`} className="w-full h-full object-cover" alt="Mentor" />
            </div>
            <span className="mt-1 bg-cyan-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              {animalsData[currentIndex % animalsData.length].nameAz}
            </span>
          </div>

          <div className="flex-1 bg-white border-3 border-cyan-300 p-6 rounded-[24px] rounded-tl-none shadow-md space-y-4 text-left">
            <div className="bg-cyan-50 border-2 border-cyan-100 p-3 rounded-xl flex gap-2 items-center">
              <Smile className="text-cyan-500 flex-shrink-0" size={16} />
              <p className="m-0 text-cyan-700 text-xs font-black font-mono leading-relaxed">
                {currentProgress.validationMessage ? currentProgress.validationMessage : (hasIntroduced ? mentorSpeechText : speechAnim.displayedText)}
              </p>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2 m-0 uppercase font-mono">
                  <Code2 size={18} className="text-cyan-500" /> Tapşırıq {currentQuestion.codeName}: {currentQuestion.title}
                </h3>
                <p className="text-slate-600 font-bold text-xs leading-relaxed font-mono bg-slate-50 p-3.5 rounded-xl border border-slate-100 mt-2 m-0 whitespace-pre-line">
                  {currentQuestion.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-amber-50/60 border-2 border-amber-200/70 p-3 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider flex items-center gap-1 font-mono mb-1">
                    <Database size={12} /> Giriş Formatı (Input)
                  </span>
                  <p className="text-slate-600 font-bold text-[11px] font-mono m-0 leading-normal">{currentQuestion.inputFormat}</p>
                </div>
                <div className="bg-indigo-50/60 border-2 border-indigo-200/70 p-3 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1 font-mono mb-1">
                    <FileText size={12} /> Çıxış Formatı (Output)
                  </span>
                  <p className="text-slate-600 font-bold text-[11px] font-mono m-0 leading-normal">{currentQuestion.outputFormat}</p>
                </div>
              </div>

              {currentQuestion.sampleCases?.map((sample, sIdx) => (
                <div key={sIdx} className="border-2 border-slate-200 rounded-xl overflow-hidden shadow-inner">
                  <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 text-[10px] font-black font-mono text-slate-500 uppercase tracking-wider">
                    🎯 Nümunə Test #{sIdx + 1}
                  </div>
                  <div className="grid grid-cols-2 bg-slate-950 font-mono text-xs text-cyan-400 p-3 divide-x divide-slate-800">
                    <div className="pr-2">
                      <span className="text-[9px] block text-slate-500 font-black uppercase tracking-wide mb-1">Giriş (stdin)</span>
                      <pre className="m-0 font-bold whitespace-pre-line">{sample.input}</pre>
                    </div>
                    <div className="pl-3">
                      <span className="text-[9px] block text-slate-500 font-black uppercase tracking-wide mb-1">Çıxış (stdout)</span>
                      <pre className="m-0 font-bold text-emerald-400">{sample.output}</pre>
                    </div>
                  </div>
                  {sample.explanation && (
                    <div className="bg-slate-50 p-2.5 border-t border-slate-200 text-[11px] font-mono text-slate-500 font-bold">
                      💡 <span className="font-black text-slate-600">İzah:</span> {sample.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. REDAKTOR VƏ RUNNER */}
        <div className={`w-full flex items-start gap-4 flex-row-reverse ${!hasIntroduced ? 'animate-step-editor' : ''}`}>
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-14 h-14 rounded-full overflow-hidden border-4 border-emerald-400 bg-white shadow-md">
              <img src={`/avatars/avatar-${userData?.avatar || 1}.png`} alt="Hero" className="w-full h-full object-cover" />
            </div>
            <span className="mt-1 bg-emerald-400 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              {userData?.fullName || "ŞAGİRD"}
            </span>
          </div>

          <div className="flex-1 bg-white border-3 border-emerald-300 p-5 rounded-[24px] rounded-tr-none shadow-md space-y-4 text-right">
            <div className="text-left">
              <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider block mb-1 font-mono">💻 C++ ONLAYN REDAKTOR:</span>
              <div className="rounded-2xl overflow-hidden border-3 border-slate-200 shadow-sm bg-white task-editor min-h-[340px]">
                <CodeMirror
                  value={currentProgress.code}
                  height="100%"
                  minHeight="340px"
                  extensions={[cpp()]}
                  onChange={(value) => handleCodeChange(value)}
                  theme="light"
                />
              </div>
            </div>

            {/* Kompilyasiya Xətası Çıxışı */}
            {currentProgress.compilerError && (
              <div className="bg-rose-950 text-rose-300 p-4 rounded-xl font-mono text-xs text-left border-2 border-rose-800 overflow-x-auto max-h-40 shadow-inner">
                <span className="font-black text-rose-400 block mb-1 uppercase tracking-wide">⚠️ Compiler Error:</span>
                <pre className="whitespace-pre-wrap">{currentProgress.compilerError}</pre>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-left">
              {currentProgress.testStatuses.map((status, index) => (
                <div
                  key={index}
                  className={`py-2 rounded-xl text-center text-[10px] font-black border-2 border-b-4 transition-all duration-300 shadow-sm
                    ${status === 'waiting' ? 'border-slate-200 text-slate-400 bg-slate-50' : ''}
                    ${status === 'checking' ? 'border-cyan-400 text-cyan-500 bg-cyan-50 animate-pulse' : ''}
                    ${status === 'passed' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' : ''}
                    ${status === 'failed' ? 'bg-rose-50 border-rose-400 text-rose-600' : ''}
                  `}
                >
                  Test {index + 1} {status === 'waiting' && '⏳'}{status === 'passed' && '✅'}{status === 'failed' && '❌'}
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={validateCode}
                disabled={isValidating}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-400 to-teal-500 text-white px-8 py-4 text-xs font-black rounded-xl border-b-[5px] border-emerald-600 active:border-b-0 active:translate-y-[5px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-widest"
              >
                {isValidating ? "KOD SINAQDAN KEÇİRİLİR... ⏳" : <><Play size={12} fill="white" /> KODU YOXLAMAQA GÖNDƏR ✨</>}
              </button>
            </div>
          </div>
        </div>

      </div>

      <style jsx global>{`
        @keyframes slideDownIn {
          0% { opacity: 0; transform: translateY(-20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUpIn {
          0% { opacity: 0; transform: translateY(25px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        .animate-step-nav { animation: slideDownIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-step-tabs { animation: slideUpIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards; opacity: 0; }
        .animate-step-mentor { animation: slideUpIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; opacity: 0; }
        .animate-step-editor { animation: slideUpIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.45s forwards; opacity: 0; }
        
        .task-editor .cm-editor { font-family: 'Consolas', monospace !important; font-size: 14px !important; font-weight: 700 !important; }
      `}</style>

    </div>
  );
}