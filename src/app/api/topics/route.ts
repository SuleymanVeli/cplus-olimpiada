import { NextRequest, NextResponse } from 'next/server';
import Topic from '@/models/GameTopic';
import Level from '@/models/GameLevel'; 
import UserGameProgress from '@/models/UserGameProgress'; // Progress modelini daxil edirik
import dbConnect from '@/src/lib/dbConnect';


export async function GET(req: NextRequest) {
  try {
        await  dbConnect();


    // 1. URL-dən userId parametrini təhlükəsiz şəkildə götürürük
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    // 2. İlk növbədə bazadakı bütün Mövzu və Səviyyələri əlaqəli şəkildə çəkirik
    const roadmap = await Topic.aggregate([
      {
        $sort: { order: 1 } // Mövzuları sırayla düzürük
      },
      {
        $lookup: {
          from: 'gamelevels',      // MongoDB-dəki kolleksiya adı
          localField: '_id',
          foreignField: 'topicId',
          as: 'levels'
        }
      },
      {
        $addFields: {
          levels: {
            $sortArray: { input: "$levels", sortBy: { order: 1 } } // Levelləri öz daxilində sıralayırıq
          }
        }
      }
    ]);

    // 3. Əgər userId yoxdursa və ya şagird sistemə girməyibsə, hamısını kilidli (ilk mövzu və level hariç) göstər
    if (!userId) {
      const defaultRoadmap = roadmap.map((topic, tIdx) => ({
        ...topic,
        isUnlocked: tIdx === 0, // Yalnız ilk mövzu açıqdır
        isCompleted: false,
        levels: topic.levels.map((level, lIdx) => ({
          ...level,
          isUnlocked: tIdx === 0 && lIdx === 0, // Yalnız ilk mövzunun ilk leveli açıqdır
          isCompleted: false,
          earnedPoints: 0
        }))
      }));
      return NextResponse.json({ games: defaultRoadmap }, { status: 200 });
    }

    // 4. Şagirdin mövcud progress məlumatlarını bazadan çəkirik
    const userProgress = await UserGameProgress.findOne({ userId });

    // 5. 🧠 Progress datası ilə əsas Xəritəni (Roadmap) sinxronlaşdırırıq
    const dynamicRoadmap = roadmap.map((topic, topicIndex) => {
      // Şagirdin bu mövzu üzrə daxili progress qeydi varmı?
      const userTopicProgress = userProgress?.topicsProgress?.find(
        (t: any) => t.topicId.toString() === topic._id.toString()
      );

      // Mövzunun açıq olma məntiqi: 
      // Ya bu ilk mövzudur (order: 1), ya admin tərəfindən kilidi açılıb (isUnlocked), ya da əvvəlki mövzu bitib.
      let isTopicUnlocked = topicIndex === 0; 
      if (userTopicProgress) {
        isTopicUnlocked = userTopicProgress.isUnlocked;
      } else if (topicIndex > 0) {
        // Əgər progress massivində bu mövzu hələ yoxdursa, bir əvvəlki mövzunun bitib-bitmədiyini yoxla
        const prevTopic = roadmap[topicIndex - 1];
        const prevTopicProgress = userProgress?.topicsProgress?.find(
          (t: any) => t.topicId.toString() === prevTopic._id.toString()
        );
        if (prevTopicProgress?.isCompleted) {
          isTopicUnlocked = true;
        }
      }

      const isTopicCompleted = userTopicProgress ? userTopicProgress.isCompleted : false;

      // İndi isə Mövzunun daxilindəki hər bir Leveli tək-tək yoxlayırıq
      const processedLevels = topic.levels.map((level, levelIndex) => {
        const completedRecord = userTopicProgress?.completedLevels?.find(
          (l: any) => l.levelId.toString() === level._id.toString()
        );

        const isLevelCompleted = !!completedRecord;
        const earnedPoints = completedRecord ? completedRecord.earnedPoints : 0;

        // Levelin açıq olma şərti:
        // 1. Aid olduğu mövzu mütləq açıq olmalıdır.
        // 2. Ya mövzunun ilk səviyyəsidir (index 0), ya da bir əvvəlki səviyyə şagird tərəfindən tamamlanıb.
        let isLevelUnlocked = false;
        if (isTopicUnlocked) {
          if (levelIndex === 0) {
            isLevelUnlocked = true; // Mövzu açıqdırsa, ilk level həmişə açıqdır
          } else {
            // Bir əvvəlki levelin tamamlanma vəziyyətinə baxırıq
            const prevLevel = topic.levels[levelIndex - 1];
            const isPrevLevelCompleted = userTopicProgress?.completedLevels?.some(
              (l: any) => l.levelId.toString() === prevLevel._id.toString()
            );
            if (isPrevLevelCompleted) {
              isLevelUnlocked = true;
            }
          }
        }

        return {
          ...level,
          isUnlocked: true, //isLevelUnlocked,
          isCompleted: isLevelCompleted,
          earnedPoints
        };
      });

      return {
        ...topic,
        isUnlocked: isTopicUnlocked,
        isCompleted: isTopicCompleted,
        levels: processedLevels
      };
    });

    return NextResponse.json({ games: dynamicRoadmap, totalGamePoints: userProgress?.totalGamePoints || 0 }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}