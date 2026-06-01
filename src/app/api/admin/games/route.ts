import { NextResponse } from 'next/server';
import  dbConnect  from '@/lib/dbConnect'; // Sizin bazaya qoşulma utiliniz
import  Game  from '@/models/Game';
import Module from '@/src/models/Module';

// 1. GET: Seçilmiş Modula aid Oyun Arenalarını gətirir
export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');

    if (!moduleId) {
      return NextResponse.json({ success: false, message: "moduleId qeyd olunmayıb!" }, { status: 400 });
    }

    // Oyunları sıra nömrəsinə (order) görə sıralayırıq
    const games = await Game.find({ moduleId }).sort({ order: 1 });
    
    return NextResponse.json({ success: true, data: games });
  } catch (error: any) {
    console.error("Games GET Error:", error);
    return NextResponse.json({ success: false, message: "Server xətası baş verdi." }, { status: 500 });
  }
}

// 2. POST: Yeni Oyun Arenası yaradır
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    const { 
      moduleId, title, instructionText, points, order, 
      startX, startY, startDirection, targetX, targetY, 
      mapLayout, collectibles 
    } = body;

    // Strict Validasiyalar
    if (!moduleId || !title?.trim() || !instructionText?.trim() || !mapLayout) {
      return NextResponse.json({ success: false, message: "Məcburi sahələr doldurulmayıb!" }, { status: 400 });
    }

    // Matris ölçüsünü yoxlayırıq (Mütləq 5x5 olmalıdır)
    if (!Array.isArray(mapLayout) || mapLayout.length !== 5 || mapLayout.some(row => row.length !== 5)) {
      return NextResponse.json({ success: false, message: "Xəritə formatı mütləq 5x5 matris olmalıdır!" }, { status: 400 });
    }

    // Sıra nömrəsinin unikal olub-olmamasını yoxlayırıq
    const existingOrder = await Game.findOne({ moduleId, order });
    if (existingOrder) {
      return NextResponse.json({ success: false, message: `Bu modulda ${order} nömrəli arena artıq mövcuddur!` }, { status: 400 });
    }

    const newGame = await Game.create({
      moduleId,
      title,
      instructionText,
      points: points || 20,
      order,
      startX,
      startY,
      startDirection,
      targetX,
      targetY,
      mapLayout,
      collectibles: collectibles || []
    });

     await Module.findByIdAndUpdate(body.moduleId, {
          $push: { games: newGame._id }
        });

    return NextResponse.json({ success: true, data: newGame }, { status: 201 });
  } catch (error: any) {
    console.error("Games POST Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server xətası." }, { status: 500 });
  }
}