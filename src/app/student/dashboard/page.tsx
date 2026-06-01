'use client';

import { useTransition } from '@/src/context/TransitionContext';
import { useUser } from '@/src/context/UserContext';
import { ChevronLeft, ChevronRight, LogOut, Menu } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function MagiForestDashboard() {

    const { userData, setUserData, logout } = useUser();
    const { navigateTo } = useTransition();
    // Canvas referansları
    const mapCanvasRef = useRef<HTMLCanvasElement>(null);
    const robotCanvasRef = useRef<HTMLCanvasElement>(null);
    const arenaCanvasRef = useRef<HTMLCanvasElement>(null);


    // --- Data States (Layout-dan gələn) ---
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [isSubsLoading, setIsSubsLoading] = useState(false);
    const [isCardMinimized, setIsCardMinimized] = useState(false);



    useEffect(() => {

        // 1. Fetch Data
        const fetchData = async () => {
            setIsSubsLoading(true);
            try {
                const res = await fetch('/api/student/submissions');
                if (res.ok) {
                    const data = await res.json();
                    setSubmissions(data.submissions || []);
                }
            } catch (err) { console.error(err); } finally { setIsSubsLoading(false); }
        };
        fetchData();

        // 2. Canvas Rendering Logic (Əvvəlki kodunuz...)
        // --- MANDATORY HELPERS ---
        function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.fill();
        }

        // ========================================================
        // 🟩 1. SOL SƏHİFƏ: MEŞƏ XƏRİTƏSİ ENGINE
        // ========================================================
        const mapCanvas = mapCanvasRef.current;
        if (!mapCanvas) return;
        const mctx = mapCanvas.getContext('2d')!;
        mapCanvas.width = 530;
        mapCanvas.height = 570;

        const points = [
            { x: 120, y: 470, status: 'completed', label: '1' },
            { x: 270, y: 390, status: 'completed', label: '2' },
            { x: 390, y: 280, status: 'active', label: '3' },
            { x: 230, y: 180, status: 'locked', label: '4' },
            { x: 150, y: 80, status: 'locked', label: '5' }
        ];

        function drawDetailedTree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
            ctx.fillStyle = 'rgba(0,0,0,0.06)';
            ctx.beginPath(); ctx.ellipse(x, y + 4, size * 0.8, size * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(x - size / 10, y - size / 1.5, size / 5, size / 1.5);
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(x - size / 2, y - size / 1.2, size / 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + size / 2, y - size / 1.2, size / 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 0.85;
            ctx.beginPath(); ctx.arc(x, y - size * 1.2, size / 1.3, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        let mapTime = 0;
        function renderMap() {
            mctx.clearRect(0, 0, mapCanvas?.width || 0, mapCanvas?.height || 0);
            mapTime += 0.04;
            mctx.fillStyle = 'rgba(255,255,255,0.03)';
            mctx.fillRect(0, 0, mapCanvas?.width || 0, mapCanvas?.height || 0);
            mctx.lineCap = 'round'; mctx.lineJoin = 'round';
            mctx.beginPath(); mctx.lineWidth = 36; mctx.strokeStyle = 'rgba(4, 120, 87, 0.15)';
            points.forEach((p, i) => i === 0 ? mctx.moveTo(p.x, p.y + 4) : mctx.lineTo(p.x, p.y + 4));
            mctx.stroke();
            mctx.beginPath(); mctx.lineWidth = 26; mctx.strokeStyle = '#f59e0b';
            points.forEach((p, i) => i === 0 ? mctx.moveTo(p.x, p.y) : mctx.lineTo(p.x, p.y));
            mctx.stroke();
            mctx.beginPath(); mctx.lineWidth = 3; mctx.strokeStyle = '#fef08a'; mctx.setLineDash([4, 12]);
            points.forEach((p, i) => i === 0 ? mctx.moveTo(p.x, p.y) : mctx.lineTo(p.x, p.y));
            mctx.stroke(); mctx.setLineDash([]);
            drawDetailedTree(mctx, 70, 420, 24, '#15803d');
            drawDetailedTree(mctx, 440, 440, 26, '#16a34a');
            drawDetailedTree(mctx, 330, 200, 22, '#22c55e');
            drawDetailedTree(mctx, 80, 160, 25, '#166534');
            drawDetailedTree(mctx, 270, 70, 23, '#15803d');
            points.forEach(p => {
                let bob = p.status === 'active' ? Math.sin(mapTime * 2) * 5 : 0;
                mctx.fillStyle = p.status === 'completed' ? '#0369a1' : (p.status === 'active' ? '#b45309' : '#64748b');
                mctx.beginPath(); mctx.arc(p.x, p.y + 4 + bob, 16, 0, Math.PI * 2); mctx.fill();
                mctx.fillStyle = p.status === 'completed' ? '#38bdf8' : (p.status === 'active' ? '#fbbf24' : '#cbd5e1');
                mctx.beginPath(); mctx.arc(p.x, p.y + bob, 16, 0, Math.PI * 2); mctx.fill();
                mctx.fillStyle = '#ffffff'; mctx.font = 'bold 13px Fredoka'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
                if (p.status === 'completed') mctx.fillText('✓', p.x, p.y + bob);
                else mctx.fillText(p.label, p.x, p.y + bob);
                if (p.status === 'active') {
                    mctx.font = '28px Arial';
                    mctx.fillText('🦊', p.x, p.y - 32 + bob);
                    mctx.font = '12px Arial';
                    mctx.fillText('👑', p.x, p.y - 52 + bob);
                }
            });
            requestAnimationFrame(renderMap);
        }

        // ========================================================
        // 🤖 2. SAĞ ÜST SƏHİFƏ: PREMIUM ROBOT ENGINESİ
        // ========================================================
        const robotCanvas = robotCanvasRef.current!;
        const rctx = robotCanvas.getContext('2d')!;
        function resizeRobotCanvas() {
            robotCanvas.width = robotCanvas.parentElement!.clientWidth;
            robotCanvas.height = robotCanvas.parentElement!.clientHeight;
        }
        resizeRobotCanvas();
        const robotObj = {
            currentX: 80, currentY: 150, targetX: 400, targetY: 150, angle: 0, frame: 0, speed: 1.5,
            update: function () {
                this.frame++;
                if (Math.abs(this.targetX - this.currentX) < 5) this.targetX = this.targetX === 400 ? 80 : 400;
                let dx = this.targetX - this.currentX;
                this.currentX += Math.sign(dx) * this.speed;
                this.angle = dx > 0 ? Math.PI / 2 : -Math.PI / 2;
            }
        };
        function renderRobotScene() {
            rctx.clearRect(0, 0, robotCanvas.width, robotCanvas.height);
            robotObj.update();

            rctx.save();
            rctx.translate(robotObj.currentX, robotObj.currentY);

            // Robotun öz oxu ətrafında dönməsi
            rctx.rotate(robotObj.angle);

            // Əgər sola baxırsa, robotu yuxarı-aşağı çevirməmək üçün 
            // sadəcə scaleX-dən istifadə edə bilərik, amma rotate daha təmizdir.
            // İndi robotun vizual mərkəzini tənzimləyirik:
            const bob = Math.sin(robotObj.frame * 0.2) * 2;

            // Tırtıllar (ayaqlar)
            rctx.fillStyle = "#1e293b";
            drawRoundedRect(rctx, -20, -20 + Math.sin(robotObj.frame * 0.4) * 2, 10, 40, 5);
            drawRoundedRect(rctx, 10, -20 - Math.sin(robotObj.frame * 0.4) * 2, 10, 40, 5);

            // Gövdə və s. (əvvəlki kimi)
            const grad = rctx.createLinearGradient(-18, -18, 18, 18);
            grad.addColorStop(0, "#ff7675"); grad.addColorStop(1, "#e63946");
            rctx.fillStyle = grad;
            drawRoundedRect(rctx, -18, -18 + bob, 36, 36, 10);
            rctx.fillStyle = "#2d3436";
            drawRoundedRect(rctx, -10, -12 + bob, 20, 8, 3);
            rctx.fillStyle = "#00cec9";
            drawRoundedRect(rctx, -5, -10 + bob, 10, 3, 1);
            rctx.restore();
            requestAnimationFrame(renderRobotScene);
        }

        // ========================================================
        // 🎯 3. SAĞ ALT SƏHİFƏ: PREMIUM SINAQ ARENASI
        // ========================================================
        const arenaCanvas = arenaCanvasRef.current!;
        const actx = arenaCanvas.getContext('2d')!;
        function resizeArenaCanvas() {
            arenaCanvas.width = arenaCanvas.parentElement!.clientWidth;
            arenaCanvas.height = arenaCanvas.parentElement!.clientHeight;
        }
        resizeArenaCanvas();
        let arenaTime = 0;
        function renderArenaScene() {
            actx.clearRect(0, 0, arenaCanvas.width, arenaCanvas.height);
            arenaTime += 0.05;
            let centerX = arenaCanvas.width / 2;
            let centerY = arenaCanvas.height / 2 - 10;
            actx.save();
            actx.translate(centerX, centerY);
            actx.strokeStyle = '#78350f'; actx.lineWidth = 5; actx.lineCap = 'round';
            actx.beginPath(); actx.moveTo(0, 0); actx.lineTo(-16, 45); actx.stroke();
            actx.beginPath(); actx.moveTo(0, 0); actx.lineTo(16, 45); actx.stroke();
            actx.lineWidth = 3; actx.strokeStyle = '#0f172a';
            actx.fillStyle = '#ef4444';
            actx.beginPath(); actx.arc(0, -10, 36, 0, Math.PI * 2); actx.fill(); actx.stroke();
            actx.fillStyle = '#ffffff';
            actx.beginPath(); actx.arc(0, -10, 24, 0, Math.PI * 2); actx.fill(); actx.stroke();
            actx.fillStyle = '#ef4444';
            actx.beginPath(); actx.arc(0, -10, 10, 0, Math.PI * 2); actx.fill(); actx.stroke();
            actx.strokeStyle = 'rgba(239, 68, 68, 0.4)'; actx.lineWidth = 2;
            actx.setLineDash([5, 10]);
            actx.beginPath(); actx.arc(0, -10, 50 + Math.sin(arenaTime) * 4, 0, Math.PI * 2); actx.stroke();
            actx.restore();
            requestAnimationFrame(renderArenaScene);
        }

        const handleResize = () => { resizeRobotCanvas(); resizeArenaCanvas(); };
        window.addEventListener('resize', handleResize);

        const mapAnim = requestAnimationFrame(renderMap);
        const robotAnim = requestAnimationFrame(renderRobotScene);
        const arenaAnim = requestAnimationFrame(renderArenaScene);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(mapAnim);
            cancelAnimationFrame(robotAnim);
            cancelAnimationFrame(arenaAnim);
        };
    }, []);


    return (
<div className="min-h-screen bg-gradient-to-b from-sky-200 via-green-100 to-emerald-200 p-6 font-sans">
        
        {/* PARLAQ VƏ UŞAQLARA UYĞUN HEADER */}
        <header className="max-w-5xl mx-auto flex items-center justify-between p-6 bg-white/80 backdrop-blur-md rounded-[32px] border-4 border-white shadow-[0_10px_0_#10b981]">
            
            {/* SOL: AVATAR VƏ PROFİL */}
            <div className="flex items-center gap-6">
                {/* ÇOX BÖYÜK VƏ CANLI AVATAR */}
                <div className="relative">
                    <div className="w-28 h-28 rounded-3xl border-[6px] border-white shadow-[0_8px_0_#059669] overflow-hidden rotate-[-2deg]">
                        <img 
                            src={`/avatars/avatar-${userData?.avatar || 1}.png`} 
                            className="w-full h-full object-cover scale-110" 
                        />
                    </div>
                    {/* Sehrli parıltı effekti */}
                    <div className="absolute -top-3 -right-3 text-3xl">✨</div>
                </div>

                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-emerald-900 tracking-tight">{userData?.fullName}</h1>
                    <div className="flex gap-2">
                        <span className="bg-amber-400 text-amber-950 font-black text-[11px] px-3 py-1 rounded-full uppercase tracking-widest shadow-[0_3px_0_#b45309]">
                            {userData?.level || "C++ Sehrbazı"}
                        </span>
                        <span className="bg-sky-500 text-white font-black text-[11px] px-3 py-1 rounded-full uppercase tracking-widest shadow-[0_3px_0_#0369a1]">
                            {userData?.points || "1280 XP"}
                        </span>
                    </div>
                </div>
            </div>

            {/* SAĞ: ŞAXSİ TƏRƏQQİ (Progress bar və ya sadə statistikalar) */}
            <div className="bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-200 text-center">
                <p className="text-xs font-black text-emerald-600 uppercase">Tamamlanan</p>
                <p className="text-3xl font-black text-emerald-900">42</p>
            </div>
        </header>
          

            <main className="scene w-full max-w-7xl mx-auto flex justify-center items-center my-auto z-10 [perspective:2200px]">
                <div className="magic-book relative flex w-[1100px] h-[600px] bg-amber-950 rounded-[40px] p-4 shadow-[0_40px_90px_rgba(67,20,7,0.35)] border-b-[20px] border-amber-950 [transform-style:preserve-3d] [transform:rotateX(18deg)]">
                    <div className="absolute left-1/2 top-0 bottom-0 w-12 -ml-6 bg-gradient-to-r from-black/10 via-black/40 to-black/10 z-30 rounded-sm pointer-events-none"></div>
                    <div className="page w-1/2 h-full rounded-l-3xl relative overflow-visible flex flex-col justify-between items-center pb-6 border-r border-black/10  [transform-origin:right_center] bg-gradient-to-br from-green-50 via-green-200 to-green-400">
                        <span className="absolute top-4 bg-emerald-700 text-emerald-50 font-black text-[11px] tracking-wider px-5 py-1 rounded-full z-20 shadow-md border border-emerald-500/30">C++ MACƏRA CIĞIRI</span>
                        <canvas ref={mapCanvasRef} className="w-full h-full rounded-l-3xl z-10 cursor-pointer"></canvas>
                        <button className="popup-el delay-3 absolute bottom-6 bg-gradient-to-b from-emerald-400 to-emerald-500 border-3 border-emerald-700 text-white font-black text-xs px-8 py-2.5 rounded-xl shadow-[0_5px_0_#047857] uppercase tracking-widest hover:from-emerald-300 transition-all z-20">DƏRSLƏRƏ BAX 📖</button>
                    </div>
                    <div className="page w-1/2 h-full rounded-r-3xl relative p-4 flex flex-col justify-between overflow-visible  [transform-origin:left_center] bg-gradient-to-bl from-yellow-50 via-yellow-200 to-yellow-400">
                        <div className="absolute inset-4 rounded-2xl border-4 border-amber-600/15 border-dashed pointer-events-none"></div>
                        <div className="h-[48%] bg-white/40 backdrop-blur-xs rounded-2xl relative p-3 flex flex-col justify-between items-center overflow-hidden border border-amber-400/20 shadow-inner">
                            <span className="bg-amber-700 text-amber-50 font-black text-[10px] tracking-wider px-3 py-0.5 rounded-full z-20 shadow-xs">ROBOT LABORATORİYASI</span>
                            <canvas ref={robotCanvasRef} className="absolute inset-0 w-full h-full z-10 cursor-pointer"></canvas>
                            <button className="popup-el delay-1 bg-gradient-to-b from-cyan-400 to-cyan-500 border-3 border-cyan-700 text-white font-black text-xs px-6 py-2 rounded-xl shadow-[0_4px_0_#0e7490] uppercase tracking-wider hover:from-cyan-300 transition-all z-20 mt-auto">LABA DAXİL OL ⚡</button>
                        </div>
                        <div className="h-[48%] bg-white/40 backdrop-blur-xs rounded-2xl relative p-3 flex flex-col justify-between items-center overflow-hidden border border-amber-400/20 shadow-inner">
                            <span className="bg-amber-700 text-amber-50 font-black text-[10px] tracking-wider px-3 py-0.5 rounded-full z-20 shadow-xs">SINAQ ARENASI</span>
                            <canvas ref={arenaCanvasRef} className="absolute inset-0 w-full h-full z-10 cursor-pointer"></canvas>
                            <button className="popup-el delay-2 bg-gradient-to-b from-rose-400 to-rose-500 border-3 border-rose-700 text-white font-black text-xs px-6 py-2 rounded-xl shadow-[0_4px_0_#be123c] uppercase tracking-wider hover:from-rose-300 transition-all z-20">ARENAYA ATIL ⚔️</button>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="w-full max-w-6xl mx-auto flex justify-between items-center z-20">

            </footer>


        </div>
    );
}