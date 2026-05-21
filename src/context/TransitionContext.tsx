'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type TransitionContextType = {
  isTransitioning: boolean;
  navigateTo: (href: string) => void;
  endTransition: () => void; // 🚀 Səhifələrin çağıracağı yeni sehrli funksiya
};

const TransitionContext = createContext<TransitionContextType | undefined>(undefined);

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const navigateTo = (href: string) => {
    if (isTransitioning || pathname === href) return;
    
    // 1. Buludları ekrana doğru gətir (bağlanma animasiyası)
    setIsTransitioning(true);

    // 2. Buludlar tam qapananda route-u dəyiş
    setTimeout(() => {
      router.push(href);
    }, 600); 
  };

  // 🚀 Səhifə datanı fetch edib qurtaranda bu funksiyanı çağıracaq
  const endTransition = () => {
    // Əgər aktiv fallback taymeri varsa, təmizləyirik
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    // Kiçik bir gecikmə ilə buludları açırıq ki, yeni komponent DOM-a rahat otursun
    setTimeout(() => {
      setIsTransitioning(false);
    }, 150);
  };

  // Səhifə dəyişən an arxa planda bir təhlükəsizlik taymeri başladırıq
  // Əgər hansısa səhifədə API xəta versə və endTransition çağırılmasa, bulud əbədi bağlı qalmasın
  useEffect(() => {
    if (isTransitioning) {
      // Əgər 4 saniyə ərzində səhifə yüklənməsə, buludları məcburi aç
      fallbackTimerRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, 4000);
    }

    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [pathname, isTransitioning]);

  return (
    <TransitionContext.Provider value={{ isTransitioning, navigateTo, endTransition }}>
      {children}
    </TransitionContext.Provider>
  );
}

export function useTransition() {
  const context = useContext(TransitionContext);
  if (!context) throw new Error('useTransition must be used within a TransitionProvider');
  return context;
}