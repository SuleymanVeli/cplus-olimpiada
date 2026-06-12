import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/dbConnect';
import UserProgress from '@/src/models/UserProgress';
import Task from '@/src/models/Task';
import Module from '@/src/models/Module';
import mongoose from 'mongoose';


// İstifadəçinin növbəti hara getməli olduğunu tapır
async function calculateNextProgress(
  progress: any,
  level: string
) {
  const modules = await Module.find({ level })
    .sort({ order: 1 });

  const completedLessons = progress.completedLessons.map(
    (id: any) => id.toString()
  );

  const completedTasks = progress.completedTasks.map(
    (id: any) => id.toString()
  );

  for (const module of modules) {

    // Lesson bitməyibsə əvvəl lesson açılır
    if (!completedLessons.includes(module._id.toString())) {
      return {
        moduleId: module._id,
        taskOrder: 0
      };
    }

    // Modulun tasklarını tap
    const tasks = await Task.find({
      moduleId: module._id
    })
      .sort({ order: 1 });

    // Bitməmiş task tap
    const unfinishedTask = tasks.find(
      task =>
        !completedTasks.includes(
          task._id.toString()
        )
    );

    if (unfinishedTask) {
      return {
        moduleId: module._id,
        taskOrder: unfinishedTask.order
      };
    }
  }

  // hər şey tamamdır
  return {
    moduleId: null,
    taskOrder: 999
  };
}

export async function POST(request: Request) {

  await dbConnect();

  try {

    const {
      userId,
      type,
      id,
      code,
      level
    } = await request.json();

    console.log(
      "Gələn data:",
      {
        userId,
        type,
        id,
        code,
        level
      }
    );

    const userObjectId =
      new mongoose.Types.ObjectId(userId);

    let progress =
      await UserProgress.findOne({
        userId: userObjectId,
        level: level
      });

    if (!progress) {
      return NextResponse.json(
        {
          success: false,
          message: "İstifadəçi irəliləyişi tapılmadı."
        },
        {
          status: 404
        }
      );
    }

    // =========================
    // LESSON TAMAMLANDI
    // =========================

    if (type === "lesson") {

      const moduleId = id;
      const exists =
        progress.completedLessons.some(
          (x: any) =>
            x.toString() === moduleId.toString()
        );

      if (!exists) {
        progress.completedLessons.push(
          moduleId
        );
      }      
    }

    // =========================
    // TASK TAMAMLANDI
    // =========================

    else if (type === "task") {
      const taskId = id;
      const task =
        await Task.findById(taskId);
      if (!task) {
        return NextResponse.json(
          {
            success: false,
            message: "Task tapılmadı."
          },
          {
            status: 404
          }
        );
      }

      const alreadyCompleted =
        progress.completedTasks.some(
          (x: any) =>
            x.toString()
            === taskId.toString()
        );

      if (!alreadyCompleted) {
        progress.completedTasks.push(
          taskId
        );
        progress.totalXp += task.points;
      }

      const solvedIndex =
        progress.solvedTasks.findIndex(
          (t: any) =>
            t.taskId.toString()
            === taskId.toString()
        );

      if (solvedIndex !== -1) {
        progress.solvedTasks[
          solvedIndex
        ].submittedCode = code;
      }
      else {
        progress.solvedTasks.push({
          taskId: task._id,
          submittedCode: code,
          pointsEarned: task.points,
          solvedAt: new Date()
        });
      }
    }

    // =========================
    // BURADA YENİ AĞILLI SİSTEM
    // =========================

    const next =
      await calculateNextProgress(
        progress,
        level
      );

    progress.currentModuleId =
      next.moduleId;

    progress.currentTaskOrder =
      next.taskOrder;

    // modul tamamlanan kimi qeyd et
    if (next.moduleId) {
      const currentModule =
        await Module.findById(
          next.moduleId
        );

      if (currentModule) {
        const moduleTasks =
          await Task.find({
            moduleId: currentModule._id
          });

        const allDone =
          moduleTasks.every(
            t =>
              progress.completedTasks
                .some(
                  (x: any) =>
                    x.toString()
                    === t._id.toString()
                )
          );

        if (allDone) {
          const already =
            progress.completedModules.some(
              (x: any) =>
                x.toString()
                === currentModule._id.toString()
            );

          if (!already) {
            progress.completedModules.push(
              currentModule._id
            );
          }
        }
      }
    }

    await progress.save();

    return NextResponse.json({

      success: true,
      totalXp:
        progress.totalXp,

      currentModuleId:
        progress.currentModuleId,

      currentTaskOrder:
        progress.currentTaskOrder
    });
  }

  catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      {
        status: 500
      }
    );
  }
}