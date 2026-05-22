import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/src/lib/dbConnect';
import { Contest } from '@/models/Contest';
import { Submission } from '@/models/Submission';

// Wandbox API-ə sorğu göndərən daxili köməkçi funksiya
async function executeCodeOnWandbox(code: string, stdin: string) {
  const response = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: code,
      stdin: stdin,
      compiler: "gcc-head",
      save: false
    })
  });
  return await response.json();
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    
    const body :any  = await req.json();
    
    const { contestId, questionId, code } = body;

    const studentId = "65f1a2b3c4d5e6f7a8b9c0d1"; // Mock Auth Student ID

    // 1. Yarışı və məhz bu sualın GİZLİ real testlərini gətiririk
    const contest = await Contest.findById(contestId);
    const question = contest?.questions.find((q: any) => q.id === questionId);

    if (!question) {
      return NextResponse.json({ message: 'Məsələ tapılmadı' }, { status: 404 });
    }

    let passedCount = 0;
    let compilerError: string | null = null;
    let testStatuses: ('passed' | 'failed')[] = [];

    // 2. Bütün gizli testləri dövrlə yoxlayırıq
    for (const test of question.testCases) {
      const result = await executeCodeOnWandbox(code, test.input);

      if (result.compiler_error) {
        compilerError = result.compiler_error;
        break; // Sintaksis xətası varsa digər testləri gözlətmədən dövrü qırırıq
      }

      // whitespace-ləri təmizləyib yoxlayırıq
      const cleanUserOutput = result.program_message?.trim();
      const cleanExpectedOutput = test.expectedOutput.trim();

      if (cleanUserOutput === cleanExpectedOutput) {
        testStatuses.push('passed');
        passedCount++;
      } else {
        testStatuses.push('failed');
      }
    }

    // 3. Qazanılan xalın hesablanması
    const pointsEarned = passedCount * question.pointsPerTest;

    // 4. Şagirdin gedişat cədvəlini (Submission) güncləyirik
    // const submission = await Submission.findOne({ contestId, studentId });
    
    // if (submission) {
    //   submission.progress.set(questionId, {
    //     questionId,
    //     code,
    //     testStatuses,
    //     compilerError,
    //     userPassedCount: passedCount,
    //     score: pointsEarned
    //   });

    //   // Bütün digər tapşırıqlardan yığılan yekun balı hesablayırıq
    //   let newTotalScore = 0;
    //   submission.progress.forEach(p => {
    //     newTotalScore += p.score;
    //   });
    //   submission.totalScore = newTotalScore;

    //   await submission.save();
    // }

    return NextResponse.json({
      testStatuses,
      compilerError,
      userPassedCount: passedCount,
      score: pointsEarned,
      // totalScore: submission?.totalScore || 0
    });

  } catch (error: any) {
    return NextResponse.json({ message: 'Kompilyasiya xətası', error: error.message }, { status: 500 });
  }
}