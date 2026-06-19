import { NextResponse, NextRequest } from 'next/server';
import connectDB from '@/src/lib/dbConnect';
import Game from '@/src/models/Game';
import UserProgress from '@/src/models/UserProgress';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    //   await connectDB();
    //  if (!req.nextUrl.searchParams.has('userId')) {
    //     return NextResponse.json({ success: false, message: "userId query parameter is required." }, { status: 400 });
    //   }

    //   const userId = req.nextUrl.searchParams.get('userId')!;
    //   const { id } = await params;

    //   // 1. Oyunun məlumatlarını (Arena, StartX, TargetX və s.) alırıq
    //   const game = await Game.findById(id);
    //   if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

    //   // 2. Şagirdin həmin oyundakı keçmişini/vəziyyətini tapırıq
    //   const progress = await UserProgress.findOne({ userId: userId });

    //   // Şagirdin bu oyunu daha əvvəl oynayıb-oynamadığını yoxlayırıq
    //   const playedData = progress?.playedGames.find(
    //     (g: any) => g.gameId.toString() === id
    //   );

    //   // 3. Frontend-ə lazım olan tam paket
    //   return NextResponse.json({
    //     gameData: {
    //       title: game.title,
    //       instructionText: game.instructionText,
    //       mapLayout: game.mapLayout,
    //       startX: game.startX,
    //       startY: game.startY,
    //       startDirection: game.startDirection,
    //       targetX: game.targetX,
    //       targetY: game.targetY,
    //       collectibles: game.collectibles,
    //       order: game.order
    //     },
    //     userStatus: {
    //       hasPlayed: !!playedData,
    //       bestCode: playedData?.submittedCode || null, // Əvvəlki uğurlu kodunu bərpa etmək üçün
    //       earnedPoints: playedData?.pointsEarned || 0
    //     }
    //   });

    const MOCK_LEVEL_DATA: any = {
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
        [1, 0, 0, 0, 0, 4, 13, 0, 5, 1], // (2,1)-də qutu, (4,1)-də terminal, (8,1)-də finiş
        [1, 0, 1, 1, 12, 1, 0, 1, 0, 1],
        [1, 0, 10, 0, 2, 0, 0, 0, 11, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
      ],

      // Qutunun altındakı xanada (2,1) int 99 var. (3,1) xanasında isə digər int 50 var.
      xanaYazilari: [
        ["", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", ""],
        ["", "sol", "", "123", "", "5.12", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", ""]
      ],

      xanaTipleri: [
        ["", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", ""],
        ["", "string", "", "int", "", "double", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", ""]
      ],

      // Test üçün dinamik xal sistemi: Şagird fərqli kombinasiyalar yaza bilər
      xalSistemi: [
        { cavab: "149", verilecekXal: 150, mesaj: "Mükəmməl! Hər iki ədədi düzgün topladın!" },
        { cavab: "99", verilecekXal: 90, mesaj: "Yaxşı cəhd, amma növbəti xanadakı ədədi unutmusan!" }
      ],

      
      hasWriteTask: true,
      requiredWrites: [
        { x: 2, y: 1, expected: "1" },
        { x: 3, y: 1, expected: "2" },
        { x: 4, y: 1, expected: "3" },
      ]
    };

    return NextResponse.json({
      data: MOCK_LEVEL_DATA

    })
  } catch (error) {
    return NextResponse.json({ error: 'Data fetch failed' }, { status: 500 });
  }
}