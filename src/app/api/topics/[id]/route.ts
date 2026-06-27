import { NextRequest, NextResponse } from 'next/server';
import Level from '@/models/GameLevel';
import UserGameProgress from '@/models/UserGameProgress';
import dbConnect from '@/src/lib/dbConnect';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await  dbConnect();
    
    // 1. Level ID-ni Next.js standartına uyğun unwrap edirik
    const params = await context.params;
    const id = params.id; 

    if (!id) {
      return NextResponse.json({ error: "Level ID tapılmadı!" }, { status: 400 });
    }

    // 2. URL-dən userId-ni götürürük (/api/game/level/[id]?userId=XXXXX)
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    // 3. Bazadan əsas Level məlumatını çəkirik
    const levelData = await Level.findById(id).lean() as any;

    if (!levelData) {
      return NextResponse.json({ error: "Belə bir arena mövcud deyil!" }, { status: 404 });
    }

    // Səhv baş verməməsi üçün ilkin fərdiləşdirilmiş xüsusiyyətlər
    let isUnlocked = false;
    let isCompleted = false;
    let previousBestCode = "";
    let previousEarnedPoints = 0;

    // 4. Əgər şagird giriş edibsə, onun progressini yoxlayırıq
    if (userId) {
      const userProgress = await UserGameProgress.findOne({ userId });

      if (userProgress) {
        // Bu levelin aid olduğu mövzunun progressini tapırıq
        const topicProg = userProgress.topicsProgress.find(
          (t: any) => t.topicId.toString() === levelData.topicId.toString()
        );

        // Məsələlərin verilənlər bazasındakı ümumi siyahısına baxıb kilid vəziyyətini tapırıq
        if (topicProg) {
          // Şagird bu leveli əvvəl tamamlayıb?
          const completedRecord = topicProg.completedLevels.find(
            (l: any) => l.levelId.toString() === id
          );

          if (completedRecord) {
            isUnlocked = true;
            isCompleted = true;
            previousBestCode = completedRecord.bestCode || "";
            previousEarnedPoints = completedRecord.earnedPoints || 0;
          } else {
            // Əgər tamamlamayıbsa, bəlkə mövzunun elə ilk levelidir? Ya da əvvəlki leveli keçib?
            // Eyni mövzuya aid bütün levelləri order-ə görə sıralayıb tapırıq
            const allTopicLevels = await Level.find({ topicId: levelData.topicId }).sort({ order: 1 }).select('_id');
            const currentLevelIndex = allTopicLevels.findIndex((l: any) => l._id.toString() === id);

            if (currentLevelIndex === 0 && topicProg.isUnlocked) {
              // Mövzu açıqdırsa və mövzunun ilk levelidirə -> Açıqdır
              isUnlocked = true;
            } else if (currentLevelIndex > 0) {
              // Bir əvvəlki levelin tamamlanıb-tamamlanmadığını yoxlayırıq
              const prevLevelId = allTopicLevels[currentLevelIndex - 1]._id.toString();
              const isPrevCompleted = topicProg.completedLevels.some((l: any) => l.levelId.toString() === prevLevelId);
              if (isPrevCompleted) {
                isUnlocked = true;
              }
            }
          }
        } else {
          // Əgər topicsProgress-də hələ bu mövzu yoxdursa, amma bazada bu ümumiyyətlə İLK mövzu daxilindəki İLK leveldirsə:
          // (Yeni qeydiyyatdan keçən uşaqlar üçün sığorta)
          const allTopicLevels = await Level.find({ topicId: levelData.topicId }).sort({ order: 1 }).select('_id');
          if (allTopicLevels.length > 0 && allTopicLevels[0]._id.toString() === id) {
            // Eyni zamanda mövzunun özünün ilk mövzu olub olmadığını yoxlaya bilərsən, sadəlik üçün bura true veririk
            isUnlocked = true; 
          }
        }
      } else {
        // Əgər progress sənədi ümumiyyətlə yoxdursa, yenə də ilk mərhələyə icazə veririk
        isUnlocked = true;
      }
    } else {
      // userId göndərilməyibsə (məsələn qonaq rejim), hər ehtimala qarşı açırıq, amma data yadda qalmayacaq
      isUnlocked = true;
    }

    // 5. Orijinal level məlumatına şagirdin şəxsi göstəricilərini əlavə edib göndəririk
    const personalizedData = {
      ...levelData,
      isUnlocked,
      isCompleted,
      previousBestCode,
      previousEarnedPoints
    };

    console.log(personalizedData)

    return NextResponse.json({ data: personalizedData }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}