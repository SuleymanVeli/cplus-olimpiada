import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/dbConnect';
import Module from '@/src/models/Module';

// [GET] /api/admin/modules - Level-ə görə filtrlə və order-ə görə sırala
export async function GET(req: Request) {
  await dbConnect();
  try {
    const { searchParams } = new URL(req.url);
    const level = parseInt(searchParams.get('level') || '1', 10);

    // Level-i olmayanları və ya 1 olanları 1-ci level kimi götürür
    const query = level === 1 
      ? { $or: [{ level: 1 }, { level: { $exists: false } }, { level: null }] } 
      : { level: level };

    const modules = await Module.find(query).sort({ order: 1 });
    return NextResponse.json({ success: true, data: modules });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// [POST] /api/admin/modules - Yeni modul yaradır (level ilə)
export async function POST(req: Request) {
  await dbConnect();
  try {
    const body = await req.json();
    
    // Əgər level göndərilməyibsə, default 1 qoyuruq
    const moduleData = {
      ...body,
      level: body.level || 1 
    };

    // Eyni level və eyni order kombinasiyasını yoxlamaq daha düzgündür
    // (Çünki 1-ci level-də 1-ci order, 2-ci level-də də 1-ci order ola bilər)
    const existingOrder = await Module.findOne({ 
      order: moduleData.order, 
      level: moduleData.level 
    });

    if (existingOrder) {
      return NextResponse.json({ 
        success: false, 
        message: `Level ${moduleData.level}-də ${moduleData.order} nömrəli modul artıq mövcuddur!` 
      }, { status: 400 });
    }

    const newModule = await Module.create(moduleData);
    return NextResponse.json({ success: true, data: newModule });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}