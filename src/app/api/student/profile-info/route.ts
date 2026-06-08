// src/app/api/student/profile-info/route.ts
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import UserProgress from "@/src/models/UserProgress";

export async function GET() {
  try {
    await dbConnect();
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Sessiya tapılmadı" }, { status: 401 });
    }

    // 1. İstifadəçini axtar
    let user = await User.findOne({ email: session.user.email });

    // 2. Əgər istifadəçi yoxdursa, yaradın
    if (!user) {
      user = await User.create({
        email: session.user.email,
        fullName: session.user.name || "",
        isRegistered: false,
        isBlocked: false,
      });
    }

    // 3. İndi user._id artıq mövcuddur, progress-i axtarın
    const userProg = await UserProgress.findOne({ userId: user._id });
    
    // 4. İstifadəçi obyektini klonlayıb səviyyəni əlavə edin (Mongoose obyektini birbaşa dəyişmək bəzən problem yaradır)
    const userData = user.toObject();
    userData.level = userProg?.level || 1;

    return NextResponse.json(userData);
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}