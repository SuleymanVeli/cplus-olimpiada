'use client';

import { useEffect, useState } from 'react';
import { Play, MapPin, CheckCircle2 } from 'lucide-react';
import { useUser } from '@/src/context/UserContext';
import { useTransition } from '@/src/context/TransitionContext';
import Image from 'next/image';

// Heyvanlar məlumat bazası
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

export default function GamesGrid() {
  const [games, setGames] = useState<any[]>([]);
  const { userData } = useUser();
  const { navigateTo, endTransition } = useTransition();

  useEffect(() => {
    if (!userData?._id) return;

    fetch(`/api/games?userId=${userData?._id}`)
      .then(res => res.json())
      .then(data => setGames(data.games))
      .catch(err => console.error(err))
      .finally(() => {
        endTransition();
      });
  }, [userData?._id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-200 via-emerald-50 to-green-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* REYAL BANNER REZERVİ */}
        <div className="relative w-full h-[280px] md:h-[380px] rounded-[40px] overflow-hidden shadow-[0_12px_0_#065f46] border-4 border-white group">
          <Image 
            src="/banners/game.png" // Bura sənə verdiyim sonuncu meşə və robot şəklini qoyacaqsan
            alt="Macəra Arenası Banner"
            fill
            priority
            className="object-cover transition-transform duration-700 group-hover:scale-102"
          />
          {/* Banner daxili qat və mətn */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/70 via-emerald-900/40 to-transparent flex flex-col justify-center p-8 md:p-12">
            <span className="bg-amber-400 text-emerald-950 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider w-fit mb-3 shadow-md">
              Yeni Rejim Aktivdir 🤖
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-white drop-shadow-[0_3px_3px_rgba(0,0,0,0.4)] max-w-lg leading-tight">
              Robotla Yarışa Qoşul!
            </h1>
            <p className="text-emerald-100 font-medium text-sm md:text-base mt-2 max-w-md drop-shadow-md">
              Hər heyvan öz xüsusi xəritəsini gətirib. Kodlarını yaz, robotu proqramlaşdır və arenada qalib gəl!
            </p>
          </div>
        </div>

        {/* BAŞLIQ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-dashed border-emerald-200 pb-4">
          <h2 className="text-3xl md:text-4xl font-black text-emerald-900 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-[0_4px_0_#065f46]">
              <MapPin size={28} className="animate-bounce" />
            </div>
            Aktiv Arenalar
          </h2>
          <div className="bg-white/80 border-2 border-emerald-200 px-5 py-2 rounded-2xl text-sm font-bold text-emerald-800 shadow-sm">
            Toplam Arena: <span className="text-emerald-500 font-black text-base">{games?.length || 0}</span>
          </div>
        </div>

        {/* QRID SISTEMI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {games?.map((game, index) => {
            // Hər oyun üçün sırayla bir heyvan seçirik (əgər oyun sayı çox olarsa dövr edir)
            const animal = animalsData[index % animalsData.length];
            
            return (
              <div 
                key={game._id}
                className={`relative bg-white p-6 rounded-[36px] border-4 transition-all duration-300 hover:-translate-y-2 flex flex-col justify-between ${
                  game.isCompleted 
                    ? 'border-emerald-400 shadow-[0_12px_0_#10b981] bg-gradient-to-b from-white to-emerald-50/40' 
                    : 'border-amber-300 shadow-[0_12px_0_#f59e0b]'
                }`}
              >
                {/* Bitirilib nişanı */}
                {game.isCompleted && (
                  <div className="absolute -top-3 -right-3 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-white shadow-md z-10 animate-pulse">
                    <CheckCircle2 size={20} strokeWidth={3} />
                  </div>
                )}

                <div>
                  {/* DAİRƏVİ HEYVAN ŞƏKİLİ ÇƏRÇİVƏSİ */}
                  <div className={`w-20 h-20 rounded-full border-4 p-1 shadow-inner overflow-hidden mb-5 bg-gradient-to-tr ${
                    game.isCompleted ? 'border-emerald-400 from-emerald-100 to-emerald-300' : 'border-amber-300 from-amber-100 to-amber-200'
                  }`}>
                    <div className="relative w-full h-full rounded-full overflow-hidden">
                      <Image 
                        src={`/animals/${animal.image}`}
                        alt={animal.nameAz}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>

                  {/* KART MƏTNLƏRİ */}
                  <div className="space-y-1">
                    <span className="text-xs font-black tracking-wide text-emerald-600/70 uppercase">
                      {animal.nameAz} Arenası
                    </span>
                    <h3 className="text-2xl font-black text-emerald-950 leading-tight">
                      {game.title}
                    </h3>
                  </div>
                  
                  <p className="text-emerald-700/80 font-medium text-sm mt-3 mb-6 line-clamp-3">
                    {game.instructionText}
                  </p>
                </div>
                
                {/* DÜYMƏ */}
                <button 
                  onClick={() => navigateTo(`/student/gamearena/${game._id}`)}
                  className={`w-full font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-white transition-all active:scale-95 text-base ${
                    game.isCompleted
                      ? 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_5px_0_#065f46]'
                      : 'bg-amber-500 hover:bg-amber-400 shadow-[0_5px_0_#b45309]'
                  }`}
                >
                  <Play size={20} fill="currentColor" /> Oyuna Atıl
                </button>
              </div>
            );
          })}
          
          {/* OYUN TAPILMADIQDA */}
          {games?.length === 0 && (
            <div className="col-span-full text-center p-16 bg-white/70 backdrop-blur-sm rounded-[40px] border-4 border-dashed border-emerald-300 max-w-2xl mx-auto shadow-sm">
              <div className="text-5xl mb-4">🚀</div>
              <h4 className="text-xl font-black text-emerald-950 mb-2">Hələ heç bir arena açılmayıb!</h4>
              <p className="text-emerald-700 font-semibold text-sm">
                Macəranı davam etdirmək üçün dərsləri bitir və xəritədəki yeni adaları kəşf et!
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}