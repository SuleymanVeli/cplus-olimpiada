'use client';

import { useState, useEffect } from 'react';
import HeroSection from '@/components/HeroSection';

export default function Home() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f4fbf7] text-slate-800 font-sans overflow-x-hidden antialiased">
      
      {/* PREMIUM TRANSPARANT HEADER */}
      <header 
        className={`w-full py-4 px-6 md:px-12 flex justify-between items-center fixed top-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/60 backdrop-blur-md border-b border-slate-200/30 shadow-sm' 
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="flex items-center space-x-3 cursor-pointer group">
          <div className="bg-[#00bac6] text-white font-black px-3 py-1 rounded-xl text-lg shadow-sm transition-transform group-hover:scale-105">
            &gt;_
          </div>
          <span className="text-xl font-black tracking-wider text-emerald-800">
            CODERS<span className="text-[#00bac6]">CUP</span>
          </span>
        </div>
        
        {/* PREMIUM MINIMALIST GİRİŞ DÜYMƏSİ */}
        <button
          onClick={() => setIsLoginOpen(true)}
          className="bg-[#10b981] hover:bg-[#059669] text-white font-extrabold text-sm md:text-base px-6 py-2.5 rounded-full shadow-sm hover:shadow-md hover:shadow-emerald-500/10 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
        >
          Giriş Et 🚀
        </button>
      </header>

      {/* HERO HİSSƏSİ (Header fixed olduğu üçün padding-top əlavə edilmədi, çünki fon tam yuxarı yapışmalıdır) */}
      <main>
        <HeroSection onLoginClick={() => setIsLoginOpen(true)} />
      </main>

      {/* GİRİŞ MODALI */}
      {isLoginOpen && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 w-full max-w-md p-8 rounded-3xl shadow-2xl relative">
            
            <button
              onClick={() => setIsLoginOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold p-2 transition duration-200"
            >
              &times;
            </button>
            
            <div className="text-center mb-6">
              <div className="inline-block bg-emerald-50 text-3xl p-3.5 rounded-2xl mb-3 border border-emerald-100">🔑</div>
              <h3 className="text-xl font-black text-emerald-800">Meşə Qapısını Aç!</h3>
              <p className="text-slate-500 text-xs mt-1 font-medium">Giriş et və macəraya dərhal başla.</p>
            </div>
            
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <div>
                <label className="block text-emerald-800 font-bold mb-1.5 text-xs uppercase tracking-wider">İstifadəçi Adı / Email</label>
                <input
                  type="text"
                  placeholder="Məs: gənc_coder"
                  className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00bac6] transition duration-200 font-medium text-sm"
                />
              </div>
              <div>
                <label className="block text-emerald-800 font-bold mb-1.5 text-xs uppercase tracking-wider">Gizli Şifrə</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00bac6] transition duration-200 font-medium text-sm"
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-[#00bac6] hover:bg-[#00a3ae] text-white font-extrabold py-3.5 rounded-full shadow-md hover:shadow-lg transition-all duration-200 text-base mt-2 uppercase tracking-wider"
              >
                Giriş və Başla! ⚔️
              </button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}