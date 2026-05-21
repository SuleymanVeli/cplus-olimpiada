'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Sparkles, ArrowRight, User, ShieldCheck } from 'lucide-react';

// 1. useSearchParams() və bütün qeydiyyat məntiqini saxlayan daxili komponent
function RegisterContent() {
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('code');
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', avatar: '1' });

  // Google Login tamamlananda avtomatik Step 2-yə keçir
  useEffect(() => {
    if (session) setStep(2);
  }, [session]);

  const handleComplete = async () => {
    const res = await fetch('/api/register/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inviteCode,
        email: session?.user?.email,
        fullName: `${formData.firstName} ${formData.lastName}`,
        avatar: formData.avatar
      })
    });
    if (res.ok) window.location.href = '/dashboard';
  };

  // Əgər dəvət kodu (inviteCode) yoxdursa, kiber üslubda xəta mesajı göstəririk
  if (!inviteCode) {
    return (
      <div className="text-center p-6 space-y-4">
        <div className="w-16 h-16 bg-red-950/50 border border-red-500/40 text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-xl font-black text-white uppercase tracking-wider">Keçərsiz Giriş Linki</h2>
        <p className="text-purple-300/60 text-xs leading-relaxed max-w-xs mx-auto">
          Alqoritm meşəsinə daxil olmaq üçün etibarlı bir dəvət koduna (invite code) sahib olmalısınız.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* ADdim 1: Google ilə Giriş */}
      {step === 1 && (
        <div className="text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="inline-flex items-center gap-1.5 bg-purple-950/60 text-purple-300 border border-purple-700/50 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
            <Sparkles size={12} className="text-amber-400" /> Səyahət Başlayır
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-wide uppercase">Xoş Gəldin! 👋</h1>
          <p className="text-purple-300/60 mb-8 text-xs font-medium leading-relaxed">
            C++ Arcadia dünyasında profilini yaratmaq və irəliləyişini yadda saxlamaq üçün Google hesabınla daxil ol.
          </p>
          
          <button 
            onClick={() => signIn('google')}
            className="w-full bg-white text-slate-900 py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-100 transition-all border-b-[4px] border-slate-300 active:border-b-0 active:translate-y-[4px]"
          >
            <img src="/google-icon.png" className="w-4 h-4 object-contain" alt="Google" /> 
            Google ilə Giriş Et
          </button>
        </div>
      )}

      {/* ADdim 2: Profil məlumatlarının tamamlanması */}
      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300">
          <h2 className="text-xl font-black text-white mb-1 uppercase tracking-wide">Profilini Yarat</h2>
          <p className="text-purple-300/50 text-xs font-bold mb-6">Meşədə səni tanımaları üçün xanaları doldur.</p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input 
                type="text"
                placeholder="Adın" 
                className="w-full p-3.5 bg-[#0e051c] border border-purple-900/40 rounded-xl text-white placeholder-purple-300/30 text-sm font-bold focus:outline-none focus:border-purple-500 transition-colors"
                onChange={e => setFormData({...formData, firstName: e.target.value})}
              />
              <input 
                type="text"
                placeholder="Soyadın" 
                className="w-full p-3.5 bg-[#0e051c] border border-purple-900/40 rounded-xl text-white placeholder-purple-300/30 text-sm font-bold focus:outline-none focus:border-purple-500 transition-colors"
                onChange={e => setFormData({...formData, lastName: e.target.value})}
              />
            </div>
            
            <div className="py-2">
              <label className="text-[10px] font-black text-purple-400 block mb-3 uppercase tracking-widest">Bələdçi Avatarını Seç</label>
              <div className="grid grid-cols-6 gap-2 max-h-[120px] overflow-y-auto p-1 bg-[#0e051c]/50 rounded-xl border border-purple-900/20 scrollbar-thin">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(num => (
                  <button 
                    key={num}
                    type="button"
                    onClick={() => setFormData({...formData, avatar: num})}
                    className={`aspect-square rounded-full overflow-hidden border-2 transition-all p-0.5 bg-purple-950/40 ${
                      formData.avatar === num 
                        ? 'border-emerald-400 scale-105 shadow-[0_0_10px_rgba(52,211,153,0.4)]' 
                        : 'border-purple-900/40 hover:border-purple-700'
                    }`}
                  >
                    <img src={`/avatars/avatar-${num}.png`} alt={`avatar-${num}`} className="w-full h-full object-cover rounded-full" />
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleComplete}
              disabled={!formData.firstName.trim() || !formData.lastName.trim()}
              className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 py-4 rounded-xl font-black text-xs uppercase tracking-widest mt-4 border-b-[4px] border-emerald-700 active:border-b-0 active:translate-y-[4px] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:border-b-[4px] transition-all flex items-center justify-center gap-2"
            >
              Arenaya Daxil Ol <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 2. Əsas Export edilən Səhifə Komponenti (Suspense sərhədi ilə sarınıb)
export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070212] p-4 relative overflow-hidden select-none">
      
      {/* Dekorativ arxa fon neon işıqları */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Qeydiyyat Kartı Konteyneri */}
      <div className="bg-[#0a0118]/80 border-2 border-purple-500/20 backdrop-blur-xl p-8 md:p-10 rounded-[32px] shadow-[0_0_50px_rgba(147,51,234,0.15)] max-w-md w-full relative z-10">
        
        <Suspense 
          fallback={
            <div className="text-center py-12 space-y-4">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-purple-300/50 text-xs font-black uppercase tracking-widest animate-pulse">
                Yüklənir...
              </p>
            </div>
          }
        >
          <RegisterContent />
        </Suspense>

      </div>
    </div>
  );
}