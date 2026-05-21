import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/dbConnect'; // Sizin mongo qoşulma funksiyanız
import User from '@/src/models/User'; // User modeliniz
import { getServerSession } from 'next-auth'; // Əgər NextAuth istifadə edirsinizsə

export async function PUT(req: Request) {
  try {
    await dbConnect();
    
    // 1. İstifadəçini müəyyən et (NextAuth nümunəsi)
    const session:any = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fullName, avatar } = await req.json();

    // 2. Bazada yenilə
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      { $set: { fullName, avatar } },
      { new: true } // Yenilənmiş datanı qaytar
    );

    return NextResponse.json({ 
      message: "Profil yeniləndi", 
      data: { fullName: updatedUser.fullName, avatar: updatedUser.avatar } 
    });

  } catch (error) {
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}
