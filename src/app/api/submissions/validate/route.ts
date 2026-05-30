import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/src/lib/dbConnect';
import Contest from '@/models/Contest';
import Submission from '@/models/Submission';
import CodeQueue from '@/models/CodeQueue'; // 👈 Yeni modeli daxil edirik

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body: any = await req.json();
    const { contestId, questionId, studentId, code } = body;

    // 1. Məsələnin varlığını yoxlayırıq
    const contest = await Contest.findById(contestId);
    const question = contest?.questions.find((q: any) => q.id === questionId);

    if (!question) {
      return NextResponse.json({ message: 'Məsələ tapılmadı' }, { status: 404 });
    }

    // 2. Şagirdin əsas Submission sənədini tapırıq və ya yaradırıq
    let submission = await Submission.findOne({ contestId, studentId });
    
    // Əgər ilk dəfə kod göndərirsə və submission yoxdursa, yarada bilərsən
    if (!submission) {
       submission = await Submission.create({ contestId, studentId, progress: new Map() });
    }

    // 3. Şagird tərəfdə yüklənmə (loader) görünməsi üçün test statuslarını 'checking' (və ya 'waiting') edirik
    const initialTestStatuses = new Array(question.testCases.length).fill('checking');
    
    submission.progress.set(questionId, {
      questionId,
      code,
      testStatuses: initialTestStatuses,
      compilerError: null,
      userPassedCount: 0,
      score: 0
    });
    await submission.save();

    // 4. İŞİ NÖVBƏYƏ ATIRIQ 🚀
    // Əgər eyni sual üçün növbədə artıq gözləyən köhnə bir kod varsa, onu silib yenisini qoyuruq
    await CodeQueue.deleteOne({ submissionDocId: submission._id, questionId, status: 'queued' });

    await CodeQueue.create({
      submissionDocId: submission._id,
      contestId,
      studentId,
      questionId,
      code,
      status: 'queued'
    });

    // 5. Şagirdə dərhal "Növbəyə alındı" statusunu qaytarırıq. Taymer donmur!
    return NextResponse.json({
      success: true,
      message: "Kod növbəyə alındı. Yoxlanılır...",
      status: 'queued'
    }, { status: 202 });

  } catch (error: any) {
    return NextResponse.json({ message: 'Növbəyə alma xətası', error: error.message }, { status: 500 });
  }
}