'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { useStore } from '@/lib/store';
import { getStoredUser } from '@/lib/auth';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { Menu } from 'lucide-react';
import StreakButton from './StreakButton';

export default function DashboardLayout({ children, title, sub }: { children: React.ReactNode; title: string; sub?: string }) {
  const router = useRouter();
  const { user, setUser } = useStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      const referral = new URLSearchParams(window.location.search).get('referral')?.trim().toUpperCase() || '';
      if (/^[A-Z0-9_-]{4,32}$/.test(referral)) localStorage.setItem('medprep_pending_referral', referral);
      router.push(referral ? `/login?referral=${encodeURIComponent(referral)}` : '/login');
      return;
    }
    setUser(stored);
  }, []);

  if (!user) return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="font-dm-serif text-[26px]">Med<span className="text-accent">Prep</span></div>
        <div className="spinner" />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {mobileNavOpen && <button type="button" aria-label="Close navigation menu" className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileNavOpen(false)} />}
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col overflow-auto">
        <div className="px-3 sm:px-5 md:px-8 py-3 md:py-4 border-b border-border bg-surface flex flex-wrap items-center justify-end sm:justify-between gap-3 flex-shrink-0">
          <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1">
            <button type="button" aria-label="Open navigation menu" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(true)} className="md:hidden h-10 w-10 shrink-0 rounded-lg border border-border2 bg-surface2 text-text2 flex items-center justify-center">
              <Menu size={19} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="font-dm-serif text-[20px] text-text break-words">{title}</h1>
              {sub && <p className="text-[12px] text-text3 mt-0.5 break-words">{sub}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <StreakButton />
            <ThemeToggle />
            {['pro','annual'].includes(user.plan) ? null : (
              <a href="/billing" className="px-3 md:px-4 py-2 rounded-lg text-[12px] md:text-[13px] font-semibold text-white whitespace-nowrap" style={{ background:'var(--accent)' }}>Upgrade to Pro</a>
            )}
          </div>
        </div>
        <main className="flex-1 p-4 md:p-8 max-w-[1280px] w-full page-anim">
          {children}
        </main>
      </div>
    </div>
  );
}
