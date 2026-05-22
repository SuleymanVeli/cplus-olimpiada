// src/app/api/student/dashboard-data/route.ts
import { getServerSession } from "next-auth";
import User from "@/models/User";
import Task from "@/models/Task"; // Tapşırıq modelini import et
import dbConnect from "@/lib/dbConnect";
import { NextResponse } from "next/server";
import {Submission} from "@/src/models/Submission";

export async function GET() {
  const session:any = await getServerSession();
  await dbConnect();

  const user = await User.findOne({ email: session.user.email });

  // Şagirdə aid olan bütün submission-ları və onlara bağlı Task məlumatlarını çəkirik
  const mySubmissions = await Submission.find({ userId: user._id })
    .populate('taskId') // Tapşırığın adını, HTML-ini götürmək üçün
    .sort({ createdAt: -1 });

  return Response.json({
    fullName: user.fullName,
    avatar: user.avatar,
    globalNote: user.globalNote,
    submissions: mySubmissions // Şagird panelində bunu map edəcəksən
  });
}