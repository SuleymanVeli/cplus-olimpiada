// app/student/arena/[taskId]/page.tsx
'use client';

import React, { useEffect, useRef, useState, use } from 'react';
import { compileCppCode } from '@/utils/wandboxService';
import { useUser } from '@/src/context/UserContext';
import { useTransition } from '@/src/context/TransitionContext';

import confetti from 'canvas-confetti';

interface ExecutionStep {
  cmd: 'move' | 'left' | 'right';
  raw: string;
}

interface Collectible {
  objectType: 'star' | 'apple' | 'key' | 'coin';
  x: number;
  y: number;
  pointsValue: number;
  isRequired: boolean;
}

interface GameData {
  _id: string;
  moduleId: string;
  title: string;
  instructionText: string;
  points: number;
  order: number;
  startX: number;
  startY: number;
  startDirection: 'up' | 'down' | 'left' | 'right';
  targetX: number;
  targetY: number;
  mapLayout: number[][];
  collectibles: Collectible[];
}

const GRID_SIZE = 80;
const ROBOT_INPUT_NUMBER = "3";

const DEFAULT_CPP_CODE = `#include <iostream>
using namespace std;

int main() {
    int addim;
    cin >> addim;

    for(int i = 0; i < addim; i++) {
        cout << "duz get" << endl;
    }
    cout << "saga don" << endl;
    cout << "duz get" << endl;
    
    return 0;
}`;

export default function RealCompilerArena({ params }: { params: Promise<{ id: string }> }) {
  // Next.js App Router-da dinamik params obyektini unwrap edirik
  const { id } = use(params);

  const { userData } = useUser();

  const { navigateTo, endTransition } = useTransition();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // API State-ləri
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const [code, setCode] = useState(DEFAULT_CPP_CODE);
  const [isRunning, setIsRunning] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<{ type: 'system' | 'error' | 'step' | 'success'; text: string }[]>([
    { type: 'system', text: '// 🤖 Wandbox API Terminalı aktivdir. Əmrlər gözlənilir...' }
  ]);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [successSteps, setSuccessSteps] = useState<number[]>([]);

  const executionStackRef = useRef<ExecutionStep[]>([]);
  const lastCompiledCodeRef = useRef<string>("");
  const abortExecutionRef = useRef<boolean>(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Robotun vəziyyətini idarə edən referans
  const robotRef = useRef({
    gridX: 0, gridY: 0, targetX: 40, targetY: 40, currentX: 40, currentY: 40,
    angle: 0, targetAngle: 0, speed: 3, frame: 0,
    directionAngles: {
      up: -Math.PI / 2,
      down: Math.PI / 2,
      left: Math.PI,
      right: 0
    },

    reset(data?: GameData) {
      const startX = data ? data.startX : 0;
      const startY = data ? data.startY : 0;
      const dir = data ? data.startDirection : 'right';

      this.gridX = startX;
      this.gridY = startY;
      this.targetX = startX * GRID_SIZE + GRID_SIZE / 2;
      this.targetY = startY * GRID_SIZE + GRID_SIZE / 2;
      this.currentX = this.targetX;
      this.currentY = this.targetY;
      this.angle = this.directionAngles[dir];
      this.targetAngle = this.directionAngles[dir];
    },
    update() {
      if (Math.abs(this.targetX - this.currentX) > this.speed) this.currentX += (this.targetX > this.currentX) ? this.speed : -this.speed;
      else this.currentX = this.targetX;
      if (Math.abs(this.targetY - this.currentY) > this.speed) this.currentY += (this.targetY > this.currentY) ? this.speed : -this.speed;
      else this.currentY = this.targetY;
      let diff = this.targetAngle - this.angle;
      if (Math.abs(diff) > 0.01) this.angle += diff * 0.15;
      else this.angle = this.targetAngle;
      this.frame++;
    },
    isBusy() {
      return Math.abs(this.targetX - this.currentX) > 1 || Math.abs(this.targetY - this.currentY) > 1 || Math.abs(this.targetAngle - this.angle) > 0.05;
    }
  });

  // 1. Verilənlər Bazası API-dən məlumatların çəkilməsi
  useEffect(() => {
    async function fetchArenaData() {
      try {
        // Id-yə görə tək bir oyunu gətirən API marşrutunuz (Əvvəlki addımda yazdığımız GET-ə uyğun)
        const res = await fetch(`/api/games/${id}?userId=${userData?._id}`);
        const result = await res.json();

        if (result.gameData
        ) {
          setGameData(result.gameData);

          // Robotu gələn ilkin mövqeyə görə tənzimləyirik
          robotRef.current.reset(result.gameData);
        } else {
          setApiError(result.message || "Arena məlumatları tapılmadı.");
        }
      } catch (err) {
        setApiError("Serverlə əlaqə qurularkən xəta baş verdi.");
      } finally {
        setLoading(false);
        endTransition();
      }
    }

    if (id && userData?._id) fetchArenaData();
  }, [id, userData?._id]);

  // 2. Canvas Dövrü (Dinamik xəritə, hədəf və collectibles ilə)
  useEffect(() => {
    if (!gameData) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const drawRoundedRect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      c.beginPath(); c.roundRect(x, y, w, h, r); c.fill();
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const layout = gameData.mapLayout;

      // 5x5 Matris xəritəsinin çəkilməsi
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          ctx.fillStyle = layout[y][x] === 1 ? "#e2e8f0" : "#ffffff";
          drawRoundedRect(ctx, x * GRID_SIZE + 4, y * GRID_SIZE + 4, GRID_SIZE - 8, GRID_SIZE - 8, 12);
          ctx.strokeStyle = "#f1f5f9"; ctx.lineWidth = 2; ctx.strokeRect(x * GRID_SIZE + 4, y * GRID_SIZE + 4, GRID_SIZE - 8, GRID_SIZE - 8);

          if (layout[y][x] === 1) {
            ctx.fillStyle = "#cbd5e1"; drawRoundedRect(ctx, x * GRID_SIZE + 12, y * GRID_SIZE + 12, GRID_SIZE - 24, GRID_SIZE - 28, 8);
          }
        }
      }

      // Finiş / Hədəf nöqtəsinin çəkilməsi (Məsələn: Yaşıl xana və ya bayraq)
      ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, gameData.targetX * GRID_SIZE + 6, gameData.targetY * GRID_SIZE + 6, GRID_SIZE - 12, GRID_SIZE - 12, 12);
      ctx.strokeRect(gameData.targetX * GRID_SIZE + 6, gameData.targetY * GRID_SIZE + 6, GRID_SIZE - 12, GRID_SIZE - 12);
      ctx.font = "24px sans-serif";
      ctx.fillText("🏁", gameData.targetX * GRID_SIZE + GRID_SIZE / 2 - 12, gameData.targetY * GRID_SIZE + GRID_SIZE / 2 + 8);

      // Collectibles (Bonus Obyektlərin) çəkilməsi
      gameData.collectibles.forEach(item => {
        const icons = { star: "⭐", apple: "🍎", key: "🔑", coin: "🪙" };
        ctx.font = "22px sans-serif";
        ctx.fillText(icons[item.objectType] || "⭐", item.x * GRID_SIZE + GRID_SIZE / 2 - 11, item.y * GRID_SIZE + GRID_SIZE / 2 + 8);
      });

      // Robotun render olunması
      const r = robotRef.current; r.update();
      ctx.save(); ctx.translate(r.currentX, r.currentY); ctx.rotate(r.angle + Math.PI / 2);
      const isMoving = Math.abs(r.targetX - r.currentX) > 0.5 || Math.abs(r.targetY - r.currentY) > 0.5;
      const bob = isMoving ? Math.sin(r.frame * 0.3) * 2 : 0;
      ctx.fillStyle = "#1e293b"; drawRoundedRect(ctx, -28, -22 + (isMoving ? Math.sin(r.frame * 0.5) * 3 : 0), 12, 44, 6);
      drawRoundedRect(ctx, 16, -22 - (isMoving ? Math.sin(r.frame * 0.5) * 3 : 0), 12, 44, 6);
      ctx.fillStyle = "rgba(0,0,0,0.08)"; drawRoundedRect(ctx, -20, -15, 40, 40, 12);
      const grad = ctx.createLinearGradient(-20, -20, 20, 20); grad.addColorStop(0, "#ff7675"); grad.addColorStop(1, "#e63946");
      ctx.fillStyle = grad; drawRoundedRect(ctx, -20, -20 + bob, 40, 40, 12);
      ctx.fillStyle = "#2d3436"; drawRoundedRect(ctx, -12, -15 + bob, 24, 8, 4);
      ctx.fillStyle = "#00cec9"; drawRoundedRect(ctx, -6, -13 + bob, 12, 3, 2);
      ctx.restore();

      animationId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationId);
  }, [gameData]);

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [terminalLogs, isTerminalExpanded]);

  // 3. Robot Hərəkət Simulyasiyası (Dinamik divar və finiş yoxlanışı ilə)
  const startRobotMovement = async (steps: ExecutionStep[]) => {
    if (!gameData) return;
    setIsRunning(true);
    setSuccessSteps([]);
    abortExecutionRef.current = false;

    const r = robotRef.current;

    for (let i = 0; i < steps.length; i++) {
      if (abortExecutionRef.current) {
        setTerminalLogs(prev => [...prev, { type: 'error', text: '🛑 Simulyasiya istifadəçi tərəfindən dayandırıldı.' }]);
        setIsRunning(false);
        setActiveStepIndex(null);
        return;
      }

      const stepData = steps[i]; const cmd = stepData.cmd; setActiveStepIndex(i);

      if (cmd === 'move') {
        // Robotun baxdığı bucağa görə növbəti addımı hesablayırıq
        let nx = r.gridX + Math.round(Math.cos(r.targetAngle));
        let ny = r.gridY + Math.round(Math.sin(r.targetAngle));

        // Sərhəd və divar yoxlanışı
        if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5 && gameData.mapLayout[ny][nx] === 0) {
          r.gridX = nx; r.gridY = ny; r.targetX = nx * GRID_SIZE + GRID_SIZE / 2; r.targetY = ny * GRID_SIZE + GRID_SIZE / 2;
        } else {
          setTerminalLogs(prev => [...prev, { type: 'error', text: `💥 Robot divara və ya xəritə sərhədinə çırpıldı! (Xana: ${nx}, ${ny})` }]);
          handleStopExecution();
          return;
        }
      } else if (cmd === 'left') r.targetAngle -= Math.PI / 2;
      else if (cmd === 'right') r.targetAngle += Math.PI / 2;

      while (r.isBusy()) {
        if (abortExecutionRef.current) break;
        await new Promise(res => setTimeout(res, 30));
      }
      if (abortExecutionRef.current) break;
      await new Promise(res => setTimeout(res, 500));
      setSuccessSteps(prev => [...prev, i]);
    }

    if (!abortExecutionRef.current) {
      // Hərəkət bitdikdən sonra hədəfə çatıb-çatmadığını yoxlayırıq
      if (r.gridX === gameData.targetX && r.gridY === gameData.targetY) {
        setTerminalLogs(prev => [...prev, { type: 'success', text: `🏆 [UĞURLU] Robot hədəfə çatdı! (+${gameData.points} Xal)` }]);

        // 1. Konfeti effekti
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });

        // 2. Məlumatları save etmək və keçid etmək üçün API çağırışı
        await fetch(`/api/games/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userData?._id, gameId: gameData._id, points: gameData.points })
        });

        // 3. Popup-ı aktivləşdirəcək state (aşağıda izah edirəm)
        setShowSuccessModal(true);
      } else {
        setTerminalLogs(prev => [...prev, { type: 'error', text: '🏁 Əmrlər bitdi, lakin robot finiş nöqtəsinə çata bilmədi.' }]);
      }
    }
    setActiveStepIndex(null);
    setIsRunning(false);
  };

  const handleCompileAndRun = async () => {
    setIsTerminalExpanded(true);

    if (code === lastCompiledCodeRef.current && executionStackRef.current.length > 0) {
      robotRef.current.reset(gameData || undefined);
      setTerminalLogs([{ type: 'system', text: '🔄 Kod eynidir. Yenidən başladılır...' }]);
      startRobotMovement(executionStackRef.current);
      return;
    }

    setIsRunning(true);
    abortExecutionRef.current = false;
    setTerminalLogs([{ type: 'system', text: '⚡ C++ kodu kompilyasiya edilir...' }]);

    try {
      const result = await compileCppCode(code, ROBOT_INPUT_NUMBER);
      if (abortExecutionRef.current) return;

      if (result.compiler_error || result.program_error) {
        setTerminalLogs([{ type: 'error', text: '❌ Kompilyasiya Xətası:' }, { type: 'error', text: result.compiler_error || result.program_error || '' }]);
        setIsRunning(false); return;
      }
      let stdout = result.program_output ? result.program_output.trim() : "";
      if (stdout === "") {
        setTerminalLogs([{ type: 'error', text: '⚠ Ekrana (cout) heç bir əmr çıxmadı.' }]);
        setIsRunning(false); return;
      }
      const rawSteps = stdout.split("\n").map(s => s.trim());
      const parsedSteps: ExecutionStep[] = [];
      rawSteps.forEach(stepText => {
        let cmdType: 'move' | 'left' | 'right' | null = null;
        if (stepText.includes("duz get")) cmdType = "move";
        else if (stepText.includes("sola don")) cmdType = "left";
        else if (stepText.includes("saga don")) cmdType = "right";
        if (cmdType) parsedSteps.push({ cmd: cmdType, raw: stepText });
      });
      executionStackRef.current = parsedSteps; lastCompiledCodeRef.current = code;
      setTerminalLogs([{ type: 'success', text: '🚀 Kompilyasiya uğurludur! Robot hərəkət edir...' }]);
      startRobotMovement(parsedSteps);
    } catch (error) {
      setTerminalLogs([{ type: 'error', text: '🌐 Server xətası baş verdi.' }]); setIsRunning(false);
    }
  };

  const handleStopExecution = () => {
    abortExecutionRef.current = true;
    setIsRunning(false);
    setActiveStepIndex(null);
  };

  const handleReset = () => {
    handleStopExecution();
    robotRef.current.reset(gameData || undefined);
    lastCompiledCodeRef.current = "";
    executionStackRef.current = [];
    setSuccessSteps([]);
    setIsTerminalExpanded(false);
    setTerminalLogs([{ type: 'system', text: '// Arena sıfırlandı. Yeni kod yaza bilərsiniz.' }]);
  };

  // Yüklənmə və Xəta ekranları
  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#f1f5f9] flex flex-col items-center justify-center font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3"></div>
        <p className="text-slate-600 font-bold text-sm">Arena yüklənir, zəhmət olmasa gözləyin...</p>
      </div>
    );
  }

  if (apiError || !gameData) {
    return (
      <div className="h-screen w-screen bg-[#f1f5f9] flex flex-col items-center justify-center font-sans p-6">
        <div className="bg-white p-6 rounded-2xl shadow-md text-center max-w-md border border-slate-200">
          <span className="text-4xl mb-2 block">⚠️</span>
          <h3 className="text-slate-800 font-extrabold text-lg mb-2">Xəta Baş Verdi</h3>
          <p className="text-slate-500 text-sm mb-4">{apiError || "Məlumat tapılmadı."}</p>
          <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl">Yenidən Cəhd Et</button>
        </div>
      </div>
    );
  }

  const lineCount = code.split('\n').length;

  return (
    <div className="h-screen w-screen bg-[#f1f5f9] flex flex-col p-4 antialiased font-sans select-none overflow-hidden">

      {/* Üst Başlıq (Dinamik data ilə) */}
      <div className="flex justify-between items-center bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-200/60 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">🌲</span>
          <div>
            <h1 className="font-extrabold text-slate-800 tracking-tight text-sm md:text-base leading-tight">{gameData.title}</h1>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{gameData.instructionText}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 font-mono">stdin = {ROBOT_INPUT_NUMBER}</p>
          <p className="text-[11px] text-indigo-600 font-bold mt-0.5">Xal: {gameData.points}</p>
        </div>
      </div>

      {/* ƏSAS İŞ SAHƏSİ */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 items-stretch overflow-hidden pb-2">

        {/* SOL TƏRƏF: Robot Arenası */}
        <div className="flex-[1.4] bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 flex items-center justify-center min-h-[300px]">
          <div className="relative aspect-square max-h-full max-w-full">
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="bg-[#fafafa] rounded-xl block max-w-full max-h-full object-contain border border-slate-100"
            />
          </div>
        </div>

        {/* SAĞ TƏRƏF */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden relative">

          {/* Editör ve Terminal Alanı */}
          <div className="flex-1 relative bg-transparent rounded-2xl overflow-hidden min-h-[200px]">

            {/* NORMAL AÇIQ EDİTÖR */}
            <div className="absolute inset-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="bg-[#f3f4f6] px-4 py-2 border-b border-slate-200 flex justify-between items-center shrink-0">
                <span className="text-xs font-mono font-bold text-slate-600">main.cpp</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">Native Editor</span>
              </div>

              <div className="flex-1 flex font-mono text-[14px] p-3 overflow-hidden bg-white">
                {/* Satır Numaraları */}
                <div className="text-slate-400 text-right pr-3 select-none border-r border-slate-200 flex flex-col w-8 shrink-0">
                  {Array.from({ length: lineCount }).map((_, i) => (
                    <div key={i} className="text-[13px] h-[21px] leading-[21px]">{i + 1}</div>
                  ))}
                </div>

                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isRunning || isTerminalExpanded}
                  className="flex-1 bg-transparent text-[#24292e] border-none resize-none outline-none pl-3 w-full h-full font-mono caret-slate-800 overflow-y-auto"
                  placeholder="// C++ kodunuzu buraya yazın..."
                  spellCheck={false}
                  style={{ lineHeight: '21px' }}
                />
              </div>
            </div>

            {/* SÜRÜŞƏN TERMİNAL */}
            <div className={`absolute left-0 right-0 bottom-0 bg-[#0f172a] rounded-2xl border border-slate-800 flex flex-col transition-all duration-500 shadow-2xl ${isTerminalExpanded
              ? 'top-0 h-full z-10 border-t-4 border-t-amber-500'
              : 'h-[120px] lg:h-[135px] z-10'
              }`}
              style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
              {/* Terminal Header */}
              <div className="flex justify-between items-center px-4 py-2 bg-[#020617] rounded-t-2xl border-b border-slate-800/80 shrink-0">
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                  <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`}></span>
                  Konsol Çıxışı
                </div>

                <div className="flex items-center gap-3">
                  {isTerminalExpanded ? (
                    <button
                      onClick={() => setIsTerminalExpanded(false)}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs px-4 py-1.5 rounded-xl border-b-[3px] border-amber-800 active:border-b-0 active:translate-y-[3px] transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
                    >
                      ↩ KODA QAYIT
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsTerminalExpanded(true)}
                      className="text-slate-400 hover:text-white text-xs bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700 transition-colors"
                    >
                      Genişlət ⛶
                    </button>
                  )}
                </div>
              </div>

              {/* Terminal Logları */}
              <div ref={terminalRef} className="flex-1 font-mono text-[13px] text-slate-300 overflow-y-auto p-4 flex flex-col gap-1.5">
                {terminalLogs.map((log, idx) => {
                  if (log.type === 'system') return <div key={idx} className="text-amber-400 font-semibold">{log.text}</div>;
                  if (log.type === 'error') return <div key={idx} className="text-rose-400 bg-rose-950/20 border border-rose-900/30 p-2 rounded-md font-sans text-xs">{log.text}</div>;
                  if (log.type === 'success') return <div key={idx} className="text-emerald-400 font-bold">{log.text}</div>;
                  return null;
                })}
                {executionStackRef.current.map((item, index) => {
                  const isActive = activeStepIndex === index;
                  const isSuccess = successSteps.includes(index);
                  let lineStyle = "px-2 py-1.5 rounded-md transition-all text-slate-500 flex items-center gap-2 ";
                  if (isActive) lineStyle += "bg-amber-400 text-slate-950 font-black pl-3 translate-x-1 shadow-md";
                  else if (isSuccess) lineStyle += "text-emerald-400 bg-emerald-500/5";
                  return <div key={index} className={lineStyle}><span className="text-[9px] opacity-40">#{index + 1}</span>{isActive ? '👉 ' : ''}{item.raw}</div>;
                })}
              </div>
            </div>

          </div>

          {/* ACTIONS */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm flex gap-3 shrink-0 z-20">
            {isRunning ? (
              <button
                onClick={handleStopExecution}
                className="flex-[2.5] bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-sm py-3 px-6 rounded-xl border-b-[4px] border-rose-700 active:border-b-0 active:translate-y-[4px] shadow-md uppercase tracking-wider transition-all duration-75"
              >
                Simulyasiyanı Dayandır 🛑
              </button>
            ) : (
              <button
                onClick={handleCompileAndRun}
                className="flex-[2.5] bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-sm py-3 px-6 rounded-xl border-b-[4px] border-emerald-700 active:border-b-0 active:translate-y-[4px] shadow-md uppercase tracking-wider transition-all duration-75"
              >
                Kodu Çalışdır ▶
              </button>
            )}

            <button
              onClick={handleReset}
              className="flex-[1] bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-sm py-3 px-4 rounded-xl border-b-[4px] border-slate-300 active:border-b-0 active:translate-y-[4px] shadow-sm uppercase tracking-wider transition-all duration-75"
            >
              Sıfırla
            </button>
          </div>

        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-2xl text-center animate-in zoom-in duration-300">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Təbriklər!</h2>
            <p className="text-slate-500 mb-6">Siz bu arenanı uğurla keçdiniz!</p>
            <button
              onClick={() => navigateTo('/student/gamearena')} // Arena siyahısına qayıtmaq üçün
              className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-indigo-700 transition-all"
            >
              Növbəti Arenaya Keç
            </button>
          </div>
        </div>
      )}
    </div>
  );
}