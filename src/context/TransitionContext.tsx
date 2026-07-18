'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type TransitionContextType = {
  isTransitioning: boolean;
  navigateTo: (href: string) => void;
  endTransition: () => void; // 🚀 Səhifələrin çağıracağı yeni sehrli funksiya
  currentTrack: string; // 🚀 Hazırda aktiv olan musiqi faylı
  isMusicAllowed: boolean; // 🚀 İstifadəçi "Sehrli Meşəyə Daxil Ol" düyməsini basıbmı?
  allowMusic: () => void; // 🚀 Giriş icazəsi funksiyası
};

const TransitionContext = createContext<TransitionContextType | undefined>(undefined);

const getTrackForPath = (path: string): string => {
  // Dinamik ID-ləri idarə etmək üçün regex və ya sadə axtarışdan istifadə edirik
  if (path === '/' || path === '/student/dashboard') {
    return '/audio/bg/bg.mp3';
  }  
  if (path.startsWith('/student/adventure') || path.includes('/student/learning')) {
    return '/audio/bg/bg4.mp3';
  }
  if (path.startsWith('/student/gamearena') || path.includes('/student/arena/') ||  path.includes('/student/lessons/')) {
    return '/audio/bg/bg2.mp3';
  }
  
  // Default olaraq lobby musiqisi
  return '/audio/bg/bg.mp3';
};

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMusicAllowed, setIsMusicAllowed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Hazırkı səhifəyə uyğun musiqi yolunu dövlət kimi saxlayırıq
  const [currentTrack, setCurrentTrack] = useState(() => getTrackForPath(pathname));
  
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // İstifadəçi ilk popup-da icazə verəndə çağırılır
  const allowMusic = () => {
    setIsMusicAllowed(true);
  };

  const navigateTo = (href: string) => {
    if (isTransitioning || pathname === href) return;
    
    // 1. Buludları ekrana doğru gətir (bağlanma animasiyası)
    setIsTransitioning(true);

    // 2. Buludlar tam qapananda (600ms sonra) route-u dəyiş və musiqini dəyişdir
    setTimeout(() => {
      // Keçid edilən yeni səhifənin musiqi faylını təyin edirik
      const nextTrack = getTrackForPath(href);
      setCurrentTrack(nextTrack);
      
      router.push(href);
    }, 600); 
  };

  const endTransition = () => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    // Buludları rəvan şəkildə açırıq
    setTimeout(() => {
      setIsTransitioning(false);
    }, 150);
  };

  useEffect(() => {
    if (isTransitioning) {
      fallbackTimerRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, 4000);
    }

    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [pathname, isTransitioning]);

  // =======================================================
  // 🚀 BRAUZERİN GERİ/İRƏLİ OX IDARƏSİ (POPSTATE) SİNXRONİZASİYASI
  // =======================================================
  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      const targetUrl = window.location.pathname;

      if (pathname === targetUrl) return;

      setIsTransitioning(true);

      setTimeout(() => {
        const nextTrack = getTrackForPath(targetUrl);
        setCurrentTrack(nextTrack);
        router.replace(targetUrl); 
      }, 600);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname, router]);

  return (
    <TransitionContext.Provider value={{ isTransitioning, 
      navigateTo, 
      endTransition, 
      currentTrack, 
      isMusicAllowed, 
      allowMusic }}>
       {/* =======================================================
          3D PREMIUM ÇOXQATLI BULUD KEÇİDİ (PREMIUM CLOUD OVERLAY)
         ======================================================= */}
      <div className={`fixed inset-0 pointer-events-none z-[9999] flex transition-all duration-700 ${isTransitioning ? 'opacity-100 bg-indigo-900/5' : 'opacity-0 bg-transparent'}`}>
        
        {/* ================= SOL BULUD SİSTEMİ ================= */}
        <div className={`w-1/2 h-full bg-white relative transition-transform duration-[650ms] cubic-bezier(0.19, 1, 0.22, 1) ${isTransitioning ? 'translate-x-0' : '-translate-x-full'}`}>
          
          {/* Əsas Pufiklər */}
          <div className="absolute right-[-110px] top-[5%] w-[260px] h-[260px] bg-white rounded-full shadow-[-20px_10px_40px_rgba(0,0,0,0.04)] animate-cloud-slow" />
          <div className="absolute right-[-60px] top-[28%] w-[190px] h-[190px] bg-white rounded-full shadow-[-15px_10px_30px_rgba(0,0,0,0.03)] animate-cloud-fast" style={{ animationDelay: '-1.5s' }} />
          <div className="absolute right-[-130px] top-[50%] w-[320px] h-[320px] bg-white rounded-full shadow-[-25px_15px_50px_rgba(0,0,0,0.04)] animate-cloud-slow" style={{ animationDelay: '-0.8s' }} />
          <div className="absolute right-[-70px] bottom-[12%] w-[200px] h-[200px] bg-white rounded-full shadow-[-15px_5px_30px_rgba(0,0,0,0.03)] animate-cloud-fast" style={{ animationDelay: '-2.2s' }} />
          <div className="absolute right-[-20px] bottom-[-20px] w-[140px] h-[140px] bg-white rounded-full" />

          {/* Dərinlik Yaradan Kölgə Qatları (Parallax Şəffaf Buludlar) */}
          <div className="absolute right-[-140px] top-[18%] w-[200px] h-[200px] bg-slate-100/70 rounded-full blur-[2px] animate-cloud-medium" style={{ animationDelay: '-0.5s' }} />
          <div className="absolute right-[-160px] bottom-[30%] w-[250px] h-[250px] bg-indigo-50/60 rounded-full blur-[1px] animate-cloud-slow" style={{ animationDelay: '-1.2s' }} />
        </div>

        {/* ================= SAĞ BULUD SİSTEMİ ================= */}
        <div className={`w-1/2 h-full bg-white relative transition-transform duration-[650ms] cubic-bezier(0.19, 1, 0.22, 1) ${isTransitioning ? 'translate-x-0' : 'translate-x-full'}`}> 
          {/* Əsas Pufiklər */}
          <div className="absolute left-[-120px] top-[1%] w-[280px] h-[280px] bg-white rounded-full shadow-[20px_10px_45px_rgba(0,0,0,0.04)] animate-cloud-slow" style={{ animationDelay: '-0.3s' }} />
          <div className="absolute left-[-50px] top-[32%] w-[170px] h-[170px] bg-white rounded-full shadow-[15px_10px_30px_rgba(0,0,0,0.03)] animate-cloud-fast" style={{ animationDelay: '-2.7s' }} />
          <div className="absolute left-[-110px] top-[48%] w-[290px] h-[290px] bg-white rounded-full shadow-[20px_15px_40px_rgba(0,0,0,0.04)] animate-cloud-slow" style={{ animationDelay: '-1.9s' }} />
          <div className="absolute left-[-80px] bottom-[15%] w-[220px] h-[220px] bg-white rounded-full shadow-[15px_5px_35px_rgba(0,0,0,0.03)] animate-cloud-medium" style={{ animationDelay: '-0.6s' }} />
          <div className="absolute left-[-30px] bottom-[-30px] w-[160px] h-[160px] bg-white rounded-full" />

          {/* Dərinlik Yaradan Kölgə Qatları (Parallax Şəffaf Buludlar) */}
          <div className="absolute left-[-150px] top-[22%] w-[220px] h-[220px] bg-slate-100/70 rounded-full blur-[2px] animate-cloud-medium" style={{ animationDelay: '-1.4s' }} />
          <div className="absolute left-[-130px] bottom-[35%] w-[210px] h-[210px] bg-indigo-50/60 rounded-full blur-[1px] animate-cloud-fast" style={{ animationDelay: '-0.2s' }} />
        </div>

        {/* CSS Texnikası: Akustik yellənmə animasiyaları */}
        <style jsx global>{`
          @keyframes cloudWaveSlow {
            0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
            50% { transform: translateY(-15px) scale(1.03) rotate(2deg); }
          }
          @keyframes cloudWaveMedium {
            0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
            50% { transform: translateY(-10px) scale(1.01) rotate(-3deg); }
          }
          @keyframes cloudWaveFast {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-7px) scale(1.04); }
          }
          .animate-cloud-slow { animation: cloudWaveSlow 6s ease-in-out infinite; }
          .animate-cloud-medium { animation: cloudWaveMedium 4.5s ease-in-out infinite; }
          .animate-cloud-fast { animation: cloudWaveFast 3s ease-in-out infinite; }
        `}</style>
      </div>

      {children}
    </TransitionContext.Provider>
  );
}

export function useTransition() {
  const context = useContext(TransitionContext);
  if (!context) throw new Error('useTransition must be used within a TransitionProvider');
  return context;
}