import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/dbConnect';
import Module from '@/src/models/Module';

// [PUT] /api/admin/modules/[id] - Modulu redaktə edir
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  try {
    const body = await req.json();
    const { id } = await params;

    // Əgər order dəyişibsə, başqa modulun bu sıranı tutub-tutmadığını yoxlayaq
    const duplicateOrder = await Module.findOne({ order: body.order, level: body.level, _id: { $ne: id } });
    if (duplicateOrder) {
      return NextResponse.json({ 
        success: false, 
        message: `Sıra nömrəsi ${body.order} artıq başqa bir modul tərəfindən istifadə edilir!` 
      }, { status: 400 });
    }

    const updatedModule = await Module.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedModule) {
      return NextResponse.json({ success: false, message: "Modul tapılmadı!" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedModule });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}