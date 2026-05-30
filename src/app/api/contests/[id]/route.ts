import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/src/lib/dbConnect';
import Contest from '@/models/Contest';
import Submission from '@/models/Submission';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    // 1. Dinamik URL-dən contestId-ni oxuyuruq
    const contestId: any = (await params).id;

    // 2. Query parametrindən studentId-ni oxuyuruq (?studentId=65f1a2...)
    const { searchParams } = req.nextUrl;
    const studentId: any = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { message: 'studentId query parametri daxil edilməyib' },
        { status: 400 }
      );
    }

    // 3. Yarışı tapırıq və gizli testləri şagird tərəfə sızdırmırıq
    const contest = await Contest.findById(contestId).select('-questions.testCases');
    if (!contest) {
      return NextResponse.json({ message: 'Yarış tapılmadı' }, { status: 404 });
    }

    // 4. Şagirdin bu yarış üzrə gedişat cədvəlinə baxırıq
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
    return NextResponse.json(
      { message: 'Server xətası', error: error.message },
      { status: 500 }
    );
  }
}