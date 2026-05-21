import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();
    // Bütün şagirdləri (admin olmayanları) gətiririk
    const students = await User.find({ role: 'student' }).sort({ registeredAt: -1 });
    return NextResponse.json({ students });
  } catch (error) {
    return NextResponse.json({ error: "Xəta" }, { status: 500 });
  }
}