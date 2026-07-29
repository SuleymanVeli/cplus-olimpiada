'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTransition } from '@/context/TransitionContext';
import WelcomePopup from './WelcomePopup';
import { useUser } from '../context/UserContext';
import { usePathname } from 'next/navigation';

export default function BackgroundMusic() {
  const { currentTrack, isMusicAllowed, allowMusic } = useTransition();
  const { userData, setUserData } = useUser();

  const pathname = usePathname();

  const showValume = pathname === '/student/dashboard';

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Lokal state
  const [volume, setVolume] = useState<number>(userData?.musicVolume ?? 0.5);
  const [isActive, setIsActive] = useState<boolean>(userData?.musicIsActive ?? true);

  // UserContext dəyişdikdə lokal state-i sinxronlaşdırırıq
  useEffect(() => {
    if (userData) {
      if (typeof userData.musicVolume === 'number') setVolume(userData.musicVolume);
      if (typeof userData.musicIsActive === 'boolean') setIsActive(userData.musicIsActive);
    }
  }, [userData]);

  // API-yə göndərmək üçün Debounce funksiyası
  const syncSettingsToDatabase = useCallback((newVolume: number, newIsActive: boolean) => {
    if (!userData?._id) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/student/update-music-volume', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userData._id,
            musicVolume: newVolume,
            musicIsActive: newIsActive,
          }),
        });
      } catch (err) {
        console.error("Musiqi ayarları API-yə göndərilərkən xəta:", err);
      }
    }, 500);
  }, [userData?._id]);

  // Musiqinin oxunması məntiqi
  useEffect(() => {
    if (!isMusicAllowed || !userData) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    audioRef.current = new Audio(currentTrack);
    audioRef.current.loop = true;
    audioRef.current.volume = volume;

    if (isActive) {
      audioRef.current.play().catch((err) => {
        console.log("Autoplay maneəsi:", err);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentTrack, isMusicAllowed]);

  // Volume dəyişdikdə
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);

    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }

    // Əgər istifadəçi səsi 0-dan yuxarı qaldırarsa və musiqi söndürülübsə, avtomatik açırıq
    let newIsActive = isActive;
    if (newVol > 0 && !isActive) {
      newIsActive = true;
      setIsActive(true);
      audioRef.current?.play().catch(() => { });
    } else if (newVol === 0 && isActive) {
      newIsActive = false;
      setIsActive(false);
      audioRef.current?.pause();
    }

    if (setUserData) {
      setUserData((prev: any) => ({ ...prev, musicVolume: newVol, musicIsActive: newIsActive }));
    }

    syncSettingsToDatabase(newVol, newIsActive);
  };

  // Səsi tam açmaq / söndürmək
  const togglePlay = () => {
    if (!audioRef.current) return;

    const nextState = !isActive;
    setIsActive(nextState);

    if (nextState) {
      // Səs sıfırdırsa, açıldıqda defolt 30% səs verək
      const targetVol = volume === 0 ? 0.3 : volume;
      setVolume(targetVol);
      audioRef.current.volume = targetVol;
      audioRef.current.play().catch((err) => console.log("Xəta:", err));

      if (setUserData) {
        setUserData((prev: any) => ({ ...prev, musicVolume: targetVol, musicIsActive: true }));
      }
      syncSettingsToDatabase(targetVol, true);
    } else {
      audioRef.current.pause();
      if (setUserData) {
        setUserData((prev: any) => ({ ...prev, musicIsActive: false }));
      }
      syncSettingsToDatabase(volume, false);
    }
  };

  const startMusic = () => {
    allowMusic();
  };

  if (!userData) return null;

  const shouldShowPopup = !isMusicAllowed && userData?.musicIsActive !== false;



  return (
    <>
      {/* Söndürülüb-söndürülməməsinə görə Popup kontrolu */}
      {shouldShowPopup && <WelcomePopup onStartMusic={startMusic} />}

      {/* Tək bir Birləşdirilmiş İdarəetmə Paneli */}

      {showValume && <div className="fixed bottom-5 right-5 z-[9999]">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900/90 border border-slate-700/60 backdrop-blur-md shadow-2xl transition-all duration-200">

          {/* Açma / Söndürmə İkon Düyməsi */}
          <button
            onClick={togglePlay}
            title={isActive ? "Musiqini Söndür" : "Musiqini Aç"}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 active:scale-95 transition-all"
          >
            <span className="text-lg leading-none">
              {isActive && volume > 0 ? '🔊' : '🔇'}
            </span>
          </button>

          {/* Səs Slideri və Yaza Uyğun Faiz Göstəricisi */}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isActive ? volume : 0}
              onChange={handleVolumeChange}
              className="w-20 sm:w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400 hover:accent-emerald-300 transition-all"
            />
            <span className="text-xs font-semibold text-slate-300 w-8 text-right select-none">
              {isActive ? `${Math.round(volume * 100)}%` : '0%'}
            </span>
          </div>

        </div>
      </div>}

    </>
  );
}