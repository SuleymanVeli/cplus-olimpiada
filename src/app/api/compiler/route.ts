import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { code, stdin } = await request.json();

    // 1. ADDIM: İlk olaraq şansımızı Wandbox ilə yoxlayırıq
    try {
      const wandboxResponse = await fetch("https://wandbox.org/api/compile.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compiler: "gcc-head",
          code: code,
          stdin: stdin || "",
          save: false
        }),
        next: { revalidate: 0 } // Cache-lənmənin qarşısını almaq üçün
      });

      const result = await wandboxResponse.json();

      // Əgər Wandbox-dan uğurlu cavab gəlibsə və "crun" xətası yoxdursa, dərhal qaytar
      if (result && !(result.compiler_error && result.compiler_error.includes("crun"))) {
        return NextResponse.json({
          compiler_error: result.compiler_error || null,
          program_output: result.program_output || ""
        });
      }
    } catch (e) {
      console.log("Wandbox xətası, OnlineCompiler-ə keçilir...");
    }

    // 2. ADDIM: Wandbox uğursuz oldusa, OnlineCompiler (Judge0 / Standart Sistem) işə düşür
    // C++ üçün standart dil ID-si adətən 54 (GCC) və ya provayderə uyğun tənzimlənir

    console.log("OnlineCompiler-ə sorğu göndərilir...");
    const compilerResponse = await fetch("https://api.onlinecompiler.io/api/run-code-sync/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "7c1450559b2dafd12fda09300f7100ae" // Sənin tokenin
      },
      body: JSON.stringify({
        code: code,
        compiler: "g++-15", // C++ (GCC) üçün standart ID
        input: stdin || ""
      })
    });

    const compilerResult = await compilerResponse.json();

    return NextResponse.json({
      compiler_error: compilerResult.error || null,
      program_output: compilerResult.output || ""
    });

  } catch (error: any) {
    console.error("Backend Ümumi Xətası:", error);
    return NextResponse.json({ compiler_error: "Sistemdə xəta yarandı", program_output: "" }, { status: 500 });
  }
}