'use client';

import { useState } from 'react';
import { 
  Users, 
  FilePlus, 
  LayoutDashboard, 
  Settings, 
  Terminal, 
  LogOut, 
  ChevronRight,
  ShieldCheck,
  Menu,
  X,
  Gamepad2
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Naviqasiya elementləri
  const navItems = [
    { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/students", icon: Users, label: "Şagirdlər" },
    { href: "/admin/tasks", icon: FilePlus, label: "Tapşırıqlar" },
    { href: "/admin/games", icon: Gamepad2, label: "Oyun Arenaları" },
    { href: "/admin/modules", icon: LayoutDashboard, label: "Modullar" },
    { href: "/admin/gametopics", icon: LayoutDashboard, label: "Oyun Topikler" },
    { href: "/admin/gamelevels", icon: Gamepad2, label: "Oyun Leveller" },
    { href: "/admin/contests", icon: Settings, label: "Sınaqlar" },
  ];

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans selection:bg-indigo-100">
      
      {/* MOBILE HEADER (Yalnız mobildə görünür) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-1.5 rounded-lg">
            <Terminal className="text-white" size={16} />
          </div>
          <span className="font-black text-sm tracking-tighter text-slate-900">CodersCup</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 bg-slate-50 rounded-xl text-slate-600 active:scale-90 transition-all"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* OVERLAY (Mobildə sidebar açılanda arxa fonu qaraldır) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR (Desktopda sabit, Mobildə yandan gələn) */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-slate-200 z-[70] transition-transform duration-500 ease-out
        w-72 lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex flex-col h-full">
          
          {/* Close button (Mobil üçün) */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900"
          >
            <X size={20} />
          </button>

          {/* Logo Section */}
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="bg-slate-900 p-2 rounded-lg shadow-lg">
              <Terminal className="text-white" size={20} />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tighter text-slate-900 leading-none">CodersCup</h1>
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mt-1">Admin Panel</span>
            </div>
          </div>

          {/* Admin Profile */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="overflow-hidden">
               <h4 className="font-black text-slate-800 text-[13px] truncate">Admin Müəllim</h4>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Sistem İdarəçisi</p>
            </div>
          </div>

          {/* NAVIGATION */}
          <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
            <div className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Menyu</div>
            
            {navItems.map((item) => (
              <Link 
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)} // Mobildə linkə klikləyəndə bağlansın
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl font-bold text-[13px] transition-all group ${
                  (item.href === "/admin/dashboard" ? pathname === item.href : pathname.includes(item.href))
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 translate-x-1' 
                  : 'text-slate-500 hover:bg-slate-50 hover:translate-x-1'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} />
                  {item.label}
                </div>
                <ChevronRight size={14} className={`transition-all ${
                  (item.href === "/admin/dashboard" ? pathname === item.href : pathname.includes(item.href)) 
                  ? 'opacity-100' 
                  : 'opacity-0 group-hover:opacity-100'
                }`} />
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="pt-6 border-t border-slate-100 mt-4">
             <button className="flex items-center gap-3 text-slate-400 font-bold text-xs hover:text-red-500 transition-all w-full px-4 py-2 group">
                <LogOut size={18} /> Çıxış Et
             </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0">
        <div className="p-6 md:p-12 mt-16 lg:mt-0 animate-in fade-in slide-in-from-bottom-2 duration-700">
          {children}
        </div>
      </main>

    </div>
  );
}