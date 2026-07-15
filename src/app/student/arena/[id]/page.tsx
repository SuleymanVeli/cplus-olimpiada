'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import confetti from 'canvas-confetti';
import { useTransition } from '@/src/context/TransitionContext';
import { useUser } from '@/src/context/UserContext';
import { ArrowLeft, Code2, Play, AlertTriangle, Smile } from 'lucide-react';

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

interface TestCase {
  _id?: string;
  input: string;
  output: string;
  isSample: boolean;
}

interface AnimalType {
  id: number;
  nameAz: string;
  nameEn: string;
  image: string;
}

interface TaskData {
  _id: string;
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  points: number;
  order: number;
  status: 'completed' | 'active';
  testCases: TestCase[];
  level?: number;
}

// Təkrarlanma və yanıb-sönmə problemi həll edilmiş ardıcıl yazı makinası hook-u
function useSequentialTypewriter(text: string, speed: number = 8, startTrigger: boolean = true) {
  const [displayedText, setDisplayedText] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!text || !startTrigger || isFinished) {
      return;
    }

    let index = 0;

    const timer = setInterval(() => {
      setDisplayedText((prev) => {
        if (prev.length < text.length) {
          return text.slice(0, prev.length + 1);
        }
        return prev;
      });

      index++;
      if (index >= text.length) {
        clearInterval(timer);
        setIsFinished(true);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, startTrigger, isFinished]);

  return { displayedText, isFinished };
}

export default function DynamicArenaPage() {
  const params = useParams();
  const taskId = params.id as string;
  const { navigateTo, endTransition } = useTransition();
  const { userData } = useUser();

  // API & Mentor States
  const [task, setTask] = useState<TaskData | null>(null);
  const [mentorAnimal, setMentorAnimal] = useState<AnimalType | null>(null);
  const [mentorSpeech, setMentorSpeech] = useState<string>('');

  // Editor və Validation State-ləri
  const [editorValue, setEditorValue] = useState('');
  const [testStatuses, setTestStatuses] = useState<string[]>([]);
  const [compilerError, setCompilerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [allPassed, setAllPassed] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Animasiya kilidləmə və dinamik mentor mesajı state-ləri
  const [isIntroDone, setIsIntroDone] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Növbəli animasiya zənciri
  const speechAnim = useSequentialTypewriter(mentorSpeech, 8, !isLoading);
  const descAnim = useSequentialTypewriter(task?.description || '', 5, speechAnim.isFinished);
  const inputAnim = useSequentialTypewriter(task?.inputFormat || '', 4, descAnim.isFinished);
  const outputAnim = useSequentialTypewriter(task?.outputFormat || '', 4, inputAnim.isFinished);
  const constraintsAnim = useSequentialTypewriter(task?.constraints || '', 4, outputAnim.isFinished);

  // Giriş animasiyalarının bitməsini bir dəfəlik kilidləyən effekt
  useEffect(() => {
    if (!isIntroDone) {
      const isFinished = task?.constraints ? constraintsAnim.isFinished : outputAnim.isFinished;
      if (isFinished) {
        setIsIntroDone(true);
      }
    }
  }, [constraintsAnim.isFinished, outputAnim.isFinished, task, isIntroDone]);

  useEffect(() => {
    async function fetchTaskData() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/tasks/${taskId}?userId=${userData?._id}`);
        const result = await res.json();

        if (result.success) {
          const data = result.data.task || result.data;
          setTask(data);

          const assignedAnimal = animalsData[(data.order || 0) % animalsData.length];
          setMentorAnimal(assignedAnimal);
          setMentorSpeech(`Salam, xoş gəldin! 🎉 Mən sehrli meşənin mühafizəçisi ${assignedAnimal.nameAz}. Sənin üçün super bir tapşırığım var! Gəl şərtləri birlikdə nəzərdən keçirək: ✨`);

          setEditorValue(`#include <iostream>\nusing namespace std;\n\nint main() {\n    // Kodunu bura yaza bilərsən 📝\n    \n    return 0;\n}`);

          const caseCount = data.testCases?.length || 0;
          setTestStatuses(new Array(caseCount).fill('waiting'));
        } else {
          setApiError(result.message || "Bu tapşırıq hələ kilidlidir və ya tapılmadı.");
        }
      } catch (err) {
        setApiError("İnternet bağlantısında xəta baş verdi, yenidən yoxla.");
      } finally {
        setIsLoading(false);
        endTransition();
      }
    }

    if (taskId && userData?._id) {
      fetchTaskData();
    }
  }, [taskId, userData?._id]);

  const goBackToMap = () => {
    switch (userData?.level) {
      case 1:
        navigateTo('/student/learning');
        break;
      case 2:
        navigateTo('/student/adventure');
        break;
      default:
        navigateTo('/student/learning');
    }
  };

const validateCode = async () => {
    if (!task || !task.testCases || task.testCases.length === 0) return;
    setAllPassed(false);
    setCompilerError(null);
    setIsValidating(true);
    setValidationMessage(`Gözlə gəlirəm... ⏳ Kodunu sehrli laboratoriyamda yoxlayıram, ulduzlar bələdçimiz olsun! ⭐`);

    let currentStatuses = [...testStatuses];
    let isEverythingCorrect = true;

    for (let i = 0; i < task.testCases.length; i++) {
      currentStatuses[i] = 'checking';
      setTestStatuses([...currentStatuses]);

      const currentCase = task.testCases[i];

      try {
        // Birbaşa öz yaratdığımız Next.js API-nə sorğu atırıq
        const response = await fetch("/api/compiler", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: editorValue,
            stdin: currentCase.input || ""
          })
        });

        const result = await response.json();

        if (result.compiler_error) {
          currentStatuses[i] = 'failed';
          setCompilerError(result.compiler_error);
          isEverythingCorrect = false;
          setValidationMessage(`Kiçik bir xəta tapdım! 🔎 Kodunda hərfləri və ya simvolları səhv yazmısan. Aşağıdakı qırmızı qeydə baxıb düzəldək?`);
          break;
        }

        const actualOutput = result.program_output ? result.program_output.trim() : "";
        const expectedOutput = currentCase.output ? currentCase.output.trim() : "";

        if (actualOutput === expectedOutput) {
          currentStatuses[i] = 'passed';
        } else {
          currentStatuses[i] = 'failed';
          isEverythingCorrect = false;
          setValidationMessage(`Oy, haradasa nəsə qarışdı! 🦊 Kodun bəzi gizli testlərdən keçə bilmədi. Nümunələrə baxıb bir daha yoxla!`);
          break;
        }
      } catch (error) {
        currentStatuses[i] = 'failed';
        isEverythingCorrect = false;
        setValidationMessage(`Sistemdə müvəqqəti nasazlıq oldu. 🦊 Bir neçə saniyə sonra yenidən yoxla!`);
        break;
      }
      setTestStatuses([...currentStatuses]);
    }

    setTestStatuses([...currentStatuses]);
    setIsValidating(false);

    if (isEverythingCorrect && currentStatuses.every(s => s === 'passed')) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      setAllPassed(true);
      setValidationMessage(`Uraaa! 🎉 Möhtəşəmsən! Bütün sınaq testlərindən uğurla keçdin. Sən əsl kod sehrbazısan! 🌟`);

      try {
        await fetch('/api/student/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'task',
            userId: userData?._id || '',
            id: task._id,
            code: editorValue,
            level: task.level || 1
          })
        });
      } catch (err) {
        console.error("Tərəqqi yadda saxlanılarkən xəta yarandı:", err);
      }
    }
  };
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4 bg-[#eef9f1]">
        <div className="w-14 h-14 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin shadow-[0_4px_12px_rgba(46,204,113,0.2)]" />
        <p className="font-black text-emerald-600 text-xs tracking-widest uppercase animate-pulse">
          Sehrli xəritə hazırlanır... ✨
        </p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4 bg-[#f4fbf7] p-6 text-center">
        <div className="bg-orange-100 text-orange-500 w-16 h-16 flex items-center justify-center rounded-full font-black text-2xl shadow-sm border border-orange-200">🔒</div>
        <h3 className="text-xl font-black text-slate-800 m-0">Giriş Bağlıdır</h3>
        <p className="text-slate-500 max-w-sm text-sm font-semibold m-0">{apiError}</p>
        <button
          onClick={goBackToMap}
          className="mt-2 bg-[#1cb0f6] text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-4 border-[#1899d6] active:border-b-0 active:translate-y-[4px] transition-all cursor-pointer shadow-md"
        >
          <ArrowLeft size={14} /> Geri Qayıt
        </button>
      </div>
    );
  }

  const sampleCase = task?.testCases?.find(c => c.isSample);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef9f1] via-[#f4fbf7] to-[#ffffff] text-slate-700 font-sans select-none pb-20 relative">

      {/* Şən Bulud Arxa Fon Dekorasiyası */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#2ecc71_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>

      {/* PARLAQ NAV-BAR */}
      <div className="bg-white/90 border-b-4 border-slate-200 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <button
          onClick={goBackToMap}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-black text-xs bg-white border-2 border-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-xl border-b-4 active:border-b-0 active:translate-y-[4px] transition-all cursor-pointer uppercase tracking-wider"
        >
          <ArrowLeft size={14} /> XƏRİTƏ
        </button>

        <div className="flex items-center gap-2">
          <span className="font-black text-emerald-600 text-sm bg-emerald-50 border-2 border-emerald-200 px-4 py-1.5 rounded-xl uppercase tracking-wide shadow-sm">
            🎯 ARENA TAPŞIRIĞI #{task?.order}
          </span>
        </div>

        <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-5 py-2 rounded-full font-black text-xs uppercase tracking-wider shadow-[0_4px_10px_rgba(241,196,15,0.3)] border-b-4 border-amber-600">
          +{task?.points} XP 🔥
        </div>
      </div>

      {/* 🗺️ DIALOG AXINI */}
      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-8 flex flex-col">

        {/* 🦊 ETAP 1 & 2: SOLA MEYİLLİ MENTOR HEYVANO VE ONUN METNLERİ */}
        {mentorAnimal && (
          <div className="w-full flex items-start gap-5 animate-avatar-left self-start max-w-[88%]">

            {/* HEYVAN AVATARI */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-18 h-18 rounded-full overflow-hidden border-4 border-emerald-400 bg-white shadow-md transition-transform duration-300 hover:scale-105">
                <img
                  src={`/animals/${mentorAnimal.image}`}
                  alt={mentorAnimal.nameAz}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="mt-1.5 bg-emerald-400 text-white font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">
                {mentorAnimal.nameAz}
              </span>
            </div>

            {/* YAZILARI OLAN BÖLMƏ */}
            <div className="flex-1 bg-white border-3 border-emerald-300 p-5 rounded-[28px] rounded-tl-none shadow-md space-y-4 relative text-left animate-bubble-in">

              {/* Salamlaşma və ya Yoxlama Mətni */}
              <div className="bg-emerald-50 border-2 border-emerald-100 p-3 rounded-2xl flex gap-2 items-center">
                <Smile className="text-emerald-500 flex-shrink-0" size={18} />
                <p className="m-0 text-emerald-700 text-xs font-black font-mono leading-relaxed">
                  {validationMessage ? validationMessage : speechAnim.displayedText}
                  {!speechAnim.isFinished && !validationMessage && (
                    <span className="inline-block w-1.5 h-3.5 bg-emerald-500 ml-0.5 animate-pulse">|</span>
                  )}
                </p>
              </div>

              {/* Tapşırığın Adı və İzahı */}
              {(speechAnim.isFinished || descAnim.displayedText) && (
                <div className="space-y-1.5 transition-all duration-300 animate-fade-in">
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5 m-0 uppercase tracking-tight">
                    <Code2 size={18} className="text-emerald-500" /> {task?.title}
                  </h3>
                  <div className="text-slate-600 font-bold text-xs leading-relaxed whitespace-pre-wrap font-mono">
                    {descAnim.displayedText}
                    {!descAnim.isFinished && speechAnim.isFinished && (
                      <span className="inline-block w-1.5 h-3.5 bg-slate-500 ml-0.5 animate-pulse">|</span>
                    )}
                  </div>
                </div>
              )}

              {/* Qaydalar və Məhdudiyyətlər */}
              {task?.constraints && (descAnim.isFinished || constraintsAnim.displayedText) && (
                <div className="bg-amber-50 border-2 border-amber-200 p-2.5 rounded-xl flex gap-2 items-center transition-all duration-300 animate-fade-in">
                  <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
                  <span className="text-slate-600 font-bold text-xs font-mono">
                    <b className="text-amber-600 font-sans text-[10px] uppercase tracking-wider mr-1">Qayda:</b>
                    {constraintsAnim.displayedText}
                    {!constraintsAnim.isFinished && outputAnim.isFinished && (
                      <span className="inline-block w-1.5 h-3.5 bg-amber-500 ml-0.5 animate-pulse">|</span>
                    )}
                  </span>
                </div>
              )}

              {/* Giriş / Çıxış Formatları */}
              {(descAnim.isFinished || inputAnim.displayedText || outputAnim.displayedText) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t-2 border-slate-100 transition-all duration-300 animate-fade-in">
                  <div className="bg-sky-50 p-3 rounded-xl border-2 border-sky-100">
                    <span className="font-black text-sky-500 text-[10px] uppercase tracking-wider block mb-0.5">Nə daxil olacaq? (Giriş)</span>
                    {/* whitespace-pre-wrap əlavə edildi */}
                    <p className="text-slate-600 text-xs font-mono font-bold m-0 leading-tight whitespace-pre-wrap">
                      {inputAnim.displayedText}
                      {!inputAnim.isFinished && descAnim.isFinished && (
                        <span className="inline-block w-1.5 h-3 bg-sky-500 ml-0.5 animate-pulse">|</span>
                      )}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-xl border-2 border-purple-100">
                    <span className="font-black text-purple-500 text-[10px] uppercase tracking-wider block mb-0.5">Ekrana nə çıxacaq? (Çıxış)</span>
                    {/* whitespace-pre-wrap əlavə edildi */}
                    <p className="text-slate-600 text-xs font-mono font-bold m-0 leading-tight whitespace-pre-wrap">
                      {outputAnim.displayedText}
                      {!outputAnim.isFinished && inputAnim.isFinished && (
                        <span className="inline-block w-1.5 h-3 bg-purple-500 ml-0.5 animate-pulse">|</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Nümunə Test Bloku */}
              {sampleCase && isIntroDone && (
                <div className="flex flex-col sm:flex-row gap-3 pt-1 transition-all duration-500 animate-pop-in">
                  {/* whitespace-pre-wrap əlavə edildi */}
                  <div className="flex-1 bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-xs shadow-inner whitespace-pre-wrap">
                    <span className="text-[9px] text-slate-400 font-sans font-black block mb-0.5 uppercase">Nümunə Giriş:</span>
                    {sampleCase.input}
                  </div>
                  {/* whitespace-pre-wrap əlavə edildi */}
                  <div className="flex-1 bg-slate-900 text-sky-400 p-3 rounded-xl font-mono text-xs shadow-inner whitespace-pre-wrap">
                    <span className="text-[9px] text-slate-400 font-sans font-black block mb-0.5 uppercase">Nümunə Çıxış:</span>
                    {sampleCase.output}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 👦 ETAP 3: SAĞA MEYİLLİ STRUKTUR - EDİTÖR SAHƏSİ */}
        {isIntroDone && (
          <div className="w-full flex items-start gap-5 self-end flex-row-reverse max-w-[94%] animate-student-layout">

            {/* ŞAGİRDİN AVATARI */}
            <div className="flex flex-col items-center flex-shrink-0 animate-pop-in">
              <div className="w-18 h-18 rounded-full overflow-hidden border-4 border-sky-400 bg-white shadow-md flex items-center justify-center transition-transform duration-300 hover:scale-105">
                <img
                  src={`/avatars/avatar-${userData?.avatar || 1}.png`}
                  alt={userData?.fullName || "Qəhrəman"}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="mt-1.5 bg-sky-400 text-white font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">
                {userData?.fullName || "QƏHRƏMAN"}
              </span>
            </div>

            {/* EDİTÖRÜ VƏ CAVAB DÜYMƏLƏRİ OLAN HİSSƏ */}
            <div className="flex-1 bg-white border-3 border-sky-300 p-5 rounded-[28px] rounded-tr-none shadow-md space-y-4 text-right animate-bubble-in">

              <div className="text-left">
                <span className="text-[10px] font-black uppercase text-sky-500 tracking-wider block mb-1">💻 SƏNİN SEHRLİ C++ KODUN:</span>
                <div className="rounded-2xl overflow-hidden border-3 border-slate-200 shadow-sm bg-white task-editor min-h-[350px]">
                  <CodeMirror
                    value={editorValue}
                    height="100%"
                    minHeight="350px"
                    extensions={[cpp()]}
                    onChange={(value) => setEditorValue(value)}
                    theme="light"
                  />
                </div>
              </div>

              {/* Dinamik Test Tapşırıq Statusları */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left">
                {testStatuses.map((status, index) => (
                  <div
                    key={index}
                    className={`py-3 rounded-xl text-center text-xs font-black border-2 border-b-4 transition-all duration-300 shadow-sm
                      ${status === 'waiting' ? 'border-slate-200 text-slate-400 bg-slate-50' : ''}
                      ${status === 'checking' ? 'border-sky-400 text-sky-500 bg-sky-50 animate-pulse' : ''}
                      ${status === 'passed' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' : ''}
                      ${status === 'failed' ? 'bg-rose-50 border-rose-400 text-rose-600' : ''}
                    `}
                  >
                    {status === 'waiting' && `Test ${index + 1} ⏳`}
                    {status === 'checking' && `Yoxlanılır...`}
                    {status === 'passed' && `Tapıldı! ✅`}
                    {status === 'failed' && `Xəta! ❌`}
                  </div>
                ))}
              </div>

              {/* Xəta Qutusu */}
              {compilerError && (
                <div className="bg-rose-50 text-rose-900 border-2 border-rose-200 p-4 rounded-2xl font-mono text-xs text-left whitespace-pre-wrap max-h-[140px] overflow-y-auto shadow-inner">
                  <span className="font-black block text-rose-600 mb-0.5 uppercase text-[10px] tracking-wide">❌ Kompilyator İpucu:</span>
                  {compilerError}
                </div>
              )}

              {/* Hərəkət Düymələri */}
              <div className="flex justify-end pt-1">
                {!allPassed ? (
                  <button
                    onClick={validateCode}
                    disabled={isValidating}
                    className="w-full sm:w-auto bg-gradient-to-r from-emerald-400 to-teal-500 text-white px-10 py-4 text-xs font-black rounded-2xl border-b-[5px] border-emerald-600 active:border-b-0 active:translate-y-[5px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-widest shadow-md"
                  >
                    {isValidating ? "KOD SINAQDAN KEÇİR... ⏳" : <><Play size={14} fill="white" /> SEHRİ YOXYA ✨</>}
                  </button>
                ) : (
                  <button
                    onClick={goBackToMap}
                    className="w-full sm:w-auto bg-gradient-to-r from-sky-400 to-blue-500 text-white px-12 py-4 text-xs font-black rounded-2xl border-b-[5px] border-blue-600 active:border-b-0 active:translate-y-[4px] transition-all hover:from-sky-300 hover:to-blue-400 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg animate-bounce"
                  >
                    MƏRHƏLƏNİ TAMAMLA 🚀
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

      {/* İncə, Oyunvari CSS Animasiyaları */}
      <style jsx global>{`
        .task-editor .cm-editor {
          font-family: 'Consolas', 'Courier New', monospace !important;
          font-size: 14.5px !important;
          font-weight: 700 !important;
          background-color: #ffffff !important;
          padding: 6px 0;
        }
        .task-editor .cm-gutters {
          background-color: #f8fafc !important;
          border-right: 2px solid #e2e8f0 !important;
          color: #94a3b8 !important;
        }
        
        @keyframes avatarLeft {
          from { transform: translateX(-30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes bubbleIn {
          0% { transform: scale(0.85); opacity: 0; transform-origin: top left; }
          70% { transform: scale(1.03); opacity: 0.9; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes studentLayout {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .animate-avatar-left { animation: avatarLeft 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-bubble-in { animation: bubbleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-student-layout { animation: studentLayout 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards; }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .animate-pop-in { animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>
    </div>
  );
}