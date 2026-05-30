// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import HeroSection from '@/components/HeroSection';
import { useTransition } from '../context/TransitionContext';
import { useUser } from '../context/UserContext';
import { signIn } from 'next-auth/react';
import { X, Loader2, ShieldAlert, Sparkles, ArrowRight, Check } from 'lucide-react';

export default function Home() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [regStep, setRegStep] = useState(1); // 1: Google Login, 2: Register Info
  const [formData, setFormData] = useState({ firstName: '', lastName: '', avatar: '1' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // logout durumunu state içinde saklıyoruz ki sunucu tarafında patlamasın
  const [isLogout, setIsLogout] = useState(false);

  const { navigateTo } = useTransition();
  const { userData, setUserData, isLoading, logout } = useUser();

  // URL Query Kontrolü ve Scroll Header İdarəsi (Sadece tarayıcıda çalışır)
  useEffect(() => {
    // window nesnesini güvenli bir şekilde useEffect içinde kontrol ediyoruz
    if (typeof window !== 'undefined') {
      const hasLogout = new URLSearchParams(window.location.search).has('logout');
      setIsLogout(hasLogout);
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // İstifadəçinin vəziyyətinə görə modal daxili ekranı təyin etmək
 // ? İstifadəçinin vəziyyətinə görə modal daxili ekranı təyin etmək
useEffect(() => {
  if (userData && !isLogout) {
    if (userData.isBlocked) {
      setIsLoginOpen(true); 
      setRegStep(1);
    } else if (!userData.isRegistered) {
      setIsLoginOpen(true); 
      setRegStep(2);
    } else {
      setIsLoginOpen(false);
      navigateTo('/student/learning');
    }
  }

  if (isLogout) {
    setIsLoginOpen(true); 
    setRegStep(1); 
    logout(); 
    setUserData(null); 
    
    // 🔥 DÖNGÜYÜ KIRAN KRİTİK DÜZELTME: URL'deki ?logout=true parametresini temizliyoruz
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('logout');
      // Sayfayı yenilemeden URL'i temizler
      window.history.replaceState({}, '', url.pathname);
      setIsLogout(false); // State'i de sıfırlıyoruz
    }
  }

}, [userData, navigateTo, isLogout, logout, setUserData]);

  // 1. Google Girişini yeni kiçik pəncərədə açmaq üçün funksiya
  const handleGoogleSignIn = () => {
    if (typeof window === 'undefined') return;

    // Yeni pəncərənin ölçüləri və ekranın ortasında açılması üçün hesablama
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    // NextAuth-un signIn funksiyasını redirect etmədən çağırırıq ki, bizə URL versin
    signIn('google', { redirect: false, callbackUrl: window.location.origin })
      .then((res) => {
        if (res?.url) {
          // Alınan Google giriş URL-ini yeni kiçik pəncərədə açırıq
          const popup = window.open(
            res.url,
            'Google SignIn',
            `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
          );

          // Pəncərənin bağlanıb-bağlanmadığını yoxlayan taymer
          const timer = setInterval(() => {
            if (!popup || popup.closed) {
              clearInterval(timer);
              // Pəncərə bağlandığı an səhifəni yeniləmədən arxa fonda sessiyanı yenidən yoxlayırıq
              window.location.reload();
            }
          }, 500);
        }
      })
      .catch((err) => console.error("Google popup error:", err));
  };

  const handleCloseModal = async () => {
    setIsLoginOpen(false);
    
    // Əgər istifadəçi loqin olubsa amma hələ qeydiyyatı bitirməyibsə, sessiyasını təmizləyirik
    if (userData && !userData.isRegistered) {
      setRegStep(1);
      await logout();
    }
  };

  const handleRegisterComplete = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/register/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const result = await res.json();
        setUserData(result.data); // Context-i təzələ, avtomatik useEffect işə düşüb arenaya aparacaq
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4fbf7] text-slate-800 font-sans overflow-x-hidden antialiased">

      {/* PREMIUM TRANSPARANT HEADER */}
      <header
        className={`w-full py-4 px-6 md:px-12 flex justify-between items-center fixed top-0 z-50 transition-all duration-300 ${isScrolled
            ? 'bg-white/60 backdrop-blur-md border-b border-slate-200/30 shadow-sm'
            : 'bg-transparent border-b border-transparent'
          }`}
      >
        

     
      </header>

      <main>
        <HeroSection onLoginClick={() => setIsLoginOpen(true)} />
      </main>

      {/* VAHİD GİRİŞ VƏ QEYDİYYAT MODALI */}
      {isLoginOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border-2 border-emerald-100 w-full max-w-md p-8 rounded-[32px] shadow-2xl relative overflow-hidden">

            <button
              onClick={() => handleCloseModal()}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold p-2 transition duration-200"
            >
              &times;
            </button>

            {isLoading ? (
              <div className="text-center py-12 space-y-4">
                <Loader2 size={36} className="animate-spin mx-auto text-[#00bac6]" />
                <p className="text-emerald-800 text-xs font-black uppercase tracking-widest animate-pulse">Portallar Yoxlanılır...</p>
              </div>
            ) : userData?.isBlocked ? (
              /* --- HESAB BLOKLANIB EKRANI --- */
              <div className="text-center py-4 space-y-4 animate-in zoom-in-95">
                <div className="w-16 h-16 bg-red-50 border border-red-200 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <ShieldAlert size={32} />
                </div>
                <h3 className="text-xl font-black text-red-600 uppercase tracking-wide">Hesab Bloklanıb!</h3>
                <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto font-medium">
                  Təhlükəsizlik və ya qayda pozuntusu səbəbindən bu hesab Kodeks tərəfindən dondurulub. Mentorla əlaqə saxlayın.
                </p>
                <button
                  onClick={logout}
                  className="mt-4 text-xs font-black text-red-500 hover:underline uppercase tracking-wider"
                >
                  Başqa Hesabla Daxil Ol
                </button>
              </div>
            ) : regStep === 1 ? (
              /* --- ADDIM 1: GOOGLE LOGG IN --- */
              <div className="text-center animate-in fade-in duration-200">
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                  <Sparkles size={12} className="text-amber-500 animate-pulse" /> Səyahət Başlayır
                </div>
                <h3 className="text-xl font-black text-emerald-800 uppercase tracking-wide">Meşə Qapısını Aç!</h3>
                <p className="text-slate-500 text-xs mt-1 mb-8 font-medium">Arcadia dünyasına qoşulmaq üçün Google hesabınla daxil ol.</p>

                <button
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white text-slate-800 border-2 border-slate-200 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all border-b-4 active:border-b-0 active:translate-y-[4px]"
                >
                  <img src="https://authjs.dev/img/providers/google.svg" className="w-4 h-4" alt="Google" />
                  Google ilə Giriş Et
                </button>
              </div>
            ) : (
              /* --- ADDIM 2: AD/AVATAR QEYDİYYAT TAMAMLAMA --- */
              <div className="animate-in slide-in-from-right-8 duration-300">
                <h3 className="text-xl font-black text-emerald-800 uppercase tracking-wide mb-1">Qəhrəmanını Yarat</h3>
                <p className="text-slate-500 text-xs font-medium mb-6">Arenada səni tanımaları üçün xanaları doldur və avatarını seç.</p>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Adın"
                      value={formData.firstName}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm font-bold focus:outline-none focus:border-[#00bac6] transition-colors"
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Soyadın"
                      value={formData.lastName}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm font-bold focus:outline-none focus:border-[#00bac6] transition-colors"
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-emerald-600 block mb-3 uppercase tracking-widest">Bələdçi Avatarını Seç</label>
                    <div className="grid grid-cols-6 gap-2 max-h-[120px] overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 custom-scrollbar">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setFormData({ ...formData, avatar: num })}
                          className={`aspect-square rounded-xl overflow-hidden border-2 transition-all p-0.5 ${formData.avatar === num
                              ? 'border-emerald-500 scale-105 bg-white shadow-md'
                              : 'border-transparent opacity-50 hover:opacity-100'
                            }`}
                        >
                          <img src={`/avatars/avatar-${num}.png`} alt={`avatar-${num}`} className="w-full h-full object-cover rounded-lg" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleRegisterComplete}
                    disabled={isSubmitting || !formData.firstName.trim() || !formData.lastName.trim()}
                    className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 py-4 rounded-xl font-black text-xs uppercase tracking-widest mt-4 border-b-[4px] border-emerald-700 active:border-b-0 active:translate-y-[4px] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {isSubmitting ? "Kodeks Yenilənir..." : "Arenaya Daxil Ol"} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}