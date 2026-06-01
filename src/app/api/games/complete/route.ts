import { NextResponse } from 'next/server';
import connectDB from '@/src/lib/dbConnect';
import UserProgress from '@/models/UserProgress'; // Sizin yuxarıda yazdığınız model

export async function POST(req: Request) {
  try {
    await connectDB();
    const { userId, gameId, points, code } = await req.json();

    // 1. İstifadəçinin tərəqqisini tapırıq və yeniləyirik
    const updatedProgress = await UserProgress.findOneAndUpdate(
      { userId: userId },
      {
        // 🚀 Total XP-ni artırırıq
        $inc: { totalXp: points },
        
        // 🚀 Əgər bu oyun hələ bitməyibsə, ID-ni array-ə əlavə edirik ($addToSet dublikatın qarşısını alır)
        $addToSet: { completedGames: gameId },
        
        // 🚀 Detallı oyun tarixçəsinə yeni qeydi əlavə edirik
        $push: {
          playedGames: {
            gameId: gameId,
            submittedCode: code,
            pointsEarned: points,
            playedAt: new Date()
          }
        }
      },
      { new: true } // Yenilənmiş məlumatı qaytarır
    );

    if (!updatedProgress) {
      return NextResponse.json({ message: "İstifadəçi tərəqqisi tapılmadı" }, { status: 404 });
    }

    return NextResponse.json({ success: true, totalXp: updatedProgress.totalXp });
  } catch (error) {
    console.error("Progress save error:", error);
    return NextResponse.json({ success: false, message: "Server xətası" }, { status: 500 });
  }
}