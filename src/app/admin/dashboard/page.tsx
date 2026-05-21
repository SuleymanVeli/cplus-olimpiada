'use client';

import Link from 'next/link';
import { Users, PlusCircle, ArrowRight, Code2, MessageCircle } from 'lucide-react';

export default function AdminMainPage() {
  const stats = [
    { label: 'Cəmi Şagird', value: '12', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Aktiv Tapşırıq', value: '8', icon: Code2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Yoxlanılacaq', value: '5', icon: MessageCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-0 pb-10 mt-20 lg:mt-0">
      
      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2 uppercase">
          Xoş gəldiniz!
        </h1>
        <p className="text-slate-500 text-sm md:text-base font-medium">
          Sistemdəki son vəziyyətə və aktivliklərə nəzər yetirin.
        </p>
      </div>

      {/* STATS - Mobildə 1, Planşetdə 2, Desktopda 3 sütun */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-12">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
          >
            <div className={`${stat.bg} ${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform`}>
              <stat.icon size={22} />
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] mb-1">
              {stat.label}
            </p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              {stat.value}
            </h3>
          </div>
        ))}
      </div>

      {/* QUICK ACTIONS */}
      <div className="space-y-6">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">
          Tez-tez istifadə olunanlar
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <QuickActionCard 
            href="/admin/tasks"
            icon={PlusCircle}
            title="Yeni Tapşırıq Əlavə Et"
            desc="Sinif üçün yeni material və suallar hazırla"
            color="bg-indigo-600"
            shadow="shadow-indigo-100"
          />

          <QuickActionCard 
            href="/admin/students"
            icon={Users}
            title="Şagirdləri İdarə Et"
            desc="Yeni qeydiyyat linkləri və həlləri yoxla"
            color="bg-emerald-500"
            shadow="shadow-emerald-100"
          />
        </div>
      </div>
    </div>
  );
}

// Köməkçi Komponent: Quick Action Card (Responsive & Compact)
function QuickActionCard({ href, icon: Icon, title, desc, color, shadow }: any) {
  return (
    <Link href={href} className="group">
      <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 hover:border-slate-900 transition-all shadow-sm hover:shadow-xl hover:shadow-slate-200/50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-6 min-w-0">
          <div className={`${color} text-white p-3.5 md:p-4 rounded-xl shadow-lg ${shadow} group-hover:scale-105 transition-transform shrink-0`}>
            <Icon size={24} className="md:w-7 md:h-7" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight truncate">
              {title}
            </h3>
            <p className="text-slate-400 text-xs md:text-sm font-medium line-clamp-1">
              {desc}
            </p>
          </div>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}