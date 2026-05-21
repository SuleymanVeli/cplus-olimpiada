import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { inviteCode, email, fullName, avatar } = await req.json();

    // 1. Kodu yoxla və hələ istifadə olunmadığından əmin ol
    const invite = await User.findOne({ inviteCode, isRegistered: false });

    if (!invite) {
      return NextResponse.json({ error: "Kod keçərsizdir və ya artıq istifadə olunub!" }, { status: 400 });
    }

    // 2. Mövcud "invite" sətirini şagird məlumatları ilə doldur
    invite.email = email;
    invite.fullName = fullName;
    invite.avatar = avatar;
    invite.isRegistered = true;
    invite.registeredAt = new Date();
    
    await invite.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Qeydiyyat xətası" }, { status: 500 });
  }
}