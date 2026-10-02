'use client';
import { useState, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useStore } from '@/lib/store';
import { COURSES, FLASH_LIMITS } from '@/lib/courses';
import api from '@/lib/api';
import { recordStreakActivity } from '@/lib/streak';
import { getStudyTopicContext } from '@/lib/studyTopics';
import toast from 'react-hot-toast';

interface FlashCard { front: string; back: string; }

export default function FlashcardsPage() {
  const user = useStore(s => s.user);
  const plan = user?.plan || 'free';
  const maxF = FLASH_LIMITS[plan as keyof typeof FLASH_LIMITS] || 15;
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(new Set<number>());
  const [reviewRecorded, setReviewRecorded] = useState(false);
  const [savedCards, setSavedCards] = useState(new Set<string>());
  const [savingCard, setSavingCard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [count, setCount] = useState(Math.min(20, maxF));
  const [topic, setTopic] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList) => { const a = Array.from(list); setFiles(p=>{ const n=new Set(p.map(f=>f.name)); return [...p,...a.filter(f=>!n.has(f.name))]; }); };
  const readFiles = async () => { const r: string[] = []; for(const f of files){try{r.push(`--- ${f.name} ---\n${(await f.text()).slice(0,6000)}`)}catch{}} return r.join('\n\n'); };

  const generate = async () => {
    setLoading(true);
    try {
      const material = await readFiles();
      const { data } = await api.post('/ai/flashcards', { topic, material, count });
      setCards(data.cards); setCurrent(0); setFlipped(false); setKnown(new Set()); setSavedCards(new Set());
      setReviewRecorded(false);
    } catch (e:any) { toast.error(e.response?.data?.error || 'Failed'); }
    setLoading(false);
  };

  const mark = (know: boolean) => {
    const k = new Set(known);
    if (know) k.add(current); else k.delete(current);
    setKnown(k);
    if (current < cards.length-1) { setCurrent(c=>c+1); setFlipped(false); }
    else if (!reviewRecorded) {
      setReviewRecorded(true);
      void recordStreakActivity().catch(() => {
        setReviewRecorded(false);
        toast.error('Review complete, but your streak could not be updated.');
      });
    }
  };

  const saveForReview = async () => {
    if (!card || savingCard || savedCards.has(card.front)) return;
    setSavingCard(true);
    const context = getStudyTopicContext(topic, COURSES);
    try {
      await api.post('/review/items', { ...context, prompt: card.front, answer: card.back });
      setSavedCards(previous => new Set(previous).add(card.front));
      toast.success('Saved to Smart Review');
    } catch (saveError: any) {
      toast.error(saveError.response?.data?.error || 'Could not save this card for review');
    } finally {
      setSavingCard(false);
    }
  };

  if (!cards.length) return (
    <DashboardLayout title="Flashcard Deck" sub={`Generate up to ${maxF} high-yield flashcards per session`}>
      <div className="max-w-2xl page-anim">
        {plan==='free' && <div className="rounded-xl p-4 mb-5 text-[13px]" style={{background:'rgba(245,166,35,.08)',border:'1px solid rgba(245,166,35,.25)',color:'var(--amber)'}}>⚡ Free plan: up to 15 cards. <a href="/billing" className="font-semibold underline">Upgrade</a> for 100.</div>}
        <Card className="mb-4">
          <h3 className="font-dm-serif text-[17px] text-text mb-4">Upload Material</h3>
          <div className="border-2 border-dashed border-border2 rounded-xl p-7 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all" onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addFiles(e.dataTransfer.files);}}>
            <input ref={fileRef} type="file" multiple accept=".pdf,.txt,.md" style={{display:'none'}} onChange={e=>e.target.files&&addFiles(e.target.files)}/>
            <div className="text-[26px] mb-1.5 text-text3">📂</div>
            <div className="text-[13px] text-text">Click or drag files</div>
          </div>
          {files.length>0&&<div className="flex flex-wrap gap-2 mt-3">{files.map(f=><span key={f.name} className="inline-flex items-center gap-1 bg-surface3 border border-border2 rounded px-2 py-1 text-[12px] text-text2">📄{f.name}<button onClick={()=>setFiles(p=>p.filter(x=>x.name!==f.name))} className="text-text3 hover:text-red ml-1">✕</button></span>)}</div>}
        </Card>
        <Card className="mb-4">
          <h3 className="font-dm-serif text-[17px] text-text mb-3">Or choose a course topic</h3>
          <select value={topic} onChange={e=>setTopic(e.target.value)} className="w-full bg-surface2 border border-border2 text-text rounded-lg px-3 py-2 text-[13px] outline-none" style={{fontFamily:'var(--font-outfit)'}}>
            <option value="">— Browse course topics —</option>
            {COURSES.map(c=><optgroup key={c.id} label={c.title}>{c.topics.map(t=><option key={t} value={`${c.title}: ${t}`}>{t}</option>)}</optgroup>)}
          </select>
          <div className="mt-4 flex items-center gap-3">
            <label className="text-[13px] text-text2">Card count (max {maxF})</label>
            <select value={count} onChange={e=>setCount(Math.min(parseInt(e.target.value),maxF))} className="bg-surface2 border border-border2 text-text rounded-lg px-3 py-2 text-[13px] outline-none" style={{fontFamily:'var(--font-outfit)'}}>
              {[10,15,20,30,50,75,100,150].filter(n=>n<=maxF).map(n=><option key={n} value={n}>{n} cards</option>)}
            </select>
          </div>
        </Card>
        <Button variant="primary" onClick={generate} disabled={loading||(!files.length&&!topic)}>
          {loading?<><Spinner/>Generating {count} flashcards…</>:`⚡ Generate ${count} Flashcards`}
        </Button>
      </div>
    </DashboardLayout>
  );

  const card = cards[current];
  return (
    <DashboardLayout title="Flashcard Deck" sub={`${cards.length} cards · ${known.size} known`}>
      <div className="max-w-xl mx-auto page-anim">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          <span className="text-[13px] text-text3">Card {current+1} of {cards.length} · <span style={{color:'var(--green)'}}>{known.size} known</span></span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={()=>{setCards(c=>[...c].sort(()=>Math.random()-.5));setCurrent(0);setFlipped(false);}}>🔀</Button>
            <Button size="sm" variant="ghost" onClick={()=>{setCards([]);setKnown(new Set());setReviewRecorded(false);}}>↺ Reset</Button>
            <Button size="sm" variant="ghost" onClick={saveForReview} disabled={savingCard || savedCards.has(card.front)}>{savedCards.has(card.front) ? 'Saved' : savingCard ? 'Saving…' : 'Save to Review'}</Button>
          </div>
        </div>
        <div className="h-1 bg-border rounded-full mb-5 overflow-hidden"><div className="h-full bg-green rounded-full transition-all" style={{width:`${Math.round(known.size/cards.length*100)}%`}}/></div>

        {/* Card flip */}
        <div style={{perspective:1000}} className="w-full h-64 cursor-pointer mb-5" onClick={()=>setFlipped(f=>!f)}>
          <div className={`card-flip w-full h-full relative`} style={{transform:flipped?'rotateY(180deg)':'none'}}>
            <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-surface2 border border-border2">
              <div className="text-[10px] uppercase tracking-widest text-text3 mb-3">Concept</div>
              <div className="text-[17px] text-text leading-relaxed">{card.front}</div>
              <div className="text-[11px] text-text3 mt-5">Tap to reveal</div>
            </div>
            <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center p-8 text-center rounded-2xl border" style={{background:'var(--surface3)',borderColor:'var(--accent)',transform:'rotateY(180deg)'}}>
              <div className="text-[10px] uppercase tracking-widest text-text3 mb-3">Answer</div>
              <div className="text-[15px] text-text leading-relaxed">{card.back}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center mb-5">
          <Button variant="danger" size="sm" onClick={()=>mark(false)}>✗ Still learning</Button>
          <Button variant="green" size="sm" onClick={()=>mark(true)}>✓ Got it</Button>
        </div>
        <div className="flex items-center justify-center gap-4">
          <Button disabled={current===0} onClick={()=>{setCurrent(c=>c-1);setFlipped(false);}}>← Prev</Button>
          <span className="text-[13px] text-text3 w-16 text-center">{current+1} / {cards.length}</span>
          <Button disabled={current===cards.length-1} onClick={()=>{setCurrent(c=>c+1);setFlipped(false);}}>Next →</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
