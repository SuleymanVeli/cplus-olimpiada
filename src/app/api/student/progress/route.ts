import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/dbConnect';
import UserProgress from '@/src/models/UserProgress';
import Task from '@/src/models/Task';
import Module from '@/src/models/Module';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  await dbConnect();

  try {
    const { userId, type, id, code, level } = await request.json();

    const userObjectId = new mongoose.Types.ObjectId(userId);
    let progress = await UserProgress.findOne({ userId: userObjectId, level });

    if (!progress) {
      return NextResponse.json({ success: false, message: "İstifadəçi irəliləyişi tapılmadı." }, { status: 404 });
    }

    // ==========================================
    // 1. LESSON TAMAMLANDI
    // ==========================================
    if (type === "lesson") {
      const moduleId = id;
      if (!progress.completedLessons.includes(moduleId)) {
        progress.completedLessons.push(moduleId);
      }

      const firstTask = await Task.findOne({ moduleId }).sort({ order: 1 });
      progress.currentModuleId = moduleId;
      progress.currentTaskOrder = firstTask ? firstTask.order : 1;
    }

    // ==========================================
    // 2. TASK TAMAMLANDI
    // ==========================================
    else if (type === "task") {
      const taskId = id;
      const task = await Task.findById(taskId);

      if (!task) {
        return NextResponse.json({ success: false, message: "Task tapılmadı." }, { status: 404 });
      }

      if (!progress.completedTasks.includes(taskId)) {
        progress.completedTasks.push(taskId);
        progress.totalXp += task.points;
      }

      const solvedIndex = progress.solvedTasks.findIndex((t: any) => t.taskId.toString() === taskId.toString());
      if (solvedIndex !== -1) {
        progress.solvedTasks[solvedIndex].submittedCode = code;
      } else {
        progress.solvedTasks.push({
          taskId: task._id,
          submittedCode: code,
          pointsEarned: task.points,
          solvedAt: new Date()
        });
      }

      // NÖVBƏTİ ADIM MƏNTİQİ
      const currentModule = await Module.findById(task.moduleId);

      if (currentModule) {
        const nextTask = await Task.findOne({
          moduleId: currentModule._id,
          order: { $gt: task.order }
        }).sort({ order: 1 });

        if (nextTask) {
          progress.currentModuleId = currentModule._id;
          progress.currentTaskOrder = nextTask.order;
        } else {
          // Modul tam bitdi
          if (!progress.completedModules.includes(currentModule._id)) {
            progress.completedModules.push(currentModule._id);
          }

          const nextModule = await Module.findOne({
            level,
            order: { $gt: currentModule.order }
          }).sort({ order: 1 });

          if (nextModule) {
            progress.currentModuleId = nextModule._id;
            progress.currentTaskOrder = 0;

            // 🚀 Yeni modula keçilərkən həftəlik açılan modul sayını 1 artırırıq
            progress.unlockedModulesThisWeek = (progress.unlockedModulesThisWeek || 0) + 1;

            console.log(`Yeni modul açıldı: ${nextModule.title}. Bu həftə açılan modul sayı: ${progress.unlockedModulesThisWeek}`);
          } else {
            progress.currentModuleId = null;
            progress.currentTaskOrder = 999;
          }
        }
      }
    }

    await progress.save();

    return NextResponse.json({
      success: true,
      totalXp: progress.totalXp,
      currentModuleId: progress.currentModuleId,
      currentTaskOrder: progress.currentTaskOrder
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}