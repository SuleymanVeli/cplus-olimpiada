'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Loader2, Save, Layers, MousePointer, Square, Package, Terminal, Flag, Sparkles, Type, Edit3, ArrowUp, ArrowRight, ArrowDown, ArrowLeft, Circle } from 'lucide-react';

interface GameForm {
  title: string;
  instructionText: string;
  points: number;
  levelPoint: number;
  startX: number;
  startY: number;
  startDirection: 'up' | 'down' | 'left' | 'right';
  order: number;
}

type ToolType = 'empty' | 'wall' | 'box' | 'iron_box' | 'button' | 'terminal' | 'finish' | 'portal' | 'yazi' | 'tapsiriq';

export default function AdminMagiForestPage() {
  const [topics, setTopics] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'json'>('form');
  const [jsonInput, setJsonInput] = useState<string>('');

  const [width, setWidth] = useState<number>(10);
  const [height, setHeight] = useState<number>(5);

  const [mapLayout, setMapLayout] = useState<number[][]>([]);
  const [xanaYazilari, setXanaYazilari] = useState<string[][]>([]);
  const [xanaTipleri, setXanaTipleri] = useState<string[][]>([]);

  const [hasTerminal, setHasTerminal] = useState(false);
  const [xalSistemi, setXalSistemi] = useState<any[]>([]);
  const [requiredWrites, setRequiredWrites] = useState<any[]>([]);

  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ y: number, x: number } | null>(null);

  const [rules, setRules] = useState<{ required: string[]; forbidden: string[]; maxUsage: Array<{ key: string; val: number }> }>({
    required: [],
    forbidden: [],
    maxUsage: []
  });



  const [variants, setVariants] = useState<Array<{ values: Array<{ name: string; value: string }> }>>([]);

  const [newRequired, setNewRequired] = useState('');
  const [newForbidden, setNewForbidden] = useState('');
  const [newLimitKey, setNewLimitKey] = useState('');
  const [newLimitVal, setNewLimitVal] = useState(1);

  const [form, setForm] = useState<GameForm>({
    title: '',
    instructionText: '',
    points: 100,
    levelPoint: 20,
    startX: 1,
    startY: 1,
    startDirection: 'right',
    order: 1
  });

  // Kənar xanaları divar etmək
  useEffect(() => {
    if (width > 0 && height > 0) {
      const newLayout = [...mapLayout];
      let changed = false;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if ((y === 0 || y === height - 1 || x === 0 || x === width - 1) && newLayout[y]?.[x] !== 1) {
            if (newLayout[y]) {
              newLayout[y][x] = 1;
              changed = true;
            }
          }
        }
      }
      if (changed) setMapLayout(newLayout);
    }
  }, [width, height, mapLayout]);

  useEffect(() => {
    const checkTerminal = mapLayout.some(row => row.includes(4));
    setHasTerminal(checkTerminal);
  }, [mapLayout]);

  useEffect(() => {
    const resizeMatrix = (oldMat: any[], defVal: any) => {
      return Array(height).fill(0).map((_, h) => {
        return Array(width).fill(0).map((_, w) => {
          return (oldMat[h] && oldMat[h][w] !== undefined) ? oldMat[h][w] : defVal;
        });
      });
    };
    setMapLayout(prev => resizeMatrix(prev, 0));
    setXanaYazilari(prev => resizeMatrix(prev, ''));
    setXanaTipleri(prev => resizeMatrix(prev, ''));
  }, [width, height]);

  useEffect(() => {
    async function loadTopics() {
      try {
        const res = await fetch('/api/admin/topics');
        const data = await res.json();
        if (data && data.length > 0) {
          setTopics(data);
          setSelectedTopicId(data[0]._id);
        }
      } catch (err) { console.error(err); }
    }
    loadTopics();
  }, []);

  useEffect(() => {
    async function loadLevelsByTopic() {
      if (!selectedTopicId) return;
      try {
        const res = await fetch(`/api/admin/levels?topicId=${selectedTopicId}`);
        const data = await res.json();
        setGames(data || []);
      } catch (err) { console.error(err); }
    }
    loadLevelsByTopic();
  }, [selectedTopicId]);

  const handleCellClick = (y: number, x: number) => {
    if (y === 0 || y === height - 1 || x === 0 || x === width - 1) return;

    if (activeTool) {
      const newLayout = [...mapLayout];
      const newXanaTipleri = [...xanaTipleri];
      const newXanaYazilari = [...xanaYazilari];

      if (activeTool === 'empty') newLayout[y][x] = 0;
      else if (activeTool === 'wall') newLayout[y][x] = 1;
      else if (activeTool === 'box') newLayout[y][x] = 2;
      else if (activeTool === 'terminal') newLayout[y][x] = 4;
      else if (activeTool === 'finish') newLayout[y][x] = 5;
      else if (activeTool === 'portal') newLayout[y][x] = 10;
      else if (activeTool === 'yazi') {
        if (!newXanaTipleri[y][x]) newXanaTipleri[y][x] = 'int';
      } else if (activeTool === 'tapsiriq') {
        const exists = requiredWrites.some(w => w.x === x && w.y === y);
        if (!exists) setRequiredWrites(prev => [...prev, { x, y, expected: '1' }]);
      } else if (activeTool === 'iron_box') {
        // Avtomatik ID təyin etmək üçün xəritədəki ən böyük tək qutu ID-sini tapırıq (Məs: 21, 23, 25...)
        let maxId = 19;
        mapLayout.forEach(row => row.forEach(v => { if (v >= 21 && v <= 29 && v % 2 !== 0) maxId = Math.max(maxId, v); }));
        newLayout[y][x] = maxId + 2 > 29 ? 21 : maxId + 2; // Sığorta
      }
      else if (activeTool === 'button') {
        // Düymələr cüt rəqəmlərdir (20, 22, 24...)
        let maxId = 18;
        mapLayout.forEach(row => row.forEach(v => { if (v >= 20 && v <= 28 && v % 2 === 0) maxId = Math.max(maxId, v); }));
        newLayout[y][x] = maxId + 2 > 28 ? 20 : maxId + 2;
        newXanaYazilari[y][x] = 'right'; // Default hərəkət istiqaməti
      }

      if (activeTool === 'empty') {
        newXanaTipleri[y][x] = '';
        newXanaYazilari[y][x] = '';
        setRequiredWrites(prev => prev.filter(w => !(w.x === x && w.y === y)));
      }

      setMapLayout(newLayout);
      setXanaTipleri(newXanaTipleri);
      setXanaYazilari(newXanaYazilari);
    } else {
      setSelectedCell({ y, x });
    }
  };

  const handleOpenCreateModal = () => {
    setEditingGameId(null);
    setValidationError(null);
    setActiveTab('form');
    setActiveTool(null);
    setSelectedCell(null);
    setWidth(10);
    setHeight(5);
    setForm({ title: '', instructionText: '', points: 100, levelPoint: 20, startX: 1, startY: 1, startDirection: 'right', order: games.length + 1 });
    setMapLayout(Array(5).fill(0).map(() => Array(10).fill(0)));
    setXanaYazilari(Array(5).fill(0).map(() => Array(10).fill('')));
    setXanaTipleri(Array(5).fill(0).map(() => Array(10).fill('')));
    setXalSistemi([]);
    setRequiredWrites([]);
    setIsModalOpen(true);
    setRules({ required: [], forbidden: [], maxUsage: [] });
    setVariants([]);
  };

  const handleOpenEditModal = (game: any) => {
    setEditingGameId(game._id);
    setValidationError(null);
    setActiveTab('form');
    setActiveTool(null);
    setSelectedCell(null);
    setWidth(game.mapLayout[0]?.length || 10);
    setHeight(game.mapLayout.length || 5);
    setForm({
      title: game.title,
      instructionText: game.instructionText,
      points: game.points || 100,
      levelPoint: game.levelPoint || 20,
      startX: game.startX,
      startY: game.startY,
      startDirection: game.startDirection,
      order: game.order || 1
    });
    setMapLayout(game.mapLayout);
    setXanaYazilari(game.xanaYazilari);
    setXanaTipleri(game.xanaTipleri);
    setXalSistemi(game.xalSistemi || []);
    setRequiredWrites(game.requiredWrites || []);
    setJsonInput(JSON.stringify(game, null, 2));
    setIsModalOpen(true);
    setVariants(game.variants || []);
    if (game.rules) {
      const maxUsageArr = game.rules.maxUsage 
        ? Object.entries(game.rules.maxUsage).map(([key, val]) => ({ key, val: val as number }))
        : [];
      setRules({
        required: game.rules.required || [],
        forbidden: game.rules.forbidden || [],
        maxUsage: maxUsageArr
      });
    } else {
      setRules({ required: [], forbidden: [], maxUsage: [] });
    }
  };

  const toggleTool = (tool: ToolType) => {
    setActiveTool(prev => prev === tool ? null : tool);
    setSelectedCell(null);
  };

  // Xal sistemi massivinə yeni cavab variantı əlavə etmək
  const addXalSistemiRow = () => {
    setXalSistemi(prev => [...prev, { cavab: '', verilecekXal: 10, mesaj: '' }]);
  };

  const removeXalSistemiRow = (index: number) => {
    setXalSistemi(prev => prev.filter((_, i) => i !== index));
  };

  const updateXalSistemiRow = (index: number, field: string, value: any) => {
    const updated = [...xalSistemi];
    updated[index][field] = value;
    setXalSistemi(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    let payload: any = { topicId: selectedTopicId };

    const maxUsageMap: Record<string, number> = {};
    rules.maxUsage.forEach(item => { maxUsageMap[item.key] = item.val; });

    if (activeTab === 'form') {
      if (!form.title.trim()) return setValidationError("Oyun adı mütləqdir!");
      payload.levelData = {
        ...form,
        mapLayout,
        xanaYazilari,
        xanaTipleri,
        hasWriteTask: !hasTerminal,
        xalSistemi: hasTerminal ? xalSistemi : [],
        requiredWrites: !hasTerminal ? requiredWrites : [],
        variants, // 🚀 Yeni əlavə
        rules: {  // 🚀 Yeni əlavə
          required: rules.required,
          forbidden: rules.forbidden,
          maxUsage: maxUsageMap
        }
      };
    } else {
      try {
        payload.levelData = JSON.parse(jsonInput);
      } catch (err: any) { return setValidationError(`JSON Xətası: ${err.message}`); }
    }

    setIsSubmitting(true);
    const url = editingGameId ? `/api/admin/levels?id=${editingGameId}` : '/api/admin/levels';
    try {
      const res = await fetch(url, {
        method: editingGameId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsModalOpen(false);
        window.location.reload();
      } else {
        const r = await res.json();
        setValidationError(r.error || "Xəta baş verdi.");
      }
    } catch { setValidationError("Server xətası."); }
    finally { setIsSubmitting(false); }
  };

  const getCellStyle = (v: number, y: number, x: number) => {
    const isBorder = y === 0 || y === height - 1 || x === 0 || x === width - 1;
    if (isBorder) return "bg-slate-300 border-slate-400 text-slate-700 font-bold";
    if (form.startX === x && form.startY === y) return "bg-indigo-50 border-indigo-400 text-indigo-700 font-black";
    if (v === 1) return "bg-amber-100 border-amber-300 text-amber-800";
    if (v === 2) return "bg-orange-100 border-orange-300 text-orange-800";
    if (v === 4) return "bg-purple-100 border-purple-300 text-purple-800";
    if (v === 5) return "bg-emerald-100 border-emerald-300 text-emerald-800";
    if (v >= 10) return "bg-cyan-100 border-cyan-300 text-cyan-800";
    if (xanaTipleri[y]?.[x]) return "bg-blue-50 border-blue-200 text-blue-700";
    if (requiredWrites.some(w => w.x === x && w.y === y)) return "bg-yellow-50 border-yellow-200 text-yellow-700";
    if (v >= 21 && v <= 29 && v % 2 !== 0) return "bg-slate-600 border-slate-800 text-white font-mono"; // Dəmir qutu rəngi
    if (v >= 20 && v <= 29 && v % 2 === 0) return "bg-rose-100 border-rose-400 text-rose-800 font-bold"; // Düymə rəngi
    return "bg-white border-slate-200 hover:bg-slate-50 text-slate-400";
  };

  const renderRobotIcon = () => {
    if (form.startDirection === 'up') return <ArrowUp size={12} className="inline text-indigo-600 ml-0.5" />;
    if (form.startDirection === 'down') return <ArrowDown size={12} className="inline text-indigo-600 ml-0.5" />;
    if (form.startDirection === 'left') return <ArrowLeft size={12} className="inline text-indigo-600 ml-0.5" />;
    return <ArrowRight size={12} className="inline text-indigo-600 ml-0.5" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* TOP BAR */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Layers className="text-sky-600" size={18} />
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="font-bold text-sm bg-transparent border-b border-slate-300 outline-none pb-0.5 cursor-pointer"
            >
              {topics.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1"
          >
            <Plus size={14} /> Yeni Arena Dizayn Et
          </button>
        </div>

        {/* LIST TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs font-bold text-slate-700">
            <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider border-b">
              <tr>
                <th className="p-3 text-center w-16">Sıra</th>
                <th className="p-3">Səviyyə Başlığı</th>
                <th className="p-3">Mükafatlandırma (XP / Bal)</th>
                <th className="p-3 text-center">Ölçü</th>
                <th className="p-3 text-center w-20">Düzəliş</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {games.map((game, idx) => (
                <tr key={game._id || idx} className="hover:bg-slate-50/60">
                  <td className="p-3 text-center font-mono text-slate-400">#{game.order || idx + 1}</td>
                  <td className="p-3 font-black text-slate-900">{game.title}</td>
                  <td className="p-3">
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] mr-2">{game.points} XP</span>
                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-[10px]">{game.levelPoint} C++ Balı</span>
                  </td>
                  <td className="p-3 text-center font-mono text-slate-500">{game.mapLayout[0]?.length}x{game.mapLayout.length}</td>
                  <td className="p-3 text-center w-20">
                    <button onClick={() => handleOpenEditModal(game)} className="bg-slate-100 hover:bg-emerald-600 hover:text-white px-2 py-1 rounded text-[10px] border transition-all">Redaktə</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-200">

            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-900">{editingGameId ? "Arenanı Redaktə Et" : "Yeni Arena Yaradılması"}</h2>
              <div className="flex gap-2 items-center">
                <div className="bg-slate-200 p-0.5 rounded-lg flex text-[11px] font-bold">
                  <button type="button" onClick={() => setActiveTab('form')} className={`px-2 py-1 rounded ${activeTab === 'form' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}>Form</button>
                  <button type="button" onClick={() => setActiveTab('json')} className={`px-2 py-1 rounded ${activeTab === 'json' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}>JSON</button>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1 flex flex-col bg-white">
              {validationError && <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2 rounded-lg text-xs font-bold">⚠️ {validationError}</div>}

              {activeTab === 'form' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 flex-1 items-start">

                  <div className="lg:col-span-3 space-y-4">

                    {/* METADATA PARAMS */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 bg-slate-50 p-3 rounded-xl border">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Arena Adı</label>
                        <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-2 py-1.5 border rounded-lg text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">En (Sütun)</label>
                        <input type="number" value={width} onChange={(e) => setWidth(parseInt(e.target.value) || 1)} className="w-full px-2 py-1.5 border rounded-lg text-xs font-bold text-center" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Uzunluq (Sətir)</label>
                        <input type="number" value={height} onChange={(e) => setHeight(parseInt(e.target.value) || 1)} className="w-full px-2 py-1.5 border rounded-lg text-xs font-bold text-center" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Platforma XP</label>
                        <input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1.5 border rounded-lg text-xs font-bold text-center text-amber-600 bg-amber-50/40" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Sıralama (Order)</label>
                        <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 1 })} className="w-full px-2 py-1.5 border rounded-lg text-xs font-bold text-center bg-slate-100" />
                      </div>
                    </div>

                    {/* FIRÇALAR */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">🖌️ Aktiv Fırça Aləti</span>
                      <div className="flex flex-wrap gap-1.5 bg-slate-50 p-2 rounded-xl border">
                        <button type="button" onClick={() => setActiveTool(null)} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-black rounded-lg border transition-all ${activeTool === null ? 'bg-sky-600 border-sky-600 text-white shadow-sm' : 'bg-white text-slate-600 border-slate-200'}`}><MousePointer size={13} /> Edit Mod</button>
                        <div className="h-6 w-[1px] bg-slate-200 mx-1 align-self-center"></div>
                        <button type="button" onClick={() => toggleTool('wall')} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${activeTool === 'wall' ? 'bg-amber-500 border-amber-500 text-white shadow-sm' : 'bg-amber-50 text-amber-700 border-amber-200'}`}><Square size={12} fill="currentColor" /> Divar</button>
                        <button type="button" onClick={() => toggleTool('box')} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${activeTool === 'box' ? 'bg-orange-500 border-orange-500 text-white shadow-sm' : 'bg-orange-50 text-orange-700 border-orange-200'}`}><Package size={12} /> Qutu</button>
                        <button type="button" onClick={() => toggleTool('terminal')} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${activeTool === 'terminal' ? 'bg-purple-500 border-purple-500 text-white shadow-sm' : 'bg-purple-50 text-purple-700 border-purple-200'}`}><Terminal size={12} /> Terminal</button>
                        <button type="button" onClick={() => toggleTool('finish')} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${activeTool === 'finish' ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}><Flag size={12} /> Finiş</button>
                        <button type="button" onClick={() => toggleTool('portal')} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${activeTool === 'portal' ? 'bg-cyan-500 border-cyan-500 text-white shadow-sm' : 'bg-cyan-50 text-cyan-700 border-cyan-200'}`}><Sparkles size={12} /> Portal</button>
                        <button type="button" onClick={() => toggleTool('yazi')} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${activeTool === 'yazi' ? 'bg-blue-500 border-blue-500 text-white shadow-sm' : 'bg-blue-50 text-blue-700 border-blue-200'}`}><Type size={12} /> Yazı Oxu</button>
                        <button type="button" onClick={() => toggleTool('tapsiriq')} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${activeTool === 'tapsiriq' ? 'bg-yellow-500 border-yellow-500 text-white shadow-sm' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}><Edit3 size={12} /> Tapşırıq Yazısı</button>
                        <button type="button" onClick={() => toggleTool('empty')} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-dashed transition-all ${activeTool === 'empty' ? 'bg-slate-700 border-slate-700 text-white shadow-sm' : 'bg-white text-slate-400 border-slate-300'}`}>Boşalt</button>
                        <button type="button" onClick={() => toggleTool('iron_box')} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${activeTool === 'iron_box' ? 'bg-slate-700 border-slate-700 text-white shadow-sm' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                          <Package size={12} className="text-slate-500" /> Dəmir Qutu (21)
                        </button>

                        <button type="button" onClick={() => toggleTool('button')} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${activeTool === 'button' ? 'bg-rose-600 border-rose-600 text-white shadow-sm' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                          <Circle size={12} /> Düymə (20)
                        </button>

                      </div>
                    </div>

                    {/* MATRİS QƏFƏSİ */}
                    <div className="border border-slate-200 bg-slate-50 p-4 rounded-xl overflow-auto flex justify-center items-center min-h-[220px]">
                      <div className="flex flex-col gap-1" style={{ minWidth: `${width * 46}px` }}>
                        {mapLayout.map((row, y) => (
                          <div key={y} className="flex gap-1">
                            {row.map((cellValue, x) => {
                              const isSelected = selectedCell?.y === y && selectedCell?.x === x;
                              const isRobot = form.startX === x && form.startY === y;

                              let cellIcon = "";
                              if (cellValue === 1) cellIcon = "🧱";
                              else if (cellValue === 2) cellIcon = "📦";
                              else if (cellValue === 4) cellIcon = "🖥️";
                              else if (cellValue === 5) cellIcon = "🏁";
                              else if (cellValue >= 10 && cellValue <= 19) cellIcon = `🌀${cellValue}`;
                              else if (cellValue >= 20 && cellValue <= 29 && cellValue%2==0) cellIcon = `🟩${cellValue}`;
                              else if (cellValue >= 20 && cellValue <= 29 && cellValue%2!=0) cellIcon = `📦${cellValue}`;

                              const hasYazi = xanaTipleri[y]?.[x] !== "";
                              const hasTapsiriq = requiredWrites.some(w => w.x === x && w.y === y);

                              return (
                                <button
                                  key={x} type="button" onClick={() => handleCellClick(y, x)}
                                  className={`w-11 h-11 border text-[10px] rounded-md flex flex-col items-center justify-center relative transition-all shadow-2xs select-none ${getCellStyle(cellValue, y, x)} ${isSelected ? 'ring-2 ring-sky-500 border-transparent scale-102 z-10' : ''}`}
                                  title={`(${x}, ${y})`}
                                >
                                  {isRobot ? (
                                    <span className="font-black text-[9px] text-indigo-700 bg-indigo-100 px-1 rounded flex items-center">
                                      🤖{renderRobotIcon()}
                                    </span>
                                  ) : (
                                    <span className="font-black text-[9px] leading-none">{cellIcon}</span>
                                  )}
                                  {!cellIcon && !isRobot && <span className="text-[7px] opacity-25 font-mono">({x},{y})</span>}

                                  {hasYazi && !cellIcon && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>}
                                  {hasTapsiriq && !cellIcon && <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Təlimat Mətni</label>
                      <textarea rows={2} value={form.instructionText} onChange={(e) => setForm({ ...form, instructionText: e.target.value })} className="w-full p-2 border rounded-xl text-xs" />
                    </div>
                  </div>

                  {/* SAĞ PANEL */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-4 h-full self-stretch flex flex-col justify-between overflow-y-auto max-h-[65vh]">
                    <div>
                      <div className="flex items-center gap-1 border-b pb-2 mb-3">
                        <MousePointer size={14} className="text-slate-400" />
                        <h4 className="text-xs font-black uppercase text-slate-700">Xana Xüsusiyyətləri</h4>
                      </div>

                      {selectedCell ? (
                        <div className="space-y-3">
                          <div className="bg-white p-2 border rounded-lg text-[11px] text-slate-500 font-mono flex justify-between">
                            <span>Seçilmiş:</span>
                            <span className="font-bold text-slate-800">X: {selectedCell.x}, Y: {selectedCell.y}</span>
                          </div>

                          {/* PORTAL */}
                          {mapLayout[selectedCell.y]?.[selectedCell.x] >= 10 && (
                            <div className="bg-white p-2 border rounded-lg space-y-1">
                              <label className="text-[10px] font-bold text-cyan-600 uppercase block">🌀 Portal No (10-19)</label>
                              <input type="number" min={10} max={19} value={mapLayout[selectedCell.y][selectedCell.x]} onChange={(e) => { const n = [...mapLayout]; n[selectedCell.y][selectedCell.x] = parseInt(e.target.value) || 10; setMapLayout(n); }} className="w-full px-2 py-1 border rounded text-xs font-bold" />
                            </div>
                          )}

                          {mapLayout[selectedCell.y]?.[selectedCell.x] >= 20 && mapLayout[selectedCell.y]?.[selectedCell.x] <= 29 && mapLayout[selectedCell.y]?.[selectedCell.x] % 2 === 0 && (
                            <div className="bg-white p-2 border rounded-lg space-y-2">
                              <label className="text-[10px] font-bold text-rose-600 uppercase block">🔘 Düymə İtələmə İstiqaməti</label>
                              <select
                                value={xanaYazilari[selectedCell.y]?.[selectedCell.x] || 'right'}
                                onChange={(e) => {
                                  const n = [...xanaYazilari];
                                  n[selectedCell.y][selectedCell.x] = e.target.value;
                                  setXanaYazilari(n);
                                }}
                                className="w-full text-[11px] p-1 border rounded font-bold"
                              >
                                <option value="RIGHT">Sağ → (right)</option>
                                <option value="LEFT">← Sol (left)</option>
                                <option value="UP">Yuxarı ↑ (up)</option>
                                <option value="DOWN">Aşağı ↓ (down)</option>
                              </select>
                              <span className="text-[9px] text-slate-400 block italic">Qutu bu düymənin üzərinə gələndə bu istiqamətə sürüşəcək.</span>
                            </div>
                          )}

                          {/* 🖥️ TERMINAL (XAL SİSTEMİ BURADA İDARƏ OLUNUR) */}
                          {mapLayout[selectedCell.y]?.[selectedCell.x] === 4 && (
                            <div className="bg-white p-2 border rounded-lg space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-purple-600 uppercase block">📊 Terminal Xal Sistemi</label>
                                <button type="button" onClick={addXalSistemiRow} className="text-[9px] bg-purple-100 hover:bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded font-bold">+ Əlavə Et</button>
                              </div>

                              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                {xalSistemi.map((row, index) => (
                                  <div key={index} className="border p-1.5 rounded-md bg-slate-50 space-y-1 relative group">
                                    <button type="button" onClick={() => removeXalSistemiRow(index)} className="absolute top-1 right-1 text-slate-400 hover:text-rose-600">
                                      <X size={10} />
                                    </button>
                                    <input type="text" placeholder="Gözlənilən çıxış (məs: 5)" value={row.cavab} onChange={(e) => updateXalSistemiRow(index, 'cavab', e.target.value)} className="w-[90%] text-[10px] p-1 border rounded font-mono" />
                                    <div className="grid grid-cols-3 gap-1">
                                      <input type="number" placeholder="Xal" value={row.verilecekXal} onChange={(e) => updateXalSistemiRow(index, 'verilecekXal', parseInt(e.target.value) || 0)} className="col-span-1 text-[10px] p-1 border rounded text-center" />
                                      <input type="text" placeholder="Təbrik mətni" value={row.mesaj} onChange={(e) => updateXalSistemiRow(index, 'mesaj', e.target.value)} className="col-span-2 text-[10px] p-1 border rounded" />
                                    </div>
                                  </div>
                                ))}
                                {xalSistemi.length === 0 && (
                                  <span className="text-[9px] text-slate-400 italic block text-center">Heç bir çıxış ssenarisi əlavə edilməyib.</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* YAZI OXU */}
                          <div className="bg-white p-2 border rounded-lg space-y-2">
                            <label className="text-[10px] font-bold text-blue-600 uppercase block">📝 Yazı Oxu (Məlumat)</label>
                            <select value={xanaTipleri[selectedCell.y]?.[selectedCell.x] || ''} onChange={(e) => { const n = [...xanaTipleri]; n[selectedCell.y][selectedCell.x] = e.target.value; setXanaTipleri(n); }} className="w-full text-[11px] p-1 border rounded font-medium">
                              <option value="">Tip Yoxdur</option>
                              <option value="int">INT</option>
                              <option value="string">STRING</option>
                              <option value="double">DOUBLE</option>
                            </select>
                            <input type="text" placeholder="Dəyər qeyd et" value={xanaYazilari[selectedCell.y]?.[selectedCell.x] || ''} onChange={(e) => { const n = [...xanaYazilari]; n[selectedCell.y][selectedCell.x] = e.target.value; setXanaYazilari(n); }} className="w-full text-[11px] px-2 py-1 border rounded font-bold" />
                          </div>

                          {/* TAPŞIRIQ YAZISI */}
                          <div className="bg-white p-2 border rounded-lg space-y-1.5">
                            <label className="text-[10px] font-bold text-yellow-600 uppercase block">✍️ Tapşırıq (Gözlənilən)</label>
                            <input type="text" placeholder="Robot nə yazmalıdır?" value={requiredWrites.find(w => w.x === selectedCell.x && w.y === selectedCell.y)?.expected || ''} onChange={(e) => { const val = e.target.value; let newWrites = [...requiredWrites]; const idx = newWrites.findIndex(w => w.x === selectedCell.x && w.y === selectedCell.y); if (val === '') { newWrites = newWrites.filter(w => !(w.x === selectedCell.x && w.y === selectedCell.y)); } else if (idx > -1) { newWrites[idx].expected = val; } else { newWrites.push({ x: selectedCell.x, y: selectedCell.y, expected: val }); } setRequiredWrites(newWrites); }} className="w-full text-[11px] px-2 py-1 border rounded font-bold" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-[10px] text-slate-400 italic">Edit modda xanaya klikləyin.</div>
                      )}
                    </div>

                    {/* ROBOT PARAMETRLƏRİ */}
                    <div className="border-t pt-3 space-y-2 bg-white/50 p-2 rounded-lg mt-4">
                      <span className="text-[10px] font-black uppercase text-indigo-600 block">🤖 Robot & Tapşırıq Ayarları</span>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">C++ Maksimum Bal (levelPoint)</label>
                        <input type="number" value={form.levelPoint} onChange={(e) => setForm({ ...form, levelPoint: parseInt(e.target.value) || 0 })} className="w-full p-1 border rounded text-xs font-bold text-center text-purple-700 bg-purple-50/40" />
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[11px] pt-1">
                        <div>
                          <label className="text-[8px] font-bold text-slate-400 block uppercase">Start X</label>
                          <input type="number" value={form.startX} onChange={(e) => setForm({ ...form, startX: parseInt(e.target.value) || 0 })} className="w-full border p-1 rounded text-center font-bold" />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-slate-400 block uppercase">Start Y</label>
                          <input type="number" value={form.startY} onChange={(e) => setForm({ ...form, startY: parseInt(e.target.value) || 0 })} className="w-full border p-1 rounded text-center font-bold" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[8px] font-bold text-slate-400 block uppercase">Robotun İstiqaməti</label>
                          <select value={form.startDirection} onChange={(e) => setForm({ ...form, startDirection: e.target.value as any })} className="w-full border p-1 rounded font-bold text-xs">
                            <option value="right">Sağ →</option>
                            <option value="left">← Sol</option>
                            <option value="up">Yuxarı ↑</option>
                            <option value="down">Aşağı ↓</option>
                          </select>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {activeTab === 'json' && (
                <div className="flex-1 min-h-[300px]">
                  <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} spellCheck={false} className="w-full h-full p-3 text-xs font-mono text-emerald-600 bg-slate-900 border rounded-xl outline-none" style={{ minHeight: '320px' }} />
                </div>
              )}

              {/* ================================================================= */}
              {/* 🆕 YENİ BÖLMƏ: OLİMPİADA QAYDALARI PANELİ (RULES) */}
              {/* ================================================================= */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-700 flex items-center gap-1">🛠️ Səviyyə Qaydaları və Məhdudiyyətlər</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Mütləq Əmrlər */}
                  <div className="bg-white p-3 rounded-lg border space-y-2">
                    <label className="text-[10px] font-bold text-emerald-600 uppercase block">🟢 Mütləq Əmrlər (Required)</label>
                    <div className="flex gap-1">
                      <input type="text" placeholder="if, while..." value={newRequired} onChange={(e) => setNewRequired(e.target.value)} className="flex-1 p-1 border rounded text-xs" />
                      <button type="button" onClick={() => { if (newRequired) { setRules({ ...rules, required: [...rules.required, newRequired] }); setNewRequired(''); } }} className="bg-emerald-600 text-white px-2 rounded text-xs">+</button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {rules.required.map(r => <span key={r} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">{r} <X size={10} className="cursor-pointer" onClick={() => setRules({ ...rules, required: rules.required.filter(x => x !== r) })} /></span>)}
                    </div>
                  </div>

                  {/* Qadağan Əmrlər */}
                  <div className="bg-white p-3 rounded-lg border space-y-2">
                    <label className="text-[10px] font-bold text-rose-600 uppercase block">🔴 Qadağan Əmrlər (Forbidden)</label>
                    <div className="flex gap-1">
                      <input type="text" placeholder="for, goto..." value={newForbidden} onChange={(e) => setNewForbidden(e.target.value)} className="flex-1 p-1 border rounded text-xs" />
                      <button type="button" onClick={() => { if (newForbidden) { setRules({ ...rules, forbidden: [...rules.forbidden, newForbidden] }); setNewForbidden(''); } }} className="bg-rose-600 text-white px-2 rounded text-xs">+</button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {rules.forbidden.map(r => <span key={r} className="bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">{r} <X size={10} className="cursor-pointer" onClick={() => setRules({ ...rules, forbidden: rules.forbidden.filter(x => x !== r) })} /></span>)}
                    </div>
                  </div>

                  {/* Limitli Əmrlər */}
                  <div className="bg-white p-3 rounded-lg border space-y-2">
                    <label className="text-[10px] font-bold text-amber-600 uppercase block">🟡 Limitli Əmrlər (Max Usage)</label>
                    <div className="flex gap-1">
                      <input type="text" placeholder="robot.ireli()" value={newLimitKey} onChange={(e) => setNewLimitKey(e.target.value)} className="flex-1 p-1 border rounded text-xs" />
                      <input type="number" min={1} value={newLimitVal} onChange={(e) => setNewLimitVal(parseInt(e.target.value) || 1)} className="w-12 p-1 border rounded text-xs text-center" />
                      <button type="button" onClick={() => { if (newLimitKey) { setRules({ ...rules, maxUsage: [...rules.maxUsage, { key: newLimitKey, val: newLimitVal }] }); setNewLimitKey(''); } }} className="bg-amber-600 text-white px-2 rounded text-xs">+</button>
                    </div>
                    <div className="flex flex-col gap-1">
                      {rules.maxUsage.map(r => <div key={r.key} className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] flex justify-between items-center"><span>{r.key} &le; {r.val} dəfə</span><X size={10} className="cursor-pointer text-amber-600" onClick={() => setRules({ ...rules, maxUsage: rules.maxUsage.filter(x => x.key !== r.key) })} /></div>)}
                    </div>
                  </div>
                </div>
              </div>

              {/* ================================================================= */}
              {/* 🆕 YENİ BÖLMƏ: DİNAMİK SSENARİLƏR PANELİ (VARIANTS) */}
              {/* ================================================================= */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase text-slate-700">🎲 Dinamik Ssenari Variantları (MagiForest Engine)</h3>
                  <button type="button" onClick={() => setVariants([...variants, { values: [{ name: '$a', value: '10' }] }])} className="bg-sky-600 text-white font-bold text-[10px] px-2 py-1 rounded">+ Yeni Ssenari Əlavə Et</button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {variants.map((senari, sIdx) => (
                    <div key={sIdx} className="bg-white p-3 rounded-lg border relative space-y-2">
                      <button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== sIdx))} className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 text-xs font-bold">Ssenarini Sil</button>
                      <span className="text-[10px] font-black text-slate-400">Ssenari #{sIdx + 1}</span>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {senari.values.map((v, vIdx) => (
                          <div key={vIdx} className="border p-1.5 rounded bg-slate-50 relative group">
                            <input type="text" value={v.name} placeholder="Dəyişən (örn: $a)" onChange={(e) => {
                              const next = [...variants];
                              next[sIdx].values[vIdx].name = e.target.value;
                              setVariants(next);
                            }} className="w-full text-[10px] p-1 border rounded font-mono font-bold text-purple-700" />
                            <input type="text" value={v.value} placeholder="Dəyər (örn: 12)" onChange={(e) => {
                              const next = [...variants];
                              next[sIdx].values[vIdx].value = e.target.value;
                              setVariants(next);
                            }} className="w-full text-[10px] p-1 border rounded mt-1" />
                            <button type="button" onClick={() => {
                              const next = [...variants];
                              next[sIdx].values = next[sIdx].values.filter((_, i) => i !== vIdx);
                              setVariants(next);
                            }} className="absolute -top-1 -right-1 hidden group-hover:block bg-rose-500 text-white rounded-full p-0.5 text-[8px]">X</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => {
                          const next = [...variants];
                          next[sIdx].values.push({ name: '', value: '' });
                          setVariants(next);
                        }} className="border border-dashed text-[10px] font-bold text-slate-400 hover:bg-slate-50 rounded flex items-center justify-center min-h-[50px]">+ Dəyişən</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3 mt-auto">
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-slate-100 text-slate-600 font-bold text-xs px-4 py-2 rounded-xl">Ləğv Et</button>
                <button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-xl flex items-center gap-1.5">
                  {isSubmitting ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />} Yadda Saxla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}