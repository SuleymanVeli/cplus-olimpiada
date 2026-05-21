import dbConnect from "@/lib/dbConnect";
import Submission from "@/models/Submission";
import Task from "@/src/models/Task";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();

     const { id } = await params; // Next.js 15-də await lazımdır

    if (!id || id === "undefined") {
      return Response.json({ error: "ID tapılmadı" }, { status: 400 });
    }
    const { status, adminComment } = await req.json();

    const updated = await Submission.findByIdAndUpdate(
      id,
      { status, adminComment },
      { new: true }
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();

    const { id } = await params; // Next.js 15-də await lazımdır

    if (!id || id === "undefined") {
      return Response.json({ error: "ID tapılmadı" }, { status: 400 });
    }

    // Təhlükəsizlik: Yalnız daxil olan istifadəçinin öz submission-ına baxdığını yoxlaya bilərsən
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Yetki yoxdur" }, { status: 401 });

    // Submission-u tapırıq və onun daxilindəki taskId-ni "populate" edirik
    // Beləliklə, bir sorğu ilə həm şagirdin kodunu, həm də dərsin HTML-ni alırıq
    const submission = await Submission.findById(id)
      .populate({
        path: 'taskId',
        model: Task
      })
      .lean();

    if (!submission) {
      return NextResponse.json({ error: "Tapşırıq tapılmadı" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: submission });
  } catch (error) {
    console.error("Submission GET Error:", error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}