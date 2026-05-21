import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const { studentId, note } = await req.json();

    const updatedUser = await User.findByIdAndUpdate(
      studentId, 
      { globalNote: note },
      { new: true }
    );

    if (!updatedUser) return NextResponse.json({ error: "İstifadəçi tapılmadı" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}