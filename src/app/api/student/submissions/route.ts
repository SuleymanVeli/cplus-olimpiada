// src/app/api/student/submissions/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/src/lib/dbConnect";
import Submission from "@/models/Submission";
import User from "@/models/User";
import Contest from "@/models/Contest"; // Contest modelini daxil edin

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Sessiya tapılmadı" }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email }).select('_id');
    if (!user) return NextResponse.json({ error: "İstifadəçi tapılmadı" }, { status: 404 });

    const now = new Date();

    // 1. Şagirdin mövcud gedişatlarını (submissions) çəkirik
    const submissions = await Submission.find({ studentId: user._id })
      .populate({ path: 'contestId', select: 'title startTime endTime durationMinutes' })
      .sort({ updatedAt: -1 });

    // 2. Sistemdə hal-hazırda aktiv olan sınaqları çəkirik (Şagird girməsə belə)
    const activeContests = await Contest.find({     
      endTime: { $gt: now }
    }).select('_id title startTime endTime durationMinutes questions');

    return NextResponse.json({ 
      success: true, 
      submissions: submissions || [],
      activeContests: activeContests || [] 
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Server xətası", details: error.message }, { status: 500 });
  }
}