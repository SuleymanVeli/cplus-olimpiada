'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react'; // Google login üçün

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('code');
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', avatar: '1' });

  // Step 1: Google Login tamamlananda Step 2-yə keç
  useEffect(() => {
    if (session) setStep(2);
  }, [session]);

  const handleComplete = async () => {
    // Burada bazaya ad, soyad və avatarı yazırıq
    const res = await fetch('/api/register/complete', {
      method: 'POST',
      body: JSON.stringify({
        inviteCode,
        email: session?.user?.email,
        fullName: `${formData.firstName} ${formData.lastName}`,
        avatar: formData.avatar
      })
    });
    if (res.ok) window.location.href = '/dashboard';
  };

  if (!inviteCode) return <div>Keçərsiz link!</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        
        {step === 1 && (
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Xoş Gəldin! 👋</h1>
            <p className="text-slate-500 mb-8 text-sm">Davam etmək üçün Google hesabınla daxil ol.</p>
            <button 
              onClick={() => signIn('google')}
              className="w-full bg-white border border-slate-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition"
            >
              <img src="/google-icon.png" className="w-5" alt="" /> Google ilə Giriş
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-bold mb-6">Profilini Tamamla</h2>
            <div className="space-y-4">
              <input 
                placeholder="Adın" 
                className="w-full p-3 border rounded-xl"
                onChange={e => setFormData({...formData, firstName: e.target.value})}
              />
              <input 
                placeholder="Soyadın" 
                className="w-full p-3 border rounded-xl"
                onChange={e => setFormData({...formData, lastName: e.target.value})}
              />
              
              <div className="py-2">
                <label className="text-xs font-bold text-slate-400 block mb-3 uppercase">Avatar Seç</label>
                <div className="flex flex-wrap gap-4 justify-center">
                  {['1', '2', '3', '4', '5','6','7','8','9','10','11','12'].map(num => (
                    <button 
                      key={num}
                      onClick={() => setFormData({...formData, avatar: num})}
                      className={`w-12 h-12 rounded-full overflow-hidden border-2 transition ${formData.avatar === num ? 'border-indigo-600 scale-110' : 'border-transparent'}`}
                    >
                      <img src={`/avatars/avatar-${num}.png`} alt="avatar" />
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleComplete}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold mt-4 shadow-lg shadow-indigo-100"
              >
                Panelə Daxil Ol
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}