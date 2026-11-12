import type { Metadata } from "next";
import { Source_Sans_3, Libre_Baskerville } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Toaster } from "react-hot-toast";

const outfit = Source_Sans_3({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-outfit" });
const dmSerif = Libre_Baskerville({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-dm-serif" });

export const metadata: Metadata = {
  title: "MedPrep — Medical & Premed Study Toolkit",
  description: "AI-powered study tools for medical, premed, and mathematics students. Quizzes, flashcards, live lessons, and 29 full courses.",
  keywords: "MCAT, medical school, anatomy, physiology, AI study, quiz generator, flashcards",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSerif.variable}`}>
      <body className="app-shell bg-bg text-text font-outfit antialiased">
        <Toaster position="bottom-right" toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border2)' } }} />
        {children}
      </body>
    </html>
  );
}
