'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import confetti from 'canvas-confetti';
import { useTransition } from '@/src/context/TransitionContext';
import { useUser } from '@/src/context/UserContext';
import { ArrowLeft, Code2, Play, Smile, Clock, ChevronRight, ChevronLeft, Database, FileText, Loader2 } from 'lucide-react';
import ArenaEndPopup from '@/src/models/ArenaEndPopup';
import { useSFX } from '@/src/hooks/useSFX';

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
  level: number;
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

  const { playSFX } = useSFX();
  

  const [isLoading, setIsLoading] = useState(true);
  const [contest, setContest] = useState<ContestData | null>(null);
  const [dynamicState, setDynamicState] = useState<Record<string, QuestionProgress>>({});
  const [activeId, setActiveId] = useState<string>("");
  const [totalScore, setTotalScore] = useState(0);

  const [timeLeftStr, setTimeLeftStr] = useState('00:00:00');
  const [timePercent, setTimePercent] = useState(100);
  const [hasIntroduced, setHasIntroduced] = useState(false);

  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const studentStartedAtRef = useRef<number | null>(null);

  const [showEndPopup, setShowEndPopup] = useState(false);
  const [popupType, setPopupType] = useState<'success' | 'timeout'>('success');


  const mentorSpeechText = `Yarış başladı! Suallar arasında sərbəst gəzə bilərsən. Yazdığın kodlar növbəti məsələyə keçəndə tam qorunacaq! Ox oxu, uğurlar! 🚀`;
  const speechAnim = useConditionalTypewriter(mentorSpeechText, !hasIntroduced && !isLoading, 4);



  const triggerAutoPolling = (qId: string, contestData: ContestData) => {
    validateCode(qId, contestData);
  };

  // 1. DATA FETCHING (Baza İnteqrasiyası)
  useEffect(() => {
    async function initArena() {
      try {

        console.log("Contest ID:", userData);
        const res = await fetch(`/api/contests/${contestId}?studentId=${userData?._id || ''}`);
        if (!res.ok) throw new Error("Məlumatlar yüklənmədi");

        const data = await res.json();
        const fetchedContest: ContestData = data.contest;
        const submission = data.studentSubmission;

        setContest(fetchedContest);
        setTotalScore(submission?.totalScore || 0);

        studentStartedAtRef.current = submission?.createdAt
          ? new Date(submission.createdAt).getTime()
          : new Date().getTime();

        // Hər bir sual üçün ilkin state-i formalaşdırırıq (Bazada köhnə kod varsa bura oturur)
        const initialState: Record<string, QuestionProgress> = {};
        fetchedContest.questions.forEach((q) => {
          const savedProgress = submission?.progress?.[q._id];
          initialState[q._id] = {
            code: savedProgress?.code || `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Tapşırıq ${q.codeName} üçün kodunuzu bura yazın 📝\n    return 0;\n}`,
            // Əgər bazada 'checking' qalıbsa, elə 'checking' göstərsin, yoxdursa 'waiting'
            testStatuses: savedProgress?.testStatuses?.length != 0 ? savedProgress?.testStatuses : new Array(q.totalTestCases).fill('waiting'),
            compilerError: savedProgress?.compilerError || null,
            validationMessage: savedProgress?.compilerError
              ? "Sintaksis xətası tapıldı. Kodu yenidən yoxla! 🛠️"
              : savedProgress?.userPassedCount === q.totalTestCases
                ? "Möhtəşəm! Bütün testlər uğurla keçdi! 🎉"
                : null,
            userPassedCount: savedProgress?.userPassedCount || 0
          };
        });

        setDynamicState(initialState);

        const currentActiveId = submission?.activeQuestionId || fetchedContest.questions[0]._id;
        if (fetchedContest.questions.length > 0) {
          setActiveId(currentActiveId);
        }

        // 🎯 POLLING-İ BURADA BAŞLADIRIQ (try-ın daxilində, hər şey hazır olandan sonra)
        const activeProgress = submission?.progress?.[currentActiveId];
        if (activeProgress?.testStatuses?.includes('checking')) {
          // Funksiyanın closure-a ilişməməsi üçün activeId-ni ötürən xüsusi polling tetikleyicisi çağırırıq
          setTimeout(() => triggerAutoPolling(currentActiveId, fetchedContest), 500);
        }
      } catch (err) {
        console.error("Arena yüklənmə xətası:", err);
      } finally {
        setIsLoading(false);
        endTransition();
      }
    }

    if (contestId && userData) initArena();
  }, [contestId || '', userData]);

  useEffect(() => {
    if (!hasIntroduced && speechAnim.isFinished) {
      setHasIntroduced(true);
    }
  }, [speechAnim.isFinished, hasIntroduced]);

  // 2. TAYMER SİSTEMİ VƏ PROGRESS BAR HESABLANMASI
  useEffect(() => {
    if (!contest) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const contestEnd = new Date(contest.endTime).getTime();

      // Şagirdin fərdi başlama vaxtını təyin edirik
      // Əgər API sənə submission daxilində `createdAt` göndərirsə, onu istifadə et. 
      // Yoxdursa, şagird arenanı açdığı an onun fərdi taymeri işə düşür.
      const initialSessionStart = studentStartedAtRef.current || new Date().getTime();

      // Sınağın fərdi ümumi davam etmə müddəti (milisaniyə ilə)
      const personalDurationMs = contest.durationMinutes * 60 * 1000;

      // Şagirdin fərdi bitmə nöqtəsi
      const personalEnd = initialSessionStart + personalDurationMs;

      // Fərdi vaxt sınağın ümumi qapanma vaxtını (contestEnd) ötə bilməz
      const actualEnd = Math.min(personalEnd, contestEnd);
      const diff = actualEnd - now;

      if (diff <= 0) {
        setTimeLeftStr("00:00:00");
        setTimePercent(0);
        clearInterval(timer);
        setPopupType('timeout');
        setShowEndPopup(true);

        // Bura sınaq bitəndə şagirdi avtomatik çıxarmaq və ya kodu dondurmaq üçün məntiq yaza bilərsən
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        // Saat, dəqiqə və saniyəni formatlayırıq
        setTimeLeftStr(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );

        // Progress bar faizinin dinamik və dəqiq hesablanması
        // Şagirdin fərdi qalan vaxtını onun ümumi imtahan müddətinə bölürük
        const percent = (diff / personalDurationMs) * 100;
        setTimePercent(Math.min(Math.max(percent, 0), 100));
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
        body: JSON.stringify({ contestId, questionId: qId, code: currentCode, studentId: userData?._id || '' }),
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
    }, 3000);
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
  // 4. REAL KOD SINAQI (Asinxron Backend Növbə İnteqrasiyası)

  const [validatingId, setValidatingId] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Komponent unmount olunanda və ya sual dəyişəndə yarımçıq qalan taymeri təmizləmək üçün
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeId]);

  const validateCode = async (targetId?: string, currentContest?: ContestData) => {
    // Əgər funksiya düymədən çağırılıbsa activeId-ni, auto-polling-dən çağırılıbsa ötürülən ID-ni əsas götürür
    const idToValidate = targetId || activeId;
    const activeContest = currentContest || contest;

    if (!activeContest || !idToValidate || validatingId === idToValidate) return;

    setValidatingId(idToValidate); // Sırf bu sualı bloklayırıq 🔒

    setDynamicState(prev => ({
      ...prev,
      [idToValidate]: {
        ...prev[idToValidate],
        compilerError: null,
        testStatuses: prev[idToValidate].testStatuses.fill('checking'),
        validationMessage: "Kod bulud serverlərində növbəyə alındı və sınaqdan keçirilir... ⏳"
      }
    }));

    try {
      // Əgər çağırış düymədəndirsə (yəni targetId yoxdursa), API-a POST atıb növbəyə salırıq
      if (!targetId) {
        const response = await fetch('/api/submissions/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contestId,
            questionId: idToValidate,
            code: dynamicState[idToValidate].code,
            studentId: userData?._id || ''
          })
        });
        if (!response.ok) throw new Error("Növbəyə göndərilmə xətası");
      }

      if (pollingRef.current) clearInterval(pollingRef.current);

      // Short Polling dövrü başlayır
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/contests/${contestId}?studentId=${userData?._id || ''}`);
          if (!res.ok) return;

          const data = await res.json();
          const submission = data.studentSubmission;
          const savedProgress = submission?.progress?.[idToValidate];

          // Əgər iş bitibsə ('checking' statusu artıq yoxdursa)
          if (savedProgress && savedProgress.testStatuses && !savedProgress.testStatuses.includes('checking')) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setValidatingId(null); // Kilidi tamamilə açırıq 🔓

            setTotalScore(submission.totalScore || 0);
            const totalTests = savedProgress.testStatuses.length;
            const passedCount = savedProgress.userPassedCount || 0;

            setDynamicState(prev => ({
              ...prev,
              [idToValidate]: {
                code: prev[idToValidate].code,
                testStatuses: savedProgress.testStatuses,
                compilerError: savedProgress.compilerError || null,
                userPassedCount: passedCount,
                validationMessage: savedProgress.compilerError
                  ? "Sintaksis xətası tapıldı. Kodu yenidən yoxla! 🛠️"
                  : passedCount === totalTests
                    ? "Möhtəşəm! Bütün testlər uğurla keçdi! 🎉"
                    : "Bəzi xətalar var, alqoritmini təkmilləşdir. 🦊"
              }
            }));

            if (!savedProgress.compilerError && passedCount === totalTests) {
              confetti({ particleCount: 90, spread: 60 });

              const isAllContestSolved = activeContest.questions.every((q) => {
                if (q._id === idToValidate) return passedCount === q.totalTestCases;
                const otherProgress = submission?.progress?.[q._id];
                return (otherProgress?.userPassedCount || 0) === q.totalTestCases;
              });

              if (isAllContestSolved) {
                setTimeout(() => {
                  setPopupType('success');
                  setShowEndPopup(true);
                }, 1500);
              }
            }
          }
        } catch (pollErr) {
          console.error("Polling xətası:", pollErr);
        }
      }, 2000);

    } catch (err) {
      console.error(err);
      setValidatingId(null);
      setDynamicState(prev => ({
        ...prev,
        [idToValidate]: {
          ...prev[idToValidate],
          testStatuses: prev[idToValidate].testStatuses.fill('waiting'),
          validationMessage: "Sistem xətası baş verdi. Yenidən cəhd edin! ❌"
        }
      }));
    }
  };


  const handleRedirect = useCallback(() => {
    if(contest?.level == 1) navigateTo('/student/learning');
    if(contest?.level == 2) navigateTo('/student/adventure');
    playSFX('btn2', 0.5);
  }, [navigateTo]);



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

  const isLevel2 = contest?.level === 2;

  if (!contest) return null;


  console.log(currentProgress)

  return (
    <div className={`min-h-screen dynamic-arena-bg ${isLevel2 ? 'level-2-theme' : 'level-1-theme'} text-slate-700 font-sans select-none pb-20 relative w-full overflow-x-hidden`}>
      
      {/* ☁️ Bulud Arxa Fon Dekorasiyası */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#2ecc71_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

      {/* 🔴 SLIDER TAYMER */}
      <div className="w-full h-3 bg-slate-200 sticky top-0 z-50 overflow-hidden shadow-inner flex">
        <div
          className={`h-full transition-all duration-1000 ease-linear relative ${
            isLevel2 
              ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500' 
              : 'bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500'
          }`}
          style={{ width: `${timePercent}%` }}
        >
          <div className="absolute right-0 top-0 h-full w-2 bg-white/40 animate-pulse" />
        </div>
      </div>

      {/* 1. NAVBAR */}
      <div className={`bg-white/95 border-b-4 border-slate-200 backdrop-blur-md px-6 py-3 flex items-center justify-between sticky top-3 z-40 shadow-sm w-full ${!hasIntroduced ? 'animate-step-nav' : ''}`}>
        <button
          onClick={() => handleRedirect()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-black text-xs bg-white border-2 border-slate-200 px-4 py-2 rounded-xl border-b-4 active:border-b-0 active:translate-y-[4px] transition-all cursor-pointer uppercase tracking-wider"
        >
          <ArrowLeft size={14} /> ÇIXIŞ
        </button>

        <div className={`flex items-center gap-2 bg-slate-950 font-mono font-black text-xs px-4 py-1.5 rounded-full border-2 shadow-md ${
          isLevel2 ? 'text-amber-400 border-amber-400' : 'text-cyan-400 border-cyan-400'
        }`}>
          <Clock size={14} className="animate-pulse" /> {timeLeftStr}
        </div>

        <span className={`font-black text-xs border-2 px-4 py-1.5 rounded-xl uppercase tracking-wide font-mono ${
          isLevel2 
            ? 'text-amber-600 bg-amber-50 border-amber-200' 
            : 'text-cyan-600 bg-cyan-50 border-cyan-200'
        }`}>
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

          <div className="flex gap-2 py-1">
            {contest.questions.map((q, idx) => {
              const isCurrent = q._id === activeId;
              const isSolved = (dynamicState[q._id]?.userPassedCount || 0) === q.totalTestCases;
              return (
                <button
                  key={q._id}
                  onClick={() => handleTabChange(q._id)}
                  className={`px-5 h-11 rounded-xl font-black text-xs border-2 transition-all flex items-center gap-2 border-b-4 shrink-0 ${
                    isCurrent
                      ? isLevel2 
                        ? 'bg-amber-500 border-amber-600 text-white scale-105' 
                        : 'bg-cyan-500 border-cyan-600 text-white scale-105'
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
            <div className={`w-14 h-14 rounded-full overflow-hidden border-4 bg-white shadow-md ${
              isLevel2 ? 'border-amber-400' : 'border-cyan-400'
            }`}>
              <img src={`/animals/${animalsData[currentIndex % animalsData.length].image}`} className="w-full h-full object-cover" alt="Mentor" />
            </div>
            <span className={`mt-1 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
              isLevel2 ? 'bg-amber-500' : 'bg-cyan-500'
            }`}>
              {animalsData[currentIndex % animalsData.length].nameAz}
            </span>
          </div>

          <div className={`flex-1 bg-white border-3 p-6 rounded-[24px] rounded-tl-none shadow-md space-y-4 text-left ${
            isLevel2 ? 'border-amber-300' : 'border-cyan-300'
          }`}>
            <div className={`border-2 p-3 rounded-xl flex gap-2 items-center ${
              isLevel2 ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-cyan-50 border-cyan-100 text-cyan-700'
            }`}>
              <Smile className="flex-shrink-0" size={16} />
              <p className="m-0 text-xs font-black font-mono leading-relaxed">
                {currentProgress.validationMessage ? currentProgress.validationMessage : (hasIntroduced ? mentorSpeechText : speechAnim.displayedText)}
              </p>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2 m-0 uppercase font-mono">
                  <Code2 size={18} className={isLevel2 ? 'text-amber-500' : 'text-cyan-500'} /> Tapşırıq {currentQuestion.codeName}: {currentQuestion.title}
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
                  <div className="grid grid-cols-2 bg-slate-950 font-mono text-xs p-3 divide-x divide-slate-800">
                    <div className="pr-2">
                      <span className="text-[9px] block text-slate-500 font-black uppercase tracking-wide mb-1">Giriş (stdin)</span>
                      <pre className={`m-0 font-bold whitespace-pre-line ${isLevel2 ? 'text-amber-400' : 'text-cyan-400'}`}>{sample.input}</pre>
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
            <div className={`w-14 h-14 rounded-full overflow-hidden border-4 bg-white shadow-md ${
              isLevel2 ? 'border-orange-400' : 'border-emerald-400'
            }`}>
              <img src={`/avatars/avatar-${userData?.avatar || 1}.png`} alt="Hero" className="w-full h-full object-cover" />
            </div>
            <span className={`mt-1 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
              isLevel2 ? 'bg-orange-500' : 'bg-emerald-400'
            }`}>
              {userData?.fullName || "ŞAGİRD"}
            </span>
          </div>

          <div className={`flex-1 bg-white border-3 p-5 rounded-[24px] rounded-tr-none shadow-md space-y-4 text-right ${
            isLevel2 ? 'border-orange-300' : 'border-emerald-300'
          }`}>
            <div className="text-left">
              <span className={`text-[10px] font-black uppercase tracking-wider block mb-1 font-mono ${
                isLevel2 ? 'text-orange-600' : 'text-emerald-600'
              }`}>
                💻 C++ ONLAYN REDAKTOR:
              </span>
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
                    ${status === 'checking' ? (isLevel2 ? 'border-amber-400 text-amber-500 bg-amber-50 animate-pulse' : 'border-cyan-400 text-cyan-500 bg-cyan-50 animate-pulse') : ''}
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
                onClick={() => validateCode()}
                disabled={validatingId === activeId}
                className={`w-full sm:w-auto text-white px-8 py-4 text-xs font-black rounded-xl border-b-[5px] active:border-b-0 active:translate-y-[5px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-widest shadow-md ${
                  isLevel2 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-700' 
                    : 'bg-gradient-to-r from-emerald-400 to-teal-500 border-emerald-600'
                }`}
              >
                {validatingId === activeId ? (
                  "KOD SINAQDAN KEÇİRİLİR... ⏳"
                ) : (
                  <>
                    <Play size={12} fill="white" /> KODU YOXLAMAQA GÖNDƏR ✨
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>

      <ArenaEndPopup
        isOpen={showEndPopup}
        type={popupType}
        totalScore={totalScore}
        maxPossibleScore={maxPossibleScore}
        onRedirect={handleRedirect}
      />

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