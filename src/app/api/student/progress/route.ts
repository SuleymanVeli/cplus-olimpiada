import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/dbConnect';
import UserProgress from '@/src/models/UserProgress';
import Task from '@/src/models/Task';
import Module from '@/src/models/Module';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  await dbConnect();

  try {
    const { userId, type, id, code } = await request.json(); // type: 'lesson' veya 'task'

    console.log("Gelen veri:", { userId, type, id, code });

    const userObjectId = new mongoose.Types.ObjectId(userId);

    let progress = await UserProgress.findOne({ userId :userObjectId });
    if (!progress) {     
      return NextResponse.json({ success: false, message: "İstifadəçi irəliləyişi tapılmadı." }, { status: 404 });
    }

    // --- SENARİ A: MÜHAZİRƏNİ BİTİRDİ ---
    if (type === 'lesson') {
      const moduleId = id;
      
      if (!progress?.completedLessons?.includes(moduleId)) {
        progress.completedLessons.push(moduleId);
      }

      // Əgər şagird cari modulun mühazirəsində idisə, onu 1-ci taska keçiririk
      if (progress?.currentModuleId?.toString() === moduleId && progress?.currentTaskOrder === 0) {
        progress.currentTaskOrder = 1;
      }
    } 
    
    // --- SENARİ B: ARENADA TASKI HƏLL ETDİ ---
    else if (type === 'task') {
      const taskId = id;
      const task = await Task.findById(taskId);
      if (!task) return NextResponse.json({ success: false, message: "Task tapılmadı." }, { status: 404 });

      // 1. Taskı tamamlananlara əlavə et (əgər yoxdursa)
      if (!progress?.completedTasks?.includes(taskId)) {
        progress.completedTasks.push(taskId);
      }

      // 2. SolvedTasks tarixinə qeyd et və ya kodu yenilə
      const alreadySolvedIndex = progress?.solvedTasks?.findIndex((t: any) => t.taskId.toString() === taskId);
      if (alreadySolvedIndex !== -1) {
        progress.solvedTasks[alreadySolvedIndex].submittedCode = code;
      } else {
        progress.totalXp += task.points;
        progress.solvedTasks.push({
          taskId: task._id,
          submittedCode: code,
          pointsEarned: task.points,
          solvedAt: new Date()
        });
      }

      // 3. XƏRİTƏDƏ NÖVBƏTİ ADXIMA KEÇİD MƏNTİQİ
      if (progress.currentModuleId.toString() === task.moduleId.toString() && task.order === progress.currentTaskOrder) {
        
        // Cari modulun bütün tasklarını tapırıq
        const currentModuleTasks = await Task.find({ moduleId: task.moduleId }).sort({ order: 1 });
        
        if (progress.currentTaskOrder < currentModuleTasks.length) {
          // Modul daxilində növbəti task var
          progress.currentTaskOrder += 1;
        } else {
          // 🚀 MODULUN BÜTÜN TASKLARI BİTDİ! Növbəti modula keçid:
          if (!progress.completedModules.includes(task.moduleId)) {
            progress.completedModules.push(task.moduleId);
          }

          const nextModule = await Module.findOne({ order: { $gt: (await Module.findById(task.moduleId)).order } }).sort({ order: 1 });
          
          if (nextModule) {
            progress.currentModuleId = nextModule._id;
            progress.currentTaskOrder = 0; // Yeni modulun dərsi açılır
          } else {
            // Oyun tam bitdi, daha modul yoxdur
            progress.currentTaskOrder = 999; 
          }
        }
      }
    }

    await progress.save();
    return NextResponse.json({ success: true, totalXp: progress.totalXp, currentTaskOrder: progress.currentTaskOrder });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}