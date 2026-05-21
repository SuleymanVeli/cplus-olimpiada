import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/dbConnect';
import Task from '@/src/models/Task';
import Module from '@/src/models/Module';

// [GET] /api/admin/tasks?moduleId=... - Müəyyən mövzuya aid taskları gətirir
export async function GET(req: Request) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get('moduleId');

  if (!moduleId) {
    return NextResponse.json({ success: false, message: "moduleId mütləq göndərilməlidir!" }, { status: 400 });
  }

  try {
    const tasks = await Task.find({ moduleId }).sort({ order: 1 });
    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// [POST] /api/admin/tasks - Yeni task yaradır və aid olduğu modulun 'tasks' massivinə ID-ni push edir
export async function POST(req: Request) {
  await dbConnect();
  try {
    const body = await req.json();

    // 1. Modul daxilində eyni sırada (order) task olub-olmamasını yoxlayırıq (Schema index-i qorumaq üçün)
    const existingTaskOrder = await Task.findOne({ moduleId: body.moduleId, order: body.order });
    if (existingTaskOrder) {
      return NextResponse.json({ 
        success: false, 
        message: `Bu modul daxilində Arena #${body.order} artıq mövcuddur! Sıranı dəyişin.` 
      }, { status: 400 });
    }

    // 2. Yeni taskı verilənlər bazasına yazırıq
    const newTask = await Task.create(body);

    // 3. Bizim ModuleSchema-da `tasks: [ObjectId]` siyahısı var idi. Yeni task yaranan kimi modula da bağlayırıq:
    await Module.findByIdAndUpdate(body.moduleId, {
      $push: { tasks: newTask._id }
    });

    return NextResponse.json({ success: true, data: newTask });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}