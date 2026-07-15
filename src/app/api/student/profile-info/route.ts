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
    let user = await User.findOne({ email: session.user.email }).lean();

    // 2. Əgər istifadəçi tapılmadısa, UserProgress kolleksiyasını yoxlayın
    if (!user) {
      return NextResponse.json({ error: "İstifadəçi tapılmadı" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}