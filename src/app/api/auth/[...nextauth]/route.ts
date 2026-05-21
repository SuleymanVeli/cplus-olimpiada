import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/register', // Giriş üçün register səhifəsinə yönləndir
  },
  callbacks: {
    async session({ session, token }) {
      // Session daxilində istifadəçi emailini rahat tapmaq üçün
      return session;
    },
  },
});

export { handler as GET, handler as POST };