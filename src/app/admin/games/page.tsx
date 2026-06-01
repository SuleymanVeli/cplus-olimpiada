'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Loader2, Save, Layers, HelpCircle, Code, FileText, Flag, Navigation, Star } from 'lucide-react';

interface CollectibleForm {
  id: string; // Frontend daxilində unikal id idarəsi üçün
  objectType: 'star' | 'apple' | 'key' | 'coin';
  x: number;
  y: number;
  pointsValue: number;
  isRequired: boolean;
}

interface GameForm {
  title: string;
  instructionText: string;
  points: number;
  order: number;
  startX: number;
  startY: number;
  startDirection: 'up' | 'down' | 'left' | 'right';
  targetX: number;
  targetY: number;
}

export default function AdminGamesPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [isLoadingGames, setIsLoadingGames] = useState(false);

  // Pop-up və Form State-ləri
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'form' | 'json'>('form');
  const [jsonInput, setJsonInput] = useState<string>('');

  // 5x5 Default Grid Layout (0 = Yol, 1 = Divar)
  const [mapLayout, setMapLayout] = useState<number[][]>([
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0]
  ]);

  const [form, setForm] = useState<GameForm>({
    title: '',
    instructionText: '',
    points: 20,
    order: 1,
    startX: 0,
    startY: 0,
    startDirection: 'up',
    targetX: 4,
    targetY: 4,
  });

  const [collectibles, setCollectibles] = useState<CollectibleForm[]>([]);

  // Default JSON şablonunu generasiya edən funksiya
  const getDefaultJsonTemplate = (nextOrder: number) => {
    const template = {
      title: "Robotun İlk Dövrləri",
      instructionText: "Robota kömək et ki, bütün almaları toplasın və finişə çatsın!",
      points: 20,
      order: nextOrder,
      startX: 0,
      startY: 0,
      startDirection: "right",
      targetX: 4,
      targetY: 4,
      mapLayout: [
        [0, 0, 0, 1, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0]
      ],
      collectibles: [
        { objectType: "apple", x: 2, y: 0, pointsValue: 10, isRequired: true }
      ]
    };
    return JSON.stringify(template, null, 2);
  };

  // Modulları API-dən çəkirik
  useEffect(() => {
    async function loadModules() {
      try {
        const res = await fetch('/api/admin/modules');
        const result = await res.json();
        if (result.success && result.data.length > 0) {
          setModules(result.data);
          setSelectedModuleId(result.data[0]._id);
        }
      } catch (err) {
        console.error("Modullar yüklənərkən xəta:", err);
      }
    }
    loadModules();
  }, []);

  // Seçilmiş modul dəyişdikdə oyun siyahısını yeniləyirik
  useEffect(() => {
    if (selectedModuleId) {
      fetchGames(selectedModuleId);
    }
  }, [selectedModuleId]);

  const fetchGames = async (modId: string) => {
    setIsLoadingGames(true);
    try {
      const res = await fetch(`/api/admin/games?moduleId=${modId}`);
      const result = await res.json();
      if (result.success) setGames(result.data);
    } catch (err) {
      console.error("Oyunlar gətirilərkən xəta:", err);
    } finally {
      setIsLoadingGames(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingGameId(null);
    setValidationError(null);
    setActiveTab('form');

    const nextOrder = games.length + 1;
    setForm({
      title: '',
      instructionText: '',
      points: 20,
      order: nextOrder,
      startX: 0,
      startY: 0,
      startDirection: 'up',
      targetX: 4,
      targetY: 4,
    });
    setMapLayout([
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0]
    ]);
    setCollectibles([]);
    setJsonInput(getDefaultJsonTemplate(nextOrder));
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (game: any) => {
    setEditingGameId(game._id);
    setValidationError(null);
    setActiveTab('form');
    setForm({
      title: game.title,
      instructionText: game.instructionText,
      points: game.points,
      order: game.order,
      startX: game.startX,
      startY: game.startY,
      startDirection: game.startDirection,
      targetX: game.targetX,
      targetY: game.targetY,
    });
    setMapLayout(game.mapLayout || [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0]
    ]);
    
    const mappedCollectibles = (game.collectibles || []).map((c: any, index: number) => ({
      id: `item_${Date.now()}_${index}`,
      objectType: c.objectType,
      x: c.x,
      y: c.y,
      pointsValue: c.pointsValue,
      isRequired: c.isRequired
    }));
    setCollectibles(mappedCollectibles);

    const currentGameJson = {
      title: game.title,
      instructionText: game.instructionText,
      points: game.points,
      order: game.order,
      startX: game.startX,
      startY: game.startY,
      startDirection: game.startDirection,
      targetX: game.targetX,
      targetY: game.targetY,
      mapLayout: game.mapLayout,
      collectibles: (game.collectibles || []).map((c: any) => ({
        objectType: c.objectType,
        x: c.x,
        y: c.y,
        pointsValue: c.pointsValue,
        isRequired: c.isRequired
      }))
    };
    setJsonInput(JSON.stringify(currentGameJson, null, 2));
    setIsModalOpen(true);
  };

  // Dinamik Obyektlərin Əlavəsi və İdarəsi
  const handleAddCollectible = () => {
    setCollectibles([...collectibles, {
      id: `item_${Date.now()}`,
      objectType: 'star',
      x: 0,
      y: 0,
      pointsValue: 10,
      isRequired: false
    }]);
  };

  const handleRemoveCollectible = (id: string) => {
    setCollectibles(collectibles.filter(c => c.id !== id));
  };

  const handleCollectibleChange = (id: string, field: keyof CollectibleForm, value: any) => {
    setCollectibles(collectibles.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  // Hüceyrəyə kliklədikdə divar/yol keçidi (Toggle Wall)
  const handleCellClick = (rIdx: number, cIdx: number) => {
    const updatedMap = mapLayout.map((row, r) => 
      row.map((cell, c) => (r === rIdx && c === cIdx) ? (cell === 0 ? 1 : 0) : cell)
    );
    setMapLayout(updatedMap);
  };

  const handleBeautifyJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed, null, 2));
      setValidationError(null);
    } catch (err: any) {
      setValidationError(`Formatlama xətası: Sxem düzgün JSON deyil! (${err.message})`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    let payload: any = { moduleId: selectedModuleId };

    if (activeTab === 'form') {
      if (!form.title.trim()) return setValidationError("Oyun adı boş qala bilməz!");
      if (!form.instructionText.trim()) return setValidationError("Göstəriş/Təlimat mətni mütləq yazılmalıdır!");

      // Validasiya: Robot və Finiş koordinatları xəritə daxilində olmalıdır (0-4)
      if (form.startX < 0 || form.startX > 4 || form.startY < 0 || form.startY > 4) return setValidationError("Başlanğıc koordinatları 0-4 arası olmalıdır!");
      if (form.targetX < 0 || form.targetX > 4 || form.targetY < 0 || form.targetY > 4) return setValidationError("Bitiş koordinatları 0-4 arası olmalıdır!");

      payload = {
        ...payload,
        ...form,
        mapLayout,
        collectibles: collectibles.map(c => ({
          objectType: c.objectType,
          x: Number(c.x),
          y: Number(c.y),
          pointsValue: Number(c.pointsValue),
          isRequired: c.isRequired
        }))
      };
    } else {
      try {
        const parsedJson = JSON.parse(jsonInput);
        if (!parsedJson.title?.trim()) return setValidationError("JSON Xətası: 'title' boş ola bilməz!");
        if (!parsedJson.instructionText?.trim()) return setValidationError("JSON Xətası: 'instructionText' boş ola bilməz!");
        if (!Array.isArray(parsedJson.mapLayout)) return setValidationError("JSON Xətası: 'mapLayout' matris formatında olmalıdır!");
        
        payload = { ...payload, ...parsedJson };
      } catch (err: any) {
        return setValidationError(`Sintaksis Xətası: JSON formatı tamamilə yanlışdır! (${err.message})`);
      }
    }

    setIsSubmitting(true);
    const url = editingGameId ? `/api/admin/games/${editingGameId}` : '/api/admin/games';
    const method = editingGameId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result.success) {
        setIsModalOpen(false);
        fetchGames(selectedModuleId);
      } else {
        setValidationError(result.message || "Xəta baş verdi.");
      }
    } catch (err) {
      setValidationError("Serverlə bağlantı xətası.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-800 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ÜST FİLTR BAR-I VƏ ƏLAVƏ ET DÜYMƏSİ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-sky-50 p-2.5 rounded-xl text-sky-600 border border-sky-100">
              <Layers size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Aktiv Mövzu Filtri</span>
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="py-1 border-b-2 border-slate-200 text-sm font-black bg-transparent text-slate-800 outline-none focus:border-sky-500 cursor-pointer pr-4"
              >
                {modules.map(m => (
                  <option key={m._id} value={m._id}>{m.order}. {m.title}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleOpenCreateModal}
            disabled={modules.length === 0}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-3 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40"
          >
            <Plus size={15} /> Yeni Oyun Arenası Qur
          </button>
        </div>

        {/* OYUNLAR CƏDVƏLİ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoadingGames ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
              <span className="text-xs font-black uppercase tracking-wider">Oyun Arenaları yüklənir...</span>
            </div>
          ) : games.length === 0 ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400 italic">
              Seçilmiş mövzuya aid hələ heç bir oyun arenası əlavə edilməyib.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-6 w-20 text-center">Oyun No</th>
                  <th className="py-4 px-6">Oyun Arenasının Adı</th>
                  <th className="py-4 px-6">Xal (Points)</th>
                  <th className="py-4 px-6 w-32 text-center">Obyekt Sayı</th>
                  <th className="py-4 px-6 w-24 text-center">Əməliyyat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {games.map((game) => (
                  <tr key={game._id} className="hover:bg-slate-50/50 transition-all">
                    <td className="py-4 px-6 text-center font-black text-slate-900 bg-slate-50/30 w-20 border-r border-slate-100">
                      #{game.order}
                    </td>
                    <td className="py-4 px-6 font-black text-sm text-slate-900 max-w-xs truncate">
                      {game.title}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                        +{game.points} XP
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-md text-[11px] font-black font-mono">
                        {game.collectibles?.length || 0} Obyekt
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleOpenEditModal(game)}
                        className="bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-200 transition-all shadow-sm uppercase tracking-wide text-[10px] font-black"
                      >
                        Redaktə
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 🌟 DINAMIK ADD / EDIT MODAL POP-UP-I */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl overflow-hidden max-h-[94vh] flex flex-col animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50/50">
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  {editingGameId ? "📝 Arenanı Redaktə Et" : "🎮 Yeni Robot Arenası Qur"}
                </h2>
                <p className="text-[11px] font-bold text-slate-400 m-0">Xəritəni vizual qurun, robotun hərəkət istiqamətini və obyektləri təyin edin.</p>
              </div>
              
              {/* Tab Seçimi */}
              <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'form' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <FileText size={14} /> Vizual Form
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('json')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'json' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Code size={14} /> JSON Rejimi
                </button>
              </div>

              <button 
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                disabled={isSubmitting}
                className="absolute top-5 right-5 sm:relative sm:top-auto sm:right-auto text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-all disabled:opacity-30"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1 flex flex-col">
              
              {validationError && (
                <div className="bg-rose-50 border-2 border-rose-100 text-rose-700 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-pre-wrap">
                  ⚠️ {validationError}
                </div>
              )}

              {/* 1. SEKTOR: STANDART FORM REJİMİ */}
              {activeTab === 'form' && (
                <div className="space-y-5 flex-1">
                  
                  {/* Başlıq və Qiymətləndirmə */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase block mb-1">Oyunun Adı (Title)</label>
                      <input 
                        type="text" disabled={isSubmitting}
                        value={form.title}
                        onChange={(e) => setForm({...form, title: e.target.value})}
                        placeholder="Məsələn: Sehrli Meşədə İlk Addım"
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-slate-400 uppercase block mb-1">Sıra (Order)</label>
                      <input 
                        type="number" disabled={isSubmitting}
                        value={form.order}
                        onChange={(e) => setForm({...form, order: Number(e.target.value)})}
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-black text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-slate-400 uppercase block mb-1">Qazanılacaq XP</label>
                      <input 
                        type="number" disabled={isSubmitting}
                        value={form.points}
                        onChange={(e) => setForm({...form, points: Number(e.target.value)})}
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-black text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Göstəriş Mətni */}
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase block mb-1">Uşaqlara Görünəcək Göstəriş Mətni (Instruction)</label>
                    <textarea 
                      rows={2} disabled={isSubmitting}
                      value={form.instructionText}
                      onChange={(e) => setForm({...form, instructionText: e.target.value})}
                      placeholder="Robotu sağa döndərərək almanı toplamasını təmin et..."
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-medium text-xs outline-none focus:border-emerald-500 leading-relaxed"
                    />
                  </div>

                  {/* VİZUAL XƏRİTƏ VƏ ROBOT KONTROLLARI */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
                    
                    {/* VİZUAL 5x5 CANVAS GRID */}
                    <div className="md:col-span-5 flex flex-col items-center p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-inner">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        🗺️ İnteraktiv Xəritə (5x5)
                      </span>
                      
                      <div className="grid grid-cols-5 gap-1.5 w-full max-w-[240px]">
                        {mapLayout.map((row, rIdx) => 
                          row.map((cell, cIdx) => {
                            const isStart = form.startX === cIdx && form.startY === rIdx;
                            const isTarget = form.targetX === cIdx && form.targetY === rIdx;
                            const hasCollectible = collectibles.some(c => Number(c.x) === cIdx && Number(c.y) === rIdx);

                            return (
                              <button
                                key={`${rIdx}-${cIdx}`}
                                type="button"
                                onClick={() => handleCellClick(rIdx, cIdx)}
                                className={`aspect-square rounded-lg font-mono text-[9px] font-black transition-all flex flex-col items-center justify-center border relative
                                  ${cell === 1 ? 'bg-slate-700 border-slate-600 text-white shadow-none' : 'bg-slate-800 hover:bg-slate-700/50 border-slate-700/60 text-slate-500'}
                                `}
                                title={`X: ${cIdx}, Y: ${rIdx} ${cell === 1 ? '(Divar)' : '(Yol)'}`}
                              >
                                {/* Koordinat etiketi */}
                                <span className="absolute bottom-0.5 right-1 opacity-20 text-[7px] text-white">{cIdx},{rIdx}</span>
                                
                                {isStart && (
                                  <div className="bg-sky-500 text-white p-1 rounded-md scale-95 shadow-md flex items-center justify-center" title="Robot Başlanğıcı">
                                    <Navigation size={12} className={`transform ${form.startDirection === 'up' ? '' : form.startDirection === 'right' ? 'rotate-90' : form.startDirection === 'down' ? 'rotate-180' : '-rotate-90'}`} />
                                  </div>
                                )}
                                {isTarget && !isStart && (
                                  <div className="bg-rose-500 text-white p-1 rounded-md scale-95 shadow-md" title="Finiş (Target)">
                                    <Flag size={12} />
                                  </div>
                                )}
                                {hasCollectible && !isStart && !isTarget && (
                                  <div className="bg-amber-500 text-white p-1 rounded-full animate-pulse" title="Obyekt Var">
                                    <Star size={10} fill="white" />
                                  </div>
                                )}
                                {!isStart && !isTarget && !hasCollectible && (cell === 1 ? '🧱' : '')}
                              </button>
                            );
                          })
                        )}
                      </div>
                      <span className="text-[9px] text-slate-500 text-center mt-3 leading-tight">
                        Hüceyrələrə klikləyərək uşaqlar üçün <b>🧱 Maneə (Divar)</b> qura bilərsiniz.
                      </span>
                    </div>

                    {/* DİNAMİK BAŞLANĞIC VƏ BİTİŞ SEÇİMLƏRİ */}
                    <div className="md:col-span-7 space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-500 tracking-wider uppercase block border-b border-slate-200 pb-1.5">
                        🤖 Robot və Finiş Koordinatları
                      </span>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Robot Başlanğıc X (0-4)</label>
                          <input 
                            type="number" min={0} max={4}
                            value={form.startX}
                            onChange={(e) => setForm({...form, startX: Math.min(4, Math.max(0, Number(e.target.value)))})}
                            className="w-full px-2 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-black"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Robot Başlanğıc Y (0-4)</label>
                          <input 
                            type="number" min={0} max={4}
                            value={form.startY}
                            onChange={(e) => setForm({...form, startY: Math.min(4, Math.max(0, Number(e.target.value)))})}
                            className="w-full px-2 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-black"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Robotun Başlanğıc İstiqaməti</label>
                        <select
                          value={form.startDirection}
                          onChange={(e) => setForm({...form, startDirection: e.target.value as any})}
                          className="w-full px-2 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-black outline-none focus:border-emerald-500"
                        >
                          <option value="up">Yuxarı (Up)</option>
                          <option value="right">Sağa (Right)</option>
                          <option value="down">Aşağı (Down)</option>
                          <option value="left">Sola (Left)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">🏁 Finiş (Target X)</label>
                          <input 
                            type="number" min={0} max={4}
                            value={form.targetX}
                            onChange={(e) => setForm({...form, targetX: Math.min(4, Math.max(0, Number(e.target.value)))})}
                            className="w-full px-2 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-black"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">🏁 Finiş (Target Y)</label>
                          <input 
                            type="number" min={0} max={4}
                            value={form.targetY}
                            onChange={(e) => setForm({...form, targetY: Math.min(4, Math.max(0, Number(e.target.value)))})}
                            className="w-full px-2 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-black"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DİNAMİK TOPLANILA BİLƏN OBYEKTLƏR (COLLECTIBLES) */}
                  <div className="border-2 border-dashed border-slate-200 p-4 rounded-2xl space-y-3 bg-slate-50/50">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-slate-500 tracking-wider uppercase flex items-center gap-1">
                        <HelpCircle size={14} className="text-emerald-500" /> 🍎 ARENADAKI TOPLANILASI OBYEKTLƏR
                      </span>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleAddCollectible}
                        className="bg-white hover:bg-emerald-50 text-emerald-600 border border-slate-200 font-black text-[10px] px-2.5 py-1.5 rounded-lg uppercase tracking-wide transition-all flex items-center gap-1"
                      >
                        + Yeni Obyekt Əlavə Et
                      </button>
                    </div>

                    {collectibles.map((c, index) => (
                      <div key={c.id} className="grid grid-cols-2 sm:grid-cols-12 gap-2.5 items-end bg-white p-3 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
                        
                        <div className="sm:col-span-3">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase mb-0.5">Obyekt Tipi</span>
                          <select
                            value={c.objectType}
                            onChange={(e) => handleCollectibleChange(c.id, 'objectType', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-transparent"
                          >
                            <option value="star">⭐️ Ulduz (Star)</option>
                            <option value="apple">🍎 Alma (Apple)</option>
                            <option value="key">🔑 Açar (Key)</option>
                            <option value="coin">🪙 Qızıl (Coin)</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase mb-0.5">X (0-4)</span>
                          <input
                            type="number" min={0} max={4}
                            value={c.x}
                            onChange={(e) => handleCollectibleChange(c.id, 'x', Math.min(4, Math.max(0, Number(e.target.value))))}
                            className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-black text-center"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase mb-0.5">Y (0-4)</span>
                          <input
                            type="number" min={0} max={4}
                            value={c.y}
                            onChange={(e) => handleCollectibleChange(c.id, 'y', Math.min(4, Math.max(0, Number(e.target.value))))}
                            className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-black text-center"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase mb-0.5">Bonus Bal</span>
                          <input
                            type="number"
                            value={c.pointsValue}
                            onChange={(e) => handleCollectibleChange(c.id, 'pointsValue', Number(e.target.value))}
                            className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-center"
                          />
                        </div>

                        <div className="sm:col-span-2 flex items-center justify-center pb-2 bg-slate-50 border border-slate-200 h-[30px] rounded-lg">
                          <input
                            type="checkbox"
                            checked={c.isRequired}
                            id={`req-${c.id}`}
                            onChange={(e) => handleCollectibleChange(c.id, 'isRequired', e.target.checked)}
                            className="w-3.5 h-3.5 text-emerald-600 border-slate-300 rounded"
                          />
                          <label htmlFor={`req-${c.id}`} className="text-[9px] font-black text-slate-400 ml-1 cursor-pointer select-none">Məcburi</label>
                        </div>

                        <div className="sm:col-span-1 flex justify-end pb-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveCollectible(c.id)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-all"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {collectibles.length === 0 && (
                      <span className="text-[10px] text-slate-400 font-bold block text-center py-2 italic">Arenada hələ heç bir toplanıla bilən oyuncaq yoxdur (Könüllü).</span>
                    )}
                  </div>
                </div>
              )}

              {/* 2. SEKTOR: SƏLİQƏLİ VƏ VALIDASIYALI JSON REJİMİ */}
              {activeTab === 'json' && (
                <div className="flex flex-col flex-1 min-h-[380px] space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Oyun Arenası Tam Sxemi (JSON)</label>
                    <button
                      type="button"
                      onClick={handleBeautifyJson}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide transition-all"
                    >
                      ✨ Formatı Səliqəyə Sal (Beautify)
                    </button>
                  </div>
                  <div className="flex-1 relative border-2 border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-900">
                    <textarea
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      disabled={isSubmitting}
                      spellCheck={false}
                      className="w-full h-full p-4 text-xs font-mono text-emerald-400 bg-slate-900 outline-none resize-none leading-relaxed focus:ring-1 focus:ring-emerald-500"
                      style={{ minHeight: '340px' }}
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 bg-white mt-auto">
                <button
                  type="button"
                  onClick={() => !isSubmitting && setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs px-5 py-3 rounded-xl uppercase tracking-wider transition-all"
                >
                  İmtina Et
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-6 py-3 rounded-xl uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> SAXLANILIR...
                    </>
                  ) : (
                    <>
                      <Save size={14} /> {editingGameId ? "Arenanı Yenilə" : "Arenanı Yarat"}
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}