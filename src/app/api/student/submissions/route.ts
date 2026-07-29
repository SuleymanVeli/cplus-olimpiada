// src/app/api/student/submissions/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/src/lib/dbConnect";
import Submission from "@/models/Submission";
import User from "@/models/User";
import Contest from "@/models/Contest";
import UserProgress from "@/models/UserProgress";
import Module from "@/models/Module"; // Module modeli daxil edilir

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Sessiya tapılmadı" }, { status: 401 });
    }

    // 1. Front-dan gələn level parametrini götürürük
    const { searchParams } = new URL(req.url);
    const level = Number(searchParams.get('level')) || 1;

    const user = await User.findOne({ email: session.user.email }).select('_id');
    if (!user) return NextResponse.json({ error: "İstifadəçi tapılmadı" }, { status: 404 });

    // 2. UserProgress-dən istifadəçinin bu level-ə uyğun progress-ini tapırıq
    // (Əgər sizdə level sahəsi UserProgress daxilindədirsə, query-yə level: level əlavə edə bilərsiniz)
    const progress = await UserProgress.findOne({ 
      userId: user._id,
      level: level 
    }).select('currentModuleId');

    let userOrder = 1;

    // 3. Əgər progress və currentModuleId varsa, Module modelindən order-i gətiririk
    if (progress && progress.currentModuleId) {
      const moduleData = await Module.findById(progress.currentModuleId).select('order');
      if (moduleData && typeof moduleData.order === 'number') {
        userOrder = moduleData.order;
      }
    }

    const now = new Date();

    // 4. Submissions (istifadəçinin sınaqları)
    const submissions = await Submission.find({ studentId: user._id })
      .populate({ 
        path: 'contestId', 
        select: 'title startTime endTime durationMinutes level reqOrder' 
      })
      .sort({ updatedAt: -1 });

    // 5. Aktiv sınaqları filterləyirik:
    // Yalnız vaxtı bitməmiş VƏ istifadəçinin level/order tələbinə cavab verən (və ya hamısını göndərib front-da filterləyə bilərsiniz)
    const activeContests = await Contest.find({ 
      endTime: { $gt: now },
      // İstəyə bağlı: yalnız istifadəçinin level-inə uyğun sınaqları getirmək üçün:
      // level: level 
    }).select('_id title startTime endTime durationMinutes questions level reqOrder');

    return NextResponse.json({ 
      success: true, 
      userLevel: level,
      userOrder: userOrder,
      submissions: submissions || [],
      activeContests: activeContests || [] 
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Server xətası", details: error.message }, { status: 500 });
  }
}