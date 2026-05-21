import dbConnect from "@/lib/dbConnect";
import Submission from "@/src/models/Submission";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const { submissionId, answerId, note } = await req.json();

    // Konkret massiv elementini (sub-document) tapıb yeniləyirik
    await Submission.updateOne(
      { _id: submissionId, "answers._id": answerId },
      { $set: { "answers.$.adminNote": note } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Xəta" }, { status: 500 });
  }
}