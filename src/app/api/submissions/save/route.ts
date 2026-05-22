import { NextRequest, NextResponse } from 'next/server';
import  connectToDatabase  from '@/src/lib/dbConnect';
import { Submission } from '@/models/Submission';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { contestId, questionId, code } = await (req?.body  as any).json();
    
    const studentId = "65f1a2b3c4d5e6f7a8b9c0d1"; // Mock Auth Student ID

    const updatePath = `progress.${questionId}`;

    // Map strukturu daxilindəki alt sahəni sürətli şəkildə güncləyirik
    // const updatedSubmission = await Submission.findOneAndUpdate(
    //   { contestId, studentId },
    //   { 
    //     $set: { 
    //       [`${updatePath}.code`]: code,
    //       [`${updatePath}.questionId`]: questionId,
    //       activeQuestionId: questionId
    //     } 
    //   },
    //   { upsert: true, new: true }
    // );

    // return NextResponse.json({ success: true, submission: updatedSubmission });
    return NextResponse.json({ success: true,  });

  } catch (error: any) {
    return NextResponse.json({ message: 'Yadda saxlanma zamanı xəta', error: error.message }, { status: 500 });
  }
}