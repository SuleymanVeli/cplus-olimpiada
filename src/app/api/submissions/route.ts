
import dbConnect from "@/src/lib/dbConnect";
import Submission from "@/src/models/Submission";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    // body: { userId: "...", userName: "...", taskId: "...", code: "..." }
    const newSubmission = await Submission.create(body);
    return NextResponse.json({ success: true, data: newSubmission });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Xəta baş verdi" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await dbConnect();
    const submissions = await Submission.find({}).sort({ submittedAt: -1 });
    return NextResponse.json({ success: true, data: submissions });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}