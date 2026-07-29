import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/src/lib/dbConnect';
import Module from '@/src/models/Module';
import Task from '@/src/models/Task';
import UserProgress from '@/src/models/UserProgress';
import User from '@/src/models/User';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const userId = req.nextUrl.searchParams.get('userId');
    const level = parseInt(req.nextUrl.searchParams.get('level') || '1', 10);

    if (!userId) {
      return NextResponse.json({ success: false, message: "userId vacibdir." }, { status: 400 });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ success: false, message: "İstifadəçi tapılmadı." }, { status: 404 });
    }

    const maxWeeklyLimit = user.weeklyModuleLimit || 2;

    const weeklyDays = user.weeklyLessonDays || 7;

    const allModules = await Module.find({ level })
      .sort({ order: 1 })
      .populate({ path: 'tasks', model: Task })
      .lean();

    let progress = await UserProgress.findOne({ userId, level });

    const now = new Date();

    // Əgər progress yoxdursa yaradılır (İlk giriş tarixi qeyd olunur)
    if (!progress && allModules.length > 0) {
      progress = await UserProgress.create({
        userId,
        totalXp: 0,
        currentModuleId: allModules[0]._id,
        currentTaskOrder: 0,
        completedLessons: [],
        completedTasks: [],
        completedModules: [],
        solvedTasks: [],
        level,
        unlockedModulesThisWeek: 0, // İlk modul açıq başlayır
        weekStartDate: now // İlk girişdə 7 günlük taymer başlayır
      });
    }

    // -------------------------------------------------------------
    // HƏFTƏLİK LİMİTİN "GET" ZAMANI SIFIRLANMASI
    // -------------------------------------------------------------
    const weekStart = new Date(progress.weekStartDate || now);
    const diffInDays = (now.getTime() - weekStart.getTime()) / (1000 * 3600 * 24);

    if (diffInDays >= weeklyDays) {
      progress.unlockedModulesThisWeek = 0;
      progress.weekStartDate = now;
      await progress.save();
    }

    const isWeeklyLimitReached = progress.unlockedModulesThisWeek >= maxWeeklyLimit;

    // -------------------------------------------------------------
    // MODUL PƏNCƏRƏSİNİ (3-4 MODUL) MƏRKƏZLƏŞDİRMƏ
    // -------------------------------------------------------------
    const currentModIdStr = progress.currentModuleId?.toString();

    // Cari aktiv modulun indeksini tapırıq
    let currentIndex = allModules.findIndex(
      (m: any) => m._id.toString() === currentModIdStr
    );

    // Əgər kurs bitibsə və ya tapılmayıbsa, sonuncu modula fokuslanırıq
    if (currentIndex === -1) {
      currentIndex = allModules.length - 1;
    }

    // Pəncərə Hesablanması: Cari moduldan 1 geridəki moduldan başlayıb, ümumi 4 modul götürürük
    // Məsələn: Index 2-dəyiksə -> [1, 2, 3, 4] modulları görünəcək.
    const RANGE_BEFORE = 1; // Geridə neçə modul olsun
    const TOTAL_VISIBLE_MODULES = 4; // Ümumi göstəriləcək modul sayı

    let startIndex = Math.max(0, currentIndex - RANGE_BEFORE);
    let endIndex = startIndex + TOTAL_VISIBLE_MODULES;

    // Massiv sərhədini aşmamaq üçün tənzimləmə
    if (endIndex > allModules.length) {
      endIndex = allModules.length;
      startIndex = Math.max(0, endIndex - TOTAL_VISIBLE_MODULES);
    }

    const visibleModules = allModules.slice(startIndex, endIndex);

    // -------------------------------------------------------------
    // NODELARIN MƏNTİQİ (Yalniz seçilmiş visibleModules üçün)
    // -------------------------------------------------------------
    const flatNodes: any[] = [];
    const compTasks = progress.completedTasks.map((id: any) => id.toString());
    const compLessons = progress.completedLessons.map((id: any) => id.toString());
    const compModules = progress.completedModules.map((id: any) => id.toString());

    // GET Route faylınızdakı ilgili hissələr:

    // Həftəlik sıfırlanmaya qalan tam milisaniyə
    const remainingMs = Math.max(0, (weeklyDays * 24 * 60 * 60 * 1000) - (now.getTime() - weekStart.getTime()));

    visibleModules.forEach((mod: any) => {
      const isCurrentModul = currentModIdStr === mod._id.toString();
      const isModuleCompleted = mod.order < allModules.find((m: any) => m._id.toString() === currentModIdStr)?.order;

      // Limit dolubsa və modul bitməyibsə -> 'weekly_locked'
      const forceLockDueToLimit = isWeeklyLimitReached && !isModuleCompleted;

      // 1. LESSON NODE STATUS
      let lessonStatus: 'completed' | 'active' | 'locked' | 'weekly_locked' = 'locked';
      const isLessonCompleted = compLessons.includes(mod._id.toString());

      if (isLessonCompleted) {
        lessonStatus = 'completed';
      } else if (isCurrentModul && progress.currentTaskOrder === 0) {
        lessonStatus = forceLockDueToLimit ? 'weekly_locked' : 'active';
      }

      flatNodes.push({
        _id: mod._id,
        type: 'lesson',
        title: `${mod.title} (Mühazirə)`,
        moduleTitle: mod.title,
        status: lessonStatus,
        remainingMs, // Qalan dəqiq vaxt (ms)
        points: 0
      });

      // 2. TASK NODES STATUS
      if (mod.tasks && Array.isArray(mod.tasks)) {
        const sortedTasks = [...mod.tasks].sort((a, b) => a.order - b.order);

        sortedTasks.forEach((task: any) => {
          const isTaskCompleted = isModuleCompleted || (isCurrentModul && task.order < progress.currentTaskOrder);
          let taskStatus: 'completed' | 'active' | 'locked' | 'weekly_locked' = 'locked';

          if (isTaskCompleted) {
            taskStatus = 'completed';
          } else if (isCurrentModul && task.order === progress.currentTaskOrder) {
            taskStatus = forceLockDueToLimit ? 'weekly_locked' : 'active';
          }

          flatNodes.push({
            _id: task._id,
            type: 'task',
            title: task.title,
            moduleTitle: mod.title,
            status: taskStatus,
            remainingMs, // Qalan dəqiq vaxt (ms)
            points: task.points,
          });
        });
      }
    });

    return NextResponse.json({
      success: true,
      pagination: {
        totalModules: allModules.length,
        visibleRange: {
          startModuleIndex: startIndex + 1,
          endModuleIndex: endIndex
        },
        hasPreviousModules: startIndex > 0,
        hasNextModules: endIndex < allModules.length
      },
      weeklyLimitInfo: {
        maxWeeklyLimit,
        unlockedThisWeek: progress.unlockedModulesThisWeek,
        isWeeklyLimitReached,
        daysUntilReset: Math.max(0, Math.ceil(7 - diffInDays))
      },
      data: flatNodes
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}