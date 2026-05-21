import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/dbConnect';
import Task from '@/src/models/Task';

// [PUT] /api/admin/tasks/[id] - Tapşırığı və onun daxili Test Case-lərini yeniləyir
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  try {
    const body = await req.json();
    const { id } = await params;

    // Eyni modul daxilində başqa bir taskın bu sıranı (order) zəbt edib-etmədiyini yoxlayırıq
    const duplicateTaskOrder = await Task.findOne({ 
      moduleId: body.moduleId, 
      order: body.order, 
      _id: { $ne: id } 
    });
    
    if (duplicateTaskOrder) {
      return NextResponse.json({ 
        success: false, 
        message: `Bu modulda Arena #${body.order} sırası artıq başqa bir tapşırığa verilib!` 
      }, { status: 400 });
    }

    // Taskı və test caseləri yeniləyirik
    const updatedTask = await Task.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true // Sxemdəki validasiyaların (required falan) işləməsi üçün
    });

    if (!updatedTask) {
      return NextResponse.json({ success: false, message: "Tapşırıq tapılmadı!" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedTask });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}