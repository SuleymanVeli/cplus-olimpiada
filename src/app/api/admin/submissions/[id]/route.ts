import dbConnect from "@/lib/dbConnect";
import Submission from "@/src/models/Submission";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  // Bu tapşırığa aid bütün təqdimatları şagird məlumatları ilə birgə gətiririk
  const subs = await Submission.find({ taskId: params.id })
    .populate('userId', 'fullName avatar')
    .sort({ createdAt: -1 });

  return NextResponse.json({ success: true, data: subs });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  // Təhlükəsizlik üçün: Yalnız statusu pending olanları silməyə icazə verə bilərsən
  const sub = await Submission.findById(params.id);
  if (sub && sub.status === 'pending') {
    await Submission.findByIdAndDelete(params.id);
    return Response.json({ success: true });
  }
  return Response.json({ error: "Baxılmış tapşırığı silmək olmaz" }, { status: 400 });
}