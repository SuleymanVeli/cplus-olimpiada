import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/src/lib/dbConnect';
import { Contest } from '@/models/Contest';
import { Submission } from '@/models/Submission';

export async function GET(
  req: NextRequest,{ params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const contestId :any  = (await params).id;

    // 1. Yarışı tapırıq və gizli testləri şagird tərəfə sızdırmırıq
    const contest = await Contest.findById(contestId).select('-questions.testCases');
    if (!contest) {
      return NextResponse.json({ message: 'Yarış tapılmadı' }, { status: 404 });
    }

    // Mock Student ID (Real sistemdə Auth Middleware və ya JWT-dən gəlməlidir)
    const studentId :any  = "65f1a2b3c4d5e6f7a8b9c0d1"; 

    // 2. Şagirdin bu yarış üzrə gedişat cədvəlinə baxırıq
    let submission = await Submission.findOne({ contestId, studentId });

    // Əgər ilk dəfə daxil olursa, bazada onun üçün profil açırıq
    if (!submission) {
      submission = await Submission.create({
        contestId,
        studentId,
        totalScore: 0,
        progress: {}
      });
    }

    return NextResponse.json({
      contest,
      studentSubmission: submission
    });

  } catch (error: any) {
    return NextResponse.json({ message: 'Server xətası', error: error.message }, { status: 500 });
  }
}