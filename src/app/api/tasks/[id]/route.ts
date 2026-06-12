import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/src/lib/dbConnect';
import Task from '@/src/models/Task';
import Module from '@/src/models/Module';
import UserProgress from '@/src/models/UserProgress';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const taskId = id;

    if (!req.nextUrl.searchParams.has('userId')) {
      return NextResponse.json({ success: false, message: "userId query parameter is required." }, { status: 400 });
    }
    // Sınaq üçün mock user ID. Real sistemdə session-dan gələcək.
    const mockUserId = req.nextUrl.searchParams.get('userId')!;
    // 1. Taskı tapırıq və ona bağlı olan Modul məlumatlarını da çəkirik (populate)
    const task = await Task.findById(taskId).populate('moduleId').lean();

    if (!task) {
      return NextResponse.json(
        { success: false, message: "Tapşırıq tapılmadı!" },
        { status: 404 }
      );
    }

    const associatedModule = task.moduleId as any;

    const level = associatedModule.level || 1;

    // 2. Şagirdin tərəqqisini yoxlayırıq ki, bu tapşırığa giriş icazəsi var ya yox
    const progress = await UserProgress.findOne({ userId: mockUserId, level: level }).lean();

    if (!progress) {
      return NextResponse.json(
        { success: false, message: "İstifadəçi tərəqqi məlumatı tapılmadı!" },
        { status: 404 }
      );
    }


    // 3. Təhlükəsizlik Yoxlanışı (Security Check): 
    // Şagird hələ bu modulun kilidini açmayıbsa və ya modul aktivdirsə amma bu taskın sırası gəlməyibsə, datanı vermirik.

    const compTasks = progress.completedTasks.map((id: any) => id.toString());

    const isTaskCompleted = compTasks.includes(taskId);
    const isCurrentModule = progress.currentModuleId.toString() === associatedModule._id.toString();
    const isCurrentTask = task.order == progress.currentTaskOrder;

    if (isCurrentModule && isCurrentTask || isTaskCompleted)
      return NextResponse.json({
        success: true,
        data: {
          task: {
            _id: task._id,
            title: task.title,
            description: task.description,
            inputFormat: task.inputFormat,
            outputFormat: task.outputFormat,
            constraints: task.constraints,
            points: task.points,
            order: task.order,
            testCases: task.testCases, // Test case-ləri də göndəririk ki, şagird özündə yoxlaya bilsin
            status: progress.completedTasks.includes(task._id.toString()) ? 'completed' : 'active',
            level: associatedModule.level
          },
          module: {
            _id: associatedModule._id,
            title: associatedModule.title,
            videoUrl: associatedModule.videoUrl,
            content: associatedModule.content // Markdown formatlı dərs mətni
          }
        }
      }, { status: 200 });

    return NextResponse.json(
      { success: false, message: "Bu tapşırıq sizin üçün hələ kilidlidir!" },
      { status: 403 }
    );

  } catch (error: any) {
    console.error("Task GET API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}