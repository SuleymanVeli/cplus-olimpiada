'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTransition } from '@/src/context/TransitionContext';
import { useUser } from '@/src/context/UserContext'; // 🚀 Sizin real User Context-iniz

interface TaskNode {
  _id: string;
  type: 'lesson' | 'task';
  title: string;
  order: number;
  points: number;
  status: 'completed' | 'active' | 'locked';
  moduleTitle: string;
}

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


export default function GamingPath() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatarImgRef = useRef<HTMLImageElement | null>(null);
  const { navigateTo, endTransition } = useTransition();

  // 🚀 Şagirdin real avatar məlumatını gətiririk
  const { userData } = useUser();
  const avatarSrc = `/avatars/avatar-${userData?.avatar || 1}.png`;

  const [nodes, setNodes] = useState<TaskNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentActiveIndex, setCurrentActiveIndex] = useState(0);

  const [activeAnimal, setActiveAnimal] = useState<{
    name: string;
    x: number;
    y: number;
    fact: string;
  } | null>(null);

  const [activeNode, setActiveNode] = useState<{
    id: string;
    _id: string;
    type: 'lesson' | 'task';
    index: number;
    displayNumber: number | string;
    title: string;
    moduleTitle: string;
    desc: string;
    animal: typeof animalsData[number] | null;
    x: number;
    y: number;
    isLeftSide: boolean;
    state: 'completed' | 'active' | 'locked';
  } | null>(null);

  console.log(userData)

  // --- 1. API-dən MƏLUMATLARIN ÇƏKİLMƏSİ ---
  useEffect(() => {
    async function fetchMapData() {
      try {
        const res = await fetch(`/api/gaming-path?userId=${userData?._id}`);
        const result = await res.json();

        if (result.success && result.data && Array.isArray(result.data)) {
          const flatNodes: TaskNode[] = result.data;

          let activeIdx = flatNodes.findIndex((n) => n.status === 'active');

          if (activeIdx === -1) {
            const lastCompleted = flatNodes.reduce((acc, n, idx) => n.status === 'completed' ? idx : acc, -1);
            activeIdx = lastCompleted !== -1 ? lastCompleted : 0;
          }

          setNodes(flatNodes);
          setCurrentActiveIndex(activeIdx);
        } else {
          generateMockFallback();
        }
      } catch (error) {
        console.error('Xəritə datası yüklənərkən xəta:', error);
        generateMockFallback();
      } finally {
        setLoading(false);
        endTransition();
      }
    }

    function generateMockFallback() {
      const mock: TaskNode[] = Array.from({ length: 15 }, (_, i) => {
        const isLesson = i % 5 === 0;
        return {
          _id: `mock_${i}`,
          type: isLesson ? 'lesson' : 'task',
          title: isLesson ? 'Nəzəriyyə və Video İzah' : `Məsələ ${i}`,
          order: isLesson ? 0 : (i % 5),
          points: isLesson ? 0 : 10,
          status: i < 3 ? 'completed' : i === 3 ? 'active' : 'locked',
          moduleTitle: i < 5 ? 'GİRİŞ VƏ TİPLƏR' : 'ŞƏRT OPERATORLARI',
        };
      });
      setNodes(mock);
      setCurrentActiveIndex(3);
    }
     
    if(userData?._id) {
      fetchMapData();
    }
  }, [userData]);

  // --- 2. CANVAS RENDERING VƏ ANIMASIYA ---
  useEffect(() => {
    // 🚀 Dinamik gələn avatar yolunu Image obyektinə yükləyirik
    const img = new Image();
    img.src = avatarSrc;
    avatarImgRef.current = img;

    if (loading || nodes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const totalNodes = nodes.length;
    const spacing = 140;
    const mapHeight = totalNodes * spacing + 300;

    let scrollY = Math.max(
      0,
      Math.min(
        mapHeight - 200 - currentActiveIndex * spacing - canvas.height / 2,
        mapHeight - canvas.height
      )
    );

    let animationFrame = 0;
    let animationId: number;

    const getX = (i: number) => canvas.width / 2 + Math.sin(i * 0.4) * 100;
    const getY = (i: number) => mapHeight - 150 - i * spacing;

    const trees: any[] = [];
    const cppFacts = [
      "💡 C++ dilində 'bool' tipi yaddaşda cəmi 1 bayt yer tutur!",
      "⚡ 'std::ios_base::sync_with_stdio(false)' kodu C++ daxiletməsini uçuşa keçirir!",
      "🦖 C++ ilk yaradılanda adı 'C with Classes' (Siniflərlə C) olub!",
      "♾️ 'for(;;)' yazmaq 'while(true)' ilə tamamilə eyni sonsuz dövrü yaradır!",
      "🛠️ C++ dilində massivin indeksləri həmişə 0-dan başlayır, unutma!",
      "🍉 'sizeof()' operatoru dəyişənin yaddaşda neçə bayt yer tutduğunu ölçür.",
      "🚀 Bjarne Stroustrup C++ dilini 1979-cu ildə icad etməyə başlayıb!",
      "💥 'int' dəyişəninə daşıya biləcəyindən böyük ədəd versən overflow (daşma) olar!"
    ];

    const animals: any[] = [];
    const animalTypes = [
      { name: '🐰 Dovşan', color: '#ffafcc', behavior: 'jump' },
      { name: '🦊 Tülkü', color: '#f95738', behavior: 'run' },
      { name: '🐻 Ayı', color: '#9c6644', behavior: 'idle' },
      { name: '🦌 Maral', color: '#e09f3e', behavior: 'jump' }
    ];

    for (let i = 0; i < 12; i++) {
      let y = Math.random() * (mapHeight - 400) + 200;
      let x = Math.random() * canvas.width;

      const nodeIndexEstimation = (mapHeight - 150 - y) / spacing;
      let pathX = getX(nodeIndexEstimation);
      if (Math.abs(x - pathX) < 120) {
        x = x < pathX ? x - 130 : x + 130;
      }

      animals.push({
        x,
        y,
        baseX: x,
        type: animalTypes[i % animalTypes.length],
        fact: cppFacts[i % cppFacts.length],
        seed: Math.random() * 100
      });
    }

    for (let i = 0; i < 150; i++) {
      let y = Math.random() * mapHeight;
      let x = Math.random() * canvas.width;

      const nodeIndexEstimation = (mapHeight - 150 - y) / spacing;
      let pathX = getX(nodeIndexEstimation);

      if (Math.abs(x - pathX) < 110) {
        x = x < pathX ? x - 120 : x + 120;
      }

      trees.push({
        x,
        y,
        size: 18 + Math.random() * 20,
        color: ['#2ecc71', '#27ae60', '#1e8449', '#78c800'][Math.floor(Math.random() * 4)],
      });
    }

    function drawDetailedTree(x: number, y: number, size: number, color: string) {
      ctx!.fillStyle = 'rgba(0,0,0,0.08)';
      ctx!.beginPath(); ctx!.ellipse(x, y + 4, size * 0.8, size * 0.4, 0, 0, Math.PI * 2); ctx!.fill();
      ctx!.fillStyle = '#5d4037';
      ctx!.fillRect(x - size / 10, y - size / 1.5, size / 5, size / 1.5);
      ctx!.fillStyle = color;
      ctx!.beginPath(); ctx!.arc(x - size / 2, y - size / 1.2, size / 1.5, 0, Math.PI * 2); ctx!.fill();
      ctx!.beginPath(); ctx!.arc(x + size / 2, y - size / 1.2, size / 1.5, 0, Math.PI * 2); ctx!.fill();
      ctx!.globalAlpha = 0.85;
      ctx!.beginPath(); ctx!.arc(x, y - size * 1.2, size / 1.3, 0, Math.PI * 2); ctx!.fill();
      ctx!.globalAlpha = 1.0;
    }

    let taskCounterInModule = 0;
    let lastSeenModule = "";
    const displayNumbers = nodes.map((node) => {
      if (node.moduleTitle !== lastSeenModule) {
        lastSeenModule = node.moduleTitle;
        taskCounterInModule = 0;
      }
      if (node.type === 'lesson') return '📖';
      taskCounterInModule++;
      return taskCounterInModule;
    });

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      animationFrame += 0.04;

      ctx.save();
      ctx.translate(0, -scrollY);

      // Torpaq Cığır alt qat
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.lineWidth = 100;
      ctx.strokeStyle = '#a1907e';
      for (let i = 0; i < totalNodes; i++) ctx.lineTo(getX(i), getY(i) + 4);
      ctx.stroke();

      // Üst cığır qatı
      ctx.beginPath();
      ctx.lineWidth = 85;
      ctx.strokeStyle = '#b0a090';
      for (let i = 0; i < totalNodes; i++)
        i === 0 ? ctx.moveTo(getX(i), getY(i)) : ctx.lineTo(getX(i), getY(i));
      ctx.stroke();

      // Pillələr
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#8c7c6d';
      for (let i = 0; i < totalNodes; i++) {
        let x = getX(i), y = getY(i);
        if (y > scrollY - 100 && y < scrollY + canvas.height + 100) {
          ctx.beginPath(); ctx.moveTo(x - 35, y); ctx.lineTo(x + 35, y); ctx.stroke();
        }
      }

      // Ağaclar
      trees.forEach((t) => {
        if (t.y > scrollY - 200 && t.y < scrollY + canvas.height + 200) {
          drawDetailedTree(t.x, t.y, t.size, t.color);
        }
      });

      // Heyvanlar
      animals.forEach((anim) => {
        if (anim.y > scrollY - 100 && anim.y < scrollY + canvas.height + 100) {
          let currentX = anim.x;
          let currentY = anim.y;

          if (anim.type.behavior === 'jump') {
            currentY -= Math.abs(Math.sin(animationFrame * 2.5 + anim.seed)) * 18;
          } else if (anim.type.behavior === 'run') {
            currentX = anim.baseX + Math.sin(animationFrame * 1.5 + anim.seed) * 40;
          } else if (anim.type.behavior === 'idle') {
            currentY += Math.sin(animationFrame * 0.8 + anim.seed) * 3;
          }

          ctx.save();
          ctx.beginPath();
          ctx.ellipse(currentX, currentY + 12, 18, 8, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(currentX, currentY, 15, 0, Math.PI * 2);
          ctx.fillStyle = anim.type.color;
          ctx.fill();

          ctx.font = '18px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(anim.type.name.split(' ')[0], currentX, currentY - 2);
          ctx.restore();

          anim.currentX = currentX;
          anim.currentY = currentY;
        }
      });

      // Nodes (Səviyyə Düymələri)
      for (let i = 0; i < totalNodes; i++) {
        let x = getX(i), y = getY(i);

        if (y > scrollY - 150 && y < scrollY + canvas.height + 150) {
          const nodeState = nodes[i].status;
          const isLesson = nodes[i].type === 'lesson';

          const r = isLesson ? 36 : 34;
          let rx = r * 1.1;
          let ry = r * 0.9;

          let floatOffset = nodeState === 'active' ? Math.sin(animationFrame * 2.2) * 8 : 0;
          let border3D = 6;

          // ... (Kölgə çəkilməsi eyni qalır, o yerdə sabit qalmalıdır ki təbii görünsün) ...
          ctx.beginPath();
          ctx.ellipse(x, y + 10, rx * (nodeState === 'active' ? 1 - floatOffset * 0.02 : 1), ry * (nodeState === 'active' ? 1 - floatOffset * 0.02 : 1), 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fill();

          // 🚀 Düymənin öz gövdəsi artıq floatOffset (yəni avatarFloat ilə eyni tempdə) hərəkət edir!
          ctx.beginPath();
          ctx.ellipse(x, y + border3D + floatOffset, rx, ry, 0, 0, Math.PI * 2);
          if (nodeState === 'completed') ctx.fillStyle = '#1899d6';
          else if (nodeState === 'active') ctx.fillStyle = '#c79200';
          else ctx.fillStyle = '#a0a0a0';
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(x, y + floatOffset, rx, ry, 0, 0, Math.PI * 2);
          if (nodeState === 'completed') ctx.fillStyle = '#1cb0f6';
          else if (nodeState === 'active') ctx.fillStyle = '#ffc800';
          else ctx.fillStyle = '#bcc4c7';
          ctx.fill();

          if (nodeState === 'active') {
            ctx.beginPath(); ctx.ellipse(x, y + floatOffset, rx * 0.8, ry * 0.8, 0, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
            ctx.beginPath(); ctx.ellipse(x, y + floatOffset, rx * 0.68, ry * 0.68, 0, 0, Math.PI * 2); ctx.fillStyle = '#ffe066'; ctx.fill();
          } else if (nodeState === 'completed') {
            ctx.beginPath(); ctx.ellipse(x, y + floatOffset + 2, rx * 0.8, ry * 0.7, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
          }

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (isLesson) {
            ctx.fillStyle = nodeState === 'locked' ? '#a0a0a0' : '#fff';
            ctx.font = '20px Arial';
            ctx.fillText('📖', x, y + floatOffset + 1);
          } else {
            if (nodeState === 'completed') {
              ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Arial';
              ctx.fillText('✓', x, y + floatOffset + 1);
            } else {
              ctx.fillStyle = nodeState === 'active' ? '#c79200' : '#8a9496';
              ctx.font = 'bold 20px Arial';
              ctx.fillText(displayNumbers[i].toString(), x, y + floatOffset + 1);
            }
          }
        }
      }

      // 🚀 USER DİNAMİK AVATARI (Aktiv Node-un Təpəsində)
      if (nodes[currentActiveIndex]) {
        const activeX = getX(currentActiveIndex);
        const activeY = getY(currentActiveIndex);

        // 🚀 Düymə ilə TAM EYNİ temp və piksel dəyəri (Sinxron hərəkətin açarı)
        let avatarFloat = Math.sin(animationFrame * 2.2) * 8;

        ctx.save();

        const avatarSize = 65;
        // 🚀 İndi avatar və üçbucağın bütün nöqtələri bu ortaq oxa bağlanır:
        const aktivNöqtəMərkəzY = activeY + avatarFloat;
        const avatarY = activeY - 55 - avatarSize + avatarFloat;
        const avatarMərkəzY = avatarY + avatarSize / 2;

        // İşıq Qradienti
        const lightGradient = ctx.createLinearGradient(activeX, aktivNöqtəMərkəzY, activeX, avatarMərkəzY);
        lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        lightGradient.addColorStop(0.4, 'rgba(255, 230, 120, 0.5)');
        lightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

        ctx.save();
        ctx.globalCompositeOperation = 'source-over';

        ctx.beginPath();
        // 🚀 Üçbucağın təpəsi artıq tam olaraq tullanan nöqtənin mərkəzindən başlayır!
        ctx.moveTo(activeX, aktivNöqtəMərkəzY);
        ctx.lineTo(activeX - avatarSize * 0.7, avatarMərkəzY);
        ctx.lineTo(activeX + avatarSize * 0.7, avatarMərkəzY);
        ctx.closePath();

        ctx.fillStyle = lightGradient;
        ctx.fill();
        ctx.restore();

        // Avatarın Çəkilməsi
        const avatarX = activeX - avatarSize / 2;

        if (avatarImgRef.current && avatarImgRef.current.complete) {
          ctx.beginPath();
          ctx.arc(activeX, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
          ctx.closePath();

          ctx.save();
          ctx.clip();

          ctx.drawImage(
            avatarImgRef.current,
            avatarX,
            avatarY,
            avatarSize,
            avatarSize
          );

          ctx.restore();

          ctx.beginPath();
          ctx.arc(activeX, avatarY + avatarSize / 2, avatarSize / 2 + 1, 0, Math.PI * 2);
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        } else {
          ctx.font = '32px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('👑', activeX, avatarMərkəzY);
        }
        ctx.restore();
      }
      ctx.restore();
      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mX = e.clientX - rect.left;
      const mY = e.clientY - rect.top + scrollY;

      for (let i = 0; i < animals.length; i++) {
        const anim = animals[i];
        if (anim.currentX && Math.sqrt((mX - anim.currentX) ** 2 + (mY - anim.currentY) ** 2) < 25) {
          setActiveAnimal({
            name: anim.type.name,
            x: anim.currentX,
            y: anim.currentY - scrollY,
            fact: anim.fact
          });
          setActiveNode(null);
          return;
        }
      }
      setActiveAnimal(null);

      for (let i = 0; i < totalNodes; i++) {
        if (Math.sqrt((mX - getX(i)) ** 2 + (mY - getY(i)) ** 2) < 40) {
          const nodeX = getX(i);
          const nodeY = getY(i) - scrollY;
          const isLeftSide = nodeX < canvas.width / 2;
          const target = nodes[i];

          // 🚀 Kliklənən nöqtənin sırasına uyğun heyvanı seçirik
          const assignedAnimal = animalsData[i % animalsData.length];

          setActiveNode({
            id: target._id,
            _id: target._id,
            type: target.type,
            index: i,
            displayNumber: displayNumbers[i],
            title: target.title,
            moduleTitle: target.moduleTitle,
            desc: target.status === 'locked'
              ? 'Bu səviyyə hələ kilidlidir. Əvvəlki dərsləri tamamla! 🔒'
              : target.type === 'lesson'
                ? 'Mövzunun video izahı və konspekti. Başlamağa hazırsınız? 📺'
                : `Bu tapşırıq sizə +${target.points} XP qazandıracak. Başlamağa hazırsınız?`,
            x: nodeX,
            y: nodeY,
            isLeftSide,
            state: target.status,
            // 🚀 Heyvan məlumatını state-ə ötürürük
            animal: assignedAnimal
          });
          return;
        }
      }
      setActiveNode(null);
    };

    const handleWheel = (e: WheelEvent) => {
      scrollY += e.deltaY * 0.8;
      scrollY = Math.max(0, Math.min(scrollY, mapHeight - canvas.height));
      setActiveNode(null);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('wheel', handleWheel);
    };
    // 🚀 dependency array-ə avatarSrc izlənməsini əlavə etdik
  }, [loading, nodes, currentActiveIndex, avatarSrc]);

  const startTask = (node: any) => {
    if (!node) return;
    if (node.type === 'lesson') {
      navigateTo(`/student/lessons/${node._id}`);
    } else {
      navigateTo(`/student/arena/${node._id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-3 bg-[#bfe3f0]">
        <div className="w-10 h-10 border-4 border-[#1cb0f6] border-t-transparent rounded-full animate-spin" />
        <p className="font-black text-slate-600 text-xs tracking-wider animate-pulse uppercase">
          C++ Dünyası Yüklənir...
        </p>
      </div>
    );
  }

  return (
    <div className="flex justify-center bg-[#bfe3f0] min-h-screen overflow-hidden font-sans select-none">
      <div className="relative shadow-[0_0_80px_rgba(0,0,0,0.2)] bg-[#58cc02]">

         {/* Dashboarda geri donme, shadow olsun */}
        <button
          onClick={() => navigateTo('/student/dashboard')}
          className="absolute top-5 left-5 bg-white px-8 py-3.5 hover:translate-y-[-2px] cursor-pointer rounded-full border-b-[5px] border-slate-200 z-10 whitespace-nowrap text-slate-700 font-black text-sm md:text-base shadow-lg tracking-wide"
        >
          🏠 Dashboard
        </button>

        {/* Dinamik Üst UI Panel */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-white px-8 py-3.5 rounded-full border-b-[5px] border-slate-200 z-10 whitespace-nowrap text-slate-700 font-black text-sm md:text-base pointer-events-none shadow-lg tracking-wide uppercase">
          🌳 C++ Macərası <span className="text-[#1cb0f6] mx-2">•</span> Tapşırıq Xəritəsi
        </div>

        {/* İnfo Kart Modalı */}
        {/* İnfo Kart Modalı */}
        {/* ✨ PREMİUM OYUNLAŞDIRILMIŞ İNFO KART MODALI */}
        {activeNode && (
          <div
            className={`absolute p-0 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-[380px] z-[100] transition-all duration-300 transform scale-100 hover:scale-[1.02] border-b-[8px] pointer-events-auto overflow-hidden flex flex-col
      ${activeNode.state === 'locked'
                ? 'bg-slate-100 border-slate-400 text-slate-500'
                : activeNode.type === 'lesson'
                  ? 'bg-gradient-to-br from-sky-50 to-white border-sky-400'
                  : 'bg-gradient-to-br from-amber-50 to-white border-amber-400'
              }
      ${activeNode.isLeftSide ? 'arrow-left' : 'arrow-right'}`}
            style={{
              left: activeNode.isLeftSide ? `${activeNode.x + 75}px` : `${activeNode.x - 380 - 75}px`,
              top: `${activeNode.y - 90}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* 1. Üst Rəngli Header Zolağı (Dərs və ya Tapşırığa görə dinamik dəyişir) */}
            <div className={`px-5 py-2.5 text-[11px] font-black tracking-widest uppercase flex justify-between items-center text-white
      ${activeNode.state === 'locked'
                ? 'bg-slate-400'
                : activeNode.type === 'lesson'
                  ? 'bg-gradient-to-r from-sky-400 to-blue-500'
                  : 'bg-gradient-to-r from-amber-400 to-orange-500'
              }`}
            >
              <span className="truncate max-w-[240px]">{activeNode.moduleTitle}</span>
              <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-[10px]">
                {activeNode.state === 'locked' ? 'KİLİDLİ 🔒' : activeNode.type === 'lesson' ? 'VİDEO DƏRS 📺' : 'ARENA ⚔️'}
              </span>
            </div>

            {/* 2. Kartın Gövdəsi (Flex Düzən) */}
            <div className="p-5 flex gap-4 items-start relative flex-1">

              {/* SOL TƏRƏF: Sualı verən personaj (Heyvan) */}
              {activeNode.animal && (
                <div className="flex flex-col items-center flex-shrink-0 group">
                  <div className={`w-20 h-20 rounded-full overflow-hidden border-4 bg-white shadow-md transform transition-transform duration-300 group-hover:rotate-3 relative
            ${activeNode.state === 'locked'
                      ? 'border-slate-300 grayscale opacity-70'
                      : activeNode.type === 'lesson' ? 'border-sky-300' : 'border-amber-300'
                    }`}
                  >
                    <img
                      src={`/animals/${activeNode.animal.image}`}
                      alt={activeNode.animal.nameAz}
                      className="w-full h-full object-cover"
                    />
                    {/* Kilid ikonunun şəklin üzərinə gəlməsi */}
                    {activeNode.state === 'locked' && (
                      <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center text-xl">🔒</div>
                    )}
                  </div>

                  {/* Heyvanın Ad Etiketi */}
                  <span className={`text-[11px] font-black mt-2 px-2.5 py-0.5 rounded-md shadow-sm border
            ${activeNode.state === 'locked'
                      ? 'bg-slate-200 border-slate-300 text-slate-500'
                      : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    {activeNode.animal.nameAz}
                  </span>
                </div>
              )}

              {/* SAĞ TƏRƏF: Danışıq Balonu (Speech Bubble) Effekti ilə Mətnlər */}
              <div className="flex-1 min-w-0 relative bg-white/60 p-3.5 rounded-2xl border border-slate-100 shadow-inner">

                {/* Balonun sol və ya sağ tərəfə baxan kiçik üçbucaq çıxıntısı */}
                <div className="absolute top-6 -left-2 w-4 h-4 bg-white/60 border-l border-b border-slate-100 rotate-45 hidden md:block"></div>

                <h3 className={`m-0 mb-1 text-base font-black leading-tight truncate
          ${activeNode.state === 'locked'
                    ? 'text-slate-400'
                    : activeNode.type === 'lesson' ? 'text-sky-600' : 'text-amber-600'
                  }`}
                >
                  {activeNode.type === 'lesson' ? '📖 ' : `${activeNode.displayNumber}. `}
                  {activeNode.title}
                </h3>

                <p className="m-0 text-slate-600 text-xs font-bold leading-relaxed mb-4 line-clamp-3">
                  {activeNode.state === 'locked'
                    ? "Dayan! 🛑 Bu cığır hələ kəşf olunmayıb. Keçid açmaq üçün əvvəlki tapşırıqları uğurla tamamlamalısan!"
                    : activeNode.desc
                  }
                </p>

                {/* Hərəkət Düyməsi */}
                {activeNode.state !== 'locked' ? (
                  <button
                    onClick={() => startTask(activeNode)}
                    className={`w-full text-white font-black text-xs text-center py-3 rounded-xl border-b-[4px] transition-all cursor-pointer uppercase tracking-widest active:border-b-0 active:translate-y-[4px]
              ${activeNode.type === 'lesson'
                        ? 'bg-sky-500 border-sky-700 hover:bg-sky-400'
                        : 'bg-amber-500 border-amber-700 hover:bg-amber-400'
                      }`}
                  >
                    {activeNode.type === 'lesson' ? 'DƏRSƏ BAX 📺' : 'KODLAMAĞA BAŞLA 🚀'}
                  </button>
                ) : (
                  <div className="w-full bg-slate-200 text-slate-400 border-b-[4px] border-slate-300 font-black text-center py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-not-allowed">
                    GİRİŞ QADAĞANDIR 🔒
                  </div>
                )}
              </div>
            </div>

            {/* Ox işarələrinin CSS ləri (Dinamik rənglərə uyğunlaşdırılıb) */}
            <style jsx>{`
      .arrow-left::after {
        content: ''; position: absolute; top: 65px; left: -24px;
        border-width: 12px; border-style: solid;
        border-color: transparent ${activeNode.state === 'locked' ? '#94a3b8' : activeNode.type === 'lesson' ? '#38bdf8' : '#fbbf24'} transparent transparent;
      }
      .arrow-right::after {
        content: ''; position: absolute; top: 65px; right: -24px;
        border-width: 12px; border-style: solid;
        border-color: transparent transparent transparent ${activeNode.state === 'locked' ? '#94a3b8' : activeNode.type === 'lesson' ? '#38bdf8' : '#fbbf24'};
      }
    `}</style>
          </div>
        )}

        {/* 🦊 HEYVAN INFO POPUP */}
        {activeAnimal && (
          <div
            className="absolute bg-amber-50 p-4 rounded-2xl shadow-xl border-2 border-amber-400 z-[110] w-[220px] animate-bounce-short text-center pointer-events-auto"
            style={{
              left: `${activeAnimal.x - 110}px`,
              top: `${activeAnimal.y - 100}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-amber-400"></div>
            <span className="text-xs font-black text-amber-600 uppercase tracking-wider block mb-1">
              {activeAnimal.name} Deyir:
            </span>
            <p className="m-0 text-slate-700 text-[11px] font-bold leading-tight">
              {activeAnimal.fact}
            </p>
          </div>
        )}

        <canvas ref={canvasRef} className="cursor-pointer block" />
      </div>
    </div>
  );
}