'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, X, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from '../context/TransitionContext';

export default function GameFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

   const { navigateTo } = useTransition();

  return (
    <>
      {/* Tullanıb-düşən İkon */}
      <motion.button
        animate={{ y: [0, -15, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-[60] bg-gradient-to-tr from-amber-400 to-orange-500 p-4 rounded-2xl shadow-[0_10px_0_#92400e] border-2 border-white text-white hover:scale-110 transition-transform"
      >
        <Gamepad2 size={28} />
      </motion.button>

      {/* İnfomasiya Popup-u */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-24 right-8 z-[70] w-64 bg-white p-6 rounded-3xl shadow-2xl border-4 border-amber-400"
          >
            <button onClick={() => setIsOpen(false)} className="absolute top-3 right-3 text-slate-300 hover:text-slate-600"><X size={16}/></button>
            <h3 className="text-amber-600 font-black mb-2 flex items-center gap-2"><Gamepad2 size={18}/> Yeni Arenalar!</h3>
            <p className="text-slate-600 text-xs font-medium mb-5">Sehrli meşədə yeni tapşırıqlar və oyunlar səni gözləyir. C++ biliklərini sınamaq vaxtıdır!</p>
            <button 
              onClick={() => navigateTo('/student/gamearena')}
              className="w-full bg-emerald-500 text-white font-black py-3 rounded-xl shadow-[0_4px_0_#065f46] hover:bg-emerald-400 flex items-center justify-center gap-2"
            >
              <Play size={14} /> Arenaya Başla
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}