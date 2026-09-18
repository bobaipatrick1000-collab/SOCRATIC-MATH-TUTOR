import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { TopBar } from "@/components/TopBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aurea — a patient mathematics tutor",
  description:
    "Aurea watches your work line by line. It stays silent while you think, and asks one good question only when you are stuck.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('aurea:theme');if(t===null)t='light';if(t==='dark')document.documentElement.dataset.theme='dark';}catch(e){}`,
          }}
        />
        <TopBar />
        <main className="main">{children}</main>
        <footer className="site-foot">
          <span>Sources shown on lessons are open-licensed or public domain.</span>
          <span className="site-foot-note">Aurea · code name · v0.2 print demo</span>
        </footer>
      </body>
    </html>
  );
}