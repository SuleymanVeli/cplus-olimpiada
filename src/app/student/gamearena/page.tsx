'use client';

import { useEffect, useState } from 'react';
import { Play, MapPin, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useUser } from '@/src/context/UserContext';
import { useTransition } from '@/src/context/TransitionContext';
import { motion } from 'framer-motion';
import Image from 'next/image';

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
      .finally(() => endTransition());
  }, [userData?._id]);

  return (
    <div className="min-h-screen bg-emerald-950">
      
      {/* 1. HERO BANNER - Tam ekran */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        className="relative h-screen w-full flex flex-col items-center justify-center p-8 overflow-hidden"
      >
        <Image 
          src="/banners/game.png" 
          alt="Macəra" 
          fill 
          priority
          className="object-cover opacity-50" 
        />
        
        {/* Qayıt düyməsi */}
        <button 
          onClick={() => navigateTo('/student/learning')}
          className="absolute top-8 left-8 z-30 flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold px-6 py-3 rounded-2xl transition-all"
        >
          <ArrowLeft size={20} /> Tədrisə Qayıt
        </button>

        <motion.div 
          initial={{ y: 50, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }}
          className="z-10 text-center"
        >
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 drop-shadow-2xl">
            Macəra Arenası
          </h1>
          <p className="text-emerald-100 text-xl font-medium max-w-lg mx-auto">
            Hər heyvan öz xəritəsini gətirib. Robotu proqramlaşdır və meşəni kəşf et!
          </p>
        </motion.div>
      </motion.div>

      {/* 2. KARTLAR SAHƏSİ - Aşağıdan yuxarıya sürüşən */}
   <motion.div 
        initial={{ y: "20%" }}
        whileInView={{ y: 0 }}
        transition={{ type: "spring", stiffness: 60 }}
        className="relative z-20 bg-white rounded-t-[60px] p-8 md:p-16 -mt-20 shadow-[0_-20px_50px_rgba(0,0,0,0.2)]"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-3 bg-amber-400 rounded-3xl text-white shadow-lg">
                <MapPin size={32} />
              </div>
              Aktiv Arenalar
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {games?.map((game) => {
              const animal = animalsData[(game.order-1) % animalsData.length];
              return (
                <div key={game._id} className="bg-slate-50 p-8 rounded-[40px] border-4 border-white hover:border-amber-300 transition-all shadow-xl hover:-translate-y-3">
                  <div className="w-20 h-20 rounded-3xl overflow-hidden mb-6 border-4 border-white shadow-inner relative">
                    <Image src={`/animals/${animal.image}`} alt={animal.nameAz} fill className="object-cover"/>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-4">{game.title}</h3>
                  <button 
                    onClick={() => navigateTo(`/student/gamearena/${game._id}`)}
                    className="w-full bg-amber-500 text-white font-black py-4 rounded-2xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-[0_5px_0_#b45309]"
                  >
                    <Play size={20} fill="currentColor" /> Oyuna Başla
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}