import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/src/lib/dbConnect';
import CodeQueue from '@/models/CodeQueue';
import Contest from '@/models/Contest';
import Submission from '@/models/Submission';

async function executeCodeOnWandbox(code: string, stdin: string) {
  const response = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: code,
      stdin: stdin,
      compiler: "gcc-head",
      save: false
    }),
    signal: AbortSignal.timeout(6000) // Wandbox ilişib qalsa 6 saniyədə kəs
  });
  return await response.json();
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // 1. Təhlükəsizlik token yoxlanışı
    const { searchParams } = new URL(req.url);
    if (searchParams.get('token') !== process.env.CRON_SECRET_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Növbədən maksimum 3 iş götürürük (Wandbox-ı boğmamaq və timeout olmamaq üçün)
    const jobs = await CodeQueue.find({
      $or: [
        { status: 'queued' },
        { status: 'processing', lockedAt: { $lt: new Date(Date.now() - 2 * 60 * 1000) } }
      ]
    }).limit(3);

    if (jobs.length === 0) {
      return NextResponse.json({ message: 'Növbə boşdur.' });
    }

    // 3. Götürülən işləri dərhal kilidləyirik (Lock)
    await CodeQueue.updateMany(
      { _id: { $in: jobs.map(j => j._id) } },
      { $set: { status: 'processing', lockedAt: new Date() } }
    );

    // 4. Hər bir işi emal edirik
    const processPromises = jobs.map(async (job) => {
      try {
        const contest = await Contest.findById(job.contestId);
        const question = contest?.questions.find((q: any) => q.id === job.questionId);

        if (!question) {
          await CodeQueue.findByIdAndDelete(job._id); // Məsələ silinibsə, növbədən də sil
          return;
        }

        let passedCount = 0;
        let compilerError: string | null = null;
        let testStatuses: ('passed' | 'failed')[] = [];

        // Həmin məsələnin testlərini dövrlə yoxlayırıq
        for (const test of question.testCases) {
          const result = await executeCodeOnWandbox(job.code, test.input);

          if (result.compiler_error) {
            compilerError = result.compiler_error;
            break; 
          }

          const cleanUserOutput = result.program_message?.trim() || result.program_output?.trim();
          const cleanExpectedOutput = test.expectedOutput.trim();

          if (cleanUserOutput === cleanExpectedOutput) {
            testStatuses.push('passed');
            passedCount++;
          } else {
            testStatuses.push('failed');
          }
        }

        const pointsEarned = passedCount * question.pointsPerTest;

        // 5. Əsas Submission sənədini yeniləyirik
        const submission = await Submission.findById(job.submissionDocId);
        if (submission) {
          submission.progress.set(job.questionId, {
            questionId: job.questionId,
            code: job.code,
            testStatuses,
            compilerError,
            userPassedCount: passedCount,
            score: pointsEarned
          });

          // Yekun balın yenidən hesablanması
          let newTotalScore = 0;
          submission.progress.forEach((p: any) => {
            newTotalScore += p.score;
          });
          submission.totalScore = newTotalScore;

          await submission.save();
        }

        // İŞ UĞURLA BİTDİ: Növbə kolleksiyasından silirik 🗑️
        await CodeQueue.findByIdAndDelete(job._id);

      } catch (err) {
        console.error(`Job xətası ${job._id}:`, err);
        // 🔄 RETRY MEXANİZMİ: Əgər Wandbox şəbəkə xətası verdisə, statusu yenidən 'queued' edirik
        await CodeQueue.findByIdAndUpdate(job._id, { status: 'queued', lockedAt: null });
      }
    });

    await Promise.all(processPromises);
    return NextResponse.json({ success: true, processedCount: jobs.length });

  } catch (error: any) {
    return NextResponse.json({ message: 'Cron xətası', error: error.message }, { status: 500 });
  }
}