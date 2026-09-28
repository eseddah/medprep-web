import type { Metadata } from "next";
import { Outfit, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-dm-serif" });

export const metadata: Metadata = {
  title: "MedPrep — Medical & Premed Study Toolkit",
  description: "AI-powered study tools for medical and premed students. Quizzes, flashcards, live lessons, and 14 full courses.",
  keywords: "MCAT, medical school, anatomy, physiology, AI study, quiz generator, flashcards",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSerif.variable}`}>
      <body className="bg-bg text-text font-outfit antialiased">
        <Toaster position="bottom-right" toastOptions={{ style: { background: '#222736', color: '#e8eaf2', border: '1px solid #343b4f' } }} />
        {children}
      </body>
    </html>
  );
}
