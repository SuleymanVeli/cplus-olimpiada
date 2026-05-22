// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // NextAuth tokenini (sessiyanı) server tərəfində oxuyuruq
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  console.log("Middleware çalışdı. Token:", token);

  // Qorumaq istədiyimiz tələbə səhifələrinin prefiksi
  const isStudentRoute = pathname.startsWith('/student');

  // Əgər istifadəçi /student ilə başlayan səhifəyə keçmək istəyirsə və loqin olmayıbsa
  if (isStudentRoute && !token) {
    // Onu birbaşa ana səhifəyə yönləndiririk


    return NextResponse.redirect(new URL('/?logout=true', request.url));
  }

  // Hər şey qaydasındadırsa, keçidə icazə ver
  return NextResponse.next();
}

// Middleware-in hansı səhifələrdə aktiv olacağını təyin edirik
export const config = {
  /*
   * /student ilə başlayan bütün səhifələri, alt qovluqları daxil olmaqla qoruyur.
   * API daxili yoxlanışları və static faylları bura daxil etmirik ki, sistem donmasın.
   */
  matcher: ['/student/:path*'],
};