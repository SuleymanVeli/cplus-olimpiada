import { NextResponse, NextRequest } from 'next/server';
import connectDB from '@/src/lib/dbConnect';
import Game from '@/src/models/Game';
import UserProgress from '@/src/models/UserProgress';

export async function GET(
  req: NextRequest, 
  { params }:  { params: Promise<{ id: string }> } 
) {
  try {
    await connectDB();
   if (!req.nextUrl.searchParams.has('userId')) {
      return NextResponse.json({ success: false, message: "userId query parameter is required." }, { status: 400 });
    }
  
    const userId = req.nextUrl.searchParams.get('userId')!;
    const { id } = await params;

    // 1. Oyunun məlumatlarını (Arena, StartX, TargetX və s.) alırıq
    const game = await Game.findById(id);
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

    // 2. Şagirdin həmin oyundakı keçmişini/vəziyyətini tapırıq
    const progress = await UserProgress.findOne({ userId: userId });
    
    // Şagirdin bu oyunu daha əvvəl oynayıb-oynamadığını yoxlayırıq
    const playedData = progress?.playedGames.find(
      (g: any) => g.gameId.toString() === id
    );

    // 3. Frontend-ə lazım olan tam paket
    return NextResponse.json({
      gameData: {
        title: game.title,
        instructionText: game.instructionText,
        mapLayout: game.mapLayout,
        startX: game.startX,
        startY: game.startY,
        startDirection: game.startDirection,
        targetX: game.targetX,
        targetY: game.targetY,
        collectibles: game.collectibles
      },
      userStatus: {
        hasPlayed: !!playedData,
        bestCode: playedData?.submittedCode || null, // Əvvəlki uğurlu kodunu bərpa etmək üçün
        earnedPoints: playedData?.pointsEarned || 0
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Data fetch failed' }, { status: 500 });
  }
}