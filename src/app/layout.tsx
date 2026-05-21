import { Providers } from "../components/Providers";
import { TransitionProvider } from "../context/TransitionContext";
import { UserProvider } from "../context/UserContext";
import "./globals.css";
import { Plus_Jakarta_Sans } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta', // CSS dəyişəni kimi təyin edirik
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az">
      <body className={`${jakarta.className} antialiased text-slate-900`}>
        <Providers>
          <TransitionProvider>
            <UserProvider>
              {children}
            </UserProvider>
          </TransitionProvider>
        </Providers>
      </body>
    </html>
  );
}