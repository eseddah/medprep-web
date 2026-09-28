'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { useStore } from '@/lib/store';
import { getStoredUser } from '@/lib/auth';

export default function DashboardLayout({ children, title, sub }: { children: React.ReactNode; title: string; sub?: string }) {
  const router = useRouter();
  const { user, setUser } = useStore();

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { router.push('/login'); return; }
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
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="px-8 py-4 border-b border-border bg-surface flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-dm-serif text-[20px] text-text">{title}</h1>
            {sub && <p className="text-[12px] text-text3 mt-0.5">{sub}</p>}
          </div>
          {['pro','annual'].includes(user.plan) ? null : (
            <a href="/billing" className="px-4 py-2 rounded-lg text-[13px] font-semibold text-black" style={{ background:'linear-gradient(135deg,var(--amber),#e8912a)' }}>✨ Upgrade to Pro</a>
          )}
        </div>
        <main className="flex-1 p-8 max-w-[1100px] w-full page-anim">
          {children}
        </main>
      </div>
    </div>
  );
}
