// src/app/api/register/complete/route.ts
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Sessiya tapılmadı!" }, { status: 401 });
    }

    const { firstName, lastName, avatar } = await req.json();

    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: "Ad və Soyad doldurulmalıdır!" }, { status: 400 });
    }

    // Google email-i ilə mövcud istifadəçini tap və yenilə
    let user = await User.findOne({ email: session.user.email });

    if (!user) {
      user = new User({
        email: session.user.email,       
      });      
    }

    if (user.isBlocked) {
      return NextResponse.json({ error: "Bu hesab bloklanıb!" }, { status: 403 });
    }

    user.fullName = `${firstName.trim()} ${lastName.trim()}`;
    user.avatar = avatar || "1";
    user.isRegistered = true;
    user.registeredAt = new Date();
    user.level = 1; // Yeni istifadəçi üçün başlanğıc səviyyə
    user.weeklyModuleLimit = 1; // Yeni istifadəçi üçün həftəlik modul limiti
    user.weeklyLessonDays = 100; // Yeni istifadəçi üçün həftəlik dərs günləri


    await user.save();

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Qeydiyyat zamanı xəta baş verdi" }, { status: 500 });
  }
}

