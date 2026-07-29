import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/dbConnect';
import User from '@/src/models/User';

export async function PATCH(request: Request) {
  await dbConnect();

  try {
    const body = await request.json();
    const { userId, musicVolume, musicIsActive } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId tələb olunur.' },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};

    if (typeof musicVolume === 'number') {
      // Səs faizini 0 və 1 arasında limitləyirik
      updateData.musicVolume = Math.max(0, Math.min(1, musicVolume));
    }

    if (typeof musicIsActive === 'boolean') {
      updateData.musicIsActive = musicIsActive;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'İstifadəçi tapılmadı.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Musiqi tənzimləmələri yeniləndi.',
      userData: {
         updateData
      }
    });

  } catch (error: any) {
    console.error("Musiqi ayarları yeniləmə xətası:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}