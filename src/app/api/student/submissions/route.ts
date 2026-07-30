// src/app/api/student/submissions/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/src/lib/dbConnect";
import Submission from "@/models/Submission";
import User from "@/models/User";
import Contest from "@/models/Contest";
import UserProgress from "@/models/UserProgress";
import Module from "@/models/Module";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Sessiya tapılmadı" }, { status: 401 });
    }

    // 1. Level parametrini götürürük
    const levelParam = req.nextUrl.searchParams.get('level') || '1';
    const level = parseInt(levelParam, 10);

    const user = await User.findOne({ email: session.user.email }).select('_id');
    if (!user) return NextResponse.json({ error: "İstifadəçi tapılmadı" }, { status: 404 });

    // 2. UserProgress-dən modulu gətiririk
    const progress = await UserProgress.findOne({ 
      userId: user._id,
      level: level 
    }).select('currentModuleId');

    let userOrder = 1;
    if (progress && progress.currentModuleId) {
      const moduleData = await Module.findById(progress.currentModuleId).select('order');
      if (moduleData && typeof moduleData.order === 'number') {
        userOrder = moduleData.order;
      }
    }

    const now = new Date();

    // 3. Cari zaman üçün aktiv olan sınaqları tapırıq
    const activeContests = await Contest.find({ 
      endTime: { $gt: now },
      level: level 
    }).select('_id title startTime endTime durationMinutes questions level reqOrder');

    // Aktiv sınaqların ID massivini çıxarırıq
    const activeContestIds = activeContests.map(c => c._id);

    // 4. ƏSAS NÜANS: Yalnız tapılmış AKTİV sınaqlara aid submission-ları gətiririk
    // Beləliklə, aktiv sınaqlarla submission-lar 1-ə 1 üst-üstə düşür.
    const submissions = await Submission.find({ 
      studentId: user._id,
      contestId: { $in: activeContestIds } 
    })
    .populate({ 
      path: 'contestId', 
      select: 'title startTime endTime durationMinutes level reqOrder' 
    })
    .sort({ updatedAt: -1 });

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