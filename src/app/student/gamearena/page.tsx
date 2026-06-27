'use client';

import { useEffect, useState } from 'react';
import { Play, MapPin, CheckCircle2, ArrowLeft, Lock } from 'lucide-react';
import { useUser } from '@/src/context/UserContext';
import { useTransition } from '@/src/context/TransitionContext';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { animalsData } from '@/src/lib/constants';

export default function GamesGrid() {
  const [games, setGames] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const { userData } = useUser();
  const { navigateTo, endTransition } = useTransition();

  useEffect(() => {
    if (!userData?._id) return;

    // 🧠 Yeni qurduğumuz API-a istifadəçi ID-sini query olaraq ötürürük
    fetch(`/api/topics?userId=${userData?._id}`)
      .then(res => res.json())
      .then(data => {
        if (data.games) setGames(data.games);
        if (data.totalGamePoints) setTotalPoints(data.totalGamePoints);
      })
      .catch(err => console.error("Xəritə datası yüklənərkən xəta:", err))
      .finally(() => endTransition());
  }, [userData?._id]);

  return (
    <div className="min-h-screen bg-emerald-950">

      {/* 1. HERO BANNER - Tam ekran */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-[60vh] md:h-[70vh] w-full flex flex-col items-center justify-center p-8 overflow-hidden"
      >
        <Image
          src="/banners/game.png"
          alt="Macəra"
          fill
          priority
          className="object-cover opacity-40"
        />

        {/* Qayıt düyməsi */}
        <button
          onClick={() => navigateTo('/student/dashboard')}
          className="absolute top-8 left-8 z-30 flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold px-6 py-3 rounded-2xl transition-all"
        >
          <ArrowLeft size={20} /> Tədrisə Qayıt
        </button>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="z-10 text-center"
        >
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 drop-shadow-2xl">
            Macəra Arenası
          </h1>
          <p className="text-emerald-100 text-lg md:text-xl font-medium max-w-xl mx-auto mb-4">
            Hər heyvan öz xəritəsini gətirib. Robotu proqramlaşdır və meşəni kəşf et!
          </p>
          
          {/* 🎯 Ümumi Oyun Balı Göstəricisi */}
          <div className="inline-flex items-center gap-2 bg-amber-400 text-slate-950 font-black px-6 py-2.5 rounded-full text-sm shadow-xl tracking-wide uppercase">
            ⭐ Ümumi Xalın: {totalPoints} XP
          </div>
        </motion.div>
      </motion.div>

      {/* 2. KARTLAR SAHƏSİ */}
      <motion.div
        initial={{ y: "10%" }}
        whileInView={{ y: 0 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 60 }}
        className="relative z-20 bg-slate-50 rounded-t-[60px] p-8 md:p-16 -mt-20 shadow-[0_-20px_50px_rgba(0,0,0,0.15)] min-h-screen"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-3 bg-emerald-500 rounded-3xl text-white shadow-lg">
                <MapPin size={32} />
              </div>
              Sənin Macəra Xəritən
            </h2>
          </div>

          <div className="space-y-16">
            {games?.map((topic, tIdx) => {
              const isTopicUnlocked = topic.isUnlocked !== false; // Backend-dən gələn təhlükəsizlik kilidi

              return (
                <div 
                  key={topic._id} 
                  className={`bg-white p-8 rounded-[40px] border-4 transition-all shadow-sm space-y-6 ${
                    isTopicUnlocked ? 'border-white opacity-100' : 'border-slate-100 bg-slate-100/50 opacity-65 select-none'
                  }`}
                >
                  {/* 1. MÖVZU ÜMUMİ MƏLUMAT BÖLMƏSİ */}
                  <div className="border-b-2 border-dashed border-slate-100 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`font-black text-xs px-3 py-1 rounded-xl uppercase tracking-wider ${
                          isTopicUnlocked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'
                        }`}>
                          Bölmə {topic.order || tIdx + 1}
                        </span>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                          {topic.name}
                          {!isTopicUnlocked && <Lock size={20} className="text-slate-400 inline" />}
                        </h2>
                      </div>

                      <div
                        className="prose prose-slate max-w-none text-slate-600 text-sm font-medium"
                        dangerouslySetInnerHTML={{ __html: topic.description || "Bu bölmədəki arenaları tamamlamaq üçün kod sehrindən istifadə et!" }}
                      />
                    </div>

                    {topic.isCompleted && (
                      <div className="flex items-center gap-1.5 bg-emerald-500 text-white font-black px-4 py-2 rounded-2xl text-xs uppercase self-start md:self-center shadow-md">
                        <CheckCircle2 size={14} /> Tamamlandı
                      </div>
                    )}
                  </div>

                  {/* 2. LEVELLƏR */}
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-4">
                      {isTopicUnlocked ? `🗺️ Bölmənin Arenaları (${topic.levels?.length || 0} Oyun)` : '🔒 Bu bölmənin kilidini açmaq üçün əvvəlki dərsləri bitir!'}
                    </span>

                    {topic.levels && topic.levels.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {topic.levels.map((level: any, lIdx: number) => {
                          const animal = animalsData[(level.order - 1) % animalsData.length] || animalsData[0];
                          const isLevelUnlocked = isTopicUnlocked && (level.isUnlocked !== false);
                          const isLevelCompleted = level.isCompleted;

                          return (
                            <div
                              key={level._id}
                              className={`bg-slate-50 p-6 rounded-[32px] border-4 transition-all shadow-md flex flex-col justify-between ${
                                isLevelUnlocked 
                                  ? 'border-white hover:border-amber-300 hover:-translate-y-1.5 bg-white' 
                                  : 'border-transparent opacity-60 pointer-events-none'
                              }`}
                            >
                              <div>
                                {/* Heyvan İkonu və Sağ Üst Status */}
                                <div className="flex justify-between items-start mb-4">
                                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-slate-100 shadow-inner relative bg-white flex-shrink-0">
                                    <Image
                                      src={`/animals/${animal.image}`}
                                      alt={animal.nameAz}
                                      fill
                                      className={`object-cover p-1 ${!isLevelUnlocked && 'grayscale'}`}
                                    />
                                  </div>
                                  
                                  {isLevelCompleted ? (
                                    <span className="text-emerald-500 bg-emerald-50 p-2 rounded-full">
                                      <CheckCircle2 size={22} fill="currentColor" className="text-white" />
                                    </span>
                                  ) : !isLevelUnlocked ? (
                                    <span className="text-slate-400 bg-slate-200/60 p-2 rounded-xl">
                                      <Lock size={16} />
                                    </span>
                                  ) : null}
                                </div>

                                {/* Level Başlığı və Xallar */}
                                <div className="flex items-center gap-2 mb-3">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                    isLevelUnlocked ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-500'
                                  }`}>
                                    Arena {level.order || lIdx + 1}
                                  </span>
                                  
                                  {/* Əgər keçibsə faktiki toplanan balı, keçməyibsə verəcəyi max balı göstəririk */}
                                  <span className="text-slate-500 text-[10px] font-bold">
                                    {isLevelCompleted ? `Keçildi: ${level.earnedPoints}/${level.levelPoint || level.points} XP` : `+${level.levelPoint || level.points} XP`}
                                  </span>
                                </div>

                                <h3 className="text-xl font-black text-slate-900 mb-6 leading-snug">
                                  {level.title}
                                </h3>
                              </div>

                              {/* Düymə */}
                              <button
                                disabled={!isLevelUnlocked}
                                onClick={() => navigateTo(`/student/gamearena/${level._id}`)}
                                className={`w-full font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md ${
                                  isLevelCompleted
                                    ? 'bg-slate-800 text-white hover:bg-slate-700 shadow-[0_4px_0_#1e293b]'
                                    : isLevelUnlocked
                                    ? 'bg-amber-500 text-white hover:bg-amber-400 shadow-[0_4px_0_#b45309] active:translate-y-0.5 active:shadow-none'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                }`}
                              >
                                {isLevelCompleted ? (
                                  <>Yenidən Oyna</>
                                ) : isLevelUnlocked ? (
                                  <><Play size={16} fill="currentColor" /> Oyuna Başla</>
                                ) : (
                                  <>Kilidlidir</>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        🔒 Bu bölməyə aid arenalar tezliklə aktivləşəcək!
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}