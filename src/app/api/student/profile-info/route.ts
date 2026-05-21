// src/app/api/student/profile-info/route.ts
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function GET() {
  try {
    await dbConnect();
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Sessiya tapılmadı" }, { status: 401 });
    }

    let user = await User.findOne({ email: session.user.email });

    // Əgər istifadəçi ilk dəfə gəlirsə, bazada sətir açırıq (Açıq Qeydiyyat)
    if (!user) {
      user = await User.create({
        email: session.user.email,
        fullName: session.user.name || "",
        isRegistered: false,
        isBlocked: false
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}