import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Level from '@/models/GameLevel';

async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  // await mongoose.connect(process.env.MONGODB_URI!);
}

interface RouteParams {
  params: Promise<{ id: string }> | { id: string }; // Next.js versiyasından asılı olaraq təhlükəsiz tip təyini
}

export async function GET(
  req: NextRequest,
  context: any // Sadəlik üçün any və ya { params: { id: string } } yazmaq olar
) {
  try {
    await connectDB();
    
    // URL-dən dynamic id parametrini götürürük
    const { id } = await context.params; 

    if (!id) {
      return NextResponse.json({ error: "Level ID tapılmadı!" }, { status: 400 });
    }

    // Bazadan həmin level-i axtarırıq
    const levelData = await Level.findById(id);

    if (!levelData) {
      return NextResponse.json({ error: "Belə bir arena mövcud deyil!" }, { status: 404 });
    }

    // Sənin frontend-də gözlədiyin "{ data: LevelData }" strukturuna uyğun qaytarırıq
    return NextResponse.json({ data: levelData }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}