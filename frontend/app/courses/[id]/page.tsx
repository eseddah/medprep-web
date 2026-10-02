'use client';
import { useState, use, useRef, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import { COURSES, courseImageUrl } from '@/lib/courses';
import { useStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import { notFound } from 'next/navigation';
import { formatLesson } from '@/lib/lessonContent';
import { consumeLessonStream } from '@/lib/streamLesson';
import { recordStreakActivity } from '@/lib/streak';
import { Pause, Play } from 'lucide-react';

const NIH3D_ENTRY = 'https://3d.nih.gov/entries/3DPX-021858';
const NIH3D_PREVIEW = 'https://3d.nih.gov/api/submissions/29574/files/input/763998';

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const course = COURSES.find(c => c.id === id);
  if (!course) notFound();

  const [activeTopic, setActiveTopic] = useState<string|null>(null);
  const [content, setContent] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lessonError, setLessonError] = useState('');
  const [lessonUsage, setLessonUsage] = useState({ used: 0, date: '' });
  const requestSequence = useRef(0);
  const abortController = useRef<AbortController | null>(null);
  const user = useStore(s => s.user);
  const isPro = ['pro','annual'].includes(user?.plan || '');
  const today = new Date().toISOString().slice(0, 10);
  const lessonsUsedToday = lessonUsage.date === today ? lessonUsage.used : 0;
  const lessonsRemaining = Math.max(0, 3 - lessonsUsedToday);

  const refreshLessonUsage = async () => {
    try {
      const { data } = await api.get('/users/stats');
      setLessonUsage({ used: data.stats?.dailyConceptsUsed || 0, date: data.stats?.dailyConceptsDate || '' });
    } catch {}
  };

  useEffect(() => { void refreshLessonUsage(); }, []);

  const loadTopic = async (topic: string, previousContent = '') => {
    const sequence = ++requestSequence.current;
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    setActiveTopic(topic);
    setContent(previousContent);
    setLessonError('');
    setPaused(false);
    setStreaming(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ai/lesson`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('medprep_token')}` },
        body: JSON.stringify({ topic: `${course.title}: ${topic}`, courseId: course.id, depth:'Deep dive', previousContent }),
        signal: controller.signal,
      });
      let full = previousContent;
      const incomplete = await consumeLessonStream(res, text => {
        full += text;
        if (sequence === requestSequence.current) setContent(full);
      });
      if (!full.trim()) throw new Error('No lesson content was returned. Please try again.');
      if (sequence !== requestSequence.current) return;
      if (incomplete) {
        setPaused(true);
        setLessonError('The lesson reached its response limit. Resume to continue the lesson.');
        await refreshLessonUsage();
        return;
      }
      try { await api.post('/ai/save-progress', { courseId: course.id, topic, type: 'lesson' }); }
      catch { toast.error('Lesson ready, but course progress did not sync'); }
      void recordStreakActivity().catch(() => toast.error('Lesson finished, but your streak could not be updated.'));
      await refreshLessonUsage();
    } catch (error: any) {
      if (sequence === requestSequence.current && !controller.signal.aborted) {
        const message = error.message || 'Could not generate this lesson. Please try again.';
        setLessonError(message);
        toast.error(message);
      }
    } finally {
      if (sequence === requestSequence.current) setStreaming(false);
      if (abortController.current === controller) abortController.current = null;
    }
  };

  const pauseLesson = () => {
    setPaused(true);
    abortController.current?.abort();
  };

  return (
    <DashboardLayout title={course.title} sub={course.desc}>
      <Link href="/courses" className="text-[13px] text-text3 hover:text-text flex items-center gap-1.5 mb-5">← All courses</Link>
      <section className="relative overflow-hidden rounded-xl border border-border bg-surface mb-6 h-[190px] md:h-[230px]">
        <img src={courseImageUrl(course.image)} alt={`${course.title} study illustration`} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{background:'linear-gradient(90deg,rgba(18,38,33,.94),rgba(18,38,33,.72) 50%,rgba(18,38,33,.16))'}} />
        <div className="relative h-full flex flex-col justify-end p-5 md:p-7 text-white max-w-2xl">
          <div className="text-[11px] uppercase tracking-wide text-white/75 mb-1">{course.cat} · {course.topics.length} learning modules</div>
          <h2 className="font-dm-serif text-[27px] md:text-[34px] mb-1">{course.title}</h2>
          <p className="text-[13px] leading-relaxed text-white/85">{course.desc}</p>
        </div>
      </section>
      {!isPro && <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber/35 bg-amber/10 px-3.5 py-2.5 text-[12px] text-text2">
        <span>Free plan: 3 concept generations per day · {lessonsRemaining} remaining today</span>
        <Link href="/billing" className="font-semibold text-accent hover:underline">Upgrade for unlimited lessons</Link>
      </div>}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-5 items-start">
        <div className="space-y-4 lg:sticky lg:top-4">
          <Card p="p-0" className="overflow-hidden">
            <div className="h-1" style={{background:course.color}}/>
            <div className="p-3">
              <p className="text-[11px] text-text3 uppercase tracking-wide mb-2">Topics</p>
              {course.topics.map(t => (
                <button key={t} onClick={()=>loadTopic(t)} className={`block w-full text-left px-3 py-2 rounded-lg text-[13px] mb-0.5 transition-all border-l-[3px] ${activeTopic===t?'bg-surface3 text-text font-medium':'text-text2 hover:bg-surface2 border-transparent'}`} style={{borderLeftColor:activeTopic===t?course.color:'transparent',fontFamily:'var(--font-outfit)'}}>{t}</button>
              ))}
            </div>
          </Card>
          {course.staticImages.length > 0 && (
            <Card>
              <p className="text-[11px] text-text3 uppercase tracking-wide mb-2">Course illustrations</p>
              {course.staticImages.map((src,i) => (
                <img key={i} src={courseImageUrl(src)} alt={`${course.title} study diagram`} className="w-full rounded-lg border border-border mb-2 bg-surface object-contain" style={{height:120}} loading="lazy" onError={e=>(e.currentTarget.style.display='none')}/>
              ))}
            </Card>
          )}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-border">
              <p className="text-[11px] text-text3 uppercase tracking-wide mb-1">Verified 3D source</p>
              <h3 className="font-semibold text-[14px] text-text">NIH 3D model library</h3>
            </div>
            {(course.id === 'immuno' || course.id === 'gastro') ? (
              <>
                <img src={NIH3D_PREVIEW} alt="NIH 3D rendering of HLA-DQ8 presenting a gluten peptide to a T-cell receptor" className="w-full h-40 object-cover bg-surface2" />
                <div className="p-3">
                  <p className="text-[12px] text-text2 mb-2">HLA-DQ8 antigen presentation · NIH 3D entry 3DPX-021858</p>
                  {isPro
                    ? <a href={NIH3D_ENTRY} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-accent hover:underline">Open interactive 3D viewer ↗</a>
                    : <Link href="/billing" className="text-[12px] font-semibold text-accent hover:underline">Unlock interactive models with Pro</Link>}
                </div>
                <div className="px-4 py-3 text-[11px] text-text3">NIH 3D · Entry 3DPX-021858 · CC BY 4.0</div>
              </>
            ) : (
              <div className="p-4">
                <p className="text-[12px] text-text2 leading-relaxed mb-3">Browse NIH-hosted scientific models related to {course.title}. Model licenses and contributors are listed on each entry.</p>
                <a href={`https://3d.nih.gov/discover?search=${encodeURIComponent(course.title)}`} target="_blank" rel="noreferrer" className="inline-flex text-[12px] font-semibold text-accent hover:underline">Search NIH 3D models ↗</a>
              </div>
            )}
            <a href={NIH3D_ENTRY} target="_blank" rel="noreferrer" className="block border-t border-border px-4 py-3 text-[11px] text-text3 hover:text-accent">Open source entry at 3d.nih.gov ↗</a>
          </Card>
        </div>
        <div>
          {!course.free && !isPro ? (
            <Card className="text-center py-12">
              <p className="text-[11px] uppercase tracking-wide text-text3 mb-2">Pro course</p>
              <h3 className="font-dm-serif text-[22px] text-text mb-2">Unlock {course.title}</h3>
              <p className="text-[13px] text-text2 max-w-md mx-auto mb-5">Get the complete topic library, in-depth lessons, and course illustrations with Pro.</p>
              <Link href="/billing" className="inline-flex px-4 py-2 rounded-lg bg-accent text-white text-[13px] font-semibold">View plans</Link>
            </Card>
          ) : !activeTopic ? (
            <Card className="text-center py-16">
              <div className="mb-5 overflow-hidden rounded-lg max-h-64 border border-border bg-surface2">
                <img src={courseImageUrl(course.image)} alt={`${course.title} illustration`} className="w-full max-h-64 object-contain" />
              </div>
              <h3 className="font-dm-serif text-[18px] text-text mb-2">Select a topic</h3>
              <p className="text-[13px] text-text3">Choose any topic from the list to generate an AI-powered lesson.</p>
            </Card>
          ) : activeTopic && (
            <Card>
              <div className="border-b border-border pb-4 mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-text3 uppercase tracking-wide mb-1">{course.title}</div>
                  <h3 className="font-dm-serif text-[18px] text-text">{activeTopic}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {streaming && <><span className="flex items-center gap-2 text-[12px] text-text2"><Spinner size={13} color="var(--accent)"/>Generating…</span><button type="button" onClick={pauseLesson} className="inline-flex items-center gap-1 rounded-md border border-border2 px-2 py-1 text-[11px] font-medium text-text2 hover:border-accent"><Pause size={13}/>Pause</button></>}
                  {paused && <><span className="text-[12px] text-amber">Paused · partial lesson saved</span><button type="button" onClick={() => activeTopic && loadTopic(activeTopic, content)} className="inline-flex items-center gap-1 rounded-md border border-accent px-2 py-1 text-[11px] font-semibold text-accent"><Play size={13}/>Resume</button></>}
                </div>
              </div>
              <div className="leading-relaxed">
                {formatLesson(content)}
                {streaming && <span className="inline-block w-2 h-3.5 ml-0.5 align-middle" style={{background:'var(--accent)',animation:'blink .8s step-end infinite'}}/>}
                {lessonError && <div role="alert" className="mt-4 rounded-lg border border-red/40 bg-red/10 p-4 text-[13px] text-red"><p>{lessonError}</p><button type="button" onClick={() => activeTopic && loadTopic(activeTopic)} className="mt-2 font-semibold underline">Retry lesson</button></div>}
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
