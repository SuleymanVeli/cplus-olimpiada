// src/app/api/admin/submissions/[id]/status/route.ts
import dbConnect from "@/lib/dbConnect";
import Submission from "@/models/Submission";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const { status } = await req.json(); // 'correct' və ya 'needs_fix'
  
  await Submission.findByIdAndUpdate(params.id, { status });
  
  return Response.json({ success: true });
}