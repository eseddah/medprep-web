'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, Flame } from 'lucide-react';
import api from '@/lib/api';
import { StreakSummary } from '@/lib/streak';

const MILESTONES = [3, 7, 14, 30, 100];

export default function StreakButton() {
  const [streak, setStreak] = useState<StreakSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [popoverTop, setPopoverTop] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const { data } = await api.get<StreakSummary>('/streak');
        if (active) setStreak(data);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    const refreshAfterActivity = () => { void load(); };
    void load();
    window.addEventListener('medprep:streak-updated', refreshAfterActivity);
    return () => {
      active = false;
      window.removeEventListener('medprep:streak-updated', refreshAfterActivity);
    };
  }, [retry]);

  useEffect(() => {
    if (!open) return;
    const closeFromOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeFromOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const currentStreak = streak?.currentStreak || 0;
  const milestone = streak?.todayDone && MILESTONES.includes(currentStreak) ? currentStreak : 0;
  const message = milestone
    ? `${milestone}-day streak milestone. Great work showing up consistently.`
    : streak?.todayDone
      ? 'You’re all set for today. Come back tomorrow to keep it going.'
      : currentStreak > 0
        ? 'Complete 1 activity today to keep your streak.'
        : 'Complete 1 activity today to start your streak.';

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Study streak: ${currentStreak} days${streak?.todayDone ? ', activity complete today' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="study-streak-popover"
        onClick={() => {
          if (!open) setPopoverTop((buttonRef.current?.getBoundingClientRect().bottom || 0) + 8);
          setOpen(value => !value);
        }}
        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border2 bg-surface2 px-2.5 text-[12px] font-semibold text-text2 hover:border-accent focus-visible:z-[60]"
      >
        <Flame size={17} aria-hidden="true" className={streak?.todayDone ? 'text-amber' : 'text-text3'} fill={streak?.todayDone ? 'currentColor' : 'none'} />
        <span>{currentStreak}</span>
        <span className="sr-only">{loading ? 'Loading' : error ? 'Unavailable' : 'day streak'}</span>
      </button>

      {open && (
        <section
          id="study-streak-popover"
          role="dialog"
          aria-label="Your study streak"
          className="fixed z-[60] rounded-xl border border-border bg-surface p-4 text-text shadow-xl"
          style={{ width: 'min(20rem, calc(100vw - 24px))', top: popoverTop, right: 12 }}
        >
          {loading ? (
            <p role="status" className="py-4 text-center text-[13px] text-text3">Loading streak…</p>
          ) : error ? (
            <div className="py-2 text-center">
              <p role="alert" className="text-[13px] text-text2">Your streak could not be loaded.</p>
              <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 text-[12px] font-semibold text-accent underline">Try again</button>
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface2 p-3">
                  <p className="text-[11px] text-text3">Current streak</p>
                  <p className="mt-0.5 text-[22px] font-semibold text-text">{currentStreak} <span className="text-[12px] font-normal text-text3">days</span></p>
                </div>
                <div className="rounded-lg bg-surface2 p-3">
                  <p className="text-[11px] text-text3">Longest streak</p>
                  <p className="mt-0.5 text-[22px] font-semibold text-text">{streak?.longestStreak || 0} <span className="text-[12px] font-normal text-text3">days</span></p>
                </div>
              </div>
              <div className="mb-4 grid grid-cols-7 gap-1" aria-label="This week's activity, Monday through Sunday">
                {(streak?.weekDays || []).map(day => (
                  <div key={day.date} className="flex min-w-0 flex-col items-center gap-1.5" aria-label={`${day.day}, ${day.date}${day.active ? ', activity completed' : ', no activity'}${day.today ? ', today' : ''}`}>
                    <span className="text-[10px] text-text3">{day.day}</span>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${day.today ? 'border-accent ring-2 ring-accent/25' : 'border-border2'} ${day.active ? 'bg-accent text-white' : 'bg-surface2 text-text3'}`}>
                      {day.active && <Check size={14} aria-hidden="true" />}
                      {day.today && !day.active && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                    </span>
                  </div>
                ))}
              </div>
              <p aria-live="polite" className="text-[12px] leading-relaxed text-text2">{message}</p>
            </>
          )}
        </section>
      )}
    </div>
  );
}