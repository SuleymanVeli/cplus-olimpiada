'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTransition } from '@/src/context/TransitionContext';
import { useUser } from '@/src/context/UserContext'; 

interface TaskNode {
  _id: string;
  type: 'lesson' | 'task';
  title: string;
  order: number;
  points: number;
  status: 'completed' | 'active' | 'locked';
  moduleTitle: string;
}

// 🐆 Səviyyə 2 loqosuna uyğun tropik cəngəllik heyvanları
const animalsData = [
    { id: 1, name: "Leo", type: "Bəbir (Jaguar)", powerLevel: 85, imagePath: "/jungle/1.png", skill: "Sürətli Qaçış" },
    { id: 2, name: "Coco", type: "Tutuquşu (Macaw)", powerLevel: 45, imagePath: "/jungle/2.png", skill: "Yüksəkdən Uçuş" },
    { id: 3, name: "Tiki", type: "Tukan (Toucan)", powerLevel: 50, imagePath: "/jungle/3.png", skill: "Meyvə Tapmaq" },
    { id: 4, name: "Momo", type: "Meymun (Monkey)", powerLevel: 65, imagePath: "/jungle/4.png", skill: "Ağaca Dırmaşmaq" },
    { id: 5, name: "Lemmy", type: "Lemur (Lemur)", powerLevel: 55, imagePath: "/jungle/5.png", skill: "Gecə Görməsi" },
    { id: 6, name: "Snappy", type: "Timsah (Crocodile)", powerLevel: 90, imagePath: "/jungle/6.png", skill: "Güclü Dişləmə" },
    { id: 7, name: "Cappy", type: "Kapibara (Capybara)", powerLevel: 40, imagePath: "/jungle/7.png", skill: "Sakitləşdirmə" },
    { id: 8, name: "Coati", type: "Koati (Nasua)", powerLevel: 60, imagePath: "/jungle/8.png", skill: "Gizli Qoxulama" }
];

export default function JungleGamingPath() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatarImgRef = useRef<HTMLImageElement | null>(null);
  const { navigateTo, endTransition } = useTransition();

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

  useEffect(() => {
    async function fetchMapData() {
      try {
        const res = await fetch(`/api/gaming-path?userId=${userData?._id}&level=2`);
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
          _id: `jungle_mock_${i}`,
          type: isLesson ? 'lesson' : 'task',
          title: isLesson ? 'Orta Səviyyə C++ Nəzəriyyəsi' : `Cəngəllik Tapşırığı ${i}`,
          order: isLesson ? 0 : (i % 5),
          points: isLesson ? 0 : 20, 
          status: i < 4 ? 'completed' : i === 4 ? 'active' : 'locked',
          moduleTitle: i < 5 ? 'STRUKTURLAR VƏ ARRAYS' : 'POINTERS VƏ FUNCTIONS',
        };
      });
      setNodes(mock);
      setCurrentActiveIndex(4);
    }
      
    if(userData?._id) {
      fetchMapData();
    }
  }, [userData]);

  useEffect(() => {
    const img = new Image();
    img.src = avatarSrc;
    avatarImgRef.current = img;

    if (loading || nodes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx:any = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const totalNodes = nodes.length;
    const spacing = 135; 
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

    const getX = (i: number) => canvas.width / 2 + Math.sin(i * 0.4) * 120;
    const getY = (i: number) => mapHeight - 150 - i * spacing;

    const vegetation: any[] = [];
    const cppMediumFacts = [
      "⚡ Pointers (Göstəricilər) birbaşa yaddaş ünvanını (RAM) yaddas saxlayır!",
      "📦 Vector-lar dinamik massivlərdir, ölçüləri avtomatik böyüyüb kiçilir.",
      "🔒 'private' modifikasiyası klas daxilindəki məlumatları kənardan gizlədir.",
      "🧬 İki funksiyanın adı eyni, parametrləri fərqlidirsə buna 'Function Overloading' deyilir.",
      "🧹 Constructor obyekt yarananda, Destructor isə silinəndə avtomatik işə düşür!"
    ];

    const jungleAnimals = [
      { name: '🐆 Bəbir', color: '#ffb703', behavior: 'idle' },
      { name: '🐒 Meymun', color: '#adc178', behavior: 'jump' },
      { name: '🦜 Tukan', color: '#00b4d8', behavior: 'run' },
      { name: '🐸 Qurbağa', color: '#70e000', behavior: 'jump' }
    ];

    // Heyvanların əlavə edilməsi
    for (let i = 0; i < 10; i++) {
      let y = Math.random() * (mapHeight - 400) + 200;
      let x = Math.random() * canvas.width;
      const nodeIndexEstimation = (mapHeight - 150 - y) / spacing;
      let pathX = getX(nodeIndexEstimation);
      if (Math.abs(x - pathX) < 140) {
        x = x < pathX ? x - 150 : x + 150;
      }
      vegetation.push({
        type: 'animal',
        x, y, baseX: x,
        animalType: jungleAnimals[i % jungleAnimals.length],
        fact: cppMediumFacts[i % cppMediumFacts.length],
        seed: Math.random() * 100
      });
    }

    // 🌳 Referans şəkildəki kimi super sıx ağaclar, qızıl sikkələr və kristalların paylanması (450 ədəd element)
    for (let i = 0; i < 500; i++) {
      let y = Math.random() * mapHeight;
      let x = Math.random() * canvas.width;
      const nodeIndexEstimation = (mapHeight - 150 - y) / spacing;
      let pathX = getX(nodeIndexEstimation);

      // Cığır üzərinə ağac düşməməsi üçün sıx təmizləmə zonası
      if (Math.abs(x - pathX) < 90) { 
        x = x < pathX ? x - 110 : x + 110;
      }

      const randType = Math.random();
      if (randType < 0.85) {
        // Referans şəkildəki canlı yaşıl cəngəllik palitrası
        const mapColors = ['#38b000', '#70e000', '#007200', '#99d98c', '#55a630'];
        vegetation.push({
          type: 'tree',
          x, y,
          size: 25 + Math.random() * 25,
          color: mapColors[Math.floor(Math.random() * mapColors.length)],
          isPalm: Math.random() > 0.6
        });
      } else if (randType < 0.93) {
        // Referansdakı Qızıl Sikkələr (Gold Coins Stack)
        vegetation.push({ type: 'coin', x, y, size: 6 + Math.random() * 4 });
      } else {
        // Referansdakı Mavi Kristallar (Gems)
        vegetation.push({ type: 'gem', x, y, size: 10 + Math.random() * 5 });
      }
    }

    // Canlı İllüstrativ Ağac rəsm funksiyası
    function drawJungleTree(x: number, y: number, size: number, color: string, isPalm: boolean) {
      // Yumşaq kölgə
      ctx!.fillStyle = 'rgba(0,0,0,0.1)';
      ctx!.beginPath(); ctx!.ellipse(x, y + 4, size * 0.6, size * 0.25, 0, 0, Math.PI * 2); ctx!.fill();

      if (isPalm) {
        ctx!.strokeStyle = '#a06cd5'; // Stilə uyğun bir az bənövşəyi/qəhvəyi gövdə çalarları
        ctx!.strokeStyle = '#6c584c';
        ctx!.lineWidth = size / 5;
        ctx!.beginLines ? ctx!.beginLines() : ctx!.beginPath();
        ctx!.moveTo(x, y);
        ctx!.quadraticCurveTo(x - size/4, y - size/2, x - size/5, y - size * 1.2);
        ctx!.stroke();

        ctx!.fillStyle = color;
        const topX = x - size/5;
        const topY = y - size * 1.2;
        for (let j = 0; j < 5; j++) {
          ctx!.save();
          ctx!.translate(topX, topY);
          ctx!.rotate((j * Math.PI) / 2.5 + animationFrame * 0.03);
          ctx!.beginPath();
          ctx!.ellipse(size/2, 0, size * 0.55, size / 3, 0, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.restore();
        }
      } else {
        // Normal şirin karikatura ağacı gövdəsi
        ctx!.fillStyle = '#7f5539';
        ctx!.fillRect(x - size / 10, y - size / 1.5, size / 5, size / 1.5);
        
        // Üst-üstə qatlanan parlaq yarpaq qatları
        ctx!.fillStyle = color;
        ctx!.beginPath(); ctx!.arc(x - size/3, y - size * 0.9, size / 1.5, 0, Math.PI * 2); ctx!.fill();
        ctx!.beginPath(); ctx!.arc(x + size/3, y - size * 0.9, size / 1.5, 0, Math.PI * 2); ctx!.fill();
        ctx!.beginPath(); ctx!.arc(x, y - size * 1.3, size / 1.3, 0, Math.PI * 2); ctx!.fill();
        
        // Parlaq işıq effekti (Ağacların üstünə açıq ton)
        ctx!.fillStyle = 'rgba(255,255,255,0.15)';
        ctx!.beginPath(); ctx!.arc(x, y - size * 1.35, size / 2, 0, Math.PI * 2); ctx!.fill();
      }
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

      // 🗺️ Cığırın çəkilməsi - Referans şəkildəki sarımtıl qum/daş patika yolu
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Alt Qat (Yolun kənarındakı tünd torpaq haşiyə)
      ctx.beginPath();
      ctx.lineWidth = 85;
      ctx.strokeStyle = '#b48a53'; 
      for (let i = 0; i < totalNodes; i++) ctx.lineTo(getX(i), getY(i) + 3);
      ctx.stroke();

      // Üst Qat (Referans şəkildəki əsas parlaq qum sarısı yol)
      ctx.beginPath();
      ctx.lineWidth = 70;
      ctx.strokeStyle = '#f4e285'; 
      for (let i = 0; i < totalNodes; i++)
        i === 0 ? ctx.moveTo(getX(i), getY(i)) : ctx.lineTo(getX(i), getY(i));
      ctx.stroke();

      // Yolun daxili bəzək elementləri və teksturası
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f7b05b';
      ctx.beginPath();
      for (let i = 0; i < totalNodes; i++) {
        let x = getX(i), y = getY(i);
        ctx.lineTo(x + Math.sin(animationFrame * 0.5 + i) * 6, y);
      }
      ctx.stroke();

      // Bitki Örtüyü, Sikkə və Kristalların Render olunması
      vegetation.forEach((v) => {
        if (v.y > scrollY - 200 && v.y < scrollY + canvas.height + 200) {
          if (v.type === 'tree') {
            ctx.save();
            ctx.globalAlpha = 0.95; 
            drawJungleTree(v.x, v.y, v.size, v.color, v.isPalm);
            ctx.restore();
          } else if (v.type === 'coin') {
            // Parıldayan Qızıl Sikkə Yığınları
            ctx.save();
            ctx.fillStyle = '#ffb703';
            ctx.strokeStyle = '#fb8500';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(v.x, v.y, v.size, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            // İkinci qat sikkə üstünə
            ctx.beginPath();
            ctx.arc(v.x + 4, v.y - 3, v.size, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            ctx.restore();
          } else if (v.type === 'gem') {
            // Parlayan Mavi Kristallar
            ctx.save();
            ctx.fillStyle = '#4cc9f0';
            ctx.strokeStyle = '#4361ee';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(v.x, v.y - v.size);
            ctx.lineTo(v.x + v.size, v.y);
            ctx.lineTo(v.x, v.y + v.size);
            ctx.lineTo(v.x - v.size, v.y);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            // Kristal parıltısı
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(v.x - 2, v.y - 2, 2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
          } else if (v.type === 'animal') {
            let currentX = v.x;
            let currentY = v.y;

            if (v.animalType.behavior === 'jump') {
              currentY -= Math.abs(Math.sin(animationFrame * 2.5 + v.seed)) * 18;
            } else if (v.animalType.behavior === 'run') {
              currentX = v.baseX + Math.sin(animationFrame * 1.2 + v.seed) * 40;
            } else if (v.animalType.behavior === 'idle') {
              currentY += Math.sin(animationFrame * 0.7 + v.seed) * 3;
            }

            ctx.save();
            ctx.beginPath();
            ctx.ellipse(currentX, currentY + 10, 18, 6, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(currentX, currentY, 15, 0, Math.PI * 2);
            ctx.fillStyle = v.animalType.color;
            ctx.fill();

            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(v.animalType.name.split(' ')[0], currentX, currentY - 1);
            ctx.restore();

            v.currentX = currentX;
            v.currentY = currentY;
          }
        }
      });

      // Yol Nöqtələri (Referans şəkildəki dairəvi, rəngli buton dizaynı)
      for (let i = 0; i < totalNodes; i++) {
        let x = getX(i), y = getY(i);

        if (y > scrollY - 150 && y < scrollY + canvas.height + 150) {
          const nodeState = nodes[i].status;
          const isLesson = nodes[i].type === 'lesson';
          const r = isLesson ? 34 : 32;
          let rx = r * 1.05;
          let ry = r * 0.95;

          let floatOffset = nodeState === 'active' ? Math.sin(animationFrame * 2.2) * 6 : 0;
          let border3D = 5;

          ctx.beginPath();
          ctx.ellipse(x, y + 8, rx, ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fill();

          // 3D Həcm effekti
          ctx.beginPath();
          ctx.ellipse(x, y + border3D + floatOffset, rx, ry, 0, 0, Math.PI * 2);
          if (nodeState === 'completed') ctx.fillStyle = '#38b000'; 
          else if (nodeState === 'active') ctx.fillStyle = '#f77f00';
          else ctx.fillStyle = '#6c757d';
          ctx.fill();

          // Əsas Səth rəngi
          ctx.beginPath();
          ctx.ellipse(x, y + floatOffset, rx, ry, 0, 0, Math.PI * 2);
          if (nodeState === 'completed') ctx.fillStyle = '#70e000'; 
          else if (nodeState === 'active') ctx.fillStyle = '#fcbf49'; 
          else ctx.fillStyle = '#adb5bd';
          ctx.fill();

          if (nodeState === 'active') {
            ctx.beginPath(); ctx.ellipse(x, y + floatOffset, rx * 0.8, ry * 0.8, 0, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
            ctx.beginPath(); ctx.ellipse(x, y + floatOffset, rx * 0.65, ry * 0.65, 0, 0, Math.PI * 2); ctx.fillStyle = '#ffea00'; ctx.fill();
          }

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (isLesson) {
            ctx.fillStyle = nodeState === 'locked' ? '#495057' : '#fff';
            ctx.font = '18px Arial';
            ctx.fillText('📖', x, y + floatOffset);
          } else {
            if (nodeState === 'completed') {
              ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial';
              ctx.fillText('✓', x, y + floatOffset);
            } else {
              ctx.fillStyle = nodeState === 'active' ? '#d62828' : '#495057';
              ctx.font = 'bold 18px Arial';
              ctx.fillText(displayNumbers[i].toString(), x, y + floatOffset);
            }
          }
        }
      }

      // İstifadəçi Avatarı və İşıq hüzməsi
      if (nodes[currentActiveIndex]) {
        const activeX = getX(currentActiveIndex);
        const activeY = getY(currentActiveIndex);
        let avatarFloat = Math.sin(animationFrame * 2.2) * 6;

        ctx.save();
        const avatarSize = 60;
        const aktivNöqtəMərkəzY = activeY + avatarFloat;
        const avatarY = activeY - 50 - avatarSize + avatarFloat;
        const avatarMərkəzY = avatarY + avatarSize / 2;

        const lightGradient = ctx.createLinearGradient(activeX, aktivNöqtəMərkəzY, activeX, avatarMərkəzY);
        lightGradient.addColorStop(0, 'rgba(255, 250, 150, 0.7)');
        lightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

        ctx.beginPath();
        ctx.moveTo(activeX, aktivNöqtəMərkəzY);
        ctx.lineTo(activeX - avatarSize * 0.6, avatarMərkəzY);
        ctx.lineTo(activeX + avatarSize * 0.6, avatarMərkəzY);
        ctx.closePath();
        ctx.fillStyle = lightGradient;
        ctx.fill();

        const avatarX = activeX - avatarSize / 2;
        if (avatarImgRef.current && avatarImgRef.current.complete) {
          ctx.beginPath();
          ctx.arc(activeX, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.save();
          ctx.clip();
          ctx.drawImage(avatarImgRef.current, avatarX, avatarY, avatarSize, avatarSize);
          ctx.restore();

          ctx.beginPath();
          ctx.arc(activeX, avatarY + avatarSize / 2, avatarSize / 2 + 1, 0, Math.PI * 2);
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#fcbf49';
          ctx.stroke();
        } else {
          ctx.font = '28px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🐯', activeX, avatarMərkəzY);
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

      for (let i = 0; i < vegetation.length; i++) {
        const item = vegetation[i];
        if (item.type === 'animal' && item.currentX && Math.sqrt((mX - item.currentX) ** 2 + (mY - item.currentY) ** 2) < 25) {
          setActiveAnimal({
            name: item.animalType.name,
            x: item.currentX,
            y: item.currentY - scrollY,
            fact: item.fact
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
              ? 'Bu Cəngəllik cığırı hələ kilidlidir. Əvvəlki dərsləri tamamla! 🔒'
              : target.type === 'lesson'
                ? 'Orta səviyyə mövzunun video izahı və konspekti. 📺'
                : `Bu tapşırıq sizə +${target.points} XP bəxş edəcək. Başlamağa hazırsınız? ⚔️`,
            x: nodeX,
            y: nodeY,
            isLeftSide,
            state: target.status,
            animal: assignedAnimal
          });
          return;
        }
      }
      setActiveNode(null);
    };

    const handleWheel = (e: WheelEvent) => {
      scrollY += e.deltaY * 0.75;
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
      <div className="flex h-screen items-center justify-center flex-col gap-3 bg-[#70e000]">
        <div className="w-10 h-10 border-4 border-[#fcbf49] border-t-transparent rounded-full animate-spin" />
        <p className="font-black text-emerald-900 text-xs tracking-wider animate-pulse uppercase">
          C++ Cəngəllik Dünyası Yüklənir...
        </p>
      </div>
    );
  }

  return (
    // 🎨 Arxa fon rəngləri tamamilə şəkildəki canlığa gətirildi (#80b918)
    <div className="flex justify-center bg-[#80b918] min-h-screen overflow-hidden font-sans select-none">
      {/* Əsas xəritə konteyneri və otluq zolaq tonu */}
      <div className="relative shadow-[0_0_80px_rgba(0,0,0,0.35)] bg-[#55a630]">

        {/* Geri Dönmə Düyməsi */}
        <button
          onClick={() => navigateTo('/student/dashboard')}
          className="absolute top-5 left-5 bg-white px-8 py-3.5 hover:translate-y-[-2px] cursor-pointer rounded-full border-b-[5px] border-slate-200 z-10 whitespace-nowrap text-emerald-800 font-black text-sm md:text-base shadow-lg tracking-wide transition-all"
        >
          🌲 Meşəyə Qayıt
        </button>

        {/* Üst Panel */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-white px-8 py-3.5 rounded-full border-b-[5px] border-amber-500 z-10 whitespace-nowrap text-slate-700 font-black text-sm md:text-base pointer-events-none shadow-lg tracking-wide uppercase">
          🐆 C++ Macərası <span className="text-amber-500 mx-2">•</span> Orta Səviyyə Cəngəllik
        </div>

        {/* Oyunlaşdırılmış İnfo Kart Modalı */}
        {activeNode && (
          <div
            className={`absolute p-0 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.35)] w-[380px] z-[100] transition-all duration-300 transform scale-100 hover:scale-[1.01] border-b-[8px] pointer-events-auto overflow-hidden flex flex-col
              ${activeNode.state === 'locked'
                ? 'bg-slate-100 border-slate-400 text-slate-500'
                : activeNode.type === 'lesson'
                  ? 'bg-gradient-to-br from-white to-emerald-50 border-emerald-400'
                  : 'bg-gradient-to-br from-white to-orange-50 border-orange-400'
              }
              ${activeNode.isLeftSide ? 'arrow-left' : 'arrow-right'}`}
            style={{
              left: activeNode.isLeftSide ? `${activeNode.x + 75}px` : `${activeNode.x - 380 - 75}px`,
              top: `${activeNode.y - 90}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={`px-5 py-2.5 text-[11px] font-black tracking-widest uppercase flex justify-between items-center text-white
              ${activeNode.state === 'locked'
                ? 'bg-slate-400'
                : activeNode.type === 'lesson'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600'
                  : 'bg-gradient-to-r from-orange-400 to-amber-500'
              }`}
            >
              <span className="truncate max-w-[240px]">{activeNode.moduleTitle}</span>
              <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-[10px]">
                {activeNode.state === 'locked' ? 'KİLİDLİ 🔒' : activeNode.type === 'lesson' ? 'VİDEO DƏRS 📺' : 'ARENA ⚔️'}
              </span>
            </div>

            <div className="p-5 flex gap-4 items-start relative flex-1">
              {activeNode.animal && (
                <div className="flex flex-col items-center flex-shrink-0 group">
                  <div className={`w-20 h-20 rounded-full overflow-hidden border-4 bg-white shadow-md transform transition-transform duration-300 group-hover:rotate-3 relative
                    ${activeNode.state === 'locked'
                      ? 'border-slate-300 grayscale opacity-70'
                      : activeNode.type === 'lesson' ? 'border-emerald-300' : 'border-amber-300'
                    }`}
                  >
                    <img
                      src={`${activeNode.animal.imagePath}`}
                      alt={activeNode.animal.name}
                      className="w-full h-full object-cover"
                    />
                    {activeNode.state === 'locked' && (
                      <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center text-xl">🔒</div>
                    )}
                  </div>
                  <span className={`text-[11px] font-black mt-2 px-2.5 py-0.5 rounded-md shadow-sm border
                    ${activeNode.state === 'locked'
                      ? 'bg-slate-200 border-slate-300 text-slate-500'
                      : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    {activeNode.animal.name}
                  </span>
                </div>
              )}

              <div className="flex-1 min-w-0 relative bg-white/60 p-3.5 rounded-2xl border border-slate-100 shadow-inner">
                <h3 className={`m-0 mb-1 text-base font-black leading-tight truncate
                  ${activeNode.state === 'locked'
                    ? 'text-slate-400'
                    : activeNode.type === 'lesson' ? 'text-emerald-600' : 'text-orange-600'
                  }`}
                >
                  {activeNode.type === 'lesson' ? '📖 ' : `${activeNode.displayNumber}. `}
                  {activeNode.title}
                </h3>

                <p className="m-0 text-slate-600 text-xs font-bold leading-relaxed mb-4 line-clamp-3">
                  {activeNode.state === 'locked'
                    ? "Dayan! 🛑 Bu sıx cəngəllik hələ təmizlənməyib. Keçid üçün əvvəlki orta səviyyə kodları tamamlamalısan!"
                    : activeNode.desc
                  }
                </p>

                {activeNode.state !== 'locked' ? (
                  <button
                    onClick={() => startTask(activeNode)}
                    className={`w-full text-white font-black text-xs text-center py-3 rounded-xl border-b-[4px] transition-all cursor-pointer uppercase tracking-widest active:border-b-0 active:translate-y-[4px]
                      ${activeNode.type === 'lesson'
                        ? 'bg-emerald-500 border-emerald-700 hover:bg-emerald-400'
                        : 'bg-orange-500 border-orange-700 hover:bg-orange-400'
                      }`}
                  >
                    {activeNode.type === 'lesson' ? 'DƏRSƏ BAX 📺' : 'CƏNGƏLLİYƏ ATIL 🚀'}
                  </button>
                ) : (
                  <div className="w-full bg-slate-200 text-slate-400 border-b-[4px] border-slate-300 font-black text-center py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-not-allowed">
                    SAYYAH KİLİDLİDİR 🔒
                  </div>
                )}
              </div>
            </div>

            <style jsx>{`
              .arrow-left::after {
                content: ''; position: absolute; top: 65px; left: -24px;
                border-width: 12px; border-style: solid;
                border-color: transparent ${activeNode.state === 'locked' ? '#94a3b8' : activeNode.type === 'lesson' ? '#10b981' : '#f97316'} transparent transparent;
              }
              .arrow-right::after {
                content: ''; position: absolute; top: 65px; right: -24px;
                border-width: 12px; border-style: solid;
                border-color: transparent transparent transparent ${activeNode.state === 'locked' ? '#94a3b8' : activeNode.type === 'lesson' ? '#10b981' : '#f97316'};
              }
            `}</style>
          </div>
        )}

        {/* HEYVAN INFO POPUP */}
        {activeAnimal && (
          <div
            className="absolute bg-amber-50 p-4 rounded-2xl shadow-xl border-2 border-amber-400 z-[110] w-[230px] text-center pointer-events-auto"
            style={{
              left: `${activeAnimal.x - 110}px`,
              top: `${activeAnimal.y - 100}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-amber-400"></div>
            <span className="text-xs font-black text-amber-600 uppercase tracking-wider block mb-1">
              {activeAnimal.name} öyrədir:
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