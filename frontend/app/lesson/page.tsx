'use client';
import { useState, useRef } from 'react';
import { useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { COURSES } from '@/lib/courses';
import toast from 'react-hot-toast';
import { formatLesson } from '@/lib/lessonContent';
import { consumeLessonStream } from '@/lib/streamLesson';
import { useStore } from '@/lib/store';
import api from '@/lib/api';
import { recordStreakActivity } from '@/lib/streak';
import Link from 'next/link';
import { Pause, Play } from 'lucide-react';

export default function LessonPage() {
  const [content, setContent] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [paused, setPaused] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [lessonUsage, setLessonUsage] = useState({ used: 0, date: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState('Standard');
  const fileRef = useRef<HTMLInputElement>(null);
  const abortController = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);
  const user = useStore(state => state.user);
  const isPro = ['pro', 'annual'].includes(user?.plan || '');
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

  const addFiles = (list: FileList) => { const a=Array.from(list); setFiles(p=>{const n=new Set(p.map(f=>f.name));return[...p,...a.filter(f=>!n.has(f.name))];});};
  const readFiles = async () => { const r:string[]=[]; for(const f of files){try{r.push(`--- ${f.name} ---\n${(await f.text()).slice(0,6000)}`)}catch{}} return r.join('\n\n'); };

  const generate = async (previousContent = '') => {
    if (typeof previousContent !== 'string') previousContent = '';
    const material = await readFiles();
    if (!material && !topic && !previousContent) { toast.error('Upload files or enter a topic'); return; }
    const sequence = ++requestSequence.current;
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    setContent(previousContent); setGenerationError(''); setPaused(false); setStreaming(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL||'http://localhost:5000/api'}/ai/lesson`, {
        method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('medprep_token')}`},
        body: JSON.stringify({ topic, material, depth, previousContent }),
        signal: controller.signal,
      });
      let full = previousContent;
      const incomplete = await consumeLessonStream(res, text => { full += text; setContent(full); });
      if (!full.trim()) throw new Error('No lesson content was returned. Please try again.');
      if (incomplete) {
        setPaused(true);
        setGenerationError('The lesson reached its response limit. Resume to continue the lesson.');
        await refreshLessonUsage();
        return;
      }
      void recordStreakActivity().catch(() => toast.error('Lesson finished, but your streak could not be updated.'));
      await refreshLessonUsage();
    } catch(error: any){
      if (!controller.signal.aborted) {
        const message = error.message || 'Could not generate the lesson. Please try again.';
        setGenerationError(message);
        toast.error(message);
        await refreshLessonUsage();
      }
    } finally {
      if (abortController.current === controller) abortController.current = null;
      if (sequence === requestSequence.current) setStreaming(false);
    }
  };

  const pauseGeneration = () => {
    setPaused(true);
    abortController.current?.abort();
  };

  if (!streaming && !content) return (
    <DashboardLayout title="Live Lesson" sub="Stream a structured AI lesson on any medical or premed topic">
      <div className="max-w-2xl page-anim">
        <Card className="mb-4">
          <h3 className="font-dm-serif text-[17px] text-text mb-4">Upload Material (optional)</h3>
          <div className="border-2 border-dashed border-border2 rounded-xl p-7 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all" onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addFiles(e.dataTransfer.files);}}>
            <input ref={fileRef} type="file" multiple accept=".pdf,.txt,.md" style={{display:'none'}} onChange={e=>e.target.files&&addFiles(e.target.files)}/>
            <div className="text-[26px] mb-1.5 text-text3">📂</div>
            <div className="text-[13px] text-text">Click or drag files</div>
          </div>
          {files.length>0&&<div className="flex flex-wrap gap-2 mt-3">{files.map(f=><span key={f.name} className="inline-flex items-center gap-1 bg-surface3 border border-border2 rounded px-2 py-1 text-[12px] text-text2">📄{f.name}<button onClick={()=>setFiles(p=>p.filter(x=>x.name!==f.name))} className="text-text3 hover:text-red ml-1">✕</button></span>)}</div>}
        </Card>
        <Card className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] text-text3 mb-1.5">Course topic</label>
              <select value={topic} onChange={e=>setTopic(e.target.value)} className="w-full bg-surface2 border border-border2 text-text rounded-lg px-3 py-2 text-[13px] outline-none" style={{fontFamily:'var(--font-outfit)'}}>
                <option value="">— Browse topics —</option>
                {COURSES.map(c=><optgroup key={c.id} label={c.title}>{c.topics.map(t=><option key={t} value={`${c.title}: ${t}`}>{t}</option>)}</optgroup>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-text3 mb-1.5">Depth</label>
              <select value={depth} onChange={e=>setDepth(e.target.value)} className="w-full bg-surface2 border border-border2 text-text rounded-lg px-3 py-2 text-[13px] outline-none" style={{fontFamily:'var(--font-outfit)'}}>
                {['Overview','Standard','Deep dive'].map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[12px] text-text3 mb-1.5">Or type a custom topic</label>
              <input type="text" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Starling's law, Krebs cycle, RAAS…" className="w-full bg-surface2 border border-border2 text-text rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent" style={{fontFamily:'var(--font-outfit)'}}/>
            </div>
          </div>
        </Card>
        {!isPro && <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber/35 bg-amber/10 px-3.5 py-2.5 text-[12px] text-text2">
          <span>Free plan: 3 concept generations per day · {lessonsRemaining} remaining today</span>
          <Link href="/billing" className="font-semibold text-accent hover:underline">Upgrade for unlimited lessons</Link>
        </div>}
        <Button variant="primary" onClick={generate}>📖 Generate Lesson</Button>
        {generationError && <p role="alert" className="mt-3 text-[13px] text-red">{generationError}</p>}
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title="Live Lesson" sub={streaming?'Streaming…':'Lesson ready'}>
      <div className="max-w-3xl page-anim">
        <div className="flex justify-between items-center mb-5">
          {streaming
            ? <div className="flex items-center gap-2 text-[13px] text-text2"><Spinner size={14} color="var(--accent)"/>Generating lesson…<Button size="sm" variant="ghost" onClick={pauseGeneration}><Pause size={14}/>Pause</Button></div>
            : paused
              ? <div className="flex items-center gap-2"><span className="text-[13px] text-amber">Paused · partial lesson saved</span><Button size="sm" variant="ghost" onClick={()=>generate(content)}><Play size={14}/>Resume</Button></div>
              : <span className="text-[13px]" style={{color:'var(--green)'}}>✓ Lesson ready</span>}
          {!streaming&&!paused&&<Button size="sm" variant="ghost" onClick={()=>{setContent('');setGenerationError('');setStreaming(false);}}>Generate New</Button>}
        </div>
        <Card>
          {formatLesson(content)}
          {generationError && <div role="alert" className="mt-4 rounded-lg border border-red/40 bg-red/10 p-4 text-[13px] text-red">{generationError}</div>}
          {streaming&&<span className="inline-block w-2 h-3.5 ml-0.5 align-middle" style={{background:'var(--accent)',animation:'blink .8s step-end infinite'}}/>}
        </Card>
      </div>
    </DashboardLayout>
  );
}
