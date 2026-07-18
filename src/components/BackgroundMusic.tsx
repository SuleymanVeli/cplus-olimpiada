'use client';

import { useEffect, useRef, useState } from 'react';
import { useTransition } from '@/context/TransitionContext'; // Yeni context-i qoşuruq
import WelcomePopup from './WelcomePopup';

export default function BackgroundMusic() {
  const { currentTrack, isMusicAllowed, allowMusic } = useTransition();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  // Musiqinin dəyişməsi məntiqi
  useEffect(() => {
    // Əgər istifadəçi hələ musiqiyə icazə verməyibsə, heç nə etmirik
    if (!isMusicAllowed) return;

    // Köhnə musiqi varsa, onu dərhal dayandırırıq
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Yeni səhifənin musiqisini yükləyirik
    audioRef.current = new Audio(currentTrack);
    
    audioRef.current.loop = true;
    audioRef.current.volume = 0.12;

    // Musiqi dəyişən an avtomatik çalmağa başlasın
    
    if(isPlaying) {
      audioRef.current.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((err) => {
        console.log("Musiqi keçidi zamanı autoplay maneəsi yarandı:", err);
      });
    }
    else {
      audioRef.current.play()
      .then(() => {
        audioRef?.current?.pause();
      })
      .catch((err) => {
        console.log("Musiqi keçidi zamanı autoplay maneəsi yarandı:", err);
      });      
    }
   
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentTrack, isMusicAllowed]);

  const startMusic = () => {
    allowMusic(); // Context-də icazəni qeyd edirik
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.log("Xəta:", err));
    }
  };

  return (
    <>
      {/* Əgər istifadəçi hələ icazə verməyibsə, sehrli bulud popup-ı görünür */}
      {!isMusicAllowed && <WelcomePopup onStartMusic={startMusic} />}

      {/* Səsi açıb-söndürmək üçün qlobal düymə */}
      {isMusicAllowed && (
        <div className="fixed bottom-5 right-5 z-[9999]">
          <button
            onClick={togglePlay}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-500/80 hover:bg-emerald-600 active:scale-95 text-white font-semibold shadow-lg shadow-emerald-900/20 backdrop-blur-sm transition-all duration-200 ease-in-out border border-emerald-400/30"
          >
            {isPlaying ? (
              <>
                <span>🔊</span>
                <span>Musiqini Söndür</span>
              </>
            ) : (
              <>
                <span>🔇</span>
                <span>Sehrli Musiqini Aç</span>
              </>
            )}
          </button>
        </div>
      )}
    </>
  );
}