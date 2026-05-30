'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Clock, X, PlayCircle, Eye, CheckCircle2, XCircle, AlertCircle, Award, Code2, FileText, Loader2 } from 'lucide-react';

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
}

export default function ContestStickyCard({
  showInfoCard,
  activeContest,
  submissions,
  navigateTo,
  isLoading = false
}: ContestStickyCardProps) {
  const [isContestCardOpen, setIsContestCardOpen] = useState(true);
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

  // Taymer mexanizmi
  useEffect(() => {
    if (!activeContest || isLoading) return;

    const formatTimeLeft = (diffMs: number, hideSeconds: boolean = false) => {
      const totalSeconds = Math.floor(diffMs / 1000);
      const totalMinutes = Math.floor(totalSeconds / 60);
      const totalHours = Math.floor(totalMinutes / 60);
      const days = Math.floor(totalHours / 24);

      if (days >= 1) return `${days} gün`;

      const hours = totalHours % 24;
      const minutes = totalMinutes % 60;
      const seconds = totalSeconds % 60;

      if (hideSeconds) {
        if (hours > 0) return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        return `${minutes} dəq`;
      }

      if (hours > 0) return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      if (minutes > 0) return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      return `${seconds} san`;
    };

    // Vəziyyəti anında yoxlayan funksiya
    const checkStatusAndRoute = () => {
      const now = new Date().getTime();
      const contestStart = new Date(activeContest.startTime).getTime();
      const contestEnd = new Date(activeContest.endTime).getTime();

      if (isFullySolved) {
        setContestStatus('completed');
        setTimeLeftStr('Sınaq Tamamlandı! 🎉');
        return false; // clearInterval siqnalı
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

    // ⚡ İlk renderdə 1 saniyə gözləmədən dərhal işə salırıq!
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

  // ==================== ⏳ SKELETON LOADING VEZİYYƏTİ ====================
  // Əgər kənardan isLoading gəlibsə VƏ YA activeContest hələ yoxdursa VƏ YA taymer mətni hələ hesablanıb bitməyibsə skeleton göstərilsin
  if (isLoading || !activeContest || !timeLeftStr) {
    return (
      <div className="pointer-events-auto animate-in fade-in duration-300">
        {isContestCardOpen ? (
          <div className="w-80 bg-white/95 border-2 border-slate-100 border-b-slate-300 rounded-[24px] shadow-xl p-5 flex flex-col relative border-b-[6px] animate-pulse">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2.5">
              <div className="w-6 h-6 bg-slate-200 rounded-lg flex items-center justify-center">
                <Loader2 size={12} className="text-slate-400 animate-spin" />
              </div>
              <div className="h-3 bg-slate-200 rounded w-28" />
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 h-11" />
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 h-11" />
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 h-11" />
            </div>

            <div className="rounded-2xl p-4 border border-slate-100 text-center mb-4 bg-slate-50/50 h-16 flex flex-col items-center justify-center gap-2">
              <div className="h-2 bg-slate-200 rounded w-20" />
              <div className="h-4 bg-slate-200 rounded w-32" />
            </div>

            <div className="w-full h-10 bg-slate-200 rounded-xl" />
          </div>
        ) : (
          <div className="bg-slate-800 text-slate-400 px-4 py-3.5 rounded-2xl shadow-lg flex items-center gap-2 font-mono font-black text-xs uppercase border-b-4 border-b-slate-900 animate-pulse">
            <Loader2 size={14} className="animate-spin" />
            <span>Yüklənir...</span>
          </div>
        )}
      </div>
    );
  }

  // ==================== 🎉 DATA HAZIR OLANDAN SONRAKI RENDER ====================
  return (
    <div className="pointer-events-auto animate-in fade-in slide-in-from-right duration-500">
      {isContestCardOpen ? (
        <div className={`w-80 bg-white/95 border-2 rounded-[24px] shadow-xl p-5 flex flex-col relative border-b-[6px] transition-all duration-300 ${
          contestStatus === 'completed' ? 'border-indigo-200 border-b-indigo-500' :
          contestStatus === 'not_started' ? 'border-sky-200 border-b-sky-500' :
          hasStartedContest ? 'border-amber-200 border-b-amber-500' : 'border-emerald-200 border-b-emerald-500'
        }`}>
          <button onClick={() => setIsContestCardOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"><X size={16} /></button>

          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2.5">
            <div className={`p-1.5 rounded-lg text-white ${contestStatus === 'completed' ? 'bg-gradient-to-tr from-indigo-500 to-purple-600' : contestStatus === 'not_started' ? 'bg-gradient-to-tr from-sky-500 to-blue-600' : hasStartedContest ? 'bg-gradient-to-tr from-amber-500 to-orange-600 animate-pulse' : 'bg-gradient-to-tr from-emerald-400 to-teal-500'}`}><Clock size={14} /></div>
            <span className={`font-black text-[10px] tracking-widest uppercase font-mono ${contestStatus === 'completed' ? 'text-indigo-700' : contestStatus === 'not_started' ? 'text-sky-700' : hasStartedContest ? 'text-amber-700' : 'text-emerald-700'}`}>{contestStatus === 'completed' ? 'Sınaq Bitdi' : contestStatus === 'not_started' ? 'Gözlənilən Sınaq' : hasStartedContest ? "Canlı Sınaq Taymeri" : "Yeni Sınaq Mövcuddur!"}</span>
          </div>

          <h4 className="font-black text-slate-900 text-sm tracking-tight leading-snug mb-4">{activeContest.title}</h4>

          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2"><span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Sual</span><span className="font-mono font-black text-xs text-slate-700">{activeContest.questions?.length || 0} ədəd</span></div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2"><span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Müddət</span><span className="font-mono font-black text-xs text-slate-700">{activeContest.durationMinutes} dəq</span></div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2"><span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Maks. Bal</span><span className="font-mono font-black text-xs text-slate-700">{totalContestScore} xal</span></div>
          </div>

          <div className={`rounded-2xl p-4 border text-center mb-4 bg-gradient-to-br ${contestStatus === 'completed' ? 'from-indigo-50 to-purple-50/50 border-indigo-100/70' : contestStatus === 'not_started' ? 'from-sky-50 to-blue-50/50 border-sky-100/70' : hasStartedContest ? 'from-amber-50 to-orange-50/50 border-amber-100/70' : 'from-emerald-50 to-teal-50/50 border-emerald-100/70'}`}>
            <span className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${contestStatus === 'completed' ? 'text-indigo-600' : contestStatus === 'not_started' ? 'text-sky-600' : hasStartedContest ? 'text-amber-600' : 'text-emerald-600'}`}>{contestStatus === 'completed' ? "Sənin Topladığın Bal" : contestStatus === 'not_started' ? "Başlamasına Qalan Vaxt" : hasStartedContest ? "İmtahanın Bitməsinə Qalan" : "Giriş üçün Son Şans"}</span>
            <span className={`font-mono font-black tracking-tight drop-shadow-sm tabular-nums ${contestStatus === 'completed' ? 'text-indigo-600 text-lg' : 'text-xl ' + (contestStatus === 'not_started' ? 'text-sky-600' : hasStartedContest ? 'text-orange-600' : 'text-emerald-600')}`}>{contestStatus === 'completed' ? `XAL: ${currentStudentScore} / ${totalContestScore}` : timeLeftStr}</span>
          </div>

          {contestStatus === 'not_started' ? (
            <div className="w-full text-center py-2.5 bg-slate-100 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-wider font-mono border border-slate-200">Sınağın açılmasını gözləyin 🔒</div>
          ) : contestStatus === 'completed' ? (
            <div className="flex flex-col gap-2">
              <div className="w-full text-center py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl font-black text-[10px] uppercase tracking-widest font-mono">Sınaq başa çatdı</div>
              <button onClick={() => setIsResultsModalOpen(true)} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest border-b-[4px] border-indigo-700 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"><Eye size={13} /> Nəticələri İncələ</button>
            </div>
          ) : (
            <button onClick={() => navigateTo(`/student/contest/${activeContest._id}`)} className={`w-full text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-b-[4px] active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${hasStartedContest ? 'from-amber-500 to-orange-500 bg-gradient-to-r border-amber-700' : 'from-emerald-400 to-teal-500 bg-gradient-to-r border-emerald-700'}`}><PlayCircle size={14} />{hasStartedContest ? "Arenaya Qayıt" : "Sınağı Başlat"}</button>
          )}
        </div>
      ) : (
        <button onClick={() => setIsContestCardOpen(true)} className={`text-white px-4 py-3.5 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-mono font-black text-xs uppercase border-b-4 backdrop-blur-xl cursor-pointer ${contestStatus === 'completed' ? 'from-indigo-50 to-purple-50/50 bg-gradient-to-r border-b-purple-700' : contestStatus === 'not_started' ? 'from-sky-50 to-blue-50/50 bg-gradient-to-r border-b-blue-700' : hasStartedContest ? 'from-amber-50 to-orange-50/50 bg-gradient-to-r border-b-orange-700' : 'from-emerald-400 to-teal-500 bg-gradient-to-r border-b-emerald-700'}`}><Clock size={16} className={contestStatus === 'not_started' ? '' : 'animate-spin'} style={{ animationDuration: '4s' }} />{contestStatus === 'completed' ? `Bitdi (${currentStudentScore} Xal)` : timeLeftStr}</button>
      )}

      {/* DETALLI POPUP MODAL */}
      {isResultsModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-2 border-indigo-200 w-full max-w-5xl h-[85vh] rounded-[28px] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50/40 shrink-0">
              <div className="flex items-center gap-2"><Award className="text-indigo-600" size={20} /><h3 className="font-black text-slate-800 tracking-wider text-sm uppercase">Detallı Sınaq Hesabatı və Yazılmış Kodlar</h3></div>
              <div className="flex items-center gap-4">
                <div className="bg-indigo-100/70 border border-indigo-200 px-4 py-1.5 rounded-xl text-right"><span className="font-mono font-black text-xs text-indigo-700">BAL: {currentStudentScore} / {totalContestScore}</span></div>
                <button onClick={() => setIsResultsModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-100"><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 flex overflow-hidden bg-slate-50/50">
              <div className="w-1/3 border-r border-slate-100 bg-white p-4 overflow-y-auto space-y-2 custom-scrollbar">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-1 mb-2">Məsələlər</span>
                {activeContest.questions?.map((question, index) => {
                  const prog = currentSubmission?.progress?.[question._id] || currentSubmission?.progress?.[question.id];
                  const passed = prog?.userPassedCount || 0;
                  const total = question.totalTestCases;
                  const isCorrect = passed === total && total > 0;
                  const isSelected = selectedQuestionId === (question._id || question.id);
                  return (
                    <button key={question._id} onClick={() => setSelectedQuestionId(question._id || question.id)} className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${isSelected ? 'border-indigo-500 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-500' : 'border-slate-100 bg-slate-50/40 hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-2.5 truncate">
                        {isCorrect ? <CheckCircle2 className="text-emerald-500 shrink-0" size={16} /> : passed > 0 ? <AlertCircle className="text-amber-500 shrink-0" size={16} /> : <XCircle className="text-rose-400 shrink-0" size={16} />}
                        <div className="truncate"><span className="font-black text-slate-800 text-xs block truncate">Sual #{index + 1}</span><span className="font-mono text-[9px] text-slate-400 font-bold block">{passed}/{total} Test</span></div>
                      </div>
                      <span className={`font-mono font-black text-[11px] shrink-0 ${isCorrect ? 'text-emerald-600' : 'text-slate-500'}`}>{isCorrect ? question.points || question.score || 100 : 0} X</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex-1 flex flex-col overflow-hidden p-5 space-y-4">
                {activeSelectedQuestion ? (
                  <>
                    <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm shrink-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5"><FileText size={15} className="text-indigo-500" /> {activeSelectedQuestion.title || `Sual Detalları`}</h4>
                        <span className="font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-black">Test: {activeSelectedProgress?.userPassedCount || 0} / {activeSelectedQuestion.totalTestCases}</span>
                      </div>
                      <p className="text-slate-600 text-xs leading-relaxed mt-2 whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">{activeSelectedQuestion.description || "Bu sual üçün əlavə təsvir mətni daxil edilməyib."}</p>
                    </div>
                    <div className="flex-1 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
                      <div className="bg-slate-950/80 px-4 py-2 flex justify-between items-center border-b border-slate-800 shrink-0"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5"><Code2 size={12} className="text-emerald-400" /> Şagirdin Göndərdiyi Son Kod (Submission)</span></div>
                      <div className="flex-1 p-4 overflow-auto custom-scrollbar font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre select-text">
                        {activeSelectedProgress?.code || activeSelectedProgress?.solution ? <code>{activeSelectedProgress.code || activeSelectedProgress.solution}</code> : <div className="text-slate-500 italic text-center mt-10 font-sans text-xs">Şagird bu məsələ üçün heç bir kod skripti göndərməyib.</div>}
                      </div>
                    </div>
                  </>
                ) : <div className="flex-1 flex items-center justify-center text-slate-400 italic text-xs">Məlumatları görmək üçün soldan bir sual seçin.</div>}
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0"><button onClick={() => setIsResultsModalOpen(false)} className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-sm">Kodu İncelemeyi Bitir</button></div>
          </div>
        </div>
      )}
    </div>
  );
}