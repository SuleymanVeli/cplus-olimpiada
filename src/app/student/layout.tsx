'use client';

import { useState } from 'react';
import { useUser } from '@/src/context/UserContext';
import { useTransition } from '@/src/context/TransitionContext';
import { Home, LogOut, ChevronRight, Terminal, UserPen, X, Check, Loader2, Award } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { userData, setUserData } = useUser();
  const { isTransitioning, navigateTo } = useTransition();
  const pathname = usePathname();
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [tempData, setTempData] = useState({ fullName: '', avatar: 1 });

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
      console.error("Update error:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f4f7fa] font-sans overflow-hidden relative">
      
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

      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen z-40">
        <div className="p-6 flex flex-col h-full">
          
          {/* LOGO */}
          <div className="flex items-center justify-center gap-2 mb-10 group cursor-default animate-in fade-in slide-in-from-top duration-700">
            <div className="bg-slate-900 p-2 rounded-xl transition-all group-hover:rotate-[15deg] group-hover:scale-110">
              <Terminal className="text-white" size={18} />
            </div>
            <h1 className="font-black text-lg tracking-tighter text-slate-900 uppercase">CodersCup</h1>
          </div>

          {/* PROFIL */}
          {!userData ? (
             <div className="h-48 bg-slate-50 animate-pulse rounded-2xl mb-10" />
          ) : (
            <div className="flex flex-col items-center mb-10 px-2 group animate-in fade-in zoom-in-95 duration-1000 delay-150 fill-mode-both">
              <div className="relative mb-5">
                <div className="absolute -inset-4 bg-indigo-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition duration-700" />
                <div className="relative">
                  <img 
                    src={`/avatars/avatar-${userData.avatar || 1}.png`} 
                    className="w-28 h-28 rounded-[2.5rem] object-cover bg-slate-50 border-4 border-white shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3" 
                    alt="Student" 
                  />
                  <button 
                    onClick={handleEditOpen}
                    className="absolute bottom-0 right-0 bg-slate-900 text-white p-2.5 rounded-2xl shadow-xl hover:bg-indigo-600 transition-all active:scale-90 border-4 border-white"
                  >
                    <UserPen size={14} />
                  </button>
                </div>
              </div>
              
              <div className="text-center space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300 fill-mode-both">
                 <h4 className="font-black text-slate-900 text-[17px] tracking-tight leading-tight">
                    {userData.fullName}
                 </h4>
                 <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Award size={10} />
                    <span className="text-[9px] uppercase tracking-[0.2em] font-black">Pro Member</span>
                 </div>
              </div>
            </div>
          )}

          {/* NAVIGASYON */}
          <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar border-t border-slate-50 pt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 fill-mode-both">
            <button 
              onClick={() => navigateTo('/student/learning')} 
              className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-[13px] transition-all duration-300 group text-left ${
                pathname === '/student/learning' 
                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 translate-x-1' 
                : 'text-slate-500 hover:bg-slate-50 hover:translate-x-1'
              }`}
            >
              <Home size={18} className={pathname === '/student/learning' ? 'animate-bounce' : ''} /> Learning
            </button>
            
            <div className="pt-8 pb-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] px-5">
              Tədris Planı
            </div>
            
            <div className="space-y-1.5">
              {userData?.submissions?.map((sub: any) => (
                <button 
                  key={sub._id} 
                  onClick={() => navigateTo(`/student/tasks/${sub._id}`)} 
                  className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl font-bold text-[12px] transition-all group border border-transparent text-left ${
                    pathname.includes(sub._id) 
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100 translate-x-1' 
                    : 'text-slate-500 hover:bg-slate-50 hover:translate-x-1'
                  }`}
                >
                  <span className="truncate w-36">{sub.taskId.title}</span>
                  <div className="flex items-center">
                    {sub.status === 'submitted' ? (
                      <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    ) : (
                      <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </nav>

          {/* Çıxış */}
          <div className="pt-6 border-t border-slate-100 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-700 fill-mode-both">
             <button className="flex items-center gap-3 text-slate-400 font-bold text-xs hover:text-red-500 transition-all w-full px-5 py-2 group">
                <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" /> Çıxış
             </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 h-screen overflow-y-auto bg-white/40">
        <div className="animate-in fade-in slide-in-from-right-4 duration-700 ease-out fill-mode-both">
          {children}
        </div>
      </main>

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in-90 slide-in-from-bottom-8 duration-500 ease-out">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
               <h3 className="font-black text-slate-800 tracking-tighter text-lg italic">Profilini Cilala</h3>
               <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-900 hover:rotate-90 transition-all duration-300"><X size={20} /></button>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="flex flex-col items-center gap-6">
                 <div className="relative group">
                    <img src={`/avatars/avatar-${tempData.avatar}.png`} className="w-24 h-24 rounded-[2.5rem] bg-slate-50 border-4 border-white shadow-2xl transition-all duration-500 group-hover:rotate-6" alt="Avatar" />
                    <div className="absolute -inset-2 border-2 border-dashed border-indigo-200 rounded-[2.8rem] animate-[spin_10s_linear_infinite]" />
                 </div>
                 
                 <div className="flex gap-3 flex-wrap justify-center bg-slate-50 p-4 rounded-3xl border border-slate-100">
                    {[1, 2, 3, 4, 5].map((idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setTempData({...tempData, avatar: idx})} 
                        className={`w-10 h-10 rounded-xl border-2 transition-all duration-300 active:scale-75 ${tempData.avatar === idx ? 'border-indigo-600 scale-125 shadow-xl z-10' : 'border-transparent opacity-40 hover:opacity-100 hover:scale-110'}`}
                      >
                        <img src={`/avatars/avatar-${idx}.png`} alt="Option" className="w-full h-full object-cover rounded-lg" />
                      </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">Tam Adın</label>
                <input 
                  type="text" 
                  value={tempData.fullName}
                  onChange={(e) => setTempData({...tempData, fullName: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner"
                />
              </div>

              <button 
                onClick={saveProfile}
                disabled={isUpdating}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-[0_20px_40px_-10px_rgba(15,23,42,0.3)] hover:bg-indigo-600 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 group"
              >
                {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} className="group-hover:scale-150 transition-transform" />} 
                {isUpdating ? "Sinxronizasiya..." : "Dəyişiklikləri Qoru"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}