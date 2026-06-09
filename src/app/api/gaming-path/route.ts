import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/src/lib/dbConnect';
import Module from '@/src/models/Module';
import Task from '@/src/models/Task';
import UserProgress from '@/src/models/UserProgress';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    if (!req.nextUrl.searchParams.has('userId')) {
      return NextResponse.json({ success: false, message: "userId query parameter is required." }, { status: 400 });
    }

    const userId = req.nextUrl.searchParams.get('userId')!;

    const level = parseInt(req.nextUrl.searchParams.get('level') || '1', 10);

    // Bütün modulları və içindəki taskları çəkirik
    // Modullerda level olmayanda 1 olaraq qəbul edirik
    const query = (level === 1)
      ? { $or: [{ level: 1 }, { level: { $exists: false } }, { level: null }] }
      : { level: level };

    const modules = await Module.find(query)
      .sort({ order: 1 })
      .populate({ path: 'tasks', model: Task })
      .lean();
    let progress = await UserProgress.findOne({ userId: userId });

    // Əgər progress yoxdursa ilk modulla başladırıq
    if (!progress && modules.length > 0) {
      progress = await UserProgress.create({
        userId: userId,
        totalXp: 0,
        currentModuleId: modules[0]._id,
        currentTaskOrder: 0,
        completedLessons: [],
        completedTasks: [],
        completedModules: [],
        solvedTasks: [],
        level: level
      });
    }

    const flatNodes: any[] = [];

    // String massivlərinə çeviririk ki, .includes() rahat işləsin
    const compTasks = progress.completedTasks.map((id: any) => id.toString());
    const compModules = progress.completedModules.map((id: any) => id.toString());
    const currentModIdStr = progress.currentModuleId.toString();

    modules.forEach((mod: any) => {
      const isModuleActive = currentModIdStr === mod._id.toString();
      const isModuleCompleted = compModules.includes(mod._id.toString());

      // A) DƏRS (LESSON) NODE
      let lessonStatus: 'completed' | 'active' | 'locked' = 'locked';
      if (isModuleCompleted) {
        lessonStatus = 'completed';
      } else if (isModuleActive) {
        lessonStatus = progress.currentTaskOrder === 0 ? 'active' : 'completed';
      }

      flatNodes.push({
        _id: mod._id,
        type: 'lesson',
        title: `${mod.title} (Mühazirə)`,
        moduleTitle: mod.title,
        status: lessonStatus,
        points: 0
      });

      // B) TAPŞIRIQLAR (TASK) NODES
      if (mod.tasks && Array.isArray(mod.tasks)) {
        // Taskları öz order-lərinə görə sıralayırıq
        const sortedTasks = [...mod.tasks].sort((a, b) => a.order - b.order);

        sortedTasks.forEach((task: any, index: number) => {
          const taskOrder = index + 1; // 1, 2, 3...
          const isTaskCompleted = compTasks.includes(task._id.toString());

          let taskStatus: 'completed' | 'active' | 'locked' = 'locked';

          if (isTaskCompleted || isModuleCompleted) {
            taskStatus = 'completed';
          } else if (isModuleActive && taskOrder === progress.currentTaskOrder) {
            taskStatus = 'active';
          }

          flatNodes.push({
            _id: task._id,
            type: 'task',
            title: task.title,
            moduleTitle: mod.title,
            status: taskStatus,
            points: task.points
          });
        });
      }
    });

    return NextResponse.json({ success: true, data: flatNodes }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}