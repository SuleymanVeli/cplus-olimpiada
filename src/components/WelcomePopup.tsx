'use client';

import { useState, useEffect } from 'react';
import { useSFX } from '@/hooks/useSFX';

interface WelcomePopupProps {
  onStartMusic: () => void;
}

export default function WelcomePopup({ onStartMusic }: WelcomePopupProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { playSFX } = useSFX();

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleStart = () => {
    playSFX('btn2', 0.5);
    onStartMusic();
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-emerald-950/30 backdrop-blur-sm">
      
      {/* =======================================================
          ZƏNGİN BULUD EKOSİSTEMİ (LAYERS & PARTICLES)
          ======================================================= */}
      <div className="relative w-full max-w-2xl h-[500px] flex items-center justify-center">

        {/* 1. ARXA PLAN: Şəffaf və Bulanlıq "Duman" Buludları (Parallax) */}
        <div className="absolute top-[10%] left-[5%] w-[300px] h-[300px] bg-white/20 rounded-full blur-[40px] animate-popup-cloud-slow" />
        <div className="absolute bottom-[20%] right-[10%] w-[250px] h-[250px] bg-indigo-200/20 rounded-full blur-[40px] animate-popup-cloud-medium" style={{ animationDelay: '-2s' }} />

        {/* 2. ORTA PLAN: Teksturalı "Pufik" Bulud Qrupları */}
        {/* Top-Left Cluster */}
        <div className="absolute top-[5%] left-[10%] animate-popup-cloud-medium">
            <div className="w-[120px] h-[120px] bg-white rounded-full shadow-lg" />
            <div className="absolute top-10 left-10 w-[80px] h-[80px] bg-white rounded-full" />
        </div>
        
        {/* Right Cluster */}
        <div className="absolute top-[20%] right-[5%] animate-popup-cloud-fast">
            <div className="w-[150px] h-[150px] bg-slate-50 rounded-full shadow-md" />
            <div className="absolute top-[-20px] left-[-30px] w-[100px] h-[100px] bg-slate-50 rounded-full" />
        </div>

        {/* Bottom Cluster */}
        <div className="absolute bottom-[5%] left-[20%] animate-popup-cloud-slow">
            <div className="w-[180px] h-[180px] bg-white rounded-full shadow-lg" />
            <div className="absolute top-0 left-[80px] w-[130px] h-[130px] bg-white rounded-full" />
        </div>

        {/* 3. MƏRKƏZ: ƏSAS "MASTER CLOUD" (Kontent Sahəsi) */}
        <div className="relative z-10 w-[400px] h-[400px] bg-white rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-8 border-emerald-100 flex flex-col items-center justify-center p-8 text-center animate-popup-cloud-slow transition-transform hover:scale-105 duration-500">
            
          {/* Sehrli Parıltı Effektləri (Kiçik sarı dairələr) */}
          <div className="absolute top-10 left-10 w-3 h-3 bg-yellow-200 rounded-full animate-pulse" />
          <div className="absolute bottom-10 right-10 w-4 h-4 bg-yellow-300 rounded-full animate-pulse delay-700" />

          {/* Bayquş */}
          <div className="text-6xl mb-4 animate-bounce-gentle">🦉</div>

          <div className="space-y-3">
            <h3 className="text-2xl font-black text-emerald-600 tracking-tight">Sehrli Portal Oyanır!</h3>
            <p className="text-slate-500 font-medium px-4">
              "Salam gənc proqramçı! Meşəmizin melodiyasını oyatmaq və macəraya başlamaq üçün düyməyə toxun!"
            </p>
          </div>

          <button
            onClick={handleStart}
            className="mt-6 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full shadow-xl shadow-emerald-500/20 border-b-4 border-emerald-700 active:scale-95 transition-all"
          >
            Daxil Ol ✨
          </button>
        </div>

        {/* 4. ÖN PLAN: Kiçik Dekorativ Bulud Parçaları (Floating Particles) */}
        <div className="absolute bottom-[15%] right-[25%] w-[60px] h-[60px] bg-white/80 rounded-full animate-float-fast" />
        <div className="absolute top-[15%] left-[25%] w-[40px] h-[40px] bg-white/80 rounded-full animate-float-slow" />
      </div>

      <style jsx global>{`
        @keyframes popupCloudSlow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes popupCloudMedium {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-1deg); }
        }
        @keyframes popupCloudFast {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes bounceGentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes floatSlow {
            0%, 100% { transform: translate(0,0); }
            50% { transform: translate(20px, -20px); }
        }
        .animate-popup-cloud-slow { animation: popupCloudSlow 6s ease-in-out infinite; }
        .animate-popup-cloud-medium { animation: popupCloudMedium 4s ease-in-out infinite; }
        .animate-popup-cloud-fast { animation: popupCloudFast 3s ease-in-out infinite; }
        .animate-float-slow { animation: floatSlow 8s ease-in-out infinite; }
        .animate-float-fast { animation: floatSlow 5s ease-in-out infinite; }
        .animate-bounce-gentle { animation: bounceGentle 2.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}