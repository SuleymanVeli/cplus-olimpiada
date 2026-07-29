import { NextResponse } from 'next/server';

import dbConnect from '@/src/lib/dbConnect';
import Contest from '@/src/models/Contest';

// ==================== GET: SİYAHILAMA VƏ REALTİME AXTARIŞ (SEARCH) ====================
export async function GET(request: Request) {
  try {
    await dbConnect();

    // URL-dən query parametrlərini oxuyuruq (?search=olimpiada)
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Əgər axtarış sözü varsa MongoDB üçün regex filteri hazırlayırıq
    const queryFilter = search
      ? { title: { $regex: search, $options: 'i' } }
      : {};

    const contests = await Contest.find(queryFilter)
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: contests }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ==================== POST: YENİ CONTEST YARATMAQ ====================
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.title || !body.startTime || !body.endTime) {
      return NextResponse.json({ success: false, message: "Məlumatlar tam deyil." }, { status: 400 });
    }

    // Sualları emal edib test sayını backend tərəfində hesablayırıq
    const processedQuestions = (body.questions || []).map((q: any) => ({
      ...q,
      codeName: q.codeName ? q.codeName.toUpperCase() : 'A',
      totalTestCases: q.testCases ? q.testCases.length : 0,
      pointsPerTest: Number(q.pointsPerTest) || 20
    }));

    const newContest = new Contest({
      title: body.title,
      durationMinutes: Number(body.durationMinutes) || 120,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      questions: processedQuestions,
      level: body.level,
      reqOrder: body.reqOrder
    });

    await newContest.save();
    return NextResponse.json({ success: true, data: { id: newContest._id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ==================== PUT: MÖVCUD CONTEST-İ YENİLƏMƏK (?id=...) ====================
export async function PUT(request: Request) {
  try {
    await dbConnect();

    // URL query-dən ID-ni oxuyuruq (?id=64f1a...)
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, message: "Yeniləmək üçün 'id' parametri göndərilməlidir." }, { status: 400 });
    }

    const processedQuestions = (body.questions || []).map((q: any) => ({
      ...q,
      codeName: q.codeName ? q.codeName.toUpperCase() : 'A',
      totalTestCases: q.testCases ? q.testCases.length : 0,
      pointsPerTest: Number(q.pointsPerTest) || 20
    }));

    const updatedContest = await Contest.findByIdAndUpdate(
      id,
      {
        title: body.title,
        durationMinutes: Number(body.durationMinutes) || 120,
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
        questions: processedQuestions,
        level: body.level,
        reqOrder: body.reqOrder
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedContest) {
      return NextResponse.json({ success: false, message: "Sınaq tapılmadı." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Uğurla yeniləndi.", data: updatedContest }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}