// src/app/api/student/profile-info/route.ts
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Submission from "@/src/models/Submission";
import Task from "@/models/Task";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Yetki yoxdur" }, { status: 401 });

    const user = await User.findOne({ email: session.user?.email })
      .select("fullName avatar globalNote")
      .lean();

    // Sidebar üçün tapşırıqların siyahısını gətiririk
    const submissions = await Submission.find({ userId: user?._id })
      .populate({ path: 'taskId', select: 'title', model: Task })
      .select("status taskId")
      .lean();

    return NextResponse.json({ ...user, submissions });
  } catch (error) {
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}