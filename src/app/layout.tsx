import type { Metadata } from "next";
import { DotGothic16, Geist, Geist_Mono as GeistMono } from "next/font/google";
import AuthSessionInvalidModal from "@/components/AuthSessionInvalidModal";
import CommonHeader from "@/components/CommonHeader";
import { CurrentUserProvider } from "@/contexts/CurrentUserContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = GeistMono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dotGothic16 = DotGothic16({
  variable: "--font-dot-gothic-16",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Type-Clash",
  description: "リアルタイム対戦型タイピングアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} ${dotGothic16.variable} h-full antialiased`}
    >
      <body data-background-id="0">
        <CurrentUserProvider>
          <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-8 sm:py-10">
            <CommonHeader />
            {children}
          </div>
          <AuthSessionInvalidModal />
        </CurrentUserProvider>
      </body>
    </html>
  );
}
