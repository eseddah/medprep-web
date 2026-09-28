'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import clsx from 'clsx';

const NAV = [
  { href: '/courses',    icon: '🎓', label: 'Courses' },
  { href: '/quiz',       icon: '🧠', label: 'Quiz Generator' },
  { href: '/flashcards', icon: '⚡', label: 'Flashcards' },
  { href: '/lesson',     icon: '📖', label: 'Live Lesson' },
  { href: '/about',      icon: 'ℹ️',  label: 'About MedPrep' },
  { href: '/settings',   icon: '⚙️',  label: 'Settings' },
  { href: '/billing',    icon: '💳', label: 'Plans & Billing' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const user = useStore(s => s.user);
  const isPro = ['pro','annual'].includes(user?.plan || '');
  const initials = user?.name?.split(' ').map((w:string) => w[0]).join('').slice(0,2).toUpperCase() || '?';

  return (
    <aside className="w-[230px] min-w-[230px] bg-surface border-r border-border flex flex-col sticky top-0 h-screen overflow-y-auto">
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
        {NAV.map(n => {
          const active = pathname.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={clsx(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-[13.5px] transition-all',
              active ? 'bg-surface3 text-text font-medium' : 'text-text2 hover:bg-surface2 hover:text-text'
            )}>
              <span className={clsx('w-[30px] h-[30px] rounded-[7px] flex items-center justify-center text-[14px] flex-shrink-0', active ? 'bg-accent' : 'bg-surface3')}>{n.icon}</span>
              {n.label}
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
