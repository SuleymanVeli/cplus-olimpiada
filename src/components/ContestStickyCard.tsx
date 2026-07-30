'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Clock, X, PlayCircle, Eye, CheckCircle2, XCircle, AlertCircle, Award, Code2, FileText, Loader2, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';

interface QuestionData {
  _id: string;
  id: string;
  title?: string;
  description?: string;
  points?: number;
  score?: number;
  totalTestCases: number;
}

interface ContestData {
  _id: string;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  durationMinutes: number;
  questions: QuestionData[];
}

interface ContestStickyCardProps {
  showInfoCard: boolean;
  activeContest: ContestData | null;
  submissions: any[];
  navigateTo: (url: string) => void;
  isLoading?: boolean;
  playSFX: any
}

export default function ContestStickyCard({
  showInfoCard,
  activeContest,
  submissions,
  navigateTo,
  playSFX,
  isLoading = false
}: ContestStickyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [contestStatus, setContestStatus] = useState<'not_started' | 'live' | 'completed'>('live');
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  const currentSubmission = useMemo(() => {
    if (!activeContest || !submissions) return null;
    return submissions.find((sub: any) => sub.contestId?._id === activeContest._id);
  }, [activeContest, submissions]);

  const hasStartedContest = !!currentSubmission;

  const isFullySolved = useMemo(() => {
    if (!activeContest || !currentSubmission || !currentSubmission.progress) return false;
    const questions = activeContest.questions || [];
    if (questions.length === 0) return false;

    return questions.every((q: any) => {
      const qProgress = currentSubmission.progress[q._id] || currentSubmission.progress[q.id];
      return qProgress && qProgress.userPassedCount === q.totalTestCases;
    });
  }, [activeContest, currentSubmission]);

  const totalContestScore = useMemo(() => {
    if (!activeContest || !activeContest.questions) return 0;
    return activeContest.questions.reduce((sum: number, q: any) => sum + (q.points || q.score || 100), 0);
  }, [activeContest]);

  const currentStudentScore = currentSubmission ? (currentSubmission.totalScore || 0) : 0;

  useEffect(() => {
    if (!activeContest || isLoading) return;

    const formatTimeLeft = (diffMs: number, hideSeconds: boolean = false) => {
      const totalSeconds = Math.floor(diffMs / 1000);
      const totalMinutes = Math.floor(totalSeconds / 60);
      const totalHours = Math.floor(totalMinutes / 60);
      const days = Math.floor(totalHours / 24);

      if (days >= 1) return `${days}d`;
      const hours = totalHours % 24;
      const minutes = totalMinutes % 60;
      const seconds = totalSeconds % 60;

      if (hideSeconds) {
        if (hours > 0) return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        return `${minutes}m`;
      }

      if (hours > 0) return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      if (minutes > 0) return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      return `${seconds}s`;
    };

    const checkStatusAndRoute = () => {
      const now = new Date().getTime();
      const contestStart = new Date(activeContest.startTime).getTime();
      const contestEnd = new Date(activeContest.endTime).getTime();

      if (isFullySolved) {
        setContestStatus('completed');
        setTimeLeftStr('Tamamlandı 🎉');
        return false;
      }

      if (now < contestStart) {
        setContestStatus('not_started');
        setTimeLeftStr(formatTimeLeft(contestStart - now));
        return true;
      }

      if (now < contestEnd) {
        setContestStatus('live');

        if (!hasStartedContest || !currentSubmission) {
          setTimeLeftStr(formatTimeLeft(contestEnd - now, true));
        } else {
          const studentStartTime = new Date(currentSubmission.createdAt).getTime();
          const studentPersonalEnd = studentStartTime + (activeContest.durationMinutes * 60 * 1000);
          const actualEnd = Math.min(studentPersonalEnd, contestEnd);
          const diff = actualEnd - now;

          if (diff > 0) {
            setTimeLeftStr(formatTimeLeft(diff, false));
          } else {
            setContestStatus('completed');
            setTimeLeftStr('Müddət bitdi');
            return false;
          }
        }
      } else {
        setContestStatus('completed');
        setTimeLeftStr('Müddət bitdi');
        return false;
      }
      return true;
    };

    const shouldContinue = checkStatusAndRoute();
    if (!shouldContinue) return;

    const timer = setInterval(() => {
      const isLive = checkStatusAndRoute();
      if (!isLive) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeContest, hasStartedContest, isFullySolved, currentSubmission, isLoading]);

  useEffect(() => {
    if (isResultsModalOpen && activeContest && activeContest?.questions?.length > 0) {
      setSelectedQuestionId(activeContest.questions[0]._id || activeContest.questions[0].id);
    }
  }, [isResultsModalOpen, activeContest]);

  const activeSelectedQuestion = useMemo(() => {
    return activeContest?.questions?.find(q => (q._id === selectedQuestionId || q.id === selectedQuestionId)) || null;
  }, [selectedQuestionId, activeContest]);

  const activeSelectedProgress = useMemo(() => {
    if (!activeSelectedQuestion || !currentSubmission?.progress) return null;
    return currentSubmission.progress[activeSelectedQuestion._id] || currentSubmission.progress[activeSelectedQuestion.id] || null;
  }, [activeSelectedQuestion, currentSubmission]);

  if (!showInfoCard) return null;

  // 🌸 Açıq Tema Vizual Konfiqurasiyaları
  const statusThemes = {
    completed: {
      bgDot: 'bg-indigo-500',
      text: 'text-indigo-600',
      badge: 'bg-indigo-50 text-indigo-600 border-indigo-200/60',
      boxBg: 'bg-indigo-50/50 border-indigo-100',
      btn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200',
      border: 'border-indigo-200/80 shadow-indigo-100/60'
    },
    not_started: {
      bgDot: 'bg-sky-500',
      text: 'text-sky-600',
      badge: 'bg-sky-50 text-sky-600 border-sky-200/60',
      boxBg: 'bg-sky-50/50 border-sky-100',
      btn: 'bg-slate-100 text-slate-400 border border-slate-200',
      border: 'border-sky-200/80 shadow-sky-100/60'
    },
    live: hasStartedContest ? {
      bgDot: 'bg-amber-500',
      text: 'text-amber-600',
      badge: 'bg-amber-50 text-amber-700 border-amber-200/60',
      boxBg: 'bg-amber-50/50 border-amber-100',
      btn: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200',
      border: 'border-amber-200/80 shadow-amber-100/60'
    } : {
      bgDot: 'bg-emerald-500',
      text: 'text-emerald-600',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      boxBg: 'bg-emerald-50/50 border-emerald-100',
      btn: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200',
      border: 'border-emerald-200/80 shadow-emerald-100/60'
    }
  };

  const activeTheme = statusThemes[contestStatus];

  if (isLoading || !activeContest || !timeLeftStr) {
    return (
      <div className="pointer-events-auto bg-white/90 backdrop-blur-md text-slate-600 rounded-full px-4 py-2 shadow-lg border border-slate-200 flex items-center gap-2 font-mono text-xs animate-pulse">
        <Loader2 size={13} className="animate-spin text-slate-400" />
        <span>Yüklənir...</span>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto animate-in fade-in duration-300">
      {/* 🌸 AÇIQ ŞİRİN DYNAMIC ISLAND KAPSUL */}
      <div 
        className={`bg-white/80 backdrop-blur-md border text-slate-800 shadow-xl transition-all duration-300 overflow-hidden ${activeTheme.border} ${
          isExpanded ? 'w-72 rounded-3xl p-4' : 'w-auto rounded-3xl px-4 py-2 cursor-pointer'
        }`}
        onClick={() => {
          !isExpanded && setIsExpanded(true);
          playSFX('btn2', 0.5);
        }}
      >
        {/* --- YIĞILMIŞ HAL (COLLAPSED PILL) --- */}
        {!isExpanded ? (
          <div className="flex items-center gap-2.5 select-none">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeTheme.bgDot}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${activeTheme.bgDot}`} />
            </span>
            
            <span className="font-bold text-xs tracking-tight text-slate-800 max-w-[110px] truncate">{activeContest.title}</span>
            <span className="text-slate-300">•</span>
            
            <div className="flex items-center gap-1 font-mono font-bold text-xs text-slate-700">
              <Clock size={12} className={contestStatus === 'live' ? 'animate-spin text-slate-400' : 'text-slate-400'} style={{ animationDuration: '6s' }} />
              <span>{contestStatus === 'completed' ? `${currentStudentScore} X` : timeLeftStr}</span>
            </div>

            <ChevronDown size={14} className="text-slate-400 ml-0.5" />
          </div>
        ) : (
          /* --- AÇILMIŞ HAL (EXPANDED WIDGET) --- */
          <div className="flex flex-col space-y-3 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase font-mono border ${activeTheme.badge}`}>
                  {contestStatus === 'completed' ? 'Bitdi' : contestStatus === 'not_started' ? 'Gözlənilir' : hasStartedContest ? 'Canlı' : 'Yeni'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">{activeContest.questions?.length || 0} Sual / {totalContestScore} P</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full cursor-pointer"
              >
                <ChevronUp size={14} />
              </button>
            </div>

            {/* Sınaq Adı */}
            <div>
              <h4 className="font-bold text-slate-800 text-xs tracking-tight line-clamp-1">{activeContest.title}</h4>
            </div>

            {/* Taymer Və Bal Görünüşü */}
            <div className={`rounded-2xl p-2.5 border flex items-center justify-between ${activeTheme.boxBg}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {contestStatus === 'completed' ? "Toplanan Bal:" : "Qalan Vaxt:"}
              </span>
              <span className={`font-mono font-black text-sm tabular-nums ${activeTheme.text}`}>
                {contestStatus === 'completed' ? `${currentStudentScore} / ${totalContestScore}` : timeLeftStr}
              </span>
            </div>

            {/* Düymələr */}
            {contestStatus === 'not_started' ? (
              <div className="w-full text-center py-2 bg-slate-100 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-wider font-mono">
                Başlamasını Gözləyin 🔒
              </div>
            ) : contestStatus === 'completed' ? (
              <button 
                onClick={() => setIsResultsModalOpen(true)} 
                className={`w-full py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${activeTheme.btn}`}
              >
                <Eye size={13} /> Nəticələri İncələ
              </button>
            ) : (
              <button 
                onClick={() => navigateTo(`/student/contest/${activeContest._id}`)} 
                className={`w-full py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${activeTheme.btn}`}
              >
                <PlayCircle size={13} />
                {hasStartedContest ? "Arenaya Qayıt" : "Sınağa Başla"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 🌸 AÇIQ VƏ İNCƏ NƏTİCƏ MODALI */}
 {isResultsModalOpen && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-200">
    <div className="bg-slate-50 border border-slate-200/80 text-slate-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl shadow-slate-300/50 overflow-hidden flex flex-col p-6 space-y-5">
      
      {/* 🌸 HEADER: Başlıq və Ümumi Bal */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 text-amber-500 flex items-center justify-center shadow-sm">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">Sınaq Xülasəsi</h3>
            <p className="text-[11px] font-medium text-slate-500">
              Cəmi {activeContest.questions?.length || 0} sualdan ibarət sınaq nəticəsi
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-2xl flex items-center gap-2 shadow-sm">
            <Award size={15} className="text-amber-500" />
            <span className="font-mono font-black text-xs text-slate-800">
              {currentStudentScore} <span className="text-slate-400 font-normal">/ {totalContestScore} P</span>
            </span>
          </div>
          <button 
            onClick={() => setIsResultsModalOpen(false)} 
            className="text-slate-400 hover:text-slate-700 p-2 rounded-2xl hover:bg-white hover:border-slate-200 border border-transparent transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 🍬 SUAL DÜYMƏLƏRİ (Minimalist Pill Cards) */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
        {activeContest.questions?.map((question, index) => {
          const prog = currentSubmission?.progress?.[question._id] || currentSubmission?.progress?.[question.id];
          const passed = prog?.userPassedCount || 0;
          const total = question.totalTestCases;
          const isCorrect = passed === total && total > 0;
          const isSelected = selectedQuestionId === (question._id || question.id);
          
          return (
            <button 
              key={question._id} 
              onClick={() => setSelectedQuestionId(question._id || question.id)} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                isSelected 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10 scale-102' 
                  : 'bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/50'
              }`}
            >
              {isCorrect ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              ) : passed > 0 ? (
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
              )}
              <span>Sual #{index + 1}</span>
            </button>
          );
        })}
      </div>

      {/* 💻 MƏRKƏZİ AÇIQ RƏNGLİ KOD PANELİ */}
      <div className="flex-1 min-h-[300px] max-h-[420px] flex flex-col overflow-hidden bg-white rounded-[2rem] border border-slate-200/80 shadow-sm relative">
        {activeSelectedQuestion ? (
          <>
            {/* Kod Header & Status Bar */}
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Code2 size={14} />
                </div>
                <span className="font-sans text-xs font-extrabold text-slate-700">
                  {activeSelectedQuestion.title || `Məsələ koda baxış`}
                </span>
              </div>

              {/* Tərəqqi (Progress Bar & Xal) */}
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${
                      (activeSelectedProgress?.userPassedCount || 0) === activeSelectedQuestion.totalTestCases
                        ? 'bg-emerald-500'
                        : (activeSelectedProgress?.userPassedCount || 0) > 0
                        ? 'bg-amber-500'
                        : 'bg-rose-400'
                    }`}
                    style={{ 
                      width: `${Math.min(100, ((activeSelectedProgress?.userPassedCount || 0) / (activeSelectedQuestion.totalTestCases || 1)) * 100)}%` 
                    }}
                  />
                </div>
                <span className="font-mono text-xs font-bold text-slate-500">
                  {activeSelectedProgress?.userPassedCount || 0}/{activeSelectedQuestion.totalTestCases} Test
                </span>
              </div>
            </div>

            {/* Göndərilmiş Kod Sahəsi */}
            <div className="flex-1 p-5 overflow-auto custom-scrollbar bg-slate-900/5 font-mono text-[12px] text-slate-800 leading-relaxed whitespace-pre select-text">
              {activeSelectedProgress?.code || activeSelectedProgress?.solution ? (
                <code>{activeSelectedProgress.code || activeSelectedProgress.solution}</code>
              ) : (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-400 font-sans space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Code2 size={20} />
                  </div>
                  <span className="text-xs font-semibold">Bu suala heç bir kod təqdim edilməyib</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-[250px] flex flex-col items-center justify-center text-slate-400 text-xs font-sans space-y-2">
            <Code2 size={24} className="opacity-40" />
            <span>Detallara baxmaq üçün yuxarıdan bir sual seçin</span>
          </div>
        )}
      </div>

      {/* 🔮 FOOTER: Status İzahları */}
      <div className="px-2 pt-1 flex justify-between items-center text-[11px] font-medium text-slate-500 border-t border-slate-200/60">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Tam Keçdi
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Qismən
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Keçmədi
          </span>
        </div>
        
        <span className="text-[10px] text-slate-400 font-mono">Baxış rejimi</span>
      </div>

    </div>
  </div>
)}
    </div>
  );
}