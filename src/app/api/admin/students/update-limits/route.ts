import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/dbConnect';
import User from '@/src/models/User'; // Və ya istifadəçi modelinizin adı

export async function PATCH(request: Request) {
  await dbConnect();

  try {
    const body = await request.json();
    const { studentId, weeklyModuleLimit, weeklyLessonDays } = body;

    // studentId-nin göndərildiyini yoxlayırıq
    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'studentId tələb olunur.' },
        { status: 400 }
      );
    }

    // Yenilənəcək sahələri dinamik toplayırıq
    const updateFields: Record<string, any> = {};
    if (typeof weeklyModuleLimit === 'number') {
      updateFields.weeklyModuleLimit = weeklyModuleLimit;
    }
    if (typeof weeklyLessonDays === 'number') {
      updateFields.weeklyLessonDays = weeklyLessonDays;
    }

    // Heç bir parametr göndərilməyibsə xəta qaytarırıq
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Yenilənmək üçün heç bir parametr (weeklyModuleLimit və ya weeklyLessonDays) göndərilməyib.' },
        { status: 400 }
      );
    }

    // Şagirdi baza üzrə yeniləyirik
    const updatedUser = await User.findByIdAndUpdate(
      studentId,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'Şagird tapılmadı.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Şagirdin limitləri uğurla yeniləndi.',
      user: updatedUser
    });

  } catch (error: any) {
    console.error("Şagird limitləri yeniləmə xətası:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}