'use client';

import { useState } from 'react';
import { useUser } from '@/src/context/UserContext';
import { usePathname } from 'next/navigation';
import {
  LogOut, UserPen, X, Check,
  Loader2, Award, Sparkles, Map as MapIcon, ChevronLeft, Menu
} from 'lucide-react';
import GameFloatingButton from '@/src/components/GameFloatingButton';
import BackgroundMusic from '@/src/components/BackgroundMusic';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { userData, setUserData, logout } = useUser();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCardMinimized, setIsCardMinimized] = useState(false);
  const [tempData, setTempData] = useState({ fullName: '', avatar: 1 });


  // ==================== 🎯 ÇOXLU SINAQ SÜZGƏCİ (YENİLƏNDİ) ====================

  const handleEditOpen = () => {
    setTempData({ fullName: userData?.fullName || '', avatar: userData?.avatar || 1 });
    setIsEditOpen(true);
  };

  const saveProfile = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/student/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempData)
      });
      if (res.ok) {
        const result = await res.json();
        setUserData({ ...userData, ...result.data });
        setIsEditOpen(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };


  return (
    <div className="flex min-h-screen bg-[#bfe3f0] text-slate-800 font-sans overflow-x-hidden relative select-none">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-[#eef9f1] to-transparent pointer-events-none z-0" />

      {/* SOL PROFIL HUD */}
      {false && userData && (
        <div className="fixed top-6 left-6 z-50 pointer-events-auto animate-in fade-in slide-in-from-left duration-500">
          {isCardMinimized ? (
            <button onClick={() => setIsCardMinimized(false)} className="bg-white/95 border-2 border-emerald-300/50 text-emerald-600 p-4 rounded-2xl shadow-lg font-black text-xs uppercase tracking-wider backdrop-blur-xl border-b-4">
              <Menu size={18} /> Profil Paneli
            </button>
          ) : (
            <div className="w-72 bg-white/95 border-2 border-emerald-200 rounded-[24px] shadow-xl p-5 flex flex-col relative animate-game-float border-b-[6px] border-b-emerald-500">
              <button onClick={() => setIsCardMinimized(true)} className="absolute top-4 right-4 text-emerald-400/50 hover:text-emerald-500 transition-colors"><ChevronLeft size={18} /></button>
           

              <div className="flex flex-col items-center text-center mb-5 relative group">
                <div className="relative mb-3">
                  <div className="absolute -inset-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-[1.8rem] blur-xl opacity-20 group-hover:opacity-40 transition duration-500" />
                  <img src={`/avatars/avatar-${userData.avatar || 1}.png`} className="w-20 h-20 rounded-[1.8rem] object-cover bg-white border-2 border-emerald-100 shadow-lg relative z-10 transition-transform duration-300 group-hover:scale-105" alt="Hero Avatar" />
                  <button onClick={handleEditOpen} className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-2 rounded-xl shadow-lg hover:bg-emerald-400 transition-all z-20 border border-white"><UserPen size={12} /></button>
                </div>
                <h4 className="font-black text-slate-900 text-base tracking-tight leading-tight mb-1.5">{userData.fullName}</h4>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-widest"><Award size={10} className="text-amber-500 animate-pulse" /> Pro Member</div>
              </div>
           
              <div className="pt-3 border-t border-slate-100 mt-4">
                <button onClick={logout} className="flex items-center justify-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-red-500 transition-colors w-full py-1.5 group"><LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Meşəni Tərk Et</button>
              </div>
            </div>
          )}
        </div>
      )}

      

      {/* KONTENT */}
      <main className="flex-1 min-h-screen relative z-10">
        <div className="animate-in fade-in duration-500 ease-out fill-mode-both">{children}</div>
      </main>

     { false && <GameFloatingButton />}

          <BackgroundMusic/>

      {/* PROFIL MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white border-2 border-emerald-200 w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 tracking-wider text-sm uppercase flex items-center gap-2"><Sparkles size={16} className="text-amber-500 animate-spin" /> Qəhrəmanını Cilala</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <img src={`/avatars/avatar-${tempData.avatar}.png`} className="w-20 h-20 rounded-2xl bg-white border-2 border-emerald-100 shadow-lg" alt="Avatar Preview" />
                  <div className="absolute -inset-1.5 border border-dashed border-emerald-300/60 rounded-2xl animate-[spin_15s_linear_infinite]" />
                </div>
                <div className="grid grid-cols-5 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 w-full justify-center">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <button key={idx} type="button" onClick={() => setTempData({ ...tempData, avatar: idx })} className={`aspect-square rounded-xl border-2 transition-all p-0.5 ${tempData.avatar === idx ? 'border-emerald-400 scale-110 shadow-lg bg-emerald-50' : 'border-transparent opacity-40 hover:opacity-100'}`}><img src={`/avatars/avatar-${idx}.png`} alt="Option" className="w-full h-full object-cover rounded-lg" /></button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 block px-1">Görünən Adın</label>
                <input type="text" value={tempData.fullName} onChange={(e) => setTempData({ ...tempData, fullName: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 text-sm focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/20 transition-colors" />
              </div>
              <button onClick={saveProfile} disabled={isUpdating || !tempData.fullName.trim()} className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest border-b-[4px] border-emerald-700 active:border-b-0 active:translate-y-[4px] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer">{isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {isUpdating ? "Yadda saxlanılır..." : "Kodeksi Yenilə"}</button>
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style jsx global>{`
        @keyframes gameFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-game-float { animation: gameFloat 4s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.4); }
      `}</style>
    </div>
  );
}