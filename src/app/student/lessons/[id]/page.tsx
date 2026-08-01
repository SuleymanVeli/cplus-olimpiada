'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTransition } from '@/src/context/TransitionContext';
import { useUser } from '@/src/context/UserContext';
import { ArrowLeft, ChevronRight, Sword, Video, BookOpen, Smile } from 'lucide-react';
import { animalsDataAdventurers, animalsDataForests, AnimalType } from '@/src/lib/constants';

interface LessonData {
  _id: string;
  title: string;
  moduleTitle: string;
  videoUrl?: string;
  content: string;
  nextTaskId?: string;
  order?: number;
  level: number;
}

// Arenadakı ardıcıl yazı makinası hook-u
function useSequentialTypewriter(text: string, speed: number = 8, startTrigger: boolean = true) {
  const [displayedText, setDisplayedText] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!text || !startTrigger) {
      setDisplayedText('');
      setIsFinished(false);
      return;
    }

    let index = 0;
    setDisplayedText('');
    setIsFinished(false);

    const timer = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) {
        clearInterval(timer);
        setIsFinished(true);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, startTrigger]);

  return { displayedText, isFinished };
}

export default function InteractiveLessonPage() {
  const params = useParams();
  const { navigateTo, endTransition } = useTransition();
  const { userData } = useUser();

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [mentorAnimal, setMentorAnimal] = useState<AnimalType | null>(null);
  const [mentorSpeech, setMentorSpeech] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Zəncirvari Yazı Makinası İntrosu
  const speechAnim = useSequentialTypewriter(mentorSpeech, 8, !loading);

  useEffect(() => {
    async function fetchLessonData() {
      try {
        const res = await fetch(`/api/lessons/${params.id}?userId=${userData?._id}`);
        const result = await res.json();

        if (result.success && result.data) {
          setLesson(result.data);
          setupMentor(result.data);
        } else {
          generateMockLesson();
        }
      } catch (error) {
        console.error('Dərs yüklənərkən xəta:', error);
        generateMockLesson();
      } finally {
        setLoading(false);
        endTransition();
      }
    }

    function setupMentor(data: LessonData) {
      const assignedAnimal = data.level === 1
        ? animalsDataForests[(data.order || 0) % animalsDataForests.length]
        : animalsDataAdventurers[(data.order || 0) % animalsDataAdventurers.length];

      setMentorAnimal(assignedAnimal);
      setMentorSpeech(`Salam, gənc kod yazarı! 🌟 Mən ${data.level === 1 ? 'meşənin' : 'cəngəllik'} müəllimi ${assignedAnimal.name}. Bugün səninlə super bir mövzu öyrənəcəyik! Hazırsansa, əvvəlcə izah videomuza baxaq, sonra konspekti oxuyarıq! 🚀`);
    }

    function generateMockLesson() {
      const mockData = {
        _id: String(params.id),
        moduleTitle: 'GİRİŞ VƏ MƏLUMAT TİPLƏRİ',
        title: 'C++ Proqramının Əsas Strukturu və `cout`',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        order: 3,
        level: 1,
        content: `
          <h3>🚀 C++ Dünyasına Xoş Gəldiniz!</h3>
          <p>Hər bir C++ proqramı xüsusi bir ana şablondan başlayır. Kompüter kodu yuxarıdan aşağıya doğru oxuyur və icra edir.</p>
          
          <div class="code-box">
            <span class="keyword">#include</span> <span class="string">&lt;iostream&gt;</span><br/>
            <span class="keyword">using namespace</span> std;<br/><br/>
            <span class="type">int</span> <span class="function">main</span>() {<br/>
            &nbsp;&nbsp;&nbsp;&nbsp;cout &lt;&lt; <span class="string">"Salam, Dünya!"</span> &lt;&lt; endl;<br/>
            &nbsp;&nbsp;&nbsp;&nbsp;<span class="keyword">return</span> <span class="number">0</span>;<br/>
            }
          </div>

          <h3>🔍 Gəlin Kodu Parçalayaq:</h3>
          <ul>
            <li><strong>#include &lt;iostream&gt;</strong> — Giriş-Çıxış kitabxanasıdır, ekrana yazı yazmaq üçün mütləq lazımdır.</li>
            <li><strong>int main()</strong> — Proqramımızın ürəyidir. C++ kodları birinci buradan işə düşür.</li>
          </ul>

          <div class="tip-box">
            💡 <strong>Qızıl Qayda:</strong> C++ dilində hər bir sətrin sonuna mütləq nöqtəli vergül (<code>;</code>) qoyulmalıdır! Unutsanız proqramınız inciyər.
          </div>
        `,
        nextTaskId: 'next_task_101',
      };
      setLesson(mockData);
      setupMentor(mockData);
    }

    if (params.id && userData?._id) {
      fetchLessonData();
    }
  }, [params.id, userData?._id]);

  const goBackToMap = () => {
    switch (lesson?.level) {
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

  const handleCompleteLesson = async () => {
    if (!lesson) return;
    const mockUserId = userData?._id;

    try {
      await fetch('/api/student/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: mockUserId,
          type: 'lesson',
          level: lesson.level,
          id: lesson._id
        }),
      })

      goBackToMap();
    } catch (error) {
      goBackToMap();
    }
  };



  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4 bg-[#eef9f1]">
        <div className="w-14 h-14 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin shadow-[0_4px_12px_rgba(46,204,113,0.2)]" />
        <p className="font-black text-emerald-600 text-xs tracking-widest uppercase animate-pulse">
          Mühazirə Materialları Hazırlanır... ✨
        </p>
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className={`min-h-screen dynamic-arena-bg ${lesson?.level === 2 ? 'level-2-theme' : 'level-1-theme'} text-slate-700 font-sans select-none pb-20 relative`}>

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

        <div className="text-center">
          {/* Səviyyəyə görə modulun etiket rəngi dəyişir */}
          <span className="text-[9px] font-black tracking-widest uppercase block dynamic-student-label">
            {lesson.moduleTitle}
          </span>
          <h1 className="text-xs sm:text-sm font-black text-slate-800 m-0 uppercase tracking-tight">
            {lesson.title}
          </h1>
        </div>

        <div className="w-[85px] hidden sm:block" />
      </div>

      {/* 🗺️ DIALOG AXINI */}
      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-8 flex flex-col">

        {/* 🦊 ETAP 1 & 2: SOLA MEYİLLİ MENTOR HEYVANI VƏ ONUN VİDEO + CONTENT MESAJLARI */}
        {mentorAnimal && (
          <div className="w-full flex items-start gap-5 animate-avatar-left self-start max-w-[88%]">

            {/* HEYVAN AVATARI */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-18 h-18 rounded-full overflow-hidden border-4 bg-white shadow-md transition-transform duration-300 hover:scale-105 dynamic-mentor-box">
                <img
                  src={mentorAnimal.imagePath}
                  alt={mentorAnimal.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="mt-1.5 text-white font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm dynamic-mentor-badge">
                {mentorAnimal.name}
              </span>
            </div>

            {/* YAZILARI, VİDEONU VƏ CONTENTİ TUTAN BÖLMƏ */}
            <div className="flex-1 bg-white border-3 p-5 rounded-[28px] rounded-tl-none shadow-md space-y-5 relative text-left animate-bubble-in dynamic-mentor-box">

              {/* Giriş Salamlaşma Mətni */}
              <div className="border-2 p-3 rounded-2xl flex gap-2 items-center dynamic-mentor-speech">
                <Smile className="flex-shrink-0" size={18} />
                <p className="m-0 text-xs font-black font-mono leading-relaxed">
                  {speechAnim.displayedText}
                  {!speechAnim.isFinished && (
                    <span className="inline-block w-1.5 h-3.5 ml-0.5 animate-pulse bg-current">|</span>
                  )}
                </p>
              </div>

              {/* VİDEO MESAJI */}
              {lesson.videoUrl && speechAnim.isFinished && (
                <div className="space-y-2 transition-all duration-500 animate-pop-in">
                  {/* Başlıq rəngi səviyyəyə uyğunlaşır */}
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 dynamic-step-header">
                    <Video size={14} /> Addım 1: Mövzu İzah Videosu
                  </span>

                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border-3 border-slate-100 shadow-inner flex flex-col items-center justify-center p-6 text-center select-none group">

                    {lesson.videoUrl == "coming_soon" && lesson.videoUrl.startsWith('http') ? (
                      <iframe
                        src={lesson.videoUrl}
                        title={lesson.title}
                        className="absolute top-0 left-0 w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      /* VİDEO HƏLƏ YOXDURSA */
                      <div className="relative z-10 flex flex-col items-center gap-3 max-w-sm">
                        <div className="relative flex items-center justify-center">
                          <span className="text-5xl filter drop-shadow-md animate-bounce">🎬</span>
                          <span className="absolute -top-1 -right-2 text-2xl animate-pulse delay-100">✨</span>
                          <span className="absolute -bottom-1 -left-2 text-2xl animate-pulse delay-300">🍿</span>
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-amber-400 uppercase tracking-wider m-0">
                            Sehrli Laboratoriya Hazırlanır!
                          </h4>
                          <p className="text-slate-400 text-[11px] font-bold font-mono leading-normal m-0">
                            Meşənin mühafizəçiləri bu mövzu üçün super bir video çəkir. Popkornları hazırla, çox yaxında bura yerləşdiriləcək! 🚀
                          </p>
                        </div>

                        <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden p-[2px] border border-slate-700 mt-1">
                          <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full animate-[loadingBar_2s_infinite_linear] w-1/2" />
                        </div>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08)_0%,transparent_70%)] pointer-events-none" />
                  </div>
                </div>
              )}

              {/* KONSPEKT / CONTENT */}
              {speechAnim.isFinished && (
                <div className="space-y-3 pt-3 border-t-2 border-slate-100 transition-all duration-700 animate-fade-in">
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 dynamic-step-header">
                    <BookOpen size={14} /> Addım 2: Qısa Konspekt & Qeydlər
                  </span>

                  <div
                    className="lesson-content-container text-slate-600 text-xs sm:text-sm font-semibold leading-relaxed font-mono"
                    dangerouslySetInnerHTML={{ __html: lesson.content }}
                  />
                </div>
              )}

            </div>
          </div>
        )}

        {/* 👨‍🏫 ETAP 3: SAĞA MEYİLLİ STRUKTUR */}
        {speechAnim.isFinished && (
          <div className="w-full flex items-start gap-5 self-end flex-row-reverse max-w-[94%] animate-student-layout">

            {/* ŞAGİRDİN AVATARI */}
            <div className="flex flex-col items-center flex-shrink-0 animate-pop-in">
              <div className="w-18 h-18 rounded-full overflow-hidden border-4 bg-white shadow-md flex items-center justify-center transition-transform duration-300 hover:scale-105 dynamic-student-box">
                <img
                  src={`/avatars/avatar-${userData?.avatar || 1}.png`}
                  alt={userData?.fullName || "QƏHRƏMAN"}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="mt-1.5 text-white font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm dynamic-student-label" style={{ backgroundColor: 'var(--student-border)' }}>
                {userData?.fullName || "QƏHRƏMAN"}
              </span>
            </div>

            {/* ŞAGİRDİN DİALOQ QUTUNUZ VƏ BUTONU */}
            <div className="flex-1 bg-white border-3 p-5 rounded-[28px] rounded-tr-none shadow-md space-y-4 text-right animate-bubble-in dynamic-student-box">
              <div>
                <span className="text-[9px] font-black tracking-wider uppercase block mb-1 dynamic-student-label">QƏHRƏMAN</span>
                <p className="text-xs sm:text-sm font-black m-0 leading-relaxed font-mono">
                  "Çox sağ ol! Mühazirəni və izahı əla şəkildə bitirdim. Nəzəriyyə tərəfi tamdırsa, indi Arenaya keçib tapşırıqları həll edə bilərəm!"
                </p>
              </div>

              <div className="flex justify-end pt-1">
                {/* Səviyyəyə görə butonun kənar rəngləri və gradienti fərqli çalarlarda dolur */}
                <button
                  onClick={handleCompleteLesson}
                  className={`w-full sm:w-auto text-white px-10 py-4 text-xs font-black rounded-2xl border-b-[5px] active:border-b-0 active:translate-y-[5px] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-widest shadow-md
                    ${lesson?.level === 2
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-700'
                      : 'bg-gradient-to-r from-emerald-400 to-teal-500 border-emerald-600'
                    }
                  `}
                >
                  <Sword size={14} /> TAPŞIRIQLARA BAŞLA🚀
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Global Stillər */}
      <style jsx global>{`
        .lesson-content-container h3 {
          font-size: 1.05rem;
          font-weight: 900;
          color: #1e293b;
          margin-top: 1.25rem;
          margin-bottom: 0.4rem;
          font-family: sans-serif !important;
        }
        .lesson-content-container p {
          margin-bottom: 0.75rem;
          line-height: 1.6;
        }
        .lesson-content-container ul {
          padding-left: 1.1rem;
          margin-bottom: 1rem;
          list-style-type: square;
        }
        .lesson-content-container li {
          margin-bottom: 0.4rem;
        }
        
        .lesson-content-container .code-box {
          background-color: #1e1e2e;
          color: #cdd6f4;
          font-family: 'Consolas', 'Courier New', monospace;
          padding: 1.1rem;
          border-radius: 18px;
          margin: 1.25rem 0;
          font-weight: 700;
          font-size: 0.85rem;
          line-height: 1.5;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.3);
          border: 3px solid #313244;
          text-align: left;
        }
        .lesson-content-container .code-box .keyword { color: #f38ba8; }
        .lesson-content-container .code-box .string { color: #a6e3a1; }
        .lesson-content-container .code-box .type { color: #fab387; }
        .lesson-content-container .code-box .function { color: #89b4fa; }
        
        .lesson-content-container .tip-box {
          background-color: #e0f2fe;
          border: 2px solid #bae6fd;
          border-left: 6px solid #0284c7;
          padding: 1rem;
          border-radius: 16px;
          margin-top: 1.25rem;
          font-size: 0.8rem;
          color: #0369a1;
          font-family: sans-serif !important;
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
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .animate-pop-in { animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>
    </div>
  );
}