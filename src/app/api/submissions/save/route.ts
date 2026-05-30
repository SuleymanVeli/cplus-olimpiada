import { NextRequest, NextResponse } from 'next/server';
import  connectToDatabase  from '@/src/lib/dbConnect';
import  Submission from '@/models/Submission';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { contestId, questionId, studentId, code } = await (req?.body  as any).json();
    
    const updatePath = `progress.${questionId}`;

    const updatedSubmission = await Submission.findOneAndUpdate(
      { contestId, studentId },
      { 
        $set: { 
          [`${updatePath}.code`]: code,
          [`${updatePath}.questionId`]: questionId,
          activeQuestionId: questionId
        } 
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, submission: updatedSubmission });

  } catch (error: any) {
    return NextResponse.json({ message: 'Yadda saxlanma zamanı xəta', error: error.message }, { status: 500 });
  }
}