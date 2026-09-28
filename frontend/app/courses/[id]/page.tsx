'use client';
import { useState, use } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import { COURSES } from '@/lib/courses';
import { useStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import { notFound } from 'next/navigation';

function formatLesson(text: string) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2"/>;
    if (line.startsWith('# ')) return <h3 key={i} className="font-dm-serif text-[20px] text-text mt-5 mb-2">{line.slice(2)}</h3>;
    if (line.startsWith('## ')) return <p key={i} className="font-semibold text-text text-[14px] mt-3 mb-1">{line.slice(3)}</p>;
    if (line.startsWith('> ')) return <div key={i} className="my-2 p-3 rounded-r-lg text-[13.5px] text-text" style={{background:'rgba(79,142,247,.1)',borderLeft:'3px solid var(--accent)'}}>{line.slice(2)}</div>;
    if (line.startsWith('- ') || line.startsWith('• ')) return <div key={i} className="flex gap-2 text-[14px] text-text2 leading-relaxed pl-3"><span className="text-accent flex-shrink-0">·</span>{line.slice(2)}</div>;
    return <p key={i} className="text-[14px] text-text2 leading-[1.75] mb-1">{line}</p>;
  });
}

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const course = COURSES.find(c => c.id === id);
  if (!course) notFound();

  const [activeTopic, setActiveTopic] = useState<string|null>(null);
  const [content, setContent] = useState('');
  const [streaming, setStreaming] = useState(false);

  const loadTopic = async (topic: string) => {
    setActiveTopic(topic); setContent(''); setStreaming(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ai/lesson`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('medprep_token')}` },
        body: JSON.stringify({ topic: `${course.title}: ${topic}`, depth:'Standard' }),
      });
      const reader = res.body!.getReader(); const dec = new TextDecoder();
      let full = '';
      while (true) {
        const {done,value} = await reader.read(); if(done) break;
        for (const line of dec.decode(value).split('\n')) {
          if (line.startsWith('data: ')) {
            const d = line.slice(6).trim();
            if (d === '[DONE]') break;
            try { const j = JSON.parse(d); if(j.text) { full+=j.text; setContent(full); } } catch {}
          }
        }
      }
    } catch (e) { toast.error('Failed to generate lesson'); }
    setStreaming(false);
  };

  return (
    <DashboardLayout title={course.title} sub={course.desc}>
      <Link href="/courses" className="text-[13px] text-text3 hover:text-text flex items-center gap-1.5 mb-5">← Back to Courses</Link>
      <div className="grid grid-cols-[220px_1fr] gap-5 items-start">
        <div className="space-y-4">
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
              <p className="text-[11px] text-text3 uppercase tracking-wide mb-2">Diagrams</p>
              {course.staticImages.map((src,i) => (
                <img key={i} src={src} alt="" className="w-full rounded-lg border border-border mb-2 bg-surface2 object-contain" style={{height:120}} loading="lazy" onError={e=>(e.currentTarget.style.display='none')}/>
              ))}
            </Card>
          )}
        </div>
        <div>
          {!activeTopic && (
            <Card className="text-center py-16">
              <div className="text-[40px] mb-3">{course.icon}</div>
              <h3 className="font-dm-serif text-[18px] text-text mb-2">Select a topic</h3>
              <p className="text-[13px] text-text3">Choose any topic from the list to generate an AI-powered lesson.</p>
            </Card>
          )}
          {activeTopic && (
            <Card>
              <div className="border-b border-border pb-4 mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-text3 uppercase tracking-wide mb-1">{course.title}</div>
                  <h3 className="font-dm-serif text-[18px] text-text">{activeTopic}</h3>
                </div>
                {streaming && <div className="flex items-center gap-2 text-[13px] text-text2"><Spinner size={13} color="var(--accent)"/>Generating…</div>}
              </div>
              <div className="leading-relaxed">
                {formatLesson(content)}
                {streaming && <span className="inline-block w-2 h-3.5 ml-0.5 align-middle" style={{background:'var(--accent)',animation:'blink .8s step-end infinite'}}/>}
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
