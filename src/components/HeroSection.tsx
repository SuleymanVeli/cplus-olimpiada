'use client';

import { useState } from 'react';

interface HeroSectionProps {
  onLoginClick: () => void;
}

interface Animal {
  id: number;
  src: string;
  alt: string;
  className: string;
  bubbleStyle: string;
  text: string;
}

export default function HeroSection({ onLoginClick }: HeroSectionProps) {
  const [hoveredAnimal, setHoveredAnimal] = useState<number | null>(null);
  

  // Heyvanlar daha böyük ölçülərdə və ekranın kənarlarına doğru geniş səpələnib
  const animals: Animal[] = [
    {
      id: 7,
      src: '/hero/7.png',
      alt: 'Böyük Maral',
      className: 'bottom-[32%] right-[-1%] w-[100%] h-[100%] max-w-[340px]',
      bubbleStyle: 'bottom-[102%] left-4 w-52',
      text: 'Mən sənə C++ proqramlarında daxil edilən verilənləri (cin >>) yadda saxlamağı öyrədəcəm! 🦌',
    },
    {
      id: 6,
      src: '/hero/6.png',
      alt: 'Dovşan',
      className: 'bottom-[32%] right-[18%] w-[14%] h-[55%] max-w-[170px]',
      bubbleStyle: 'bottom-[105%] left-[-10px] w-48',
      text: 'Birlikdə "if/else" şərtləri ilə meşədəki gizli yolları tapacağıq! 🐰',
    },
    {
      id: 5,
      src: '/hero/5.png',
      alt: 'Şirin Sincab',
      className: 'bottom-[4%] right-[31%] w-[12%] h-[50%] max-w-[150px]',
      bubbleStyle: 'bottom-[105%] left-[-30px] w-48',
      text: 'Qozları saymaq üçün "for" və "while" dövrlərindən istifadə edəcəyik! 🐿️',
    },
    {
      id: 4,
      src: '/hero/4.png',
      alt: 'Tülkü',
      className: 'bottom-0 left-1/2 -translate-x-1/2 w-[16%] h-[62%] max-w-[200px]',
      bubbleStyle: 'bottom-[105%] left-1/2 -translate-x-1/2 w-56',
      text: 'C++ dilində funksiyalar yazaraq meşədə sehrli kod blokları yaradacağıq! 🦊',
    },
    {
      id: 3,
      src: '/hero/3.png',
      alt: 'Qozlu Sincab',
      className: 'bottom-[40%] left-[27%] w-[13%] h-[52%] max-w-[160px]',
      bubbleStyle: 'bottom-[105%] right-[-30px] w-48',
      text: 'Massivlər (arrays) vasitəsilə bütün tapşırıqlarımı bir yerdə saxlayıram! 🌰',
    },
    {
      id: 2,
      src: '/hero/2.png',
      alt: 'Skuns',
      className: 'bottom-0 left-[17%] w-[14%] h-[56%] max-w-[180px]',
      bubbleStyle: 'bottom-[105%] right-[-10px] w-48',
      text: 'Dəyişənlər (variables) meşənin gizli sandıqları kimidir, kodları qoruyur! 🦨',
    },
    {
      id: 1,
      src: '/hero/1.png',
      alt: 'Balaca Maral',
      className: 'bottom-[50%] left-[1%] w-[100%] h-[100%] max-w-[250px]',
      bubbleStyle: 'bottom-[102%] right-4 w-52',
      text: 'Ekrana sehrli mesajlar çıxarmaq üçün (cout <<) mənim yanıma gəl! 🦌',
    },
  ];

  return (
    <section className="relative w-full h-screen bg-[#e2f4e5] overflow-hidden flex items-center justify-center select-none antialiased">
      
      {/* 1. SEHRLİ MEŞƏ ARXA FONU */}
      <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
        <img
          src="/hero/bg.png"
          alt="Sehrli Meşə Cizgi Filmi İllüstrasiyası"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* 2. MƏRKƏZDƏKİ LOGİN TETİKLEYİCİ TAHTA PANAL */}
      <div className="relative z-30 max-w-xl md:max-w-2xl text-center px-4 mt-[-100px] md:mt-[-150px]">
        <div 
          onClick={onLoginClick}
          className="cursor-pointer transform hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)] animate-scaleIn"
        >
          <img
            src="/hero/text.png"
            alt="Sehrli Meşə - Heyvanlarla C++ Öyrən"
            className="w-full h-auto"
          />
       <div className="inline-block bg-emerald-50/80 border border-emerald-100/50 text-emerald-600 font-black text-[11px] uppercase tracking-widest px-4 py-1.5 rounded-full mt-3 ">
  ✨ Giriş etmək üçün lövhəyə toxun! ✨
</div>
        </div>
      </div>

      {/* 3. GENİŞ SƏPƏLƏNMİŞ HEYVANLAR QATI */}
      <div className="absolute inset-x-0 bottom-0 h-[48%] w-full z-20 pointer-events-none">
        <div className="relative w-full h-full w-full max-w-[1600px] mx-auto px-4">
          
          {animals.map((animal) => {
            const isHovered = hoveredAnimal === animal.id;
            const isCenterFox = animal.id === 4;

            return (
              <div
                key={animal.id}
                className={`absolute cursor-pointer pointer-events-auto transition-all duration-300 ease-out will-change-transform animate-slideUp ${
                  animal.className
                }  ${
                  isHovered 
                    ? 'z-40 -translate-y-2' 
                    : 'z-20 translate-y-0'
                }`}
                // Tülkünün Tailwind mərkəzləmə kodunu (`-translate-x-1/2`) hover zamanı əllə qoruyuruq
                style={isCenterFox ? { transform: isHovered ? 'translate(-50%, -8px)' : 'translate(-50%, 0)' } : undefined}
                onMouseEnter={() => setHoveredAnimal(animal.id)}
                onMouseLeave={() => setHoveredAnimal(null)}
              >
                <div className="relative w-full h-full">
                  
                  {/* YUMŞAQ VƏ SƏLİQƏLİ DİALOQ BULUDU */}
                  <div
                    className={`absolute bg-white/95 backdrop-blur-sm text-slate-700 px-4 py-3.5 rounded-2xl border border-emerald-400/20 shadow-xl transition-all duration-200 pointer-events-none ${
                      animal.bubbleStyle
                    } ${
                      isHovered 
                        ? 'opacity-100 scale-100 translate-y-0' 
                        : 'opacity-0 scale-95 translate-y-2'
                    }`}
                  >
                    <p className="text-xs md:text-sm font-bold text-center leading-relaxed">
                      {animal.text}
                    </p>
                    {/* Zərif quyruq oxu */}
                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-0 h-0 border-x-6 border-x-transparent border-t-6 border-t-white/95"></div>
                  </div>

                  {/* Tam Keyfiyyətli Heyvan Şəkli */}
                  <img 
                    src={animal.src} 
                    alt={animal.alt} 
                    className="w-full h-full object-contain object-bottom filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.1)]"
                  />

                </div>
              </div>
            );
          })}

        </div>
      </div>

    </section>
  );
}