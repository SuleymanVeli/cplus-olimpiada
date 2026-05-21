import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { v4 as uuidv4 } from 'uuid'; // 'npm install uuid' lazımdır
import { NextResponse } from "next/server";

export async function POST() {
  await dbConnect();
  
  const inviteCode = uuidv4().slice(0, 8); // Qısa, unikal kod (məs: a1b2c3d4)
  
  // Bazada boş bir istifadəçi yaradırıq (yalnız invite kodu ilə)
  const newUser = await User.create({
    inviteCode,
    isRegistered: false
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/register?code=${inviteCode}`;
  
  return NextResponse.json({ url: inviteUrl, code: inviteCode });
}