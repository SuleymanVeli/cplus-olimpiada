import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect'; // Sənin DB bağlantı funksiyan (yaxud connectDB məntiqin)
import UserGameProgress from '@/models/UserGameProgress';
import Level from '@/models/GameLevel';
import Topic from '@/models/GameTopic';


export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // 1. Frontend-dən gələn JSON məlumatını oxuyuruq
    const body = await req.json();
    const { userId, levelId, earnedPoints, bestCode } = body;

    if (!userId || !levelId) {
      return NextResponse.json({ success: false, message: 'Əskik parametrlər!' }, { status: 400 });
    }

    // 2. Cari Level-i və onun aid olduğu Topic-i bazadan tapırıq
    const currentLevel = await Level.findById(levelId);
    if (!currentLevel) {
      return NextResponse.json({ success: false, message: 'Level tapılmadı!' }, { status: 404 });
    }
    const { topicId, order: currentLevelOrder } = currentLevel;

    // 3. Şagirdin mövcud progress sənədini tapırıq və ya ilk dəfədirsə yaradırıq
    let progress = await UserGameProgress.findOne({ userId });
    if (!progress) {
      progress = new UserGameProgress({ userId, topicsProgress: [] });
    }

    // 4. Cari Topic-in progress massivində olub-olmadığını yoxlayırıq
    let topicProg = progress.topicsProgress.find((t: any) => t.topicId.toString() === topicId.toString());
    
    if (!topicProg) {
      // Əgər bu topic siyahıda yox idisə (məsələn, ilk səviyyədirsə), əlavə edirik
      topicProg = { topicId, isUnlocked: true, isCompleted: false, completedLevels: [] };
      progress.topicsProgress.push(topicProg);
      // Mongoose massivə push olunmağı bilsin deyə yenidən referansını götürürük
      topicProg = progress.topicsProgress[progress.topicsProgress.length - 1];
    }

    // 5. Şagird bu leveli əvvəl keçibmi?
    const oldLevelRecord = topicProg.completedLevels.find((l: any) => l.levelId.toString() === levelId.toString());
    let pointsDifference = 0;

    if (oldLevelRecord) {
      // Əgər əvvəl keçibsə və indi daha yüksək bal alıbsa, balını yeniləyirik (Highscore məntiqi)
      if (earnedPoints > oldLevelRecord.earnedPoints) {
        pointsDifference = earnedPoints - oldLevelRecord.earnedPoints;
        oldLevelRecord.earnedPoints = earnedPoints;
        oldLevelRecord.bestCode = bestCode;
        oldLevelRecord.completedAt = new Date();
      }
    } else {
      // İlk dəfə keçirsə, massivə yazırıq və qazanılan balı birbaşa əlavə edirik
      topicProg.completedLevels.push({
        levelId,
        earnedPoints,
        bestCode,
        isCompleted: true,
        completedAt: new Date()
      });
      pointsDifference = earnedPoints;
    }

    // İstifadəçinin ümumi oyun xalını artırırıq
    progress.totalGamePoints += pointsDifference;

    // 6. 🧠 DINAMIK NÖVBƏTİ LEVEL VƏ TOPIC HESABLANMASI
    // Cari mövzuda, cari levelin order-indən böyük olan NÖVBƏTİ İLK LEVEL-İ tapırıq
    const nextLevel = await Level.findOne({
      topicId,
      order: { $gt: currentLevelOrder }
    }).sort({ order: 1 });

    let nextLevelId = null;
    let nextTopicId = null;

    if (nextLevel) {
      // Əgər eyni mövzuda növbəti level varsa, onun İD-sini götürürük
      nextLevelId = nextLevel._id;
      nextTopicId = topicId;
    } else {
      // Mövzu bitdi! Bu mövzunu tamamlandı olaraq işarələyirik
      topicProg.isCompleted = true;

      // Cari Topic-in order dəyərini tapırıq
      const currentTopic = await Topic.findById(topicId);
      
      if (currentTopic) {
        // Növbəti mövzunu tapırıq (Cari mövzunun order-indən böyük olan ilk mövzu)
        const nextTopic = await Topic.findOne({
          order: { $gt: currentTopic.order }
        }).sort({ order: 1 });

        if (nextTopic) {
          nextTopicId = nextTopic._id;
          
          // Növbəti mövzunun progressini yoxlayırıq, yoxdursa kilidini açıq (`isUnlocked: true`) şəkildə əlavə edirik
          let nextTopicProg = progress.topicsProgress.find((t: any) => t.topicId.toString() === nextTopic._id.toString());
          if (!nextTopicProg) {
            progress.topicsProgress.push({
              topicId: nextTopic._id,
              isUnlocked: true,
              isCompleted: false,
              completedLevels: []
            });
          } else {
            nextTopicProg.isUnlocked = true;
          }

          // Növbəti mövzunun ilk levelini tapırıq
          const firstLevelOfNextTopic = await Level.findOne({ topicId: nextTopic._id }).sort({ order: 1 });
          if (firstLevelOfNextTopic) {
            nextLevelId = firstLevelOfNextTopic._id;
          }
        }
      }
    }

    // 7. Sonuncu oynanılan yeri yeniləyirik
    progress.lastPlayed = {
      topicId: topicId,
      levelId: levelId
    };

    // 🧠 Mongoose-a dərin daxili massivlərin dəyişdiyini xəbər veririk (Sığorta)
    progress.markModified('topicsProgress');

    // Dəyişiklikləri bazaya yazırıq
    await progress.save();

    return NextResponse.json({
      success: true,
      message: 'Təbrik edirik! Progress yadda saxlanıldı.',
      data: {
        totalGamePoints: progress.totalGamePoints,
        nextLevelId,
        nextTopicId,
        topicCompleted: !nextLevel
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Progress API Route Xətası:', error);
    return NextResponse.json({ success: false, message: 'Server daxili xətası!', error: error.message }, { status: 500 });
  }
}