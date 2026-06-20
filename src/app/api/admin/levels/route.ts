import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Level from '@/models/GameLevel'; // Şemanın olduğu düzgün ünvanı qeyd et

async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  // await mongoose.connect(process.env.MONGODB_URI!);
}

// 1. GET: Müəyyən bir mövzuya (topicId) aid levelləri siyahılamaq
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get('topicId');

    if (!topicId) {
      return NextResponse.json({ error: "topicId süzgəci mütləqdir!" }, { status: 400 });
    }

    // Gələn topicId-yə görə levelləri tapır və 'order'-ə görə sıralayır
    const levels = await Level.find({ topicId }).sort({ order: 1 });

    return NextResponse.json(levels, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST: Yeni Səviyyə (Arena) yaratmaq
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { topicId, levelData } = body;

    if (!topicId || !levelData) {
      return NextResponse.json({ error: "topicId və levelData məlumatları mütləqdir!" }, { status: 400 });
    }

    // Şemaya uyğun olaraq yeni level sənədini qururuq
    const newLevel = new Level({
      topicId,
      title: levelData.title.trim(),
      instructionText: levelData.instructionText,
      points: levelData.points ?? 100,
      levelPoint: levelData.levelPoint,
      startX: levelData.startX,
      startY: levelData.startY,
      startDirection: levelData.startDirection || 'right',
      mapLayout: levelData.mapLayout,
      xanaYazilari: levelData.xanaYazilari,
      xanaTipleri: levelData.xanaTipleri,
      hasWriteTask: levelData.hasWriteTask,
      requiredWrites: levelData.requiredWrites || [],
      xalSistemi: levelData.xalSistemi || [],
      order: levelData.order || 1,

      // 🚀 YENİ ƏLAVƏLƏR
      variants: levelData.variants || [],
      rules: levelData.rules || null
    });

    await newLevel.save();
    return NextResponse.json(newLevel, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. PUT: Mövcud Səviyyəni yeniləmək
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Level ID-si göndərilməlidir!" }, { status: 400 });
    }

    const body = await req.json();
    const { levelData } = body;

    if (!levelData) {
      return NextResponse.json({ error: "Yenilənəcək data (levelData) tapılmadı!" }, { status: 400 });
    }

    const updatedLevel = await Level.findByIdAndUpdate(
      id,
      {
        title: levelData.title.trim(),
        instructionText: levelData.instructionText,
        points: levelData.points,
        levelPoint: levelData.levelPoint,
        startX: levelData.startX,
        startY: levelData.startY,
        startDirection: levelData.startDirection,
        mapLayout: levelData.mapLayout,
        xanaYazilari: levelData.xanaYazilari,
        xanaTipleri: levelData.xanaTipleri,
        hasWriteTask: levelData.hasWriteTask,
        requiredWrites: levelData.requiredWrites,
        xalSistemi: levelData.xalSistemi,
        order: levelData.order,

        // 🚀 YENİ ƏLAVƏLƏR
        variants: levelData.variants,
        rules: levelData.rules
      },
      { new: true, runValidators: true }
    );

    if (!updatedLevel) {
      return NextResponse.json({ error: "Səviyyə tapılmadı!" }, { status: 404 });
    }

    return NextResponse.json(updatedLevel, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. DELETE: Səviyyəni silmək
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Level ID-si göndərilməlidir!" }, { status: 400 });
    }

    const deletedLevel = await Level.findByIdAndDelete(id);

    if (!deletedLevel) {
      return NextResponse.json({ error: "Səviyyə tapılmadı və ya əvvəldən silinib!" }, { status: 404 });
    }

    return NextResponse.json({ message: "Səviyyə uğurla silindi." }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}