import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import UserProgress from "@/models/UserProgress";
import Submission from "@/models/Submission";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();

    const students = await User.find({ role: 'student' }).sort({ registeredAt: -1 }).lean();

    const detailedStudents = await Promise.all(
      students.map(async (student: any) => {
        const progress = await UserProgress.findOne({ userId: student._id })
          .populate('currentModuleId', 'title order tasks games')
          .lean();

        const examSubmissions = await Submission.find({ studentId: student._id })
          .populate({
            path: 'contestId',
            select: 'title questions'
          })
          .lean();

        const formattedExams = examSubmissions.map((sub: any) => {
          const progressMap = sub.progress || {};
          
          return {
            contestId: sub.contestId?._id,
            contestTitle: sub.contestId?.title || "Naməlum Yarış",
            totalScore: sub.totalScore,
            updatedAt: sub.updatedAt,
            questions: sub.contestId?.questions?.map((q: any) => {
              const studentProg = progressMap[q._id.toString()] || {};
              return {
                codeName: q.codeName,
                title: q.title,
                pointsPerTest: q.pointsPerTest,
                score: studentProg.score || 0,
                // Kodları çıxartdıq, sadəcə xəta statusu qaldı
                compilerError: studentProg.compilerError ? "Xəta var" : null,
                testStatuses: studentProg.testStatuses || []
              };
            }) || []
          };
        });

        // Modul daxilindəki ümumi addım sayını (Mühazirə + Tasklar + Oyunlar) hesablayırıq
        const totalModuleSteps = progress?.currentModuleId 
          ? 1 + (progress.currentModuleId.tasks?.length || 0) + (progress.currentModuleId.games?.length || 0)
          : 0;

        return {
          ...student,
          progress: progress ? {
            totalXp: progress.totalXp,
            currentModuleTitle: progress.currentModuleId?.title || "Başlamayıb",
            currentModuleOrder: progress.currentModuleId?.order || 0,
            currentTaskOrder: progress.currentTaskOrder, // Şagirdin modul daxilindəki cari addımı
            totalSteps: totalModuleSteps,
            completedModulesCount: progress.completedModules?.length || 0,
          } : null,
          exams: formattedExams
        };
      })
    );

    return NextResponse.json({ students: detailedStudents });
  } catch (error) {
    console.error("Admin API Error:", error);
    return NextResponse.json({ error: "Xəta baş verdi" }, { status: 500 });
  }
}