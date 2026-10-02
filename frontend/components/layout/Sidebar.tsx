'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import api from '@/lib/api';
import clsx from 'clsx';
import { BookOpen, BookOpenCheck, Brain, CreditCard, GraduationCap, Info, Layers, MessageCircle, RotateCcw, Settings, ShieldCheck, Sparkles } from 'lucide-react';

const NAV = [
  { href: '/courses',    icon: GraduationCap, label: 'Courses', color: '#176d82' },
  { href: '/quiz',       icon: Brain, label: 'Quiz Generator', color: '#a24d15' },
  { href: '/review',     icon: RotateCcw, label: 'Smart Review', color: '#287348' },
  { href: '/flashcards', icon: Layers, label: 'Flashcards', color: '#6250a2' },
  { href: '/lesson',     icon: BookOpen, label: 'Live Lesson', color: '#287348' },
  { href: '/cases',      icon: BookOpenCheck, label: 'Case Rounds', color: '#a24d15' },
  { href: '/tutor',      icon: Sparkles, label: 'AI Tutor Pro', color: '#80509b' },
  { href: '/chat',       icon: MessageCircle, label: 'Study Lounge', color: '#087769' },
  { href: '/about',      icon: Info, label: 'About MedPrep', color: '#365f9b' },
  { href: '/settings',   icon: Settings, label: 'Settings', color: '#9b453e' },
  { href: '/billing',    icon: CreditCard, label: 'Plans & Billing', color: '#78601a' },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const user = useStore(s => s.user);
  const [isAdmin, setIsAdmin] = useState(false);
  const isPro = ['pro','annual'].includes(user?.plan || '');
  const initials = user?.name?.split(' ').map((w:string) => w[0]).join('').slice(0,2).toUpperCase() || '?';

  useEffect(() => {
    if (!user?._id) { setIsAdmin(false); return; }
    let active = true;
    api.get('/admin/access')
      .then(() => { if (active) setIsAdmin(true); })
      .catch(() => { if (active) setIsAdmin(false); });
    return () => { active = false; };
  }, [user?._id]);

  const navItems = isAdmin ? [...NAV, { href: '/admin', icon: ShieldCheck, label: 'Admin', color: '#176d82' }] : NAV;

  return (
    <aside className={clsx('fixed inset-y-0 left-0 z-50 w-[280px] bg-surface border-r border-border flex flex-col h-dvh overflow-y-auto transition-transform md:sticky md:top-0 md:z-auto md:w-[230px] md:min-w-[230px] md:translate-x-0 md:transition-none', open ? 'translate-x-0' : '-translate-x-full')} aria-label="Main navigation">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="font-dm-serif text-[22px] text-text">Med<span className="text-accent">Prep</span></div>
        <div className="text-[11px] text-text3 mt-0.5 tracking-wide uppercase">Study Toolkit</div>
      </div>

      {/* Plan badge */}
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
        <span className="text-[12px] text-text3">{isPro ? 'Pro Plan' : 'Free Plan'}</span>
        {isPro
          ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background:'rgba(62,207,142,.15)', color:'var(--green)', border:'1px solid rgba(62,207,142,.3)' }}>Pro ✓</span>
          : <Link href="/billing" className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber text-black">Upgrade</Link>}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2.5">
        {navItems.map(n => {
          const active = pathname.startsWith(n.href);
          const Icon = n.icon;
          return (
            <Link key={n.href} href={n.href} className={clsx(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-[13.5px] transition-all',
              active ? 'bg-surface3 text-text font-medium' : 'text-text2 hover:bg-surface2 hover:text-text'
            )} title={n.label} onClick={onClose}>
              <span className={clsx('w-[32px] h-[32px] rounded-[7px] border flex items-center justify-center shrink-0', active ? 'bg-accent border-transparent' : 'bg-surface2 border-border')} style={{ color: active ? '#fff' : n.color }}>
                <Icon size={17} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-surface3 border border-border2 flex items-center justify-center text-[13px] text-text2 flex-shrink-0">{initials}</div>
          <div className="min-w-0">
            <div className="text-[13px] text-text truncate">{user?.name || 'Student'}</div>
            <div className="text-[11px] text-text3 truncate">{user?.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
