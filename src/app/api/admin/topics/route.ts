import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Topic from '@/models/GameTopic'; // Şemanın olduğu düzgün ünvanı qeyd et

// Verilənlər bazası bağlantısını yoxlayan funksiya (əgər qlobal db connect istifadə etmirsənsə)
async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  // Məsələn: await mongoose.connect(process.env.MONGODB_URI!);
}

// 1. GET: Bütün mövzuları siyahılamaq
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // Mövzuları 'order' (sıralama nömrəsinə) görə kiçikdən böyüyə düzürük
    const topics = await Topic.find({}).sort({ order: 1 });
    
    return NextResponse.json(topics, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST: Yeni Mövzu yaratmaq
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, description, icon, order } = body;

    if (!name) {
      return NextResponse.json({ error: "Mövzu adı mütləqdir!" }, { status: 400 });
    }

    // Adın unikal olub-olmadığını yoxlayaq
    const existingTopic = await Topic.findOne({ name: name.trim() });
    if (existingTopic) {
      return NextResponse.json({ error: "Bu adda mövzu artıq mövcuddur!" }, { status: 400 });
    }

    const newTopic = new Topic({
      name: name.trim(),
      description: description?.trim(),
      icon: icon || 'forest-icon',
      order: order || 1
    });

    await newTopic.save();
    return NextResponse.json(newTopic, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. PUT: Mövzunu yeniləmək (Edit)
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Mövzu ID-si göndərilməlidir!" }, { status: 400 });
    }

    const body = await req.json();
    const { name, description, icon, order } = body;

    // Başqa bir mövzunun bu adı istifadə edib-etmədiyini yoxlayaq
    if (name) {
      const existingTopic = await Topic.findOne({ 
        name: name.trim(), 
        _id: { $ne: id } // Cari mövzunun özünü yoxlamadan çıxarırıq
      });
      if (existingTopic) {
        return NextResponse.json({ error: "Bu adda başqa bir mövzu artıq mövcuddur!" }, { status: 400 });
      }
    }

    const updatedTopic = await Topic.findByIdAndUpdate(
      id,
      {
        name: name?.trim(),
        description: description?.trim(),
        icon: icon,
        order: order
      },
      { new: true, runValidators: true } // Yenilənmiş sənədi geri qaytarır və validasiya edir
    );

    if (!updatedTopic) {
      return NextResponse.json({ error: "Mövzu tapılmadı!" }, { status: 404 });
    }

    return NextResponse.json(updatedTopic, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. DELETE: Mövzu Silmək
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Mövzu ID-si göndərilməlidir!" }, { status: 400 });
    }

    const deletedTopic = await Topic.findByIdAndDelete(id);

    if (!deletedTopic) {
      return NextResponse.json({ error: "Mövzu tapılmadı və ya artıq silinib!" }, { status: 404 });
    }

    // Qeyd: Real layihədə bu mövzu silinəndə ona aid olan 'Level'-ləri də silmək (Cascade Delete) 
    // və ya istifadəçiyə xəbərdarlıq etmək yaxşı praktikadır. 
    // Əgər levelləri də avtomatik təmizləmək istəsən:
    // await Level.deleteMany({ topicId: id });

    return NextResponse.json({ message: "Mövzu uğurla silindi." }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}