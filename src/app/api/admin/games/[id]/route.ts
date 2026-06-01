import { NextResponse } from 'next/server';
import  dbConnect  from '@/lib/dbConnect';
import Game  from '@/models/Game';

// 1. PUT: Mövcud Oyun Arenasını redaktə edir
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const gameId = params.id;
    const body = await request.json();

    const { 
      title, instructionText, points, order, 
      startX, startY, startDirection, targetX, targetY, 
      mapLayout, collectibles, moduleId 
    } = body;

    // Yoxlayırıq belə bir oyun var ya yox
    const currentGame = await Game.findById(gameId);
    if (!currentGame) {
      return NextResponse.json({ success: false, message: "Oyun arenası tapılmadı!" }, { status: 404 });
    }

    // Əgər sıra nömrəsi (order) dəyişibsə, başqa bir oyunla toqquşub-toqquşmadığını yoxlayırıq
    if (order !== currentGame.order) {
      const targetModuleId = moduleId || currentGame.moduleId;
      const duplicateOrder = await Game.findOne({ moduleId: targetModuleId, order, _id: { $ne: gameId } });
      if (duplicateOrder) {
        return NextResponse.json({ success: false, message: `Bu modulda ${order} nömrəli arena artıq başqa bir oyuna təyin edilib!` }, { status: 400 });
      }
    }

    // Məlumatları yeniləyirik
    const updatedGame = await Game.findByIdAndUpdate(
      gameId,
      {
        title,
        instructionText,
        points,
        order,
        startX,
        startY,
        startDirection,
        targetX,
        targetY,
        mapLayout,
        collectibles: collectibles || []
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: updatedGame });
  } catch (error: any) {
    console.error("Games PUT Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Yenilənmə zamanı xəta." }, { status: 500 });
  }
}

// 2. DELETE: Oyun Arenasını silir (Ehtiyac olarsa admin paneldən çağırmaq üçün)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const gameId = params.id;

    const deletedGame = await Game.findByIdAndDelete(gameId);
    if (!deletedGame) {
      return NextResponse.json({ success: false, message: "Silinəcək oyun arenası tapılmadı!" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Oyun arenası uğurla silindi." });
  } catch (error: any) {
    console.error("Games DELETE Error:", error);
    return NextResponse.json({ success: false, message: "Silinmə zamanı server xətası." }, { status: 500 });
  }
}