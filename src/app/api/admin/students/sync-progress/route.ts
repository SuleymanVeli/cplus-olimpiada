import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/dbConnect';
import UserProgress from '@/src/models/UserProgress';
import Module from '@/src/models/Module';
import Task from '@/src/models/Task';

// Sizin mövcud funksiyanız (eynilə bura daxil edirik və ya export etmisinizsə import edin)
async function calculateNextProgress(progress: any, level: string) {
  const modules = await Module.find({ level }).sort({ order: 1 });

  const completedLessons = progress.completedLessons.map((id: any) => id.toString());
  const completedTasks = progress.completedTasks.map((id: any) => id.toString());

  for (const module of modules) {
    if (!completedLessons.includes(module._id.toString())) {
      return { moduleId: module._id, taskOrder: 0 };
    }

    const tasks = await Task.find({ moduleId: module._id }).sort({ order: 1 });
    const unfinishedTask = tasks.find(task => !completedTasks.includes(task._id.toString()));

    if (unfinishedTask) {
      return { moduleId: module._id, taskOrder: unfinishedTask.order };
    }
  }

  return { moduleId: null, taskOrder: 999 };
}

export async function POST(request: Request) {
  await dbConnect();

  try {
    // Bütün şagirdlərin progress sənədlərini gətiririk
    const allProgress = await UserProgress.find({});
    let updatedCount = 0;

    for (let progress of allProgress) {
      // Hər bir istifadəçinin öz səviyyəsinə görə növbəti addımını yenidən hesablayırıq
      const next = await calculateNextProgress(progress, progress.level);

      // Əgər fərqlilik varsa, yeniləyirik
      if (
        String(progress.currentModuleId) !== String(next.moduleId) ||
        progress.currentTaskOrder !== next.taskOrder
      ) {
        progress.currentModuleId = next.moduleId;
        progress.currentTaskOrder = next.taskOrder;

        // Əgər təzə modul gəlibsə və modul tamamlanma loqikanız varsa bura da tətbiq edilə bilər
        if (next.moduleId) {
          const currentModule = await Module.findById(next.moduleId);
          if (currentModule) {
            const moduleTasks = await Task.find({ moduleId: currentModule._id });
            const allDone = moduleTasks.every(t =>
              progress.completedTasks.some((x: any) => x.toString() === t._id.toString())
            );

            if (allDone) {
              const already = progress.completedModules.some((x: any) => x.toString() === currentModule._id.toString());
              if (!already) {
                progress.completedModules.push(currentModule._id);
              }
            }
          }
        }

        await progress.save();
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Proqreslər uğurla sinxronizasiya edildi. ${updatedCount} şagirdin gedişatı yeniləndi.`
    });

  } catch (error: any) {
    console.error("Sinxronizasiya xətası:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}