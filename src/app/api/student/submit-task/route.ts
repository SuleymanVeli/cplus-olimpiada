import dbConnect from "@/lib/dbConnect";
import  Submission from "@/src/models/Submission";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  try {
    await dbConnect();
    
    // Artıq tək bir studentCode deyil, answers massivini alırıq
    const { submissionId, answers } = await req.json();

    if (!submissionId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Məlumatlar tam deyil və ya formatı düzgün deyil" }, 
        { status: 400 }
      );
    }

    const updated = await Submission.findByIdAndUpdate(
      submissionId,
      { 
        answers, // Bütün massivi (kodlar və başlıqlar) bura yazırıq
        status: 'submitted', 
        submittedAt: new Date() 
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Tapşırıq tapılmadı" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Submission Update Error:", error);
    return NextResponse.json({ error: "Göndərmə xətası baş verdi" }, { status: 500 });
  }
}