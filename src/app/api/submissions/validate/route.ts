import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/src/lib/dbConnect';
import Contest from '@/models/Contest';
import Submission from '@/models/Submission';
import CodeQueue from '@/models/CodeQueue';
import { toString } from 'lodash';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body: any = await req.json();
    const { contestId, questionId, studentId, code } = body;

    // Əsas validasiya
    if (!contestId || !questionId || !studentId || !code) {
      return NextResponse.json({ message: 'Eksik parametrlər' }, { status: 400 });
    }

    // 1. Məsələnin varlığını yoxlayırıq (Mongoose-un .id VƏ YA ._id müqayisəsi ilə)
    const contest = await Contest.findById(contestId).lean();
    if (!contest) {
      return NextResponse.json({ message: 'Sınaq tapılmadı' }, { status: 404 });
    }


    // Lodash yerinə birbaşa .find və toString() istifadə etmək daha təhlükəsizdir
    const question = contest.questions.find(
      (q: any) => q._id.toString() === questionId || q.id === questionId
    );

    if (!question) {
      return NextResponse.json({ message: 'Məsələ tapılmadı' }, { status: 404 });
    }

    // 2. Şagirdin əsas Submission sənədini tapırıq və ya yaradırıq
    let submission = await Submission.findOne({ contestId, studentId });

    if (!submission) {
      submission = await Submission.create({ 
        contestId, 
        studentId, 
        progress: new Map() 
      });
    }

    // 3. Şagird tərəfdə yüklənmə (loader) görünməsi üçün test statuslarını 'checking' edirik
    // Qoruma üçün testCases massivinin olmasını yoxlayırıq
    const testCasesCount = question.testCases?.length || 0;
    const initialTestStatuses = new Array(testCasesCount).fill('checking');

    // Mongoose Map üçün set istifadə edirik
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
    // Eyni sual üçün növbədə olan köhnə 'queued' statuslu işi təmizləyirik
    await CodeQueue.deleteOne({ 
      submissionDocId: submission._id, 
      questionId, 
      status: 'queued' 
    });

    await CodeQueue.create({
      submissionDocId: submission._id,
      contestId,
      studentId,
      questionId,
      code,
      status: 'queued'
    });

    // 5. Şagirdə dərhal cavab qaytarırıq
    return NextResponse.json({
      success: true,
      message: "Kod növbəyə alındı. Yoxlanılır...",
      status: 'queued'
    }, { status: 202 });

  } catch (error: any) {
    console.error("Code queue error:", error);
    return NextResponse.json({ message: 'Növbəyə alma xətası', error: error.message }, { status: 500 });
  }
}