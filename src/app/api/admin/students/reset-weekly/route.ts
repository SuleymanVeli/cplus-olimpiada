import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/dbConnect';
import UserProgress from '@/src/models/UserProgress';

export async function POST(request: Request) {
  await dbConnect();

  try {
    const body = await request.json();
    const { studentId, progressId } = body;

    if (!studentId && !progressId) {
      return NextResponse.json(
        { success: false, error: 'studentId və ya progressId tələb olunur.' },
        { status: 400 }
      );
    }

    // Əgər spesifik progressId verilibsə onu, yoxsa studentId-yə görə filterləyirik
    const filter = progressId ? { _id: progressId } : { userId: studentId };

    const updatedProgress = await UserProgress.findOneAndUpdate(
      filter,
      {
        $set: {
          unlockedModulesThisWeek: 0,
          weekStartDate: new Date() // Həftə başlanğıcını da indiki zamana sıfırlayırıq
        }
      },
      { new: true }
    );

    if (!updatedProgress) {
      return NextResponse.json(
        { success: false, error: 'İstifadəçi proqresi tapılmadı.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Həftəlik mövzu limiti uğurla sıfırlandı.',
      data: updatedProgress
    });

  } catch (error: any) {
    console.error("Həftəlik limit sıfırlama xətası:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}