'use client';
import { useState, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { COURSES } from '@/lib/courses';
import toast from 'react-hot-toast';

function fmt(text: string) {
  return text.split('\n').map((line,i) => {
    if (!line.trim()) return <div key={i} className="h-2"/>;
    if (line.startsWith('# ')) return <h3 key={i} className="font-dm-serif text-[20px] text-text mt-6 mb-2">{line.slice(2)}</h3>;
    if (line.startsWith('## ')) return <p key={i} className="font-semibold text-text text-[14px] mt-3 mb-1">{line.slice(3)}</p>;
    if (line.startsWith('> ')) return <div key={i} className="my-2 p-3 rounded-r-lg text-[13.5px] text-text" style={{background:'rgba(79,142,247,.1)',borderLeft:'3px solid var(--accent)'}}>{line.slice(2)}</div>;
    if (line.startsWith('- ')||line.startsWith('• ')) return <div key={i} className="flex gap-2 text-[14px] text-text2 leading-relaxed pl-3"><span className="text-accent flex-shrink-0">·</span>{line.slice(2)}</div>;
    return <p key={i} className="text-[14px] text-text2 leading-[1.75] mb-1">{line}</p>;
  });
}

export default function LessonPage() {
  const [content, setContent] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState('Standard');
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList) => { const a=Array.from(list); setFiles(p=>{const n=new Set(p.map(f=>f.name));return[...p,...a.filter(f=>!n.has(f.name))];});};
  const readFiles = async () => { const r:string[]=[]; for(const f of files){try{r.push(`--- ${f.name} ---\n${(await f.text()).slice(0,6000)}`)}catch{}} return r.join('\n\n'); };

  const generate = async () => {
    const material = await readFiles();
    if (!material && !topic) { toast.error('Upload files or enter a topic'); return; }
    setContent(''); setStreaming(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL||'http://localhost:5000/api'}/ai/lesson`, {
        method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('medprep_token')}`},
        body: JSON.stringify({ topic, material, depth }),
      });
      const reader = res.body!.getReader(); const dec = new TextDecoder();
      let full = '';
      while(true){
        const{done,value}=await reader.read();if(done)break;
        for(const line of dec.decode(value).split('\n')){
          if(line.startsWith('data: ')){const d=line.slice(6).trim();if(d==='[DONE]')break;try{const j=JSON.parse(d);if(j.text){full+=j.text;setContent(full);}}catch{}}
        }
      }
    } catch(e){ toast.error('Failed to generate lesson'); }
    setStreaming(false);
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
        <Button variant="primary" onClick={generate}>📖 Generate Lesson</Button>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title="Live Lesson" sub={streaming?'Streaming…':'Lesson ready'}>
      <div className="max-w-3xl page-anim">
        <div className="flex justify-between items-center mb-5">
          {streaming?<div className="flex items-center gap-2 text-[13px] text-text2"><Spinner size={14} color="var(--accent)"/>Generating lesson…</div>:<span className="text-[13px]" style={{color:'var(--green)'}}>✓ Lesson ready</span>}
          {!streaming&&<Button size="sm" variant="ghost" onClick={()=>{setContent('');setStreaming(false);}}>Generate New</Button>}
        </div>
        <Card>
          {fmt(content)}
          {streaming&&<span className="inline-block w-2 h-3.5 ml-0.5 align-middle" style={{background:'var(--accent)',animation:'blink .8s step-end infinite'}}/>}
        </Card>
      </div>
    </DashboardLayout>
  );
}
