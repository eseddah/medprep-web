'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowRight, BookOpen, Check, GraduationCap, ShieldCheck, Sparkles, X } from 'lucide-react';
import CourseArtwork from '@/components/courses/CourseArtwork';
import { COURSES } from '@/lib/courses';
import { getStoredUser } from '@/lib/auth';

const featuredCourses = ['anatomy', 'physio', 'biochem']
  .map(id => COURSES.find(course => course.id === id))
  .filter((course): course is (typeof COURSES)[number] => Boolean(course));

export default function HomePage() {
  const router = useRouter();
  const [promptOpen, setPromptOpen] = useState(false);

  const markPromptSeen = useCallback(() => {
    try { sessionStorage.setItem('medprep-trial-prompt-seen', 'true'); } catch {}
  }, []);

  const closePrompt = useCallback(() => {
    markPromptSeen();
    setPromptOpen(false);
    router.push('/courses');
  }, [markPromptSeen, router]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('medprep-trial-prompt-seen') !== 'true') setPromptOpen(true);
    } catch {
      setPromptOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!promptOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePrompt();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [closePrompt, promptOpen]);

  const startTrial = () => {
    markPromptSeen();
    setPromptOpen(false);
    router.push(getStoredUser() ? '/courses' : '/register');
  };

  const openPlans = () => {
    markPromptSeen();
    setPromptOpen(false);
    window.setTimeout(() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const choosePro = () => {
    markPromptSeen();
    setPromptOpen(false);
    router.push(getStoredUser() ? '/billing' : '/register?next=%2Fbilling');
  };

  return (
    <main className="app-shell min-h-screen overflow-hidden bg-bg text-text">
      <header className="border-b border-border bg-surface/90">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 lg:px-8" aria-label="Main navigation">
          <Link href="/" className="font-dm-serif text-2xl tracking-tight text-text">
            Med<span className="text-accent">Prep</span>
          </Link>
          <div className="hidden items-center gap-8 text-[15px] font-medium text-text2 md:flex">
            <a href="#courses" className="transition-colors hover:text-accent">Courses</a>
            <a href="#features" className="transition-colors hover:text-accent">How it works</a>
            <a href="#plans" onClick={openPlans} className="transition-colors hover:text-accent">Plans</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden rounded-lg px-3 py-2 text-[14px] font-semibold text-text2 hover:text-accent sm:inline-flex">Sign in</Link>
            <button type="button" onClick={startTrial} className="rounded-lg bg-accent px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-accent2">
              Start free trial
            </button>
          </div>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 md:py-20 lg:grid-cols-[1.02fr_.98fr] lg:px-8 lg:py-24">
        <div className="page-anim">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3.5 py-2 text-[13px] font-semibold text-accent">
            <Sparkles size={15} aria-hidden="true" /> A more focused way to study
          </div>
          <h1 className="max-w-2xl font-dm-serif text-4xl leading-[1.14] tracking-tight text-text sm:text-5xl lg:text-[60px]">
            Prepare with clarity. Learn for the long term.
          </h1>
          <p className="mt-6 max-w-xl text-[18px] leading-8 text-text2">
            Build a strong foundation in medicine and the sciences with structured courses, active recall, and AI-guided explanations.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={startTrial} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-accent px-5 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-accent2">
              Start your 14-day trial <ArrowRight size={17} />
            </button>
            <a href="#courses" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border2 bg-surface px-5 py-3 text-[15px] font-semibold text-text2 transition hover:border-accent hover:text-accent">
              Explore courses <ArrowDown size={16} />
            </a>
          </div>
          <p className="mt-4 text-[13px] text-text3">No automatic charge. Your account returns to Free when the trial ends.</p>
          <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 border-t border-border pt-5 text-[14px] text-text2">
            <span className="inline-flex items-center gap-2"><BookOpen size={16} className="text-accent" /> {COURSES.length} structured courses</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-accent" /> 14 days of Pro access</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[560px] animate-float">
          <div className="absolute -inset-5 rounded-[2rem] bg-accent/5 blur-2xl" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-3 shadow-[0_24px_70px_rgba(27,48,40,0.12)]">
            <CourseArtwork course={featuredCourses[0]} className="h-[300px] rounded-xl sm:h-[390px]" imageClassName="object-[center_30%]" priority />
            <div className="absolute inset-x-3 bottom-3 rounded-b-xl bg-gradient-to-t from-black/75 to-transparent px-5 pb-5 pt-16 text-white">
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/75">A structured study library</p>
              <h2 className="mt-1 font-dm-serif text-2xl">From foundational science to clinical study</h2>
            </div>
          </div>
          <div className="absolute -left-5 top-8 hidden items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg sm:flex">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent"><GraduationCap size={21} /></span>
            <span><span className="block text-[13px] text-text3">Study at your pace</span><strong className="text-[15px] text-text">Clear, focused lessons</strong></span>
          </div>
        </div>
      </section>

      <section id="courses" className="border-y border-border bg-surface py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent">Course library</p>
              <h2 className="mt-2 font-dm-serif text-3xl tracking-tight text-text sm:text-4xl">Learn concepts in context</h2>
              <p className="mt-3 text-[16px] leading-7 text-text2">Explore illustrated learning paths across the subjects that support medical and premed study.</p>
            </div>
            <Link href="/courses" className="inline-flex items-center gap-2 text-[14px] font-semibold text-accent hover:underline">Browse all courses <ArrowRight size={16} /></Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {featuredCourses.map(course => (
              <Link key={course.id} href={`/courses/${course.id}`} className="group overflow-hidden rounded-xl border border-border bg-bg transition duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg">
                <CourseArtwork course={course} className="h-52" imageClassName="transition duration-500 group-hover:scale-[1.04]" />
                <div className="p-5">
                  <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-accent">{course.cat}</p>
                  <h3 className="mt-1 font-dm-serif text-xl text-text">{course.title}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-text2">{course.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-[14px] font-semibold text-accent">Explore course <ArrowRight size={15} /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-16 md:py-20 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent">A calmer study routine</p>
          <h2 className="mt-2 font-dm-serif text-3xl tracking-tight text-text sm:text-4xl">Tools that support real learning</h2>
          <p className="mt-3 text-[16px] leading-7 text-text2">Bring explanations, practice, and review together in one clear workspace.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: BookOpen, title: 'Structured courses', detail: 'Follow focused topic paths with relevant illustrations and generated lessons.' },
            { icon: Sparkles, title: 'Practice on demand', detail: 'Create quizzes and flashcards from course topics or your own study material.' },
            { icon: GraduationCap, title: 'Review with purpose', detail: 'Use guided explanations and spaced review to revisit difficult concepts.' },
          ].map(({ icon: Icon, title, detail }) => (
            <article key={title} className="rounded-xl border border-border bg-surface p-6 transition hover:border-accent/40 hover:shadow-md">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent"><Icon size={21} /></span>
              <h3 className="mt-5 font-dm-serif text-xl text-text">{title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-text2">{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="plans" className="border-y border-border bg-surface py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-5 lg:px-8">
          <div className="mx-auto mb-9 max-w-xl text-center">
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent">Plans</p>
            <h2 className="mt-2 font-dm-serif text-3xl tracking-tight text-text sm:text-4xl">Start free. Upgrade when you’re ready.</h2>
            <p className="mt-3 text-[16px] leading-7 text-text2">Every new account starts with 14 days of Pro access. No automatic charge at the end of the trial.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <article className="rounded-xl border border-border bg-bg p-6 md:p-8">
              <h3 className="font-dm-serif text-2xl text-text">Free</h3>
              <p className="mt-2 text-[15px] text-text2">Keep learning with a selection of courses and daily study tools.</p>
              <ul className="mt-6 space-y-3 text-[14px] text-text2">
                {['5 foundational courses', '10 quiz questions per session', '15 flashcards per session', '3 AI concept lessons per day', 'Community access'].map(item => <li key={item} className="flex gap-2"><Check size={17} className="mt-0.5 shrink-0 text-accent" />{item}</li>)}
              </ul>
              <button type="button" onClick={startTrial} className="mt-7 min-h-11 w-full rounded-lg border border-border2 bg-surface px-4 py-2.5 text-[14px] font-semibold text-text transition hover:border-accent hover:text-accent">Create a free account</button>
            </article>
            <article className="relative rounded-xl border-2 border-accent bg-bg p-6 shadow-[0_20px_50px_rgba(18,105,94,0.1)] md:p-8">
              <span className="absolute right-5 top-5 rounded-full bg-accent/10 px-3 py-1 text-[12px] font-bold text-accent">14-day trial included</span>
              <h3 className="font-dm-serif text-2xl text-text">Pro</h3>
              <p className="mt-1 text-[15px] font-semibold text-accent">GH₵50 monthly · GH₵500 annually</p>
              <p className="mt-2 text-[15px] text-text2">Unlock the complete study library and expanded learning tools.</p>
              <ul className="mt-6 space-y-3 text-[14px] text-text2">
                {['All 29 courses', 'Expanded quiz and flashcard limits', 'Interactive 3D model access', 'Live lessons and study uploads', 'Progress tracking and MCAT mode'].map(item => <li key={item} className="flex gap-2"><Check size={17} className="mt-0.5 shrink-0 text-accent" />{item}</li>)}
              </ul>
              <button type="button" onClick={choosePro} className="mt-7 min-h-11 w-full rounded-lg bg-accent px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-accent2">View Pro plans</button>
            </article>
          </div>
          <p className="mt-5 text-center text-[13px] text-text3">Your account returns to Free after the trial. A paid plan begins only when you choose one.</p>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-7 text-[13px] text-text3 lg:px-8">
        <Link href="/" className="font-dm-serif text-lg text-text">Med<span className="text-accent">Prep</span></Link>
        <span>Study tools for medicine, science, and mathematics.</span>
        <Link href="/about" className="hover:text-accent">About MedPrep</Link>
      </footer>

      {promptOpen && (
        <div className="trial-overlay fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={closePrompt}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="trial-dialog-title"
            className="trial-dialog relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface p-7 shadow-2xl sm:p-9"
            onClick={event => event.stopPropagation()}
          >
            <button type="button" onClick={closePrompt} aria-label="Close trial offer" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-text3 transition hover:bg-surface2 hover:text-text"><X size={19} /></button>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent"><GraduationCap size={23} /></span>
            <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.14em] text-accent">Welcome to MedPrep</p>
            <h2 id="trial-dialog-title" className="mt-2 font-dm-serif text-3xl leading-tight text-text">Choose how you’d like to begin</h2>
            <p className="mt-3 text-[15px] leading-7 text-text2">Start with 14 days of full Pro access, or compare the plans first. There’s no automatic charge when your trial ends.</p>
            <div className="mt-6 grid gap-3">
              <button type="button" onClick={startTrial} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-accent2">
                Start my 14-day free trial <ArrowRight size={17} />
              </button>
              <button type="button" onClick={openPlans} className="min-h-12 rounded-lg border border-border2 bg-surface px-5 py-3 text-[15px] font-semibold text-text2 transition hover:border-accent hover:text-accent">
                View plans
              </button>
            </div>
            <p className="mt-4 text-center text-[12px] text-text3">No payment details required to start.</p>
          </section>
        </div>
      )}
    </main>
  );
}
