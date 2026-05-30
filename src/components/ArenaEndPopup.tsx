'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ArenaEndPopupProps {
  isOpen: boolean;
  type: 'success' | 'timeout';
  totalScore: number;
  maxPossibleScore: number;
  onRedirect: () => void;
}

export default function ArenaEndPopup({
  isOpen,
  type,
  totalScore,
  maxPossibleScore,
  onRedirect
}: ArenaEndPopupProps) {
  const [countdown, setCountdown] = useState(5);

  // 1. Taymer yalnız saniyələri azaltmağa baxsın (State daxilində kənar funksiya çağırılmır)
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // 2. Geri sayım 0-a çatanda təhlükəsiz şəkildə yönləndirmə edilsin (Render-dən sonrakı faza)
  useEffect(() => {
    if (isOpen && countdown === 0) {
      onRedirect();
    }
  }, [countdown, isOpen, onRedirect]);

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300 p-4">
      <div className="bg-white rounded-[32px] border-4 border-slate-200 border-b-[8px] shadow-2xl p-8 max-w-md w-full text-center space-y-6 transform animate-in zoom-in-95 duration-300">
        
        {/* İkon və Vizual Animasiya */}
        <div className="flex justify-center">
          {type === 'success' ? (
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center border-4 border-emerald-400 text-5xl animate-bounce">
              🏆
            </div>
          ) : (
            <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center border-4 border-amber-400 text-5xl animate-pulse">
              ⏰
            </div>
          )}
        </div>

        {/* Başlıq və Mətn */}
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 uppercase font-mono tracking-tight">
            {type === 'success' ? 'Möhtəşəm Qələbə! 🎉' : 'Sınaq Müddəti Bitdi!'}
          </h2>
          <p className="text-slate-500 text-xs font-bold font-mono leading-relaxed px-2">
            {type === 'success' 
              ? 'Təbriklər! Sınaqdakı bütün proqramlaşdırma məsələlərini 100% doğru həll edərək arenanı tamamladın!' 
              : 'Təyin olunmuş fərdi imtahan vaxtın başa çatdı. Yazdığın bütün kodlar sistem tərəfindən avtomatik qorundu.'}
          </p>
        </div>

        {/* Cari Bal Statistikası */}
        <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 font-mono">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Topladığın Yekun Xal</span>
          <span className="text-xl font-black text-cyan-600">
            {totalScore} / {maxPossibleScore} Xal
          </span>
        </div>

        {/* Geri Sayım Vizualı */}
        <div className="pt-2">
          <div className="inline-flex items-center gap-2 bg-slate-900 text-white text-[10px] font-black font-mono px-4 py-2 rounded-xl uppercase tracking-wider">
            <Loader2 className="animate-spin text-cyan-400" size={12} />
            {countdown > 0 ? `${countdown} saniyə sonra təlim panelinə keçid...` : 'Keçid edilir...'}
          </div>
        </div>
        
      </div>
    </div>
  );
}