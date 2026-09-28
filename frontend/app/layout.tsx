import type { Metadata } from "next";
import { Outfit, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-dm-serif" });

export const metadata: Metadata = {
  title: "MedPrep — Medical & Premed Study Toolkit",
  description: "AI-powered study tools for medical, premed, and mathematics students. Quizzes, flashcards, live lessons, and 29 full courses.",
  keywords: "MCAT, medical school, anatomy, physiology, AI study, quiz generator, flashcards",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSerif.variable}`}>
      <body className="bg-bg text-text font-outfit antialiased">
        <Toaster position="bottom-right" toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border2)' } }} />
        {children}
      </body>
    </html>
  );
}
