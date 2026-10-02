'use client';
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, GraduationCap, Mail, X } from 'lucide-react';

const EMAIL = 'edmondeddah999@gmail.com';
const GMAIL_COMPOSE_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL)}`;

export default function DeveloperProfile() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const closeDialog = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <section className="mb-8 border-y border-border py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4 md:gap-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[24px] font-dm-serif text-white md:h-16 md:w-16" style={{ background: 'var(--accent)' }}>E</div>
          <div className="min-w-0">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-text3">Developer</p>
            <h3 className="font-dm-serif text-[21px] text-text">Edmond Eddah</h3>
            <p className="text-[13px] text-text2">Biochemistry · KNUST</p>
          </div>
        </div>
        <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border2 bg-surface2 px-4 py-2 text-[13px] font-semibold text-text2 transition-colors hover:border-accent hover:text-accent">
          <GraduationCap size={17} aria-hidden="true" />
          Meet the developer
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="developer-dialog-title"
        onCancel={event => { event.preventDefault(); closeDialog(); }}
        onClose={() => setOpen(false)}
        onClick={event => { if (event.target === dialogRef.current) closeDialog(); }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/55"
      >
        <div className="p-5 sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[24px] font-dm-serif text-white" style={{ background: 'var(--accent)' }}>E</div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase text-text3">Meet the developer</p>
                <h2 id="developer-dialog-title" className="mt-1 break-words font-dm-serif text-[23px] text-text">Edmond Eddah</h2>
              </div>
            </div>
            <button type="button" aria-label="Close developer profile" onClick={closeDialog} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text3 hover:bg-surface2 hover:text-text">
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2 text-[12px] text-text2">
            <span className="rounded-full border border-border2 bg-surface2 px-3 py-1.5">Programme: Biochemistry</span>
            <span className="rounded-full border border-border2 bg-surface2 px-3 py-1.5">School: KNUST</span>
          </div>

          <div className="space-y-3 text-[14px] leading-relaxed text-text2">
            <p>Edmond is a Biochemistry student at KNUST with a passion for making demanding science easier to understand and remember.</p>
            <p>MedPrep grew from a simple idea: bring active recall, clear explanations, and practical study tools together so students can learn with more confidence, not just spend more hours reading.</p>
          </div>

          <a href={GMAIL_COMPOSE_URL} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-white hover:brightness-110">
            <Mail size={16} aria-hidden="true" />
            <span className="break-all">{EMAIL}</span>
            <ExternalLink size={14} aria-hidden="true" />
            <span className="sr-only">Open Gmail compose in a new tab</span>
          </a>
        </div>
      </dialog>
    </section>
  );
}