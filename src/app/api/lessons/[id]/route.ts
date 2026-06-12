// app/api/lessons/[id]/route.ts daxilində nümunə məntiq:
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/src/lib/dbConnect';
import Module from '@/src/models/Module';
import Task from '@/src/models/Task';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
     const { id } = await params;
    
    const moduleId = id; // URL-dən gələn modul ID-si

    const currentModule = await Module.findById(moduleId).lean();
    if (!currentModule) {
      return NextResponse.json({ success: false, message: "Modul tapılmadı." }, { status: 404 });
    }

    // 🚀 Bu modula aid ilk tapşırığı (order: 1) tapırıq
    const firstTask = await Task.findOne({ moduleId: currentModule._id }).sort({ order: 1 }).lean();

    const lessonData = {
      _id: currentModule._id,
      moduleTitle: currentModule.title.toUpperCase(),
      title: currentModule.lessonTitle || `${currentModule.title} Mühazirəsi`,
      videoUrl: currentModule.videoUrl, // "https://www.youtube.com/embed/..."
      content: currentModule.content,   // HTML kontent
      level: currentModule.level,
      nextTaskId: firstTask ? firstTask._id.toString() : null // 🚀 İlk taskın ID-si bura oturur
    };

    return NextResponse.json({ success: true, data: lessonData }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}