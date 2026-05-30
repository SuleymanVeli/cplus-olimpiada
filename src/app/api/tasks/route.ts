import dbConnect from "@/src/lib/dbConnect";
import Task from "@/src/models/Task";
import { NextResponse } from "next/server";
import Submission from "@/src/models/Submission";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const newTask = await Task.create(body);
    return NextResponse.json({ success: true, data: newTask });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Bazaya yazılmadı" }, { status: 500 });
  }
}



export async function GET() {
  await dbConnect();
  
  // Tapşırıqları gətiririk
  const tasks = await Task.find({}).sort({ createdAt: -1 }).lean();

  // Hər tapşırıq üçün ona aid olan submission-ları (və şagird adlarını) çəkirik
  const tasksWithSubs = await Promise.all(tasks.map(async (task) => {
    const subs = await Submission.find({ taskId: task._id })
      .populate('userId', 'fullName avatar')
      .lean();
    return { ...task, submissions: subs };
  }));

  return Response.json({ data: tasksWithSubs });
}