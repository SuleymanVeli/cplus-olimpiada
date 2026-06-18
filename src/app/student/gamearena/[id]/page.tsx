'use client';

import React, { useEffect, useRef, useState } from 'react';
import { compileCppCode } from '@/utils/wandboxService';
import { Play, Square, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import ReactCodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { generateEngineHeader } from '@/src/utils/gameEngineUtils';

// 1. Frontend Parser və Animasiya Sistemi Üçün Əmrlər
interface ExecutionStep {
  cmd:
  | 'move'
  | 'left'
  | 'right'
  | 'push_box'
  | 'portal_jump'
  | 'look_ahead'
  | 'read_int'
  | 'read_string'
  | 'read_double'
  | 'terminal_write'
  | 'tile_write';
  raw: string;
}

interface PortalData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface CavabXal {
  cavab: string;      // C++ mühərriki ilə tam eyni (müqayisə string-lə gedir)
  verilecekXal: number;
  mesaj: string;
}

interface LevelData {
  title: string;
  instructionText: string;
  points: number;            // Səviyyənin ümumi (maksimum) balı
  startX: number;
  startY: number;
  startDirection: 'right' | 'left' | 'up' | 'down';
  mapLayout: number[][];
  xanaYazilari: string[][];  // Hüceyrədəki yazılar
  xanaTipleri: string[][];   // "int", "string", "double" və ya ""
  portals?: PortalData[];    // Səviyyədə portal yoxdursa undefined ola bilər
  xalSistemi?: CavabXal[];   // Dinamik xal matrisi (Terminal varsa aktivləşir)
  levelPoint: number;
  hasWriteTask: boolean;
  requiredWrites: any[];

}

// 2. MOCK DATA: Bütün yeni mühərrik komponentlərini test edən real xəritə (10x5)
// 0: Boş, 1: Sabit Divar, 2: Qutu, 3: Portal, 4: Terminal, 5: Finiş
const MOCK_LEVEL_DATA: LevelData = {
  title: "Sehrli Meşə: Alqoritmik Hesablama və Terminal Testi",
  instructionText: "Qarşıdakı qutunu itələ, xanadakı <strong>INT</strong> dəyəri oxu, üzərinə 1 addım irəlidəki dəyəri əlavə et, <strong>Terminalda (4)</strong> yaz və <strong>Finişə (5)</strong> keç!",
  points: 150,
  startX: 1,
  startY: 1,
  startDirection: 'right',
  levelPoint: 20,

  // Xəritədə artıq Terminal (4) və Finiş (5) mövcuddur
  mapLayout: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 5, 1], // (2,1)-də qutu, (4,1)-də terminal, (8,1)-də finiş
    [1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ],

  // Qutunun altındakı xanada (2,1) int 99 var. (3,1) xanasında isə digər int 50 var.
  xanaYazilari: [
    ["", "", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", "", ""]
  ],

  xanaTipleri: [
    ["", "", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", "", ""]
  ],

  // Test üçün dinamik xal sistemi: Şagird fərqli kombinasiyalar yaza bilər
  xalSistemi: [
    { cavab: "149", verilecekXal: 150, mesaj: "Mükəmməl! Hər iki ədədi düzgün topladın!" },
    { cavab: "99", verilecekXal: 90, mesaj: "Yaxşı cəhd, amma növbəti xanadakı ədədi unutmusan!" }
  ],

  portals: [],
  hasWriteTask: true,
  requiredWrites: [
    { x: 2, y: 1, expected: "1" },
    { x: 3, y: 1, expected: "2" },
    { x: 4, y: 1, expected: "3" },
    { x: 5, y: 1, expected: "4" }
  ]
};

const GRID_SIZE = 60;
const ROBOT_INPUT_NUMBER = "0";

// 3. DEFAULT C++ CODE: Uşağın redaktorda ilk görəcəyi təmiz, yeni overload olunmuş kod şablonu
const DEFAULT_CPP_CODE = `#include <iostream>
using namespace std;

int main() {
    // 1. Önümüzdəki qutunu irəli itələyirik
    robot.ireli(); 
    
    // 2. İnt tipli yazıları oxuyub toplayırıq
    int eded1 = robot.yaziOxuInt();
    robot.ireli();
    int eded2 = robot.yaziOxuInt();
    
    // 3. Terminal xanasının üzərinə gəlirik
    robot.ireli();
    
    // 4. Yeni tək parametrlə nəticəni birbaşa terminala yazırıq!
    int cem = eded1 + eded2;
    robot.terminalaYaz(cem); 
    
    // 5. Finiş qapısı açıldı! Finişə doğru gedirik
    robot.ireli();
    robot.ireli();
    robot.ireli();
    robot.ireli(); // Səviyyə tamamlandı! 🎉

    return 0;
}`;

export default function RealCompilerArena() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<LevelData| null>();

  // Cari xəritə və yazı vəziyyətini dinamik saxlamaq üçün statelər
  const [dynamicMap, setDynamicMap] = useState<number[][]>(MOCK_LEVEL_DATA.mapLayout);
  const [code, setCode] = useState(DEFAULT_CPP_CODE);
  const [isRunning, setIsRunning] = useState(false);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<{ type: 'system' | 'error' | 'step' | 'success'; text: string }[]>([
    { type: 'system', text: '// 🌲 Meşə Mühərriki 2.0 Aktivdir. C++ simulyasiyası gözlənilir...' }
  ]);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [successSteps, setSuccessSteps] = useState<number[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [xanaYazilari, setXanaYazilari] = useState<string[][]>(MOCK_LEVEL_DATA.xanaYazilari)

  const executionStackRef = useRef<ExecutionStep[]>([]);
  const lastCompiledCodeRef = useRef<string>("");
  const abortExecutionRef = useRef<boolean>(false);


  // Robotun fiziki və vizual obyekti
  const robotRef = useRef({
    gridX: MOCK_LEVEL_DATA.startX,
    gridY: MOCK_LEVEL_DATA.startY,
    targetX: MOCK_LEVEL_DATA.startX * GRID_SIZE + GRID_SIZE / 2,
    targetY: MOCK_LEVEL_DATA.startY * GRID_SIZE + GRID_SIZE / 2,
    currentX: MOCK_LEVEL_DATA.startX * GRID_SIZE + GRID_SIZE / 2,
    currentY: MOCK_LEVEL_DATA.startY * GRID_SIZE + GRID_SIZE / 2,
    angle: 0,
    targetAngle: 0,
    speed: 4,
    frame: 0,
    directionAngles: { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 },
    isScanning: false,
    isWriting: false,
    isLookingAhead: false,
    finishOpened: !MOCK_LEVEL_DATA.mapLayout.some(row => row.includes(4)),
    currentDataType: "int",

    popup: null as { text: string; type: 'write' | 'read'; expiresAt: number } | null,

    reset() {
      this.gridX = MOCK_LEVEL_DATA.startX;
      this.gridY = MOCK_LEVEL_DATA.startY;
      this.targetX = MOCK_LEVEL_DATA.startX * GRID_SIZE + GRID_SIZE / 2;
      this.targetY = MOCK_LEVEL_DATA.startY * GRID_SIZE + GRID_SIZE / 2;
      this.currentX = this.targetX;
      this.currentY = this.targetY;
      this.angle = this.directionAngles[MOCK_LEVEL_DATA.startDirection];
      this.targetAngle = this.directionAngles[MOCK_LEVEL_DATA.startDirection];
      this.isScanning = false;
      this.isWriting = false;
      this.isLookingAhead = false;
      this.finishOpened = !MOCK_LEVEL_DATA.mapLayout.some(row => row.includes(4));
      this.currentDataType = "int",
        setDynamicMap(JSON.parse(JSON.stringify(MOCK_LEVEL_DATA.mapLayout)));
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

  

  // CANVAS RENDER (Bütün yeni obyektlərin vizual qatı)
  useEffect(() => {
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

      const r = robotRef.current;

      // Grid və Obyektlərin Çəkilməsi
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 10; x++) {
          const tile = dynamicMap[y][x];

          // Zəmin rəngləri
          ctx.fillStyle = tile === 1 ? "#cbd5e1" : "#ffffff";
          drawRoundedRect(ctx, x * GRID_SIZE + 2, y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4, 8);
          ctx.strokeStyle = "#f1f5f9"; ctx.lineWidth = 1; ctx.strokeRect(x * GRID_SIZE + 2, y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);

          // 1. SABİT DİVAR
          if (tile === 1) {
            ctx.fillStyle = "#94a3b8";
            drawRoundedRect(ctx, x * GRID_SIZE + 6, y * GRID_SIZE + 6, GRID_SIZE - 12, GRID_SIZE - 12, 6);
          }
          // 2. İTƏLƏNƏ BİLƏN QUTU (Sokoban stili)
          if (tile === 2) {
            const padding = 6; // Qutunun xana daxilindəki boşluğu
            const rectX = Math.round(x * GRID_SIZE + padding);
            const rectY = Math.round(y * GRID_SIZE + padding);
            const rectW = Math.round(GRID_SIZE - (padding * 2));
            const rectH = Math.round(GRID_SIZE - (padding * 2));

            ctx.save();

            // --- 1. QUTUNUN ƏSAS GÖVDƏSİ (Taxta rəngi) ---
            ctx.fillStyle = "#b45309"; // İsti taxta qəhvəyi (Amber 700)
            ctx.strokeStyle = "#78350f"; // Tünd qəhvəyi çərçivə (Amber 900)
            ctx.lineWidth = 2;
            ctx.lineJoin = "miter";

            // Qutunun əsas kvadratını çəkirik
            drawRoundedRect(ctx, rectX, rectY, rectW, rectH, 4);
            ctx.fill();
            ctx.stroke();

            // --- 2. DAXİLİ ÇƏRÇİVƏ (Taxta lövhə effekti üçün) ---
            const innerPad = 4;
            ctx.strokeStyle = "#92400e"; // Bir ton tünd qəhvəyi
            ctx.lineWidth = 1.5;
            ctx.strokeRect(
              rectX + innerPad,
              rectY + innerPad,
              rectW - (innerPad * 2),
              rectH - (innerPad * 2)
            );

            // --- 3. KLASSİK "X" TAHTA BƏRKİDİCİSİ (Çarpaz xətlər) ---
            ctx.strokeStyle = "#78350f"; // Tünd kölgə rəngi
            ctx.lineWidth = 3;
            ctx.lineCap = "round";

            ctx.beginPath();
            // Sol yuxarıdan sağ aşağıya çarpaz
            ctx.moveTo(rectX + innerPad + 2, rectY + innerPad + 2);
            ctx.lineTo(rectX + rectW - innerPad - 2, rectY + rectH - innerPad - 2);

            // Sağ yuxarıdan sol aşağıya çarpaz
            ctx.moveTo(rectX + rectW - innerPad - 2, rectY + innerPad + 2);
            ctx.lineTo(rectX + innerPad + 2, rectY + rectH - innerPad - 2);
            ctx.stroke();

            // --- 4. TAHTA LÖVHƏ CİZGİLƏRİ (Tekstura xırdalıqları) ---
            ctx.strokeStyle = "#d97706"; // Parlaq taxta damarı rəngi
            ctx.lineWidth = 1;
            ctx.beginPath();
            // Qutunun kənarlarına bir neçə kiçik taxta cizgisi atırıq ki, canlı görünsün
            ctx.moveTo(rectX + innerPad + 1, rectY + rectH / 2);
            ctx.lineTo(rectX + innerPad + 6, rectY + rectH / 2);
            ctx.moveTo(rectX + rectW - innerPad - 6, rectY + rectH / 3);
            ctx.lineTo(rectX + rectW - innerPad - 1, rectY + rectH / 3);
            ctx.stroke();

            ctx.restore();
          }
          // 3. PORTALLAR
          if (tile === 3) {
            // 1. Portalın mərkəz nöqtəsini hesablayaq
            const centerX = x * GRID_SIZE + GRID_SIZE / 2;
            const centerY = y * GRID_SIZE + GRID_SIZE / 2;

            // Dinamik zaman parametri (əgər kənardan ötürülmürsə, birbaşa Date.now ilə canlandıraq)
            const time = Date.now() * 0.003;
            const pulse = Math.sin(time * 2) * 3; // -3 və +3 piksel arası pulsasiya effekti
            const baseRadius = GRID_SIZE / 2 - 6;

            ctx.save(); // Mövcud canvas vəziyyətini yaddaşda saxlayaq

            // --- ARXAFON PARILTISI (Glow effect) ---
            ctx.shadowBlur = 15;
            ctx.shadowColor = "rgba(56, 189, 248, 0.8)"; // Neon Göy parıltı
            ctx.fillStyle = "rgba(56, 189, 248, 0.1)";
            ctx.beginPath();
            ctx.arc(centerX, centerY, baseRadius + pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // Digər obyektlərə təsir etməməsi üçün sıfırlayırıq

            // --- XARİCİ DÖNƏN HALQA (Kəsikli xətlərlə) ---
            ctx.translate(centerX, centerY);
            ctx.rotate(time); // Zaman keçdikcə sağa doğru dönür

            ctx.strokeStyle = "rgba(14, 165, 233, 0.8)";
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 6]); // Kəsik-kəsik xətt effekti (çox qəşəng vizual verir)
            ctx.beginPath();
            ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
            ctx.stroke();

            // --- DAXİLİ ƏKS-DÖNƏN HALQA (Girdab effekti üçün) ---
            ctx.rotate(-time * 2); // Əks istiqamətə və daha sürətlə dönür
            ctx.strokeStyle = "rgba(192, 132, 252, 0.9)"; // Bənövşəyi neon tərəfə keçid
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, baseRadius - 6 - (pulse * 0.5), 0, Math.PI * 2);
            ctx.stroke();

            // --- MƏRKƏZ NÜVƏ (Portalın mərkəzi) ---
            ctx.setLineDash([]); // Xətləri düzəldirik
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.beginPath();
            ctx.arc(0, 0, 4 + (pulse * 0.3), 0, Math.PI * 2);
            ctx.fill();

            ctx.restore(); // Canvas koordinat sistemini əvvəlki halına qaytaraq
          }
          // 4. TERMINAL XANASI
          if (tile === 4) {
            const padding = 4; // Xanaya tam oturması üçün təmiz boşluq
            const rectX = Math.round(x * GRID_SIZE + padding);
            const rectY = Math.round(y * GRID_SIZE + padding);
            const rectW = Math.round(GRID_SIZE - (padding * 2));
            const rectH = Math.round(GRID_SIZE - (padding * 2));

            const time = Date.now() * 0.001; // Saniyə cinsindən zaman
            const isActivated = robotRef.current?.finishOpened || false;

            ctx.save();

            // --- 1. TERMİNAL GÖVDƏSİ VƏ KƏNARI ---
            ctx.shadowBlur = isActivated ? 12 : 4;
            ctx.shadowColor = isActivated ? "#22c55e" : "rgba(15, 23, 42, 0.4)";
            ctx.fillStyle = isActivated ? "#052e16" : "#0f172a";
            drawRoundedRect(ctx, rectX, rectY, rectW, rectH, 8);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.strokeStyle = isActivated ? "#22c55e" : "#334155";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // --- 2. MINI WINDOW DOTS (Mac style) ---
            const dotRadius = 1.5;
            const dotY = rectY + 5;
            ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(rectX + 6, dotY, dotRadius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#eab308"; ctx.beginPath(); ctx.arc(rectX + 11, dotY, dotRadius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(rectX + 16, dotY, dotRadius, 0, Math.PI * 2); ctx.fill();

            // --- 3. SİNTRAKSİS STRUKTURU ---
            const mockCodeStructure = [
              { indent: 0, width: 14, color: "#c084fc" }, // #include
              { indent: 0, width: 18, color: "#38bdf8" }, // int main()
              { indent: 4, width: 10, color: "#f472b6" }, //   Robot r;
              { indent: 4, width: 15, color: "#fb923c" }, //   r.ireli();
              { indent: 4, width: 22, color: "#38bdf8" }, //   int x = r.read();
              { indent: 8, width: 12, color: "#4ade80" }, //     cout << x;
              { indent: 4, width: 10, color: "#f472b6" }, //   return 0;
              { indent: 0, width: 4, color: "#38bdf8" }  // }
            ];

            const lineHeight = 4;
            const lineSpacing = 3;
            const startWritingY = rectY + 12;
            const maxVisibleHeight = rectH - 16;

            // --- 🔄 SONSUZ DÖVRÜN (LOOP) AYARLANMASI ---
            const lineGenerationSpeed = 3.0; // Saniyədə yazılan sətir sayı (Sürəti buradan tənzimləyə bilərsən)
            const totalDuration = (mockCodeStructure.length + 2) / lineGenerationSpeed; // Ümumi dövr müddəti (baxıb gözləmə daxil)
            const loopTime = time % totalDuration; // Modulo (%) ilə zamanı sonsuz dövrə salırıq

            const currentProgress = loopTime * lineGenerationSpeed;
            // Əgər sətirlər bitibsə, yeni dövrə qədər sonuncu sətirdə gözləyir
            const totalLinesToDraw = Math.min(mockCodeStructure.length, Math.floor(currentProgress) + 1);

            // --- 4. SCROLL VE SÜRÜŞMƏ HESABLANMASI ---
            const totalRenderedHeight = totalLinesToDraw * (lineHeight + lineSpacing);
            let scrollOffset = 0;
            if (totalRenderedHeight > maxVisibleHeight) {
              scrollOffset = totalRenderedHeight - maxVisibleHeight;
            }

            // Clipping Mask (Kənara daşan xətləri gizlədirik)
            ctx.save();
            ctx.beginPath();
            ctx.rect(rectX + 2, startWritingY, rectW - 4, maxVisibleHeight);
            ctx.clip();

            // --- 5. XƏTLƏRİN ÇƏKİLMƏSİ ---
            ctx.lineCap = "round";

            for (let i = 0; i < totalLinesToDraw; i++) {
              const lineData = mockCodeStructure[i];
              const currentY = startWritingY + (i * (lineHeight + lineSpacing)) - scrollOffset;

              // Soldan sağa doğru uzanma (typing) animasiyası
              let currentWidth = lineData.width;
              if (i === Math.floor(currentProgress) && i < mockCodeStructure.length) {
                const linePercent = currentProgress % 1;
                currentWidth = lineData.width * linePercent;
              }

              const startX = rectX + 5 + lineData.indent;

              ctx.strokeStyle = isActivated ? "#4ade80" : lineData.color;
              ctx.lineWidth = lineHeight;

              ctx.beginPath();
              ctx.moveTo(startX, currentY);
              ctx.lineTo(startX + currentWidth, currentY);
              ctx.stroke();

              // 💡 Aktiv sətir ucunda yanıb-sönən kursor
              if (i === totalLinesToDraw - 1 && i < mockCodeStructure.length) {
                const flash = Math.floor(Date.now() / 180) % 2 === 0;
                if (flash) {
                  ctx.strokeStyle = isActivated ? "#22c55e" : "#e2e8f0";
                  ctx.lineWidth = lineHeight;
                  ctx.beginPath();
                  ctx.moveTo(startX + currentWidth + 2, currentY - 1);
                  ctx.lineTo(startX + currentWidth + 2, currentY + 1);
                  ctx.stroke();
                }
              }
            }

            ctx.restore(); // Clipping mask-ı ləğv edirik
            ctx.restore();
          }
          // 5. FINISH
          if (tile === 5) {
            // Səliqəli və kiçik görünməsi üçün padding-i 4-dən 8-ə qaldırırıq
            const padding = 12;
            const rectX = Math.round(x * GRID_SIZE + padding);
            const rectY = Math.round(y * GRID_SIZE + padding);
            const rectW = Math.round(GRID_SIZE - (padding * 2));
            const rectH = Math.round(GRID_SIZE - (padding * 2));

            const time = Date.now() * 0.003;
            const neonPulse = (Math.sin(time * 4) + 1) / 2;

            const isUnlocked = r.finishOpened;

            ctx.save();

            // --- 1. ARXAFON VƏ PARILTI ---
            ctx.shadowBlur = isUnlocked ? 10 : 4; // Parıltını da bir az kiçiltdik
            // ctx.shadowColor = isUnlocked ? "rgba(34, 197, 94, 0.7)" : "rgba(239, 68, 68, 0.4)";
            ctx.fillStyle = isUnlocked ? "rgba(34, 197, 94, 0.1)" : "rgba(15, 23, 42, 0.9)";

            drawRoundedRect(ctx, rectX, rectY, rectW, rectH, 6); // Radius 8-dən 6-ya düşdü
            ctx.fill();
            ctx.shadowBlur = 0;

            // --- 2. KİÇİLDİLMİŞ ŞAHMAT TORU ---
            const rows = 4;
            const cols = 4;
            const cellW = rectW / cols;
            const cellH = rectH / rows;

            for (let rw = 0; rw < rows; rw++) {
              for (let c = 0; c < cols; c++) {
                const isDark = (rw + c) % 2 === 0;

                if (isDark) {
                  ctx.fillStyle = "#1e293b"; // Sabit tünd dama
                } else {
                  ctx.fillStyle = isUnlocked ? "#ffffff" : "#475569"; // Kilidlidirsə sönük boz
                }

                const cx = rectX + c * cellW;
                const cy = rectY + rw * cellH;

                ctx.fillRect(Math.floor(cx), Math.floor(cy), Math.ceil(cellW), Math.ceil(cellH));
              }
            }

            // // İncə kənar xətti
            // ctx.strokeStyle = isUnlocked ? "#22c55e" : "#ef4444";
            // ctx.lineWidth = 1.5; // Xətt qalınlığı 2-dən 1.5-ə düşdü
            // ctx.beginPath();
            // drawRoundedRect(ctx, rectX, rectY, rectW, rectH, 6);
            // ctx.stroke();

            // --- 3. KİÇİK MƏRKƏZİ QIFIL VƏ YA ULDUZ ---
            const centerX = rectX + rectW / 2;
            const centerY = rectY + rectH / 2;

            if (!isUnlocked) {
              // Ölçüləri kiçildilmiş Vektorial Qıfıl
              ctx.lineWidth = 1.5;
              ctx.strokeStyle = "#f59e0b";
              ctx.lineCap = "round";

              // Daha kiçik yuxarı qövs
              ctx.beginPath();
              ctx.arc(centerX, centerY - 1.5, 3, Math.PI, 0); // Radius 4-dən 3-ə düşdü
              ctx.stroke();

              // Daha kiçik qıfıl gövdəsi
              ctx.fillStyle = "#f59e0b";
              ctx.beginPath();
              drawRoundedRect(ctx, centerX - 4, centerY - 1.5, 8, 7, 1.5); // Ölçülər bütövlüklə kiçildi
              ctx.fill();

              // Mikro açar nöqtəsi
              ctx.fillStyle = "#1e293b";
              ctx.beginPath();
              ctx.arc(centerX, centerY + 1.5, 1, 0, Math.PI * 2);
              ctx.fill();
            } else {
              // Daha incə və kiçik Finiş Ulduzu
              ctx.fillStyle = "#eab308";
              ctx.font = "bold 11px sans-serif"; // Şrift 14-dən 11-ə düşdü
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText("⭐", centerX, centerY);
            }

            ctx.restore();
          }

          // 3. Qayda: Gizli Yazıların Görünməsi (Yalnız üstündə qutu yoxdursa)
          if (xanaYazilari[y][x] && tile !== 2) {
            const value = xanaYazilari[y][x];

            // Ədədin tam mərkəz koordinatları
            const centerX = x * GRID_SIZE + GRID_SIZE / 2;
            const centerY = y * GRID_SIZE + GRID_SIZE / 2;

            ctx.save();

            // --- 2. TƏMİZ VƏ ORTALANMIŞ ƏDƏD ---
            ctx.font = "bold 12px sans-serif"; // Monospace əvəzinə daha şirin sans-serif
            ctx.fillStyle = "#6366f1"; // Parlaq İndigo rəngi
            ctx.textAlign = "center";   // Üfüqi olaraq mərkəzlə
            ctx.textBaseline = "middle"; // Şaquli olaraq mərkəzlə

            // Sadəcə ədədin özünü çəkirik, "txt:" prefiksini sildik!
            ctx.fillText(value.toString(), centerX, centerY);

            ctx.restore();
          }

          const writeTask = MOCK_LEVEL_DATA.hasWriteTask
            ? MOCK_LEVEL_DATA.requiredWrites.find(w => w.x === x && w.y === y)
            : null;

          if (writeTask) {
            const cellX = Math.round(x * GRID_SIZE);
            const cellY = Math.round(y * GRID_SIZE);

            const currentStudentValue = xanaYazilari[y]?.[x];
            const isFilled = currentStudentValue !== undefined && currentStudentValue !== "";
            const isCorrect = isFilled && currentStudentValue === writeTask.expected;

            ctx.save();

            // --- 1. SEHRLİ VƏ PARLAQ FON RƏNGLƏRİ (Light & Pastel Magic) ---
            if (!isFilled) {
              // 💤 SÖNÜK GÖZLƏMƏ VƏZİYYƏTİ: Şirin, sehirli və yumşaq pastel bənövşəyi fon
              ctx.fillStyle = "#faf5ff"; // Çox açıq, təmiz lavanda/bənövşəyi fon
              drawRoundedRect(ctx, x * GRID_SIZE + 6, y * GRID_SIZE + 6, GRID_SIZE - 12, GRID_SIZE - 12, 6);
            } else {
              ctx.fillStyle = isCorrect ? "#e6f4ea" : "#fce8e6";
              drawRoundedRect(ctx, x * GRID_SIZE + 6, y * GRID_SIZE + 6, GRID_SIZE - 12, GRID_SIZE - 12, 6);
            }

            // --- 2. YAZILARIN PARLAQ VƏ OXUNAN RENDERINGİ ---
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            if (!isFilled) {
              // 💬 PLACEHOLDER YAZI: Diqqət çəkən amma gözü yormayan bənövşəyi/boz yazı
              ctx.font = "bold 11px monospace";
              ctx.fillStyle = "#a855f7"; // Canlı bənövşəyi placeholder

              // Şagird bilsin ki, bura nə yazılmalıdır (Məsələn: ? və ya gözlənilən hədəf)
              ctx.fillText(writeTask.expected, cellX + GRID_SIZE / 2, cellY + GRID_SIZE / 2);

            } else {
              // 🔥 REAL YAZI: Kontrastı yüksək, uşaqların dərhal oxuya biləcəyi tünd proqramçı şrifti
              ctx.font = "bold 14px monospace";
              ctx.fillStyle = isCorrect ? "#137333" : "#c5221f"; // Yaşıl və ya Qırmızı tünd mətn

              // Yazını bir az daha qabartmaq üçün xəfıf ağ kölgə (şirin görünsün deyə)
              ctx.shadowBlur = 4;
              ctx.shadowColor = "#ffffff";

              ctx.fillText(currentStudentValue, cellX + GRID_SIZE / 2, cellY + GRID_SIZE / 2);
            }

            ctx.restore();
          }


        }
      }

      // Robotun renderi (Süleyman tərzi şirin robot)

      r.update();

      ctx.save();
      ctx.translate(r.currentX, r.currentY);
      ctx.rotate(r.angle + Math.PI / 2);

      // --- 🌟 ANİMASİYA PARAMETRLƏRİ ---
      const time = Date.now() * 0.003;

      // 1. Robotun hərəkət edib-etmədiyini koordinat dəyişməsindən anlayaq
      // Əgər hərəkət sürəti varsa, təkərlər sürətlə hərəkət edəcək
      const isMoving = Math.abs(r.targetX - r.currentX) > 0.5 || Math.abs(r.targetY - r.currentY) > 0.5;
      const movementWave = isMoving ? Math.sin(time * 15) * 4 : 0; // Hərəkət edəndə təkər yellənməsi

      // 2. Dayananda belə canlı qalması üçün yüngül nəfəs alma effekti
      const breathe = Math.sin(time * 4) * 0.5; // Gövdə üçün kiçik miqyas rəqsi
      const eyePulse = (Math.sin(time * 6) + 1) / 2; // Gözün neon parıltısı

      // --- 3. TƏKƏRLƏR (Hərəkət dalğasına görə irəli-geri sürüşür) ---
      ctx.fillStyle = "#1e293b";
      // Sol təkər
      drawRoundedRect(ctx, -20, -15 + movementWave, 8, 30, 4);
      // Sağ təkər (əks faza ilə hərəkət edir ki, əsl addımlama effekti versin)
      drawRoundedRect(ctx, 12, -15 - movementWave, 8, 30, 4);

      // --- 4. ƏSAS GÖVDƏ (Nəfəs alma effektinə görə yüngülcə ölçüsü dəyişir) ---
      ctx.save();
      ctx.scale(1 + breathe * 0.03, 1 + breathe * 0.03); // Robot nəfəs alır

      const grad = ctx.createLinearGradient(-15, -15, 15, 15);
      grad.addColorStop(0, "#ff7675");
      grad.addColorStop(1, "#e63946");
      ctx.fillStyle = grad;
      drawRoundedRect(ctx, -15, -15, 30, 30, 8);

      // --- 5. ROBOTUN BAŞI / EKRANI ---
      ctx.fillStyle = "#2d3436";
      drawRoundedRect(ctx, -9, -10, 18, 6, 2);

      // --- 6. PARILDAYAN NEON GÖZ (Kiber lazer effekti) ---
      ctx.shadowBlur = isMoving ? 10 : 5;
      ctx.shadowColor = "#00cec9";
      ctx.fillStyle = `rgba(0, 206, 201, ${0.7 + eyePulse * 0.3})`; // Gözün işığı yanıb-sönür
      drawRoundedRect(ctx, -4, -8, 8, 2, 1);

      ctx.restore(); // Gövdə miqyasını (scale) sıfırlayırıq


      // --- 7. DETAL: ARXADAN ÇIXAN ENERJİ TÜSTÜSÜ (İstəyə bağlı) ---
      if (isMoving) {
        ctx.fillStyle = `rgba(255, 118, 117, ${0.4 - (Math.sin(time * 20) + 1) * 0.1})`;
        ctx.beginPath();
        // Robotun arxasından çıxan kiçik enerji alovu/tüstüsü
        ctx.arc(0, 18 + Math.random() * 2, 3 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }


      if (r.isScanning || r.isLookingAhead) {
        ctx.save();

        // Robotun gözündən önə doğru açılan üçbucaqlı skan şüası (Laser Cone)
        const scanGrad = ctx.createLinearGradient(0, -8, 0, -50);
        scanGrad.addColorStop(0, "rgba(0, 206, 201, 0.5)"); // Parlaq firuzəyi
        scanGrad.addColorStop(1, "rgba(0, 206, 201, 0.0)"); // Şəffaflaşan uc

        ctx.fillStyle = scanGrad;
        ctx.beginPath();
        ctx.moveTo(-4, -8);   // Gözün sol tərəfi
        ctx.lineTo(4, -8);    // Gözün sağ tərəfi
        ctx.lineTo(25, -45);  // Skan sahəsinin sağ ön ucu
        ctx.lineTo(-25, -45); // Skan sahəsinin sol ön ucu
        ctx.closePath();
        ctx.fill();

        // İrəli-geri qaçan dinamik lazer xətti (Skaner xətti)
        const scanLineY = -15 - ((Math.sin(time * 10) + 1) * 12); // -15 ilə -39 piksel arası hərəkət edir
        const lineWidthAtY = 8 + (Math.abs(scanLineY) * 0.8); // Şüa genişləndikcə xətt də genəlir

        ctx.strokeStyle = "rgba(0, 206, 201, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#00cec9";

        ctx.beginPath();
        ctx.moveTo(-lineWidthAtY / 2, scanLineY);
        ctx.lineTo(lineWidthAtY / 2, scanLineY);
        ctx.stroke();

        ctx.restore();
      }
      if (r.isScanning) {
        ctx.save();

        // Skan xəttinin irəliləmə faizi
        const scanProgress = (Date.now() * 0.002) % 1;
        const halfGrid = GRID_SIZE / 2;

        // 🎯 KRİTİK HİSSƏ: 1 dama önün koordinat mərkəzini təyin edirik
        // Robot daxilində olduğumuz üçün yuxarı tərəf robotun ÖNÜDÜR.
        const targetX = 0;
        const targetY = -GRID_SIZE; // Tam 1 dama irəli (Y oxu mənfi istiqamət)

        // Ön xananın hüdudları
        const startX = targetX - halfGrid + 4;
        const endX = targetX + halfGrid - 4;
        const startY = targetY - halfGrid + 4;
        const endY = targetY + halfGrid - 4;

        // Skan xəttinin irəliləmə mövqeyi
        const laserX = startX + (scanProgress * (GRID_SIZE - 8));

        // --- TİPLƏRƏ GÖRƏ LAZER RƏNGİ (Uşaqlar üçün vizual ipucu) ---
        let laserColor = "rgba(0, 206, 201, 0.95)"; // Varsayılan firuzəyi (look_ahead üçün)
        let glowColor = "#00cec9";

        if (r.isScanning) {
          if (r.currentDataType === "int") {
            laserColor = "rgba(234, 179, 8, 0.95)"; // Sarı (İnt)
            glowColor = "#eab308";
          } else if (r.currentDataType === "string") {
            laserColor = "rgba(236, 72, 153, 0.95)"; // Çəhrayı (String)
            glowColor = "#ec4899";
          } else if (r.currentDataType === "double") {
            laserColor = "rgba(168, 85, 247, 0.95)"; // Bənövşəyi (Double)
            glowColor = "#a855f7";
          }
        }

        // --- A. SKAN İZİ (Trail) ---
        const trailGrad = ctx.createLinearGradient(laserX - 20, 0, laserX, 0);
        trailGrad.addColorStop(0, "transparent");
        trailGrad.addColorStop(1, laserColor.replace("0.95", "0.15"));
        ctx.fillStyle = trailGrad;
        ctx.fillRect(startX, startY, laserX - startX, GRID_SIZE - 8);

        // --- B. LAZER XƏTTİ ---
        ctx.strokeStyle = laserColor;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = glowColor;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(laserX, startY);
        ctx.lineTo(laserX, endY);
        ctx.stroke();

        // --- C. UCLARINDAKI İŞIQLAR ---
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(laserX, startY, 1.5, 0, Math.PI * 2);
        ctx.arc(laserX, endY, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
      // =================================================================
      // 🌟 9. TERMİNALA YAZMA EFFEKTİ (robot.terminalaYaz() icra olunanda)
      // =================================================================
      // Qeyd: r.isWriting state-ini terminala yazanda true etmək lazımdır
      if (r.isWriting) {
        ctx.save();

        // Robotun ətrafında kiber data dalğaları (Genişlənən rəqəmsal halqalar)
        const writePulse = (time * 2) % 1; // 0 ilə 1 arası durmadan sıfırlanan dövr

        ctx.strokeStyle = `rgba(168, 85, 247, ${1 - writePulse})`; // Bənövşəyi WiFi/Data dalğası
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#a855f7";

        // 1-ci genişlənən dalğa
        ctx.beginPath();
        ctx.arc(0, 0, 15 + writePulse * 30, 0, Math.PI * 2);
        ctx.stroke();

        // 2-ci daha kiçik dalğa (ardıcıllıq yaratmaq üçün)
        const writePulse2 = (writePulse + 0.5) % 1;
        ctx.strokeStyle = `rgba(168, 85, 247, ${1 - writePulse2})`;
        ctx.beginPath();
        ctx.arc(0, 0, 15 + writePulse2 * 30, 0, Math.PI * 2);
        ctx.stroke();

        // Matrix kod hissəcikləri (Robotun başından yuxarı uçan kiçik "0" və "1"lər)
        ctx.fillStyle = "#e9d5ff";
        ctx.font = "bold 9px monospace";
        ctx.shadowBlur = 0;

        // Təsadüfi görünən rəqəmsal siqnallar
        const bitY = -20 - (writePulse * 20);
        ctx.fillText("1", -12, bitY);
        ctx.fillText("0", 12, bitY - 5);
        ctx.fillText("0", -5, bitY - 12);

        ctx.restore();
      }

      ctx.restore();

      const currentPopup = robotRef.current?.popup;

      if (currentPopup && Date.now() < currentPopup.expiresAt) {
        const now = Date.now();
        const age = now - currentPopup.createdAt;
        const timeLeft = currentPopup.expiresAt - now;

        const robX = robotRef.current.gridX * GRID_SIZE + GRID_SIZE / 2;
        const robY = robotRef.current.gridY * GRID_SIZE;

        ctx.save();

        // 🧸 1. ULTRA-QALIN VƏ BÖYÜK OYUN ŞRİFTİ (Daha dolğun və qabarıq)
        ctx.font = "900 14px 'Fredoka One', 'Nunito', 'Arial Black', sans-serif";

        const textContent = currentPopup.text;

        const fullText = `${textContent}`;

        const textWidth = ctx.measureText(fullText).width;

        // 📐 2. KVADRATA YAXIN ÖLÇÜLƏR VƏ MAKSİMUM PADDİNG
        // Geniş padding-lər verərək mətni mərkəzdə saxlayan bir kvadrat kapsul yaradırıq
        const paddingX = 26; // Sağ və soldan böyük boşluq
        const paddingY = 10; // Üst və aşağıdan böyük boşluq (Kvadrata yaxınlaşdırır)

        const bubbleW = textWidth + paddingX;
        const bubbleH = 5 + paddingY; // Şrift hündürlüyü ilə mütənasib

        // Ölçülərin bir-birinə yaxın olmasını təmin edirik (Toppuş kvadrat fəlsəfəsi)
        const finalW = Math.max(bubbleW, 50);
        const finalH = Math.max(bubbleH, 50);

        const bubbleX = robX - finalW / 2;
        const bubbleY = robY - finalH - 1; // Başın üstündə bir az daha yuxarıda uçur

        // 📈 3. SQUISHY REZİN ANIMASİYASI
        let scaleX = 1;
        let scaleY = 1;
        if (age < 150) {
          const progress = age / 150;
          scaleX = progress * 1.05;
          scaleY = progress * 1.2;
        } else if (age < 250) {
          const progress = (age - 150) / 100;
          scaleX = 1.05 - (progress * 0.05);
          scaleY = 1.2 - (progress * 0.2);
        } else if (timeLeft < 150) {
          const progress = timeLeft / 150;
          scaleX = progress;
          scaleY = progress;
        }

        // 🎈 4. YUMŞAQ HAVA DALĞALANMASI
        const floatOffset = Math.sin(now * 0.004) * 3.5;

        ctx.translate(robX, bubbleY + finalH / 2 + floatOffset);
        ctx.scale(scaleX, scaleY);
        ctx.translate(-robX, -(bubbleY + finalH / 2 + floatOffset));

        const currentY = bubbleY + floatOffset;


        const strokeGradient = ctx.createLinearGradient(bubbleX, currentY, bubbleX + finalW, currentY + finalH);
        if (currentPopup.type === 'write') {
          // Şəkildəki rəngin daha canlı, konfet kimi parlaq firuzəyi-yaşıl versiyası
          strokeGradient.addColorStop(0, "#06b6d4"); // Canlı Neon Firuzəyi (Cyan)
          strokeGradient.addColorStop(0.5, "#10b981"); // Keçid Zümrüd Yaşılı
          strokeGradient.addColorStop(1, "#4ade80"); // Parlaq Nanə Yaşılı
        } else {
          // Sehrli oxuma əməliyyatı üçün fantastik bənövşəyi-çəhrayı qradiyent
          strokeGradient.addColorStop(0, "#d946ef"); // Parlaq Maqenta (Fuchsia)
          strokeGradient.addColorStop(1, "#8b5cf6"); // Dərin Sehrbaz Bənövşəyisi
        }

        // ☁️ 6. DOYĞUN 2D KART KÖLGƏSİ (Sticker effektini gücləndirir)
        ctx.shadowColor = "rgba(15, 23, 42, 0.12)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 5;

        // 🛠️ 7. KVADRATİK TOPPUŞ GÖVDƏ VƏ QUYRUQ PATH-I
        const r = 12; // Künclərin ovallığı azaldıldı (Kvadratik forma üçün 12px ideal balansdır)

        ctx.beginPath();
        // Sol-üst kənar
        ctx.moveTo(bubbleX + r, currentY);
        // Sağ-üst kənar
        ctx.lineTo(bubbleX + finalW - r, currentY);
        ctx.arcTo(bubbleX + finalW, currentY, bubbleX + finalW, currentY + r, r);
        // Sağ-aşağı kənar
        ctx.lineTo(bubbleX + finalW, currentY + finalH - r);
        ctx.arcTo(bubbleX + finalW, currentY + finalH, bubbleX + finalW - r, currentY + finalH, r);

        // 💥 Şəkillə tam eyni olan o sol tərəfə qıvrılan sehirli incə quyruq
        ctx.lineTo(robX + 7, currentY + finalH);
        ctx.bezierCurveTo(robX + 3, currentY + finalH + 5, robX - 1, currentY + finalH + 9, robX - 5, currentY + finalH + 11);
        ctx.bezierCurveTo(robX - 1, currentY + finalH + 6, robX - 2, currentY + finalH, robX - 7, currentY + finalH);

        // Sol-aşağı kənar və bağlama
        ctx.lineTo(bubbleX + r, currentY + finalH);
        ctx.arcTo(bubbleX, currentY + finalH, bubbleX, currentY + finalH - r, r);
        ctx.lineTo(bubbleX, currentY + r);
        ctx.arcTo(bubbleX, currentY, bubbleX + r, currentY, r);
        ctx.closePath();

        // 🧼 APPAQ PARLAK FON
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.shadowColor = "transparent"; // Kölgəni mətndən əvvəl tamamilə sıfırlayırıq

        // ⚡ ULTRA-QALIN CİZGİ (Çox maraqlı və qabarıq kontur)
        ctx.strokeStyle = strokeGradient;
        ctx.lineWidth = 3.5; // Cizgi qalınlığı 3.5px-ə qaldırıldı (Tam sticker dizaynı)
        ctx.stroke();

        // 📝 8. TEXT RENDERING
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Maksimum oxunma və kontrast üçün zərif tünd proqramçı rəngləri
        ctx.fillStyle = currentPopup.type === 'write' ? "#0f766e" : "#5b21b6";

        ctx.fillText(fullText, robX, currentY + finalH / 2);

        ctx.restore();
      } else if (currentPopup && Date.now() >= currentPopup.expiresAt) {
        robotRef.current.popup = null;
      }

      animationId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationId);
  }, [dynamicMap, xanaYazilari, ]);

  // ANİMASİYA VE HƏRƏKƏT SİNYALLARININ İCRA OLUNMASI
  const startRobotMovement = async (steps: ExecutionStep[]) => {
    setIsRunning(true);
    setSuccessSteps([]);
    abortExecutionRef.current = false;
    const r = robotRef.current;
    if (!r) return;

    // Local xəritə kopyası (Animasiya zamanı qutuların yerini vizual sürüşdürmək üçün)
    let currentMapState = JSON.parse(JSON.stringify(dynamicMap));

    for (let i = 0; i < steps.length; i++) {
      if (abortExecutionRef.current) break;
      const stepData = steps[i];
      setActiveStepIndex(i);

      if (stepData.cmd === 'move') {
        // Robotun baxdığı istiqamətə görə önündəki xananın koordinatları
        let nx = r.gridX + Math.round(Math.cos(r.targetAngle));
        let ny = r.gridY + Math.round(Math.sin(r.targetAngle));

        // Sərhəd yoxlaması (Xəritədən kənara çıxma xətalarının qarşısını alır)
        if (ny >= 0 && ny < currentMapState.length && nx >= 0 && nx < currentMapState[0].length) {

          // 📦 Əgər qarşıda İTƏLƏNƏ BİLƏN QUTU (2) varsa
          if (currentMapState[ny][nx] === 2) {
            // Qutudan sonrakı növbəti xana
            let bnx = nx + Math.round(Math.cos(r.targetAngle));
            let bny = ny + Math.round(Math.sin(r.targetAngle));

            // Qutunun itələnəcəyi xana xəritə daxilindədirmi?
            if (bny >= 0 && bny < currentMapState.length && bnx >= 0 && bnx < currentMapState[0].length) {
              const targetTile = currentMapState[bny][bnx];

              // Qutu yalnız boş xanaya (0) və ya yazı olan xanaya itələnə bilər (Divara (1) ilişməməlidir)
              if (targetTile === 0) {
                currentMapState[bny][bnx] = 2; // Qutu yeni yerə keçir
                currentMapState[ny][nx] = 0;   // Köhnə yeri boşalır
                setDynamicMap([...currentMapState]); // Canvas interfeysini yeniləyirik
              }
            }
          }

          // Robotun daxili hərəkət hədəflərini yeniləyirik
          r.gridX = nx;
          r.gridY = ny;
          r.targetX = nx * GRID_SIZE + GRID_SIZE / 2;
          r.targetY = ny * GRID_SIZE + GRID_SIZE / 2;
        }

      } else if (stepData.cmd === 'left') {
        r.targetAngle -= Math.PI / 2;
      } else if (stepData.cmd === 'right') {
        r.targetAngle += Math.PI / 2;
      }

      else if (stepData.cmd === 'portal_jump') {
        const levelPortals = MOCK_LEVEL_DATA.portals || [];
        if (levelPortals.length > 0) {
          const portal = levelPortals[0];
          if (r.gridX === portal.x1 && r.gridY === portal.y1) {
            r.gridX = portal.x2; r.gridY = portal.y2;
          } else if (r.gridX === portal.x2 && r.gridY === portal.y2) {
            r.gridX = portal.x1; r.gridY = portal.y1;
          }
          r.targetX = r.gridX * GRID_SIZE + GRID_SIZE / 2;
          r.targetY = r.gridY * GRID_SIZE + GRID_SIZE / 2;
          r.currentX = r.targetX; r.currentY = r.targetY; // Sıçrayış anidir (sub-pixel interpolasiyası olmasın)
        }
      }

      else if (stepData.cmd === 'look_ahead') {
        r.isLookingAhead = true;
        await new Promise(res => setTimeout(res, 400));
        r.isLookingAhead = false;
      }

      else if (['read_int', 'read_string', 'read_double'].includes(stepData.cmd)) {
        r.isScanning = true;
        r.currentDataType = stepData.cmd.replace('read_', '');
        await new Promise(res => setTimeout(res, 900));
        r.isScanning = false;
      }

      // ✨ Düzeldi: 'write' olan köhnə kod 'terminal_write' ilə sinxronlaşdırıldı
      else if (stepData.cmd === 'terminal_write') {
        r.isWriting = true;
        r.finishOpened = true; // Kompilyatordan bu əmr gəlibsə, finiş qapısının kilidini açırıq!
        await new Promise(res => setTimeout(res, 900));
        r.isWriting = false;
      }

      else if (stepData.cmd === 'tile_write') {
        r.isWriting = true; // Robotun üstündəki kiber şüalar aktivləşir

        const targetX = r.gridX;
        const targetY = r.gridY;
        const writeValue = stepData.value || "";

        r.popup = {
          text: `✍️ Yazdım: "${writeValue}"`,
          type: 'write',
          expiresAt: Date.now() + 1200 // 1.2 saniyə ekranda qalacaq
        };

        // 📝 Mövcud yazı state-ini kopyalayırıq və robotun durduğu koordinata yazını daxil edirik
        setXanaYazilari(prev => {
          const nextWrites = { ...prev };
          if (!nextWrites[targetY]) nextWrites[targetY] = {};
          nextWrites[targetY][targetX] = writeValue;
          return nextWrites;
        });

        // Animasiyanın tamamlanması üçün gözləmə müddəti
        await new Promise(res => setTimeout(res, 800));
        r.isWriting = false;
      }

      // Robot hədəf nöqtəsinə çatana qədər dövrü bloklayırıq (Axıcı animasiya üçün)
      while (r.isBusy()) {
        if (abortExecutionRef.current) break;
        await new Promise(res => setTimeout(res, 20));
      }

      // Addımlar arası qısa vizual fasilə
      await new Promise(res => setTimeout(res, 300));
      setSuccessSteps(prev => [...prev, i]);
    }

    // 🏁 MƏRHƏLƏNİN BİTMƏSİNİN YOXLANILMASI
    if (!abortExecutionRef.current) {
      const targetTileType = MOCK_LEVEL_DATA.mapLayout[r.gridY]?.[r.gridX];

      if (targetTileType === 5) { // Robot FINISH xanasındadır

        // 🎯 Yazı tapşırığının doğruluğunu yoxlayırıq
        let taskSuccess = true;

        if (MOCK_LEVEL_DATA.hasWriteTask) {
          // Hər bir hədəf xananı şagirdin yazdıqları ilə müqayisə edirik
          for (const task of MOCK_LEVEL_DATA.requiredWrites) {
            const studentValue = xanaYazilari[task.y]?.[task.x];
            if (studentValue !== task.expected) {
              taskSuccess = false;
              break;
            }
          }
        }

        if (taskSuccess) {
          setTerminalLogs(prev => [...prev, { type: 'success', text: `🏆 [MİSSİYA UĞURLU!] Bütün xanalar düzgün proqramlaşdırıldı! (+${MOCK_LEVEL_DATA.points} Xal)` }]);
          if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          setShowSuccessModal(true);
        } else {
          setTerminalLogs(prev => [...prev, { type: 'error', text: '❌ Finişə çatdınız, lakin bəzi xanalara yazılan məlumatlar tapşırığın şərtini ödəmir! Kodunuzu yoxlayın.' }]);
        }

      } else {
        setTerminalLogs(prev => [...prev, { type: 'error', text: '🏁 Əmrlər icra olundu, lakin robot hələ də Finiş (⭐) xanasına çatmayıb.' }]);
      }
    }
    setActiveStepIndex(null);
    setIsRunning(false);
  };

  // KOMPİLYASİYA FUNKSİYASI (Dinamik C++ Kitabxanası bura qoşulur)
  const handleCompileAndRun = async () => {
    setIsTerminalExpanded(true); // Terminal panelini vizual olaraq açırıq
    setIsRunning(true);
    abortExecutionRef.current = false;
    setTerminalLogs([{ type: 'system', text: '⚡ Sehrli Meşə mühərriki başladılır...' }]);

    // 1. Portalları dinamik olaraq MOCK_LEVEL_DATA-dan çəkirik (Hardcode silindi!)
    const p1 = MOCK_LEVEL_DATA.portals && MOCK_LEVEL_DATA.portals[0];
    const engineHeader = generateEngineHeader({
      mapLayout: MOCK_LEVEL_DATA.mapLayout,
      xanaYazilari: xanaYazilari,
      xanaTipleri: MOCK_LEVEL_DATA.xanaTipleri, // Yeni tip qatını da C++ mühərrikinə ötürürük
      portal1_x: p1 ? p1.x1 : -1,
      portal1_y: p1 ? p1.y1 : -1,
      portal2_x: p1 ? p1.x2 : -1,
      portal2_y: p1 ? p1.y2 : -1,
      startX: MOCK_LEVEL_DATA.startX,
      startY: MOCK_LEVEL_DATA.startY,
      levelPoint: MOCK_LEVEL_DATA.levelPoint,
      xalSistemi: MOCK_LEVEL_DATA.xalSistemi,
      requiredWrites: MOCK_LEVEL_DATA.requiredWrites,
      hasWriteTask: MOCK_LEVEL_DATA.hasWriteTask
    });

    try {
      // 2. Şagirdin təkrarlaya biləcəyi kitabxanaları təhlükəsiz təmizləyirik
      const filteredUserCode = code
        .replace(/#include\s*<iostream>/g, "")
        .replace(/#include\s*<string>/g, "")
        .replace(/#include\s*<vector>/g, "")
        .replace(/using\s+namespace\s+std\s*;/g, "");

      const fullCodeToCompile = engineHeader + filteredUserCode;
      const result = await compileCppCode(fullCodeToCompile);

      if (abortExecutionRef.current) return;

      if (result.compiler_error || result.program_error) {
        setTerminalLogs([
          { type: 'error', text: '❌ Sintaksis / Kompilyasiya Xətası:' },
          { type: 'error', text: result.compiler_error || result.program_error || '' }
        ]);
        setIsRunning(false);
        return;
      }

      let stdout = result.program_output ? result.program_output.trim() : "";
      const rawLines = stdout.split("\n").map(s => s.trim());
      const parsedSteps: ExecutionStep[] = [];

      // 3. C++ mühərrikindən gələn çıxışların (stdout) parse edilməsi
      rawLines.forEach(line => {
        if (line.startsWith("XETA:")) {
          setTerminalLogs(prev => [...prev, { type: 'error', text: `💥 ${line}` }]);
        } else if (line.startsWith("TERMINAL LOG:")) {
          // Şagirdin terminala yazdırdığı nəticəni loqlaşdırırıq
          setTerminalLogs(prev => [...prev, { type: 'system', text: `🖥️ [Terminal]: ${line.replace("TERMINAL LOG:", "")}` }]);
        } else if (line.startsWith("KONSOL:")) {
          const isSuccess = line.includes("Təbriklər");
          setTerminalLogs(prev => [...prev, { type: isSuccess ? 'success' : 'warning', text: `📢 ${line.replace("KONSOL:", "")}` }]);
        } else if (line === "ireli") {
          parsedSteps.push({ cmd: 'move', raw: 'robot.ireli()' });
        } else if (line === "sola") {
          parsedSteps.push({ cmd: 'left', raw: 'robot.sola()' });
        } else if (line === "saga") {
          parsedSteps.push({ cmd: 'right', raw: 'robot.saga()' });
        } else if (line === "ANIMATION: qutu_itele") {
          parsedSteps.push({ cmd: 'push_box', raw: '📦 Qutu itələnir' });
        } else if (line === "ANIMATION: portal_jump") {
          parsedSteps.push({ cmd: 'portal_jump', raw: '⚡ Portal keçidi!' });
        } else if (line === "ANIMATION: terminala_yaz") {
          // Interfeyslə tam sinxron hala gətirildi ('terminal_write')
          parsedSteps.push({ cmd: 'terminal_write', raw: '💾 Terminala məlumat yazılır...' });
        } else if (line === "ANIMATION: onde_ne_var") {
          parsedSteps.push({ cmd: 'look_ahead', raw: 'robot.ondeNeVar()' });
        } else if (line === "ANIMATION: yazi_oxu_int") {
          parsedSteps.push({ cmd: 'read_int', raw: 'robot.yaziOxuInt()' });
        } else if (line === "ANIMATION: yazi_oxu_string") {
          parsedSteps.push({ cmd: 'read_string', raw: 'robot.yaziOxuString()' });
        } else if (line === "ANIMATION: yazi_oxu_double") {
          parsedSteps.push({ cmd: 'read_double', raw: 'robot.yaziOxuDouble()' });
        } else if (line.startsWith("ANIMATION: yazi_yaz|")) {
          const valueToLength = line.replace("ANIMATION: yazi_yaz|", "");
          parsedSteps.push({
            cmd: 'tile_write',
            value: valueToLength, // Şagirdin yazdığı dəyər (məsələn: "1" və ya "Salam")
            raw: `robot.yaziYaz(${valueToLength})`
          });
        }
      });

      if (parsedSteps.length === 0) {
        setIsRunning(false);
        return;
      }

      setTerminalLogs(prev => [...prev, { type: 'success', text: '🚀 Simulyasiya icra olunur...' }]);

      // 4. Robotun vəziyyətini sıfırlayıb animasiyanı başladırıq
      if (robotRef.current) {
        robotRef.current.reset(); // İcra əvvəli koordinat və bayraqları sıfırlayırıq
      }

      startRobotMovement(parsedSteps); // Frontend animasiya dövrünü (loop) tetikleyirik

    } catch (error) {
      setTerminalLogs([{ type: 'error', text: '🌐 Serverlə əlaqə kəsildi və ya kompilyasiya xətası.' }]);
      setIsRunning(false);
    }
  };

  const handleStopExecution = () => {
    abortExecutionRef.current = true;
    setIsRunning(false);
    setActiveStepIndex(null);
  };

  const handleReset = () => {
    handleStopExecution();
    robotRef.current.reset();
    setSuccessSteps([]);
    setIsTerminalExpanded(false);
    setTerminalLogs([{ type: 'system', text: '// Xəritə sıfırlandı. Yeni həll kodunu yaza bilərsiniz.' }]);
    setXanaYazilari(MOCK_LEVEL_DATA.xanaYazilari)
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-b from-sky-100 via-emerald-50 to-green-50 flex flex-col p-6 font-sans antialiased select-none overflow-hidden">

      {/* BAŞLIQ PANELİ */}
      <div className="flex justify-between items-center bg-white p-4 rounded-[24px] border-4 border-white shadow-[0_4px_0_#e2e8f0] mb-4 shrink-0">
        <div>
          <h1 className="font-black text-emerald-950 tracking-tight text-lg md:text-xl leading-tight">{MOCK_LEVEL_DATA.title}</h1>
          <div className="mt-1 text-xs md:text-sm text-emerald-800" dangerouslySetInnerHTML={{ __html: MOCK_LEVEL_DATA.instructionText }} />
        </div>
        <div className="bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs uppercase shrink-0">YENİ MÜHƏRRİK (MOCK)</div>
      </div>

      {/* İŞ SAHƏSİ */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 items-stretch overflow-hidden pb-2">

        {/* CANVAS: OYUN SAHƏSİ */}
        <div className="flex-[1.4] bg-white p-4 rounded-[28px] border-4 border-white shadow-[0_6px_0_#e2e8f0] flex items-center justify-center overflow-auto">
          <canvas ref={canvasRef} width={600} height={300} className="bg-emerald-50/30 rounded-xl block border-2 border-dashed border-emerald-200" />
        </div>

        {/* REDAKTOR VƏ TERMİNAL PANELİ */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden relative">
          <div className="flex-1 relative rounded-2xl overflow-hidden min-h-[200px]">
            <div className="absolute inset-0 bg-white rounded-[24px] border-4 border-white shadow-[0_6px_0_#e2e8f0] flex flex-col overflow-hidden">
              <div className="bg-[#f8fafc] px-4 py-2 border-b-2 border-slate-100 flex justify-between items-center">
                <span className="text-xs font-mono font-black text-slate-500">solution.cpp</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-2.5 py-0.5 rounded-full uppercase">C++ 17</span>
              </div>
              <div className="flex-1 overflow-auto bg-white task-editor">
                <ReactCodeMirror
                  value={code}
                  height="100%"
                  theme="light"
                  extensions={[cpp()]}
                  onChange={(value) => setCode(value)}
                  editable={!isRunning && !isTerminalExpanded}
                />
              </div>
            </div>

            {/* SÜRÜŞƏN TERMİNAL */}
            <div className={`absolute left-0 right-0 bottom-0 bg-[#1e293b] rounded-[20px] border-4 border-[#334155] flex flex-col transition-all duration-500 shadow-2xl ${isTerminalExpanded ? 'top-0 h-full z-10' : 'h-[110px]'}`}>
              <div className="flex justify-between items-center px-4 py-2 bg-[#0f172a] rounded-t-[14px] border-b border-slate-700 shrink-0">
                <div className="text-[10px] text-slate-400 font-mono font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`}></span>
                  Konsol Çıxışı / Alqoritm Addımları
                </div>
                <button onClick={() => setIsTerminalExpanded(!isTerminalExpanded)} className="text-slate-400 hover:text-white text-[11px] font-bold">
                  {isTerminalExpanded ? "↩ Koda Qayıt" : "Genişlət ⛶"}
                </button>
              </div>
              <div ref={terminalRef} className="flex-1 font-mono text-xs text-slate-200 overflow-y-auto p-3 flex flex-col gap-1.5">
                {terminalLogs.map((log, idx) => (
                  <div key={idx} className={log.type === 'system' ? 'text-amber-400 font-bold' : log.type === 'error' ? 'text-rose-400' : 'text-emerald-400 font-black'}>{log.text}</div>
                ))}
                {executionStackRef.current.map((item, index) => {
                  const isActive = activeStepIndex === index;
                  const isSuccess = successSteps.includes(index);
                  return (
                    <div key={index} className={`px-2 py-1 rounded-lg font-bold transition-all ${isActive ? 'bg-amber-400 text-slate-950 translate-x-1' : isSuccess ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-500'}`}>
                      {isActive ? '👉 ' : '# '}{item.raw}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* İDARƏETMƏ DÜYMƏLƏRİ */}
          <div className="p-3 bg-white rounded-[20px] border-4 border-white shadow-[0_4px_0_#e2e8f0] flex gap-3 shrink-0">
            {isRunning ? (
              <button onClick={handleStopExecution} className="flex-[2.5] bg-rose-500 hover:bg-rose-400 text-white font-black text-xs py-3 px-4 rounded-xl shadow-[0_4px_0_#9f1239] active:translate-y-[4px] active:shadow-none uppercase tracking-wider transition-all">
                Dayandır <Square size={12} className="inline ml-1" fill="currentColor" />
              </button>
            ) : (
              <button onClick={handleCompileAndRun} className="flex-[2.5] bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs py-3 px-4 rounded-xl shadow-[0_4px_0_#065f46] active:translate-y-[4px] active:shadow-none uppercase tracking-wider transition-all">
                Kodu Çalışdır <Play size={12} className="inline ml-1" fill="currentColor" />
              </button>
            )}
            <button onClick={handleReset} className="flex-[1] bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs py-3 px-3 rounded-xl shadow-[0_4px_0_#cbd5e1] active:translate-y-[4px] active:shadow-none uppercase tracking-wider transition-all">
              Sıfırla <RotateCcw size={12} className="inline ml-1" />
            </button>
          </div>

        </div>
      </div>

      {/* UĞUR MODALI */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-[32px] border-8 border-emerald-400 shadow-2xl text-center max-w-sm w-full">
            <div className="text-6xl mb-3 animate-bounce">🎉</div>
            <h2 className="text-2xl font-black text-emerald-950 mb-1">Mükəmməl Alqoritm!</h2>
            <p className="text-slate-600 text-sm font-bold mb-4">Robot qutuları itələdi, portaldan keçdi və missiyanı tamamladı!</p>
            <button onClick={() => setShowSuccessModal(false)} className="w-full bg-emerald-500 text-white font-black py-3 rounded-xl shadow-[0_4px_0_#065f46] active:translate-y-[4px] active:shadow-none uppercase text-xs">
              Davam Et 🐾
            </button>
          </div>
        </div>
      )}
    </div>
  );
}