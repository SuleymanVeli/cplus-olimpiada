import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/src/lib/dbConnect';
import Game from '@/src/models/Game';
import UserProgress from '@/src/models/UserProgress';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

      if (!req.nextUrl.searchParams.has('userId')) {
      return NextResponse.json({ success: false, message: "userId query parameter is required." }, { status: 400 });
    }
  
    const userId = req.nextUrl.searchParams.get('userId')!;

    // 2. Şagirdin tərəqqisini tapırıq
    const progress = await UserProgress.findOne({ userId: userId });
    if (!progress) {
      return NextResponse.json({ games: [] });
    }

    // 3. Yalnız bitirdiyi modulların ID-lərini götürürük
    const completedModuleIds = progress.completedModules;

    // 4. Həmin modullara bağlı olan oyunları tapırıq
    // Məntiq: Oyunun moduleId-si şagirdin completedModules array-ində varsa, onu qaytar
  const availableGames = await Game.find({
      moduleId: { $in: completedModuleIds }
    }).sort({ order: 1 });

    // 5. Oyunları formatlayırıq: Bitirilib-bitirilmədiyini işarələyirik
    const gamesWithStatus = availableGames.map(game => ({
      ...game.toObject(),
      isCompleted: progress.completedGames.includes(game._id) // Boolean: true/false
    }));

    return NextResponse.json({ games: gamesWithStatus });
  } catch (error) {
    console.error('Games fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}