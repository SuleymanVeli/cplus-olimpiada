'use client';

import { useCallback, useRef } from 'react';

// Səs növlərini TypeScript ilə təyin edirik
type SFXType = 'btn1' | 'btn2' | 'btn3' | 'hvr' | 'success' | 'error' | 'loading' | 'ok1' ;

export function useSFX() {
  // Səsləri yaddaşda saxlamaq üçün ref istifadə edirik ki, hər re-render-də yenidən yüklənməsinlər
  const soundsRef = useRef<Record<SFXType, HTMLAudioElement | null>>({
    btn1: null,
    btn2: null,
    btn3: null,
    hvr: null,
    success: null,
    loading: null,
    error: null,
    ok1: null,
  });

  const playSFX = useCallback((type: SFXType, volume: number = 0.3) => {
    // Səs faylı hələ yaradılmayıbsa, indi yaradırıq (Lazy loading)
    if (!soundsRef.current[type]) {
      soundsRef.current[type] = new Audio(`/audio/sfx/${type}.mp3`);
    }

    const audio = soundsRef.current[type];
    if (audio) {
      // Əgər eyni səs üst-üstə tez-tez kliklənirsə, səsi sıfırlayıb yenidən başladırıq
      audio.currentTime = 0;
      audio.volume = volume;
      audio.play().catch((err) => console.log(`${type} səsini oynatmaq mümkün olmadı:`, err));
    }
  }, []);

  return { playSFX };
}