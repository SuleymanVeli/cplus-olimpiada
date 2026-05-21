import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/dbConnect';
import Module from '@/src/models/Module';

// [GET] /api/admin/modules - Bütün modulları sırası ilə gətirir
export async function GET() {
  await dbConnect();
  try {
    const modules = await Module.find({}).sort({ order: 1 });
    return NextResponse.json({ success: true, data: modules });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// [POST] /api/admin/modules - Yeni modul yaradır
export async function POST(req: Request) {
  await dbConnect();
  try {
    const body = await req.json();

    // Eyni order nömrəsinin olub-olmamasını yoxlayaq (Schema-da unique: true qoymuşuq)
    const existingOrder = await Module.findOne({ order: body.order });
    if (existingOrder) {
      return NextResponse.json({ 
        success: false, 
        message: `Sıra nömrəsi ${body.order} olan modul artıq mövcuddur! Zəhmət olmasa fərqli sıra nömrəsi yazın.` 
      }, { status: 400 });
    }

    const newModule = await Module.create(body);
    return NextResponse.json({ success: true, data: newModule });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}