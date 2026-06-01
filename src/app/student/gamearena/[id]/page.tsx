'use client';

import React, { useEffect, useRef, useState, use } from 'react';
import { compileCppCode } from '@/utils/wandboxService';
import { useUser } from '@/src/context/UserContext';
import { useTransition } from '@/src/context/TransitionContext';
import Image from 'next/image';
import { Play, Square, RotateCcw, MapPin, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import ReactCodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';

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

// Heyvanlar məlumat bazası (Gələn order və ya index-ə görə uyğun heyvanı seçmək üçün)
const animalsData = [
  { id: 1, nameAz: "Canavar", nameEn: "Wolf", image: "1.jpg" },
  { id: 2, nameAz: "Kirpi", nameEn: "Hedgehog", image: "2.jpg" },
  { id: 3, nameAz: "Ayı", nameEn: "Bear", image: "3.jpg" },
  { id: 4, nameAz: "Tısbağa", nameEn: "Turtle", image: "4.jpg" },
  { id: 5, nameAz: "Bəbir", nameEn: "Leopard", image: "5.jpg" },
  { id: 6, nameAz: "Sincab (Zolaqlı)", nameEn: "Chipmunk", image: "6.jpg" },
  { id: 7, nameAz: "Maral", nameEn: "Deer", image: "7.jpg" },
  { id: 8, nameAz: "Bayquş", nameEn: "Owl", image: "8.jpg" },
  { id: 9, nameAz: "Sığın", nameEn: "Moose", image: "9.jpg" },
  { id: 10, nameAz: "Dələ", nameEn: "Squirrel", image: "10.jpg" },
  { id: 11, nameAz: "Bizon", nameEn: "Bison", image: "11.jpg" },
  { id: 12, nameAz: "Tənbəllər", nameEn: "Sloth", image: "12.jpg" },
  { id: 13, nameAz: "Surikat", nameEn: "Meerkat", image: "13.jpg" }
];

const GRID_SIZE = 80;
const ROBOT_INPUT_NUMBER = "3";

const DEFAULT_CPP_CODE = `#include <iostream>
using namespace std;

int main() {
    // Buraya robotu hərəkətə gətirəcək C++ kodunu yazacaqsınız.
    
    return 0;
}`;

export default function RealCompilerArena({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { userData } = useUser();
  const { navigateTo, endTransition } = useTransition();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const [code, setCode] = useState(DEFAULT_CPP_CODE);
  const [isRunning, setIsRunning] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<{ type: 'system' | 'error' | 'step' | 'success'; text: string }[]>([
    { type: 'system', text: '// 🤖 Meşə Texnologiyası Terminalı aktivdir. Əmrlər gözlənilir...' }
  ]);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [successSteps, setSuccessSteps] = useState<number[]>([]);

  const executionStackRef = useRef<ExecutionStep[]>([]);
  const lastCompiledCodeRef = useRef<string>("");
  const abortExecutionRef = useRef<boolean>(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  console.log("GameData:", gameData);

  // Arenanın sırasına uyğun gələn heyvanı tapırıq
  const currentAnimal = gameData ? animalsData[(gameData.order-1 || 0) % animalsData.length] : animalsData[0];

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

  useEffect(() => {
    async function fetchArenaData() {
      try {
        const res = await fetch(`/api/games/${id}?userId=${userData?._id}`);
        const result = await res.json();

        if (result.gameData) {
          setGameData(result.gameData);
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

  const startRobotMovement = async (steps: ExecutionStep[]) => {
    if (!gameData) return;
    setIsRunning(true);
    setSuccessSteps([]);
    abortExecutionRef.current = false;

    const r = robotRef.current;

    for (let i = 0; i < steps.length; i++) {
      if (abortExecutionRef.current) {
        setTerminalLogs(prev => [...prev, { type: 'error', text: '🛑 Simulyasiya dayandırıldı.' }]);
        setIsRunning(false); setActiveStepIndex(null); return;
      }

      const stepData = steps[i]; const cmd = stepData.cmd; setActiveStepIndex(i);

      if (cmd === 'move') {
        let nx = r.gridX + Math.round(Math.cos(r.targetAngle));
        let ny = r.gridY + Math.round(Math.sin(r.targetAngle));

        if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5 && gameData.mapLayout[ny][nx] === 0) {
          r.gridX = nx; r.gridY = ny; r.targetX = nx * GRID_SIZE + GRID_SIZE / 2; r.targetY = ny * GRID_SIZE + GRID_SIZE / 2;
        } else {
          setTerminalLogs(prev => [...prev, { type: 'error', text: `💥 Robot əngələ çırpıldı! (Xana: ${nx + 1}, ${ny + 1})` }]);
          handleStopExecution(); return;
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
      if (r.gridX === gameData.targetX && r.gridY === gameData.targetY) {
        setTerminalLogs(prev => [...prev, { type: 'success', text: `🏆 [UĞURLU] Missiya tamamlandı! (+${gameData.points} Xal)` }]);

        confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 } });

        await fetch(`/api/games/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userData?._id, gameId: gameData._id, points: gameData.points })
        });

        setShowSuccessModal(true);
      } else {
        setTerminalLogs(prev => [...prev, { type: 'error', text: '🏁 Əmrlər icra olundu, lakin robot finiş xanasına çata bilmədi.' }]);
      }
    }
    setActiveStepIndex(null);
    setIsRunning(false);
  };

  const handleCompileAndRun = async () => {
    setIsTerminalExpanded(true);

    if (code === lastCompiledCodeRef.current && executionStackRef.current.length > 0) {
      robotRef.current.reset(gameData || undefined);
      setTerminalLogs([{ type: 'system', text: '🔄 Eyni kod yenidən simulyasiya edilir...' }]);
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
        setTerminalLogs([{ type: 'error', text: '⚠ Ekrana (cout) heç bir komanda çıxmadı.' }]);
        setIsRunning(false); return;
      }
      const rawSteps = stdout.split("\n").map(s => s.trim());
      const parsedSteps: ExecutionStep[] = [];
      rawSteps.forEach(stepText => {
        let cmdType: 'move' | 'left' | 'right' | null = null;
        if (stepText.includes("ireli")) cmdType = "move";
        else if (stepText.includes("sola don")) cmdType = "left";
        else if (stepText.includes("saga don")) cmdType = "right";
        if (cmdType) parsedSteps.push({ cmd: cmdType, raw: stepText });
      });
      executionStackRef.current = parsedSteps; lastCompiledCodeRef.current = code;
      setTerminalLogs([{ type: 'success', text: '🚀 Kod uğurlu işlədi! Robot hərəkətə başlayır...' }]);
      startRobotMovement(parsedSteps);
    } catch (error) {
      setTerminalLogs([{ type: 'error', text: '🌐 Server əlaqə xətası.' }]); setIsRunning(false);
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
    setTerminalLogs([{ type: 'system', text: '// Xəritə sıfırlandı. Yeni kod yaza bilərsiniz.' }]);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-gradient-to-b from-sky-200 to-green-100 flex flex-col items-center justify-center font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-600 mb-4"></div>
        <p className="text-emerald-900 font-black text-base">Arena hazırlanır, meşəyə daxil olursunuz... 🌲</p>
      </div>
    );
  }

  if (apiError || !gameData) {
    return (
      <div className="h-screen w-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-[32px] border-4 border-amber-400 shadow-xl text-center max-w-md">
          <span className="text-5xl mb-3 block">⚠️</span>
          <h3 className="text-slate-900 font-black text-xl mb-2">Xəta Baş Verdi</h3>
          <p className="text-slate-600 text-sm mb-5 font-semibold">{apiError || "Məlumat tapılmadı."}</p>
          <button onClick={() => window.location.reload()} className="bg-amber-500 text-white font-black px-6 py-2.5 rounded-xl shadow-[0_4px_0_#b45309]">Yenidən Cəhd Et</button>
        </div>
      </div>
    );
  }

  const lineCount = code.split('\n').length;

  return (
    <div className="h-screen w-screen bg-gradient-to-b from-sky-100 via-emerald-50 to-green-50 flex flex-col p-4 md:p-6 antialiased font-sans select-none overflow-hidden">


      {/* ÜST DİNAMİK BAŞLIQ QATI (TAM YENİLƏNMİŞ OYUN KONSEPTLİ GERİ DÜYMƏSİ) */}
      <div className="flex justify-between items-center bg-white p-4 rounded-[28px] border-4 border-white shadow-[0_6px_0_#e2e8f0] mb-5 shrink-0">
        <div className="flex items-center gap-4">

          {/* BÖYÜK, ŞİRİN VƏ QALIN GERİ QAYIT DÜYMƏSİ */}
          <button
            onClick={() => navigateTo('/student/gamearena')}
            className="p-3 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-2xl border-b-[4px] border-rose-300 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center shrink-0 shadow-sm group"
            title="Arenadan Çıx"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transform group-hover:-translate-x-1 transition-transform"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          {/* Dairəvi Çərçivədə Dinamik Heyvan Şəkli */}
          <div className="relative w-16 h-16 rounded-full border-4 border-emerald-400 overflow-hidden shadow-md bg-emerald-50 shrink-0">
            <Image
              src={`/animals/${currentAnimal.image}`}
              alt={currentAnimal.nameAz}
              fill
              className="object-cover"
            />
          </div>

          <div>

            <h1 className="font-black text-emerald-950 tracking-tight text-base md:text-xl leading-tight mt-0.5 md:mt-1">
              {gameData.title}
            </h1>

            {/* HTML Formatında Təlimat Mətni */}
            <div
              className="mt-2 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-2xl border-2 border-emerald-200 shadow-inner"
            >

              <div
                className="text-xs md:text-sm text-emerald-800 font-medium leading-relaxed [&_strong]:bg-emerald-200 [&_strong]:px-1.5 [&_strong]:rounded-md [&_strong]:text-emerald-950 [&_code]:bg-emerald-900 [&_code]:text-emerald-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded font-mono"
                dangerouslySetInnerHTML={{ __html: gameData.instructionText }}
              />
            </div>
          </div>
        </div>

        {/* Xal və Göstəricilər */}

      </div>
      {/* İŞ SAHƏSİ */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch overflow-hidden pb-2">

        {/* SOL TƏRƏF: Robot Arenası (Uşaq Stili Böyük Çərçivə) */}
        <div className="flex-[1.3] bg-white p-5 rounded-[36px] border-4 border-white shadow-[0_8px_0_#e2e8f0] flex items-center justify-center min-h-[320px]">
          <div className="relative aspect-square max-h-full max-w-full">
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="bg-emerald-50/40 rounded-2xl block max-w-full max-h-full object-contain border-2 border-dashed border-emerald-200"
            />
          </div>
        </div>

        {/* SAĞ TƏRƏF: Redaktor və Kod Sahəsi */}
        <div className="flex-1 flex flex-col gap-5 overflow-hidden relative">

          <div className="flex-1 relative bg-transparent rounded-3xl overflow-hidden min-h-[220px]">
            {/* C++ EDİTÖR */}
            <div className="absolute inset-0 bg-white rounded-[32px] border-4 border-white shadow-[0_8px_0_#e2e8f0] flex flex-col overflow-hidden">
              <div className="bg-[#f8fafc] px-5 py-3 border-b-2 border-slate-100 flex justify-between items-center shrink-0">
                <span className="text-xs font-mono font-black text-slate-500">solution.cpp</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  C++ Kompilyator
                </span>
              </div>

              <div className="rounded-2xl overflow-hidden border-3 border-slate-200 shadow-sm bg-white task-editor min-h-[340px]">
                {/* Sətir Nömrələri */}
              
                <ReactCodeMirror
                  value={code}
                  height="100%"
                  minHeight="340px"
                  theme="light"
                  extensions={[cpp()]}
                  onChange={(value) => setCode(value)}
                  editable={!isRunning && !isTerminalExpanded}
                />                
              </div>
            </div>

            {/* SÜRÜŞƏN MEŞƏ TERMİNALI */}
            <div className={`absolute left-0 right-0 bottom-0 bg-[#1e293b] rounded-[28px] border-4 border-[#334155] flex flex-col transition-all duration-500 shadow-2xl ${isTerminalExpanded
              ? 'top-0 h-full z-10 border-t-4 border-t-amber-400'
              : 'h-[130px] lg:h-[145px] z-10'
              }`}
              style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
              {/* Terminal Başlığı */}
              <div className="flex justify-between items-center px-5 py-2.5 bg-[#0f172a] rounded-t-[20px] border-b border-slate-700 shrink-0">
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono font-black uppercase tracking-wider">
                  <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`}></span>
                  Konsol Ekranı
                </div>

                <div>
                  {isTerminalExpanded ? (
                    <button
                      onClick={() => setIsTerminalExpanded(false)}
                      className="bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-black text-xs px-4 py-1.5 rounded-xl shadow-[0_3px_0_#b45309] active:translate-y-[3px] active:shadow-none transition-all flex items-center gap-1.5"
                    >
                      ↩ KODA QAYIT
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsTerminalExpanded(true)}
                      className="text-slate-400 hover:text-white text-xs bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 font-bold transition-colors"
                    >
                      Genişlət ⛶
                    </button>
                  )}
                </div>
              </div>

              {/* Terminal Logları */}
              <div ref={terminalRef} className="flex-1 font-mono text-[13px] text-slate-200 overflow-y-auto p-4 flex flex-col gap-2">
                {terminalLogs.map((log, idx) => {
                  if (log.type === 'system') return <div key={idx} className="text-amber-400 font-bold">{log.text}</div>;
                  if (log.type === 'error') return <div key={idx} className="text-rose-400 bg-rose-950/40 border border-rose-900/40 p-3 rounded-xl font-sans text-xs font-semibold">{log.text}</div>;
                  if (log.type === 'success') return <div key={idx} className="text-emerald-400 font-black">{log.text}</div>;
                  return null;
                })}
                {executionStackRef.current.map((item, index) => {
                  const isActive = activeStepIndex === index;
                  const isSuccess = successSteps.includes(index);
                  let lineStyle = "px-3 py-2 rounded-xl transition-all font-bold text-slate-400 flex items-center gap-2 ";
                  if (isActive) lineStyle += "bg-amber-400 text-slate-950 font-black translate-x-1 shadow-md";
                  else if (isSuccess) lineStyle += "text-emerald-400 bg-emerald-500/10";
                  return <div key={index} className={lineStyle}><span className="text-[10px] opacity-30">#{index + 1}</span>{isActive ? '👉 ' : ''}{item.raw}</div>;
                })}
              </div>
            </div>

          </div>

          {/* FƏALİYYƏT DÜYMƏLƏRİ (OYUN PANELİ SÜLEYMAN TƏRZİ) */}
          <div className="p-4 bg-white rounded-[24px] border-4 border-white shadow-[0_6px_0_#e2e8f0] flex gap-3 shrink-0 z-20">
            {isRunning ? (
              <button
                onClick={handleStopExecution}
                className="flex-[2.5] bg-rose-500 hover:bg-rose-400 text-white font-black text-sm py-4 px-6 rounded-2xl shadow-[0_5px_0_#9f1239] active:translate-y-[5px] active:shadow-none uppercase tracking-wider transition-all"
              >
                Dayandır <Square size={16} className="inline ml-1" fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={handleCompileAndRun}
                className="flex-[2.5] bg-emerald-500 hover:bg-emerald-400 text-white font-black text-sm py-4 px-6 rounded-2xl shadow-[0_5px_0_#065f46] active:translate-y-[5px] active:shadow-none uppercase tracking-wider transition-all"
              >
                Kodu Çalışdır <Play size={16} className="inline ml-1" fill="currentColor" />
              </button>
            )}

            <button
              onClick={handleReset}
              className="flex-[1] bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm py-4 px-4 rounded-2xl shadow-[0_5px_0_#cbd5e1] active:translate-y-[5px] active:shadow-none uppercase tracking-wider transition-all"
            >
              Sıfırla <RotateCcw size={16} className="inline ml-1" />
            </button>
          </div>

        </div>
      </div>

      {/* SƏHİFƏLƏRARASI KEÇİD POPUP-I */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-[40px] border-8 border-emerald-400 shadow-2xl text-center max-w-sm w-full animate-in zoom-in duration-300">
            <div className="text-7xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-3xl font-black text-emerald-950 mb-2">Əla İş!</h2>
            <p className="text-slate-600 font-bold mb-6">Robot hədəfə çatdı və {currentAnimal.nameAz} sənə xalları təqdim etdi!</p>
            <button
              onClick={() => navigateTo('/student/gamearena')}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 rounded-2xl shadow-[0_5px_0_#065f46] active:translate-y-[5px] active:shadow-none transition-all uppercase text-sm tracking-wider"
            >
              Arenaya Dön 🐾
            </button>
          </div>
        </div>
      )}


       <style jsx global>{`     
        
        .task-editor .cm-editor { font-family: 'Consolas', monospace !important; font-size: 14px !important; font-weight: 700 !important; }
      `}</style>
    </div>
  );
}