'use client';

import React, { useEffect, useRef, useState } from 'react';
import { compileCppCode } from '@/utils/wandboxService';
import { Play, Square, RotateCcw, HomeIcon } from 'lucide-react';
import confetti from 'canvas-confetti';
import ReactCodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { generateEngineHeader } from '@/src/utils/gameEngineUtils';
import { useParams } from 'next/navigation';
import { transformLevelWithRandomVariant } from '@/src/utils/transformLevelWithRandomVariant';
import { cloneDeep } from 'lodash';
import validateCodeRules from '@/src/utils/validateCodeRules';
import { animalsData } from '@/src/lib/constants';
import { useUser } from '@/src/context/UserContext';
import { useTransition } from '@/src/context/TransitionContext';

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

interface VariantValue {
  name: string;  // Məsələn: "$a", "$b", "$cavab"
  value: string; // Məsələn: "10", "cüt", "150"
}

interface ScenarioData {
  values: VariantValue[];
}

interface OriginalLevelData {
  title: string;
  instructionText: string;
  points: number;            // Səviyyənin ümumi (maksimum) balı
  startX: number;
  startY: number;
  startDirection: 'right' | 'left' | 'up' | 'down';
  mapLayout: number[][];
  xanaYazilari: string[][];  // Hüceyrədəki yazılar (İçində "$a", "$b" şablonları ola bilər)
  xanaTipleri: string[][];   // "int", "string", "double" və ya ""
  portals?: PortalData[];    // Səviyyədə portal yoxdursa undefined ola bilər
  xalSistemi?: CavabXal[];   // Dinamik xal matrisi (Terminal varsa aktivləşir)
  levelPoint: number;
  hasWriteTask: boolean;
  requiredWrites: any[];
  variants?: ScenarioData[];
  isUnlocked: boolean;
  previousBestCode: string;
  help: string;
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
  order: number;
  help: number;
}

const GRID_SIZE = 60;
const ROBOT_INPUT_NUMBER = "0";

// 3. DEFAULT C++ CODE: Uşağın redaktorda ilk görəcəyi təmiz, yeni overload olunmuş kod şablonu
const DEFAULT_CPP_CODE = `#include <iostream>
using namespace std;

int main() {
    
   
    
    return 0;
}`;

export default function RealCompilerArena() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const { navigateTo, endTransition } = useTransition();

  const { userData } = useUser();

  const params = useParams();
  const id = params.id;

  const [originalData, setOriginalData] = useState<OriginalLevelData | null>();

  const [data, setData] = useState<LevelData | null>();

  // Cari xəritə və yazı vəziyyətini dinamik saxlamaq üçün statelər
  const [dynamicMap, setDynamicMap] = useState<number[][]>();
  const [code, setCode] = useState(DEFAULT_CPP_CODE);
  const [isRunning, setIsRunning] = useState(false);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<{ type: 'system' | 'error' | 'step' | 'success'; text: string }[]>([
    { type: 'system', text: '// 🌲 Meşə Mühərriki 2.0 Aktivdir. C++ simulyasiyası gözlənilir...' }
  ]);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [successSteps, setSuccessSteps] = useState<number[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [isPopupOpen, setIsPopupOpen] = useState(true); // Səhifə açılanda avtomatik açıq olur
  const [leftWidth, setLeftWidth] = useState(55); // Faizlə oyun sahəsinin eni
  const [isResizing, setIsResizing] = useState(false);

  const [nextLevel, setNextLevel] = useState();

  const [isHelpExpanded, setIsHelpExpanded] = useState(false);

  // Meşə Heyvanı Məntiqi (order-ə görə dinamik seçilir)
  const assignedAnimal = animalsData[(data?.order || 0) % animalsData.length];

  const [xanaYazilari, setXanaYazilari] = useState<string[][]>()

  const executionStackRef = useRef<ExecutionStep[]>([]);
  const lastCompiledCodeRef = useRef<string>("");
  const abortExecutionRef = useRef<boolean>(false);

  const ironBoxesRef = useRef<{ [key: string]: { currentX: number, currentY: number, targetX: number, targetY: number } }>({});


  useEffect(() => {

    console.log("bura 1 effekt")

    if (!id || !userData) return;
    const fetchLevelData = async () => {
      try {
        // API endpoint-inizi bura yazın (məsələn: '/api/level' və ya xarici URL)
        const response = await fetch(`/api/topics/${id}?userId=${userData?._id}`);
        const { data }: { data: OriginalLevelData } = await response.json();

        // if (data?.isUnlocked === false) {
        //   navigateTo("/student/gamearena");
        //   return;
        // }

        setOriginalData(data);

        setCode(data?.previousBestCode || DEFAULT_CPP_CODE)

        const changedData = transformLevelWithRandomVariant(cloneDeep(data))

        // Data uğurla gəldikdə əlaqədar stateləri yeniləyirik
        setData(changedData);
        setDynamicMap(changedData.mapLayout);
        setXanaYazilari(changedData.xanaYazilari);
        setTerminalLogs([
          { type: 'system', text: `// 🌲 ${changedData.title} Aktivdir. C++ simulyasiyası gözlənilir...` }
        ]);

        // Robotun ilkin vəziyyətini dinamik gələn dataya görə nizamlayırıq
        robotRef.current.gridX = changedData.startX;
        robotRef.current.gridY = changedData.startY;
        robotRef.current.targetX = changedData.startX * GRID_SIZE + GRID_SIZE / 2;
        robotRef.current.targetY = changedData.startY * GRID_SIZE + GRID_SIZE / 2;
        robotRef.current.currentX = robotRef.current.targetX;
        robotRef.current.currentY = robotRef.current.targetY;
        robotRef.current.angle = robotRef.current.directionAngles[changedData.startDirection];
        robotRef.current.targetAngle = robotRef.current.directionAngles[changedData.startDirection];
        robotRef.current.finishOpened = !changedData.mapLayout.some(row => row.includes(4));

        if (changedData) {

          const cols = changedData?.mapLayout[0]?.length || 10;
          const rows = changedData?.mapLayout?.length || 5;
          const boxes: typeof ironBoxesRef.current = {};
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              const tile = changedData.mapLayout[y][x];
              if (tile >= 21 && tile <= 29 && tile % 2 !== 0) {
                boxes[tile] = {
                  currentX: x * GRID_SIZE,
                  currentY: y * GRID_SIZE,
                  targetX: x * GRID_SIZE,
                  targetY: y * GRID_SIZE
                };
              }
            }
          }
          ironBoxesRef.current = boxes;
        }


      } catch (error) {
        console.error("Data yüklənərkən xəta baş verdi:", error);
      } finally {
        endTransition();
      }
    };

    fetchLevelData();
  }, [id, userData]);


  // Robotun fiziki və vizual obyekti
  const robotRef = useRef({
    gridX: 0,
    gridY: 0,
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
    angle: 0,
    targetAngle: 0,
    speed: 4,
    frame: 0,
    directionAngles: { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 },
    isScanning: false,
    isWriting: false,
    isLookingAhead: false,
    finishOpened: true,
    currentDataType: "int",
    popup: null as { text: string; type: 'write' | 'read'; expiresAt: number } | null,

    // reset() {
    //   if (!data || !originalData) return;

    //   const changedData = transformLevelWithRandomVariant(cloneDeep(originalData))

    //   setData(changedData)

    //   this.gridX = changedData.startX;
    //   this.gridY = changedData.startY;
    //   this.targetX = changedData.startX * GRID_SIZE + GRID_SIZE / 2;
    //   this.targetY = changedData.startY * GRID_SIZE + GRID_SIZE / 2;
    //   this.currentX = this.targetX;
    //   this.currentY = this.targetY;
    //   this.angle = this.directionAngles[changedData.startDirection];
    //   this.targetAngle = this.directionAngles[changedData.startDirection];
    //   this.isScanning = false;
    //   this.isWriting = false;
    //   this.isLookingAhead = false;
    //   this.finishOpened = !changedData.mapLayout.some(row => row.includes(4));
    //   this.currentDataType = "int";
    //   setDynamicMap(cloneDeep(changedData.mapLayout));
    //   setXanaYazilari(cloneDeep(changedData.xanaYazilari));



    //   if (changedData) {

    //     const cols = changedData?.mapLayout[0]?.length || 10;
    //     const rows = changedData?.mapLayout?.length || 5;
    //     const boxes: typeof ironBoxesRef.current = {};
    //     for (let y = 0; y < rows; y++) {
    //       for (let x = 0; x < cols; x++) {
    //         const tile = changedData.mapLayout[y][x];
    //         if (tile >= 21 && tile <= 29 && tile % 2 !== 0) {
    //           boxes[tile] = {
    //             currentX: x * GRID_SIZE,
    //             currentY: y * GRID_SIZE,
    //             targetX: x * GRID_SIZE,
    //             targetY: y * GRID_SIZE
    //           };
    //         }
    //       }
    //     }
    //     ironBoxesRef.current = boxes;
    //   }

    //   console.log("reset")
    // },

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

  const cols = data?.mapLayout[0]?.length || 10;
  const rows = data?.mapLayout?.length || 5;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth > 30 && newWidth < 75) setLeftWidth(newWidth); // Limit qoyuruq
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);


  // CANVAS RENDER (Bütün yeni obyektlərin vizual qatı)
  useEffect(() => {
    if (!data || !dynamicMap || !xanaYazilari) return;
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
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
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
          if (tile > 9 && tile < 20) {
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

          if (tile >= 20 && tile <= 29 && tile % 2 === 0) {
            const padding = 8; // Düymə yerdə basıla bilən plitə kimi bir az kiçik görünsün
            const rectX = Math.round(x * GRID_SIZE + padding);
            const rectY = Math.round(y * GRID_SIZE + padding);
            const rectW = Math.round(GRID_SIZE - (padding * 2));
            const rectH = Math.round(GRID_SIZE - (padding * 2));

            ctx.save();

            // Düymənin əsası (Canlı Zümrüd/Firuzəyi - Aktiv hərəkət mexanizmini bildirir)
            ctx.fillStyle = "#10b981"; // Emerald 500
            ctx.strokeStyle = "#047857"; // Emerald 700
            ctx.lineWidth = 2;

            drawRoundedRect(ctx, rectX, rectY, rectW, rectH, 6);
            ctx.fill();
            ctx.stroke();

            // Daxili dairə (Uşaqların hədəf alması üçün düymə mərkəzi)
            ctx.fillStyle = "#059669";
            ctx.beginPath();
            ctx.arc(rectX + rectW / 2, rectY + rectH / 2, rectW / 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }

          if (tile >= 21 && tile <= 29 && tile % 2 !== 0) {
            const boxState = ironBoxesRef.current[tile];
            if (boxState) {
              // Qutunun anlıq koordinatlarını hədəfə doğru rəvan sürüşdürürük
              boxState.currentX += (boxState.targetX - boxState.currentX) * 0.15;
              boxState.currentY += (boxState.targetY - boxState.currentY) * 0.15;
            }
          }

          // 3. Qayda: Gizli Yazıların Görünməsi (Yalnız üstündə qutu yoxdursa)

          const isBoxOnTop = tile === 2 || (tile >= 20 && tile <= 29 && tile % 2 == 0);

          if (xanaYazilari[y][x] && !isBoxOnTop) {
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

          const writeTask = data.hasWriteTask
            ? data.requiredWrites.find(w => w.x === x && w.y === y)
            : null;

          if (writeTask) {
            const cellX = Math.round(x * GRID_SIZE);
            const cellY = Math.round(y * GRID_SIZE);

            const currentStudentValue = xanaYazilari[y]?.[x];
            const isFilled = currentStudentValue !== undefined && currentStudentValue !== "";
            const isCorrect = isFilled && currentStudentValue === writeTask.expected;

            ctx.save();

            // --- 1. DİNAMİK OPACITY (Yox olub qayıtma animasiyası üçün) ---
            // Zaman asılılığı ilə 0.2 və 0.85 arasında yumşaq dalğalanma yaradır
            const time = Date.now() * 0.001;
            const pulseOpacity = 0.1 + Math.abs(Math.sin(time)) * 0.35;

            // --- 2. FONUN RENDERINGİ ---
            if (!isFilled) {
              // 💤 GÖZLƏMƏ VƏZİYYƏTİ: Şirin, sehirli pastel narıncı fon
              ctx.fillStyle = "#fff";
              drawRoundedRect(ctx, x * GRID_SIZE + 6, y * GRID_SIZE + 6, GRID_SIZE - 12, GRID_SIZE - 12, 6);
            } else {
              ctx.fillStyle = isCorrect ? "#e6f4ea" : "#fce8e6";
              drawRoundedRect(ctx, x * GRID_SIZE + 6, y * GRID_SIZE + 6, GRID_SIZE - 12, GRID_SIZE - 12, 6);
            }

            // --- 3. HƏFİF DASHED ROUNDED BORDER ƏLAVƏSİ ---
            if (!isFilled) {
              ctx.strokeStyle = "#ea580c"; // Parlaq narıncı xətlər
              ctx.lineWidth = 1;
              ctx.setLineDash([4, 4]);     // Kəsik-kəsik effekt [çizgi, boşluq]

              // Xəttin də yumşaq şəkildə parıldaması üçün qlobal alpha-nı tənzimləyirik
              // ctx.globalAlpha = pulseOpacity;

              // Kənarlardan 7px içəridə şirin dashed border çəkirik
              ctx.beginPath();
              // Əgər drawRoundedRect funksiyanız birbaşa fill/stroke etmirsə, sadəcə path yaradırsa istifadə edin:
              drawRoundedRect(ctx, x * GRID_SIZE + 7, y * GRID_SIZE + 7, GRID_SIZE - 14, GRID_SIZE - 14, 6);
              ctx.stroke();

              ctx.setLineDash([]); // Digər elementlərə təsir etməməsi üçün sıfırlayırıq
              ctx.globalAlpha = 1.0; // Alpha-nı bərpa edirik
            }

            // --- 4. YAZILARIN RENDERINGİ ---
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            if (!isFilled) {
              // 💬 PLACEHOLDER YAZI: Həfif görünən və yox olub qayıdan yazı
              ctx.font = "bold 13px monospace";
              ctx.fillStyle = "#ea580c";

              // Yazıya animasiyalı şəffaflığı tətbiq edirik
              ctx.globalAlpha = pulseOpacity;
              ctx.fillText(writeTask.expected, cellX + GRID_SIZE / 2, cellY + GRID_SIZE / 2);
              ctx.globalAlpha = 1.0;

            } else {
              // 🔥 REAL YAZI: Kontrastı yüksək, düzgünlük rənginə uyğun
              ctx.font = "bold 14px monospace";
              ctx.fillStyle = isCorrect ? "#137333" : "#c5221f";

              ctx.shadowBlur = 4;
              ctx.shadowColor = "#ffffff";

              ctx.fillText(currentStudentValue, cellX + GRID_SIZE / 2, cellY + GRID_SIZE / 2);
            }

            ctx.restore();
          }

        }
      }

      Object.keys(ironBoxesRef.current).forEach(tileStr => {
        const tile = parseInt(tileStr, 10);

        // Əgər bu qutu hazırda dynamicMap-də varsa, onu ən üstdə render et
        // (Bununla qutunun harada olmasından asılı olmayaraq heç bir xananın altında qala bilməz)
        const boxState = ironBoxesRef.current[tile];

        if (boxState) {
          const padding = 6;
          const rectX = Math.round(boxState.currentX + padding);
          const rectY = Math.round(boxState.currentY + padding);
          const rectW = Math.round(GRID_SIZE - (padding * 2));
          const rectH = Math.round(GRID_SIZE - (padding * 2));

          ctx.save();
          // --- Sənin yazdığın qutu dizayn kodu ---
          const metalGrad = ctx.createLinearGradient(rectX, rectY, rectX + rectW, rectY + rectH);
          metalGrad.addColorStop(0, "#64748b");
          metalGrad.addColorStop(1, "#334155");
          ctx.fillStyle = metalGrad;
          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = 2.5;
          drawRoundedRect(ctx, rectX, rectY, rectW, rectH, 5);
          ctx.fill();
          ctx.stroke();

          // Metal pərçimlər
          ctx.fillStyle = "#cbd5e1";
          const boltOffset = 5;
          ctx.beginPath();
          ctx.arc(rectX + boltOffset, rectY + boltOffset, 1.5, 0, Math.PI * 2);
          ctx.arc(rectX + rectW - boltOffset, rectY + boltOffset, 1.5, 0, Math.PI * 2);
          ctx.arc(rectX + boltOffset, rectY + rectH - boltOffset, 1.5, 0, Math.PI * 2);
          ctx.arc(rectX + rectW - boltOffset, rectY + rectH - boltOffset, 1.5, 0, Math.PI * 2);
          ctx.fill();



          ctx.restore();
        }
      });

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
  }, [dynamicMap, xanaYazilari, data]);

  console.log(xanaYazilari)

  const handleReset = (stop: boolean = true) => {
    if (!originalData) return;
    if (stop) handleStopExecution();

    console.log("bura reset")

    const changedData = transformLevelWithRandomVariant(cloneDeep(originalData))

    // Data uğurla gəldikdə əlaqədar stateləri yeniləyirik
    setData(changedData);
    setDynamicMap(changedData.mapLayout);
    setXanaYazilari(changedData.xanaYazilari);
    setTerminalLogs([
      { type: 'system', text: `// 🌲 ${changedData.title} Aktivdir. C++ simulyasiyası gözlənilir...` }
    ]);

    // Robotun ilkin vəziyyətini dinamik gələn dataya görə nizamlayırıq
    robotRef.current.gridX = changedData.startX;
    robotRef.current.gridY = changedData.startY;
    robotRef.current.targetX = changedData.startX * GRID_SIZE + GRID_SIZE / 2;
    robotRef.current.targetY = changedData.startY * GRID_SIZE + GRID_SIZE / 2;
    robotRef.current.currentX = robotRef.current.targetX;
    robotRef.current.currentY = robotRef.current.targetY;
    robotRef.current.angle = robotRef.current.directionAngles[changedData.startDirection];
    robotRef.current.targetAngle = robotRef.current.directionAngles[changedData.startDirection];
    robotRef.current.finishOpened = !changedData.mapLayout.some(row => row.includes(4));

    if (changedData) {
      const boxes: typeof ironBoxesRef.current = {};
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const tile = changedData.mapLayout[y][x];
          if (tile >= 21 && tile <= 29 && tile % 2 !== 0) {
            boxes[tile] = {
              currentX: x * GRID_SIZE,
              currentY: y * GRID_SIZE,
              targetX: x * GRID_SIZE,
              targetY: y * GRID_SIZE
            };
          }
        }
      }
      ironBoxesRef.current = boxes;
    }

    setSuccessSteps([]);
    setIsTerminalExpanded(false);
    setTerminalLogs([{ type: 'system', text: '// Xəritə sıfırlandı. Yeni həll kodunu yaza bilərsiniz.' }]);

    return changedData;
  };

  const handleLevelSuccess = async () => {
    // 1. Konfetti falan partlatdığın yer

    // 2. API-a progressi göndəririk
    try {
      const response = await fetch('/api/topics/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData?._id,          // Şagirdin ID-si
          levelId: data?._id,             // Cari mərhələnin ID-si
          earnedPoints: data?.levelPoint, // Qazandığı maksimal bal
          bestCode: code                  // Redaktorda yazdığı C++ kodu
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setNextLevel(resData?.data?.nextLevelId || "")
      }
    } catch (err) {
      console.error("Progress yadda saxlanarkən xəta yarandı:", err);
    }
  };

  // ANİMASİYA VE HƏRƏKƏT SİNYALLARININ İCRA OLUNMASI
  const startRobotMovement = async (steps: ExecutionStep[], changedData: LevelData) => {
    if (!data || !dynamicMap || !xanaYazilari) return;
    setIsRunning(true);
    setSuccessSteps([]);
    abortExecutionRef.current = false;
    const r = robotRef.current;
    if (!r) return;

    // Local xəritə kopyası (Animasiya zamanı qutuların yerini vizual sürüşdürmək üçün)
    let currentMapState = cloneDeep(changedData.mapLayout);

    let currentXanaYazilari = cloneDeep(changedData.xanaYazilari);

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

          const nextTile = currentMapState[ny][nx];
          const isIronBox = nextTile >= 21 && nextTile <= 29 && nextTile % 2 !== 0;

          let canMove = true; // Robotun irəli gedib-gedə bilməyəcəyini idarə edən bayraq

          // 1. 🧱 SABİT DİVAR YOXLANIŞI
          if (nextTile === 1 || isIronBox) {
            canMove = false; // Divar və ya ağır dəmir qutu varsa, irəli gedə bilməz
          }

          // 📦 Əgər qarşıda İTƏLƏNƏ BİLƏN QUTU (2) varsa
          if (nextTile === 2) {
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
              else {
                canMove = false; // Qutunun önü doludur (məsələn divardır), qutu yerindən tərpənmədi, robot da qaldı
              }
            }
            else {
              canMove = false; // Qutunun önü doludur (məsələn divardır), qutu yerindən tərpənmədi, robot da qaldı
            }
          }

          // Robotun daxili hərəkət hədəflərini yeniləyirik
          if (canMove) {
            // Əgər yol təmizdirsə və ya qutu uğurla itələnibsə, robot irəliləyir
            r.gridX = nx;
            r.gridY = ny;
            r.targetX = nx * GRID_SIZE + GRID_SIZE / 2;
            r.targetY = ny * GRID_SIZE + GRID_SIZE / 2;
          } else {
            // Əgər qarşısı bloklanıbsa, robot yerində qalır amma hədəf koordinatını öz cari yerinə set edirik ki, glitch olmasın
            r.targetX = r.gridX * GRID_SIZE + GRID_SIZE / 2;
            r.targetY = r.gridY * GRID_SIZE + GRID_SIZE / 2;
          }
        }

      } else if (stepData.cmd === 'left') {
        r.targetAngle -= Math.PI / 2;
      } else if (stepData.cmd === 'right') {
        r.targetAngle += Math.PI / 2;
      }

      else if (stepData.cmd.startsWith('portal_jump')) {
        // 🌀 Log formatı: "portal_jump|10->11"
        // stepData.cmd daxilində tam sətir və ya əlavə bir stepData.value ilə ötürdüyünüzü fərz edərək parslayırıq:

        const logParts = stepData.cmd.split('|');
        console.log("dsvdv", logParts)
        let targetPortalID = 11; // Default fallback

        if (logParts.length > 1) {
          const route = logParts[1].split('->'); // ["10", "11"]
          if (route.length > 1) {
            targetPortalID = parseInt(route[1], 10); // Bizə lazım olan hədəf portal: 11
          }
        }

        // 🗺️ Xəritə matrisində (mapLayout) bu hədəf portalın koordinatlarını axtarırıq
        let foundX = -1;
        let foundY = -1;
        const layout = data.mapLayout; // Sizin mövcud level data matrisi

        for (let y = 0; y < layout.length; y++) {
          for (let x = 0; x < layout[y].length; x++) {
            if (layout[y][x] === targetPortalID) {
              foundX = x;
              foundY = y;
              break;
            }
          }
          if (foundX !== -1) break;
        }

        // Sıçrayış koordinatları tapıldısa, robotu anında oraya teleport edirik
        if (foundX !== -1 && foundY !== -1) {
          r.gridX = foundX;
          r.gridY = foundY;

          // Canvas hədəf koordinatlarını set edirik
          r.targetX = r.gridX * GRID_SIZE + GRID_SIZE / 2;
          r.targetY = r.gridY * GRID_SIZE + GRID_SIZE / 2;

          // Animasiya interpolasiyasında sürüşmə (glitch) olmasın deyə cari koordinatları da anında bərabərləşdiririk
          r.currentX = r.targetX;
          r.currentY = r.targetY;

          // ✨ İstəsən bura şirin bir portal hissəcik (particle) effekti və ya popup mesajı da tetikleye bilərsən
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
        if (!currentXanaYazilari[targetY]) currentXanaYazilari[targetY] = [];
        currentXanaYazilari[targetY][targetX] = writeValue;

        // 🚀 2. Sonra vizual interfeys (React render) üçün dövləti yeniləyirik
        setXanaYazilari(cloneDeep(currentXanaYazilari));

        // Animasiyanın tamamlanması üçün gözləmə müddəti
        await new Promise(res => setTimeout(res, 800));
        r.isWriting = false;
      }

      else if (stepData.cmd.startsWith('iron_box_move')) {
        const parts = stepData.cmd.split('|');

        if (parts.length > 2) {
          const ironBoxID = parseInt(parts[1], 10);
          const coords = parts[2].split('->'); // ["2,3", "2,4"]

          const [fromX, fromY] = coords[0].split(',').map(Number);
          const [toX, toY] = coords[1] ? coords[1].split(',').map(Number) : parts[2].split('->')[1].split(',').map(Number);

          // 🚀 1. Ref üzərində hədəf nöqtəni təyin edirik (Canvas bunu görüb sürüşdürməyə başlayır)
          if (ironBoxesRef.current[ironBoxID]) {
            ironBoxesRef.current[ironBoxID].targetX = toX * GRID_SIZE;
            ironBoxesRef.current[ironBoxID].targetY = toY * GRID_SIZE;
          }

          // ⏳ Animasiyanın yarıya qədər gəlməsini (rəvan keçidi) gözləyirik
          await new Promise(res => setTimeout(res, 250));

          // 🗺️ 2. İndi xəritə state-ini yeniləyirik ki, loqika yerinə otursun
          if (toY >= 0 && toY < currentMapState.length && toX >= 0 && toX < currentMapState[0].length) {
            const originalTile = data.mapLayout[fromY]?.[fromX];
            const isButton = originalTile >= 20 && originalTile <= 29 && originalTile % 2 === 0;

            currentMapState[fromY][fromX] = isButton ? originalTile : 0;
            currentMapState[toY][toX] = ironBoxID;

            setDynamicMap([...currentMapState]);
          }

          // 💾 3. Qutu ilə bərabər yazını da sürüşdürürük
          setXanaYazilari(cloneDeep(currentXanaYazilari));

          // Animasiyanın tam tamamlanması üçün qalan müddəti gözləyirik
          await new Promise(res => setTimeout(res, 150));
        }
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
      const targetTileType = changedData.mapLayout[r.gridY]?.[r.gridX];

      if (targetTileType === 5) { // Robot FINISH xanasındadır

        // 🎯 Yazı tapşırığının doğruluğunu yoxlayırıq
        let taskSuccess = true;

        if (changedData.hasWriteTask) {
          // Hər bir hədəf xananı şagirdin yazdıqları ilə müqayisə edirik
          for (const task of changedData.requiredWrites) {
            const studentValue = currentXanaYazilari[task.y]?.[task.x];

            if (studentValue !== task.expected) {
              taskSuccess = false;
              break;
            }
          }
        }

        if (taskSuccess) {
          setTerminalLogs(prev => [...prev, { type: 'success', text: `🏆 [MİSSİYA UĞURLU!] Bütün xanalar düzgün proqramlaşdırıldı! (+${data.points} Xal)` }]);
          if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

          handleLevelSuccess();
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
    if (!data || !xanaYazilari) return;
    const changedData = handleReset(false)
    setIsTerminalExpanded(true); // Terminal panelini vizual olaraq açırıq
    setIsRunning(true);
    abortExecutionRef.current = false;
    setTerminalLogs([{ type: 'system', text: '⚡ Sehrli Meşə mühərriki başladılır...' }]);

    setIsHelpExpanded(false)

    if (changedData.rules) {
      // Mongoose Map tipini təmiz JS obyektinə çeviririk (əgər toJSON olunmayıbsa sığorta üçün)
      let maxUsageObj = {};
      if (changedData.rules.maxUsage) {
        maxUsageObj = typeof changedData.rules.maxUsage.get === 'function'
          ? Object.fromEntries(changedData.rules.maxUsage)
          : changedData.rules.maxUsage;
      }

      // Funksiyaya göndərəcəyimiz təmizlənmiş qayda obyekti
      const normalizedRules = {
        required: changedData.rules.required || [],
        forbidden: changedData.rules.forbidden || [],
        maxUsage: maxUsageObj
      };

      const ruleValidationError = validateCodeRules(code, normalizedRules);

      if (ruleValidationError) {
        setTerminalLogs([
          { type: 'error', text: '🛑 [MİSSİYA ŞƏRTİ POZULUB]:' },
          { type: 'error', text: ruleValidationError }
        ]);
        setIsRunning(false);
        return; // ⛔ Kodun kompilyasiyaya getməsini tamamilə dayandırırıq!
      }
    }

    const engineHeader = generateEngineHeader({
      mapLayout: changedData.mapLayout,
      xanaYazilari: changedData.xanaYazilari,
      xanaTipleri: changedData.xanaTipleri,
      startX: changedData.startX,
      startY: changedData.startY,
      levelPoint: changedData.levelPoint,
      xalSistemi: changedData.xalSistemi,
      requiredWrites: changedData.requiredWrites,
      hasWriteTask: changedData.hasWriteTask,
      startDirection: changedData.startDirection
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
        } // 🌀 Tam sətir bərabərliyi (===) əvəzinə startsWith istifadə edirik
        else if (line.startsWith("ANIMATION: portal_jump")) {
          // Sətiri parçalayırıq. line formatı: "ANIMATION: portal_jump|10->11"
          const parts = line.split('|');
          if (parts.length > 1) {
            const route = parts[1]; // "10->11"
            parsedSteps.push({
              cmd: `portal_jump|${route}`, // "portal_jump|10->11" olaraq push edilir
              raw: `⚡ Portal keçidi! (${route})`
            });
          } else {
            // Fallback: Əgər köhnə səviyyələrdən parametr gəlməzsə
            parsedSteps.push({ cmd: 'portal_jump', raw: '⚡ Portal keçidi!' });
          }
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
        } else if (line.startsWith("ANIMATION: iron_box_move|")) {
          const cmdContent = line.replace("ANIMATION: ", ""); // "iron_box_move|21|2,3->2,4"
          console.log("bura", cmdContent)
          parsedSteps.push({
            cmd: cmdContent, // Bütöv şəkildə cmd daxilinə gedir ki, startRobotMovement parslaya bilsin
            raw: `⚙️ Düymə aktivləşdi: Dəmir qutu hərəkət edir.`
          });
        }
      });

      if (parsedSteps.length === 0) {
        setIsRunning(false);
        return;
      }

      setTerminalLogs(prev => [...prev, { type: 'success', text: '🚀 Simulyasiya icra olunur...' }]);

      // 4. Robotun vəziyyətini sıfırlayıb animasiyanı başladırıq
      // if (robotRef.current) {
      //   robotRef.current.reset(); // İcra əvvəli koordinat və bayraqları sıfırlayırıq
      // }

      startRobotMovement(parsedSteps, changedData); // Frontend animasiya dövrünü (loop) tetikleyirik

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


  const handleNext = () => {
    if (nextLevel) navigateTo(`/student/gamearena/${nextLevel}`)
    else setShowSuccessModal(false)
  }


  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white font-bold text-lg animate-pulse">
        🚀 Səviyyə məlumatları yüklənir, zəhmət olmasa gözləyin...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-b from-sky-100 via-emerald-50 to-green-50 flex flex-col p-6 font-sans antialiased select-none overflow-hidden relative">

      {/* 🌟 APARAT İŞ SAHƏSİ */}
      <div className="flex-1 flex w-full items-stretch overflow-hidden relative">

        {/* 🧩 SOL PANEL: OYUN SAHƏSİ (Özəl Çərçivə və Üzərindəki Absolute Heyvan) */}
        <div
          style={{ width: `${leftWidth}%` }}
          className="flex flex-col items-stretch overflow-hidden h-full pr-3 relative pb-2"
        >
          {/* 🐾 ABSOLUTE MENTOR HEYVAN VƏ BALLOON PANELİ */}
          <div className="absolute top-[10px] left-[10px]  z-20 flex items-end gap-3 pointer-events-auto">
            {/* Sabit Heyvan Şəkli və Altındakı Başlıq */}
            <div className="flex flex-col items-center">
              <div
                onClick={() => setIsPopupOpen(true)}
                className="w-24 h-24 rounded-full bg-white border-4 border-emerald-500 p-1 shadow-lg cursor-pointer transform hover:scale-105 active:scale-95 transition-all shrink-0"
              >
                <img
                  src={`/animals/${assignedAnimal.image}`}
                  alt={data?.title}
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              {/* Şəklin altındakı Məsələ Adı */}
              <span className="text-emerald-600 text-[20px] mt-1 font-bold text-center" >
                {assignedAnimal.nameAz} <br /> {data?.title}
              </span>
            </div>

            {/* Atılıb Düşən İzah Mesajı (Danışıq Balonu) */}
            <div
              onClick={() => setIsPopupOpen(true)}
              className="bg-amber-400 border-4 border-white rounded-2xl px-3 py-1.5 text-xs font-black text-slate-900 shadow-md cursor-pointer animate-[bounce_2.5s_infinite] mb-20 relative hover:bg-amber-300 transition-colors"
            >
              <div className="absolute left-[-12px] bottom-2 w-0 h-0 border-t-[6px] border-t-transparent border-r-[10px] border-r-white border-b-[6px] border-b-transparent"></div>
              Tapşırığı gör! 🐾
            </div>
          </div>

          {/* SOL PANELİN İÇİ (CANVAS SAHƏSİ) */}
          <div className="flex-1 bg-white p-4 rounded-[32px] border-4 border-emerald-500 shadow-[0_6px_0_#065f46] flex items-center justify-center overflow-auto relative">

            {/* Geriye Qaytarmaq (Sıfırlama) İkonu - Sağ Yuxarı Küncdə */}
            <button
              onClick={() => { navigateTo("/student/gamearena") }}
              title="Mərhələni Sıfırla"
              className="absolute top-4 right-4 z-10 p-2.5 bg-slate-100 hover:bg-rose-50 border-2 border-slate-200 hover:border-rose-300 text-slate-600 hover:text-rose-500 rounded-full transition-all active:scale-90 shadow-sm"
            >
              <HomeIcon size={16} className="font-black" />
            </button>

            {data?.help && (
              <div className="absolute top-4 right-20 z-50 w-80 pointer-events-none min-h-[40px]">

                {/* 1. MESAJ BALONU (Açıq olanda yuxarıdan sola və aşağıya doğru açılır) */}
                <div
                  className={`w-full bg-gradient-to-br from-purple-600 via-indigo-700 to-indigo-900 text-white rounded-3xl shadow-[0_10px_30px_rgba(109,40,217,0.3)] border-4 border-purple-400 overflow-hidden transition-all duration-500 ease-out pointer-events-auto origin-top-right ${isHelpExpanded
                    ? 'scale-100 opacity-100 translate-y-0 translate-x-0'
                    : 'scale-75 opacity-0 -translate-y-4 translate-x-4 pointer-events-none absolute top-0 right-0'
                    }`}
                >
                  {/* Pop-up Başlığı */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-black/20 border-b border-purple-500/30">
                    <div className="flex items-center gap-2">
                      <span className="animate-bounce text-base">🔮</span>
                      <span className="font-black text-[11px] uppercase tracking-wider text-purple-200">
                        Sehrbazın Mesajı
                      </span>
                    </div>
                    {/* Bağlama Düyməsi (X) */}
                    <button
                      onClick={() => setIsHelpExpanded(false)}
                      className="w-6 h-6 rounded-full bg-purple-900/50 hover:bg-purple-500 text-purple-200 hover:text-white font-bold text-xs transition-all flex items-center justify-center shadow-inner"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Pop-up İçərliyi (Hündürlük tam) */}
                  <div className="p-4  overflow-y-auto custom-scrollbar">
                    <div
                      className="prose prose-invert prose-sm max-w-none text-purple-100 font-semibold text-xs leading-relaxed
                     prose-headings:font-black prose-headings:text-amber-300 prose-headings:text-sm prose-headings:mb-1
                     prose-strong:text-amber-300 prose-code:bg-purple-950/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-amber-300 prose-code:border prose-code:border-purple-500/40"
                      dangerouslySetInnerHTML={{ __html: data.help }}
                    />
                  </div>
                </div>

                {/* 2. KİÇİK İPUCU İKONU (Həmişə tam yuxarıda sağda sabit qalır, aşağı qaçmır) */}
                <button
                  onClick={() => setIsHelpExpanded(true)}
                  className={`absolute top-0 right-0 pointer-events-auto flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black px-4 py-3 rounded-2xl shadow-lg border-4 border-white hover:border-amber-300 transition-all duration-300 transform active:scale-95 whitespace-nowrap ${!isHelpExpanded
                    ? 'scale-100 opacity-100 translate-y-0 translate-x-0 animate-pulse'
                    : 'scale-50 opacity-0 -translate-y-4 translate-x-4 pointer-events-none'
                    }`}
                >
                  <span className="text-lg">💡</span>
                  <span className="text-xs uppercase tracking-wider font-extrabold drop-shadow-sm">İpucu Al</span>
                </button>

              </div>
            )}
            {/* Oyunun Canvası */}
            <canvas
              ref={canvasRef}
              width={cols * GRID_SIZE}
              height={rows * GRID_SIZE}
              className="bg-emerald-50/20 rounded-2xl block border-2 border-dashed border-emerald-100"
            />
          </div>
        </div>

        {/* ↕️ SÜRÜŞDÜRMƏ BARU (RESIZER) */}
        <div
          onMouseDown={() => setIsResizing(true)}
          className={`w-2.5 hover:w-3.5 bg-gradient-to-b from-emerald-400 to-green-500 cursor-col-resize rounded-full mx-1 transition-all flex items-center justify-center shadow-inner ${isResizing ? 'bg-amber-400 w-3.5' : ''} pb-2`}
        >
          <div className="w-1 h-12 bg-white/50 rounded-full"></div>
        </div>

        {/* 💻 SAĞ PANEL: EDİTOR VƏ TERMİNAL (Başlıqsız, Özəl Çərçivə və Tələbə Avatarı Üzərində) */}
        <div
          style={{ width: `${100 - leftWidth}%` }}
          className="flex flex-col items-stretch overflow-hidden h-full pl-3 relative pb-2"
        >
          {/* 🧑‍🎓 ABSOLUTE TƏLƏBƏ AVATARI */}
          <div className="absolute top-[10px] right-[10px]  z-20 flex flex-col items-center pointer-events-none">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-white border-4 border-purple-500 p-0.5 shadow-lg flex items-center justify-center">
              <img
                src={`/avatars/avatar-${userData?.avatar || 1}.png`}
                alt="Profilim"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-purple-600 font-black text-[20px] mt-1 ">
              {userData?.fullName || "Şagird"}
            </span>
          </div>

          {/* SAĞ PANELİN İÇİ (EDİTOR SAHƏSİ - BAŞLIQLAR SİLİNDİ) */}
          <div className="flex-1 flex flex-col gap-3 overflow-hidden relative bg-white p-4 rounded-[32px] border-4 border-purple-500 shadow-[0_6px_0_#581c87]">

            {/* CodeMirror Redaktoru (Üst başlıq tamamilə təmizləndi) */}
            <div className="flex-1 relative mb-24 rounded-2xl overflow-hidden border-2 border-slate-100 bg-white min-h-[150px] custom-scrollbar-editor">
              <ReactCodeMirror
                value={code}
                height="100%"
                theme="light"
                extensions={[cpp()]}
                onChange={(value) => setCode(value)}
                editable={!isRunning && !isTerminalExpanded}
                className="h-full text-sm"
              />
              <style jsx global>{`
    /* 1. Üfiqi scrollbar-ın (Horizontal) yerini tənzimləyirik */
    .custom-scrollbar-editor .cm-scroller::-webkit-scrollbar {
      height: 6px !important;
      width: 6px !important;
    }

    /* 2. Sürüşmə oxuna yuxarıdan xüsusi margin / boşluq veririk ki, şəklin altından qaçsın */
    .custom-scrollbar-editor .cm-scroller::-webkit-scrollbar-track {
      background: transparent !important;
      margin-top: 20px !important;    /* Yuxarıdan (şəkildən) boşluq buraxır */
      margin-bottom: 5px !important;  /* Altdan səliqəli məsafə */
    }

    /* 3. Sürüşən barın özünün dizaynı */
    .custom-scrollbar-editor .cm-scroller::-webkit-scrollbar-thumb {
      background-color: #cbd5e1 !important; /* Slate-300 */
      border-radius: 10px !important;
    }

    .custom-scrollbar-editor .cm-scroller::-webkit-scrollbar-thumb:hover {
      background-color: #94a3b8 !important; /* Slate-400 */
    }

    /* 4. Alternativ olaraq CodeMirror-un öz daxili scroll komponentlərini də aşağı sıxırıq */
    .custom-scrollbar-editor .cm-scrollbar-horizontal {
      bottom: 2px !important;
      margin-top: 15px !important; /* Yuxarı kənar margin sığortası */
    }
  `}</style>
            </div>

            {/* SÜRÜŞƏN TERMİNAL */}
            {/* 💻 SÜRÜŞƏN TERMİNAL */}
            <div
              className={`absolute left-4 right-4 bottom-16 bg-[#1e293b] rounded-[20px] border-4 border-[#334155] flex flex-col transition-all duration-500 ease-out shadow-2xl origin-bottom ${isTerminalExpanded
                ? 'h-[calc(100%-80px)] z-30 border-purple-400' // Genişlənəndə: Yuxarıya doğru rəvan uzanır
                : 'h-[100px] z-10' // Normal halda: Aşağıda sakitcə durur
                }`}
            >
              <div className="flex justify-between items-center px-4 py-1.5 bg-[#0f172a] rounded-t-[14px] border-b border-slate-700 shrink-0">
                <div className="text-[10px] text-slate-400 font-mono font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`}></span>
                  Konsol Çıxışı
                </div>
                <button
                  onClick={() => setIsTerminalExpanded(!isTerminalExpanded)}
                  className="text-slate-400 hover:text-white text-[10px] font-bold bg-slate-800/50 hover:bg-slate-800 px-2 py-0.5 rounded-md transition-colors"
                >
                  {isTerminalExpanded ? "↩ Koda Qayıt" : "Genişlət ⛶"}
                </button>
              </div>

              <div className="flex-1 font-mono text-xs text-slate-200 overflow-y-auto p-3 flex flex-col gap-1">
                {terminalLogs.map((log, idx) => (
                  <div key={idx} className={log.type === 'system' ? 'text-amber-400 font-bold' : log.type === 'error' ? 'text-rose-400' : 'text-emerald-400 font-black'}>{log.text}</div>
                ))}
                {executionStackRef.current.map((item, index) => {
                  const isActive = activeStepIndex === index;
                  const isSuccess = successSteps.includes(index);
                  return (
                    <div key={index} className={`px-2 py-0.5 rounded-md font-bold transition-all ${isActive ? 'bg-amber-400 text-slate-950 translate-x-1' : isSuccess ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-500'}`}>
                      {isActive ? '👉 ' : '# '}{item.raw}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 🛠️ İDARƏETMƏ DÜYMƏLƏRİ */}
            <div className="flex gap-2 shrink-0 pt-2 border-t-2 border-dashed border-slate-100 z-20">
              {isRunning ? (
                <button onClick={handleStopExecution} className="flex-1 bg-rose-500 hover:bg-rose-400 text-white font-black text-xs py-3 px-4 rounded-xl shadow-[0_4px_0_#9f1239] active:translate-y-[4px] active:shadow-none uppercase tracking-wider transition-all">
                  Dayandır <Square size={12} className="inline ml-1" fill="currentColor" />
                </button>
              ) : (
                <button onClick={handleCompileAndRun} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs py-3 px-4 rounded-xl shadow-[0_4px_0_#065f46] active:translate-y-[4px] active:shadow-none uppercase tracking-wider transition-all">
                  Kodu Çalışdır <Play size={12} className="inline ml-1" fill="currentColor" />
                </button>
              )}

              <button onClick={() => { handleReset() }} className="flex-[1] bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs py-3 px-3 rounded-xl shadow-[0_4px_0_#cbd5e1] active:translate-y-[4px] active:shadow-none uppercase tracking-wider transition-all">
                Sıfırla <RotateCcw size={12} className="inline ml-1" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* 🌊 DALĞALI TAPŞIRIQ POPUP-U */}
      {isPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white p-6 pt-12 rounded-[50px_20px_60px_30px] border-8 border-emerald-400 shadow-[0_16px_0_#065f46] text-center max-w-[600px] w-full relative">

            {/* Sol yuxarı küncdəki asılı heyvan */}
            <div className="absolute -top-14 left-6 w-24 h-24 bg-white border-4 border-emerald-400 rounded-full p-2 shadow-xl transform -rotate-6">
              <img
                src={`/animals/${assignedAnimal.image}`}
                alt={assignedAnimal.nameAz}
                className="w-full h-full object-contain"
              />
            </div>

            <div className='mb-4'>
              <div dangerouslySetInnerHTML={{ __html: data?.instructionText }} />
            </div>


            <button
              onClick={() => setIsPopupOpen(false)}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-3.5 rounded-2xl shadow-[0_5px_0_#b45309] active:translate-y-[5px] active:shadow-none uppercase text-xs tracking-wider transition-all"
            >
              Anladım, Koda Keçək! 🚀
            </button>
          </div>
        </div>
      )}



      {/* UĞUR MODALI */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-[32px] border-8 border-emerald-400 shadow-2xl text-center max-w-sm w-full">
            <div className="text-6xl mb-3 animate-bounce">🎉</div>
            <h2 className="text-2xl font-black text-emerald-950 mb-1">Mükəmməl Alqoritm!</h2>
            <p className="text-slate-600 text-sm font-bold mb-4">Robot qutuları itələdi, portaldan keçdi və missiyanı tamamladı!</p>
            <button onClick={() => handleNext()} className="w-full bg-emerald-500 text-white font-black py-3 rounded-xl shadow-[0_4px_0_#065f46] active:translate-y-[4px] active:shadow-none uppercase text-xs">
              Davam Et 🐾
            </button>
          </div>
        </div>
      )}
    </div>
  );
}