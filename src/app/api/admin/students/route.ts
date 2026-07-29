import dbConnect from "@/src/lib/dbConnect";
import User from "@/src/models/User";
import UserProgress from "@/src/models/UserProgress";
import Submission from "@/src/models/Submission";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();

    // 1. Şagirdləri gətiririk
    const students = await User.find({ role: 'student' })
      .sort({ registeredAt: -1 })
      .lean();

    if (!students.length) {
      return NextResponse.json({ students: [] });
    }

    const studentIds = students.map((s: any) => s._id);

    // 2. N+1 probleminin qarşısını almaq üçün bütün proqres və imtahanları bir dəfəyə çəkirik
    const [allProgresses, allSubmissions] = await Promise.all([
      UserProgress.find({ userId: { $in: studentIds } })
        .populate('currentModuleId', '_id title order tasks')
        .lean(),
      Submission.find({ studentId: { $in: studentIds } })
        .populate({
          path: 'contestId',
          select: 'title questions'
        })
        .lean()
    ]);

    // 3. Məlumatları studentId-yə görə qruplaşdırırıq (sürətli axtarış üçün)
    const progressMap = new Map<string, any[]>();
    allProgresses.forEach((p: any) => {
      const uId = p.userId.toString();
      if (!progressMap.has(uId)) progressMap.set(uId, []);
      progressMap.get(uId)!.push(p);
    });

    const submissionMap = new Map<string, any[]>();
    allSubmissions.forEach((sub: any) => {
      const sId = sub.studentId.toString();
      if (!submissionMap.has(sId)) submissionMap.set(sId, []);
      submissionMap.get(sId)!.push(sub);
    });

    // 4. Şagird məlumatlarını formatlayırıq
    const detailedStudents = students.map((student: any) => {
      const sId = student._id.toString();
      const userProgresses = progressMap.get(sId) || [];
      const userSubmissions = submissionMap.get(sId) || [];

      // İmtahan nəticələrini formatlayırıq
      const formattedExams = userSubmissions.map((sub: any) => {
        const subProgress = sub.progress || {};

        return {
          contestId: sub.contestId?._id,
          contestTitle: sub.contestId?.title || "Naməlum Yarış",
          totalScore: sub.totalScore,
          updatedAt: sub.updatedAt,
          questions: sub.contestId?.questions?.map((q: any) => {
            const studentProg = subProgress[q._id.toString()] || {};
            return {
              codeName: q.codeName,
              title: q.title,
              pointsPerTest: q.pointsPerTest,
              score: studentProg.score || 0,
              compilerError: studentProg.compilerError ? "Xəta var" : null,
              testStatuses: studentProg.testStatuses || []
            };
          }) || []
        };
      });

      // Proqres məlumatlarını formatlayırıq
      const formattedProgresses = userProgresses.map((progress: any) => ({
        _id: progress._id,
        currentModuleTitle: progress.currentModuleId?.title || "Başlamayıb",
        currentModuleOrder: progress.currentModuleId?.order || 0,
        currentTaskOrder: progress.currentTaskOrder || 0,
        totalSteps: progress.currentModuleId?.tasks?.length || 0,
        totalXp: progress.totalXp || 0,
        level: progress.level || 1,
        completedModulesCount: progress.completedModules?.length || 0,
        
        // 🔴 DÜZƏLİŞ BURADADIR: Sahələr mütləq `progress` obyektindən götürülməlidir
        unlockedModulesThisWeek: progress.unlockedModulesThisWeek || 0,
        weekStartDate: progress.weekStartDate || null
      }));

      return {
        ...student,
        progresses: formattedProgresses,
        exams: formattedExams
      };
    });

    return NextResponse.json({ students: detailedStudents });

  } catch (error: any) {
    console.error("Admin API Error:", error);
    return NextResponse.json(
      { error: "Şagird məlumatları gətirilərkən xəta baş verdi" },
      { status: 500 }
    );
  }
}