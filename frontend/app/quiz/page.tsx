'use client';
import { useState, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { COURSES, QUIZ_LIMITS } from '@/lib/courses';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';

interface Question { question:string; options:string[]; correct:number; explanation:string; }
type Phase = 'setup'|'questions'|'results';

export default function QuizPage() {
  const user = useStore(s => s.user);
  const plan = user?.plan || 'free';
  const maxQ = QUIZ_LIMITS[plan as keyof typeof QUIZ_LIMITS] || 10;
  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answered, setAnswered] = useState<Record<number,number>>({});
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [count, setCount] = useState(Math.min(20, maxQ));
  const [diff, setDiff] = useState('Medium');
  const [type, setType] = useState('Multiple Choice');
  const [topic, setTopic] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList) => {
    const arr = Array.from(list);
    setFiles(prev => { const names = new Set(prev.map(f=>f.name)); return [...prev, ...arr.filter(f=>!names.has(f.name))]; });
  };
  const readFiles = async () => {
    const parts: string[] = [];
    for (const f of files) { try { parts.push(`--- ${f.name} ---\n${(await f.text()).slice(0,6000)}`); } catch {} }
    return parts.join('\n\n');
  };

  const generate = async () => {
    setLoading(true);
    try {
      const material = await readFiles();
      const { data } = await api.post('/ai/quiz', { topic, material, count, difficulty: diff, type });
      setQuestions(data.questions);
      setAnswered({}); setScore(0); setPhase('questions');
    } catch (e:any) { toast.error(e.response?.data?.error || 'Failed to generate quiz'); }
    setLoading(false);
  };

  const answer = (qi: number, oi: number) => {
    if (answered[qi] !== undefined) return;
    setAnswered(a => ({...a, [qi]:oi}));
    if (oi === questions[qi].correct) setScore(s => s+1);
  };

  const answeredCount = Object.keys(answered).length;
  const total = questions.length;
  const pct = total ? Math.round(score/total*100) : 0;

  return (
    <DashboardLayout title="Quiz Generator" sub={`Generate up to ${maxQ} clinically accurate questions per session`}>
      {phase === 'setup' && (
        <div className="max-w-2xl page-anim">
          {plan === 'free' && (
            <div className="rounded-xl p-4 mb-5 text-[13px]" style={{background:'rgba(245,166,35,.08)',border:'1px solid rgba(245,166,35,.25)',color:'var(--amber)'}}>
              ⚡ Free plan: up to 10 questions/session. <a href="/billing" className="font-semibold underline">Upgrade to Pro</a> for 100 questions.
            </div>
          )}
          <Card className="mb-5">
            <h3 className="font-dm-serif text-[17px] text-text mb-4">Upload Study Material</h3>
            <div className="border-2 border-dashed border-border2 rounded-xl p-8 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all" onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addFiles(e.dataTransfer.files);}}>
              <input ref={fileRef} type="file" multiple accept=".pdf,.txt,.md" style={{display:'none'}} onChange={e=>e.target.files&&addFiles(e.target.files)} />
              <div className="text-[28px] mb-2 text-text3">📂</div>
              <div className="text-[14px] font-medium text-text mb-1">Click or drag files here</div>
              <div className="text-[12px] text-text3">PDF, TXT — your notes & slides</div>
            </div>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {files.map(f => (
                  <span key={f.name} className="inline-flex items-center gap-1.5 bg-surface3 border border-border2 rounded-md px-2.5 py-1 text-[12px] text-text2">
                    📄 {f.name}<button onClick={()=>setFiles(p=>p.filter(x=>x.name!==f.name))} className="text-text3 hover:text-red ml-1">✕</button>
                  </span>
                ))}
              </div>
            )}
          </Card>

          <Card className="mb-5">
            <h3 className="font-dm-serif text-[17px] text-text mb-4">Or choose a course topic</h3>
            <select value={topic} onChange={e=>setTopic(e.target.value)} className="w-full bg-surface2 border border-border2 text-text rounded-lg px-3 py-2 text-[13px] outline-none" style={{fontFamily:'var(--font-outfit)'}}>
              <option value="">— Browse course topics —</option>
              {COURSES.map(c => <optgroup key={c.id} label={c.title}>{c.topics.map(t => <option key={t} value={`${c.title}: ${t}`}>{t}</option>)}</optgroup>)}
            </select>
          </Card>

          <Card className="mb-5">
            <h3 className="font-dm-serif text-[17px] text-text mb-4">Settings</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[12px] text-text3 mb-1.5">Questions (max {maxQ})</label>
                <select value={count} onChange={e=>setCount(Math.min(parseInt(e.target.value),maxQ))} className="w-full bg-surface2 border border-border2 text-text rounded-lg px-3 py-2 text-[13px] outline-none" style={{fontFamily:'var(--font-outfit)'}}>
                  {[10,20,30,50,75,100,150].filter(n=>n<=maxQ).map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] text-text3 mb-1.5">Difficulty</label>
                <select value={diff} onChange={e=>setDiff(e.target.value)} className="w-full bg-surface2 border border-border2 text-text rounded-lg px-3 py-2 text-[13px] outline-none" style={{fontFamily:'var(--font-outfit)'}}>
                  {['Easy','Medium','Hard','Mixed'].map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] text-text3 mb-1.5">Type</label>
                <select value={type} onChange={e=>setType(e.target.value)} className="w-full bg-surface2 border border-border2 text-text rounded-lg px-3 py-2 text-[13px] outline-none" style={{fontFamily:'var(--font-outfit)'}}>
                  {['Multiple Choice','True / False','Mixed'].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </Card>

          <Button variant="primary" onClick={generate} disabled={loading || (!files.length && !topic)}>
            {loading ? <><Spinner/>Generating {count} questions…</> : `🧠 Generate ${count} Questions`}
          </Button>
          {!files.length && !topic && <p className="text-[12px] text-text3 mt-2">Upload files or select a course topic to begin.</p>}
        </div>
      )}

      {phase === 'questions' && (
        <div className="max-w-3xl page-anim">
          <div className="h-1 bg-border rounded-full mb-4 overflow-hidden"><div className="h-full bg-accent rounded-full transition-all" style={{width:`${Math.round(answeredCount/total*100)}%`}} /></div>
          <div className="flex justify-between items-center mb-5">
            <span className="text-[13px] text-text3">{answeredCount} / {total} answered</span>
            {answeredCount === total && <Button variant="primary" size="sm" onClick={()=>setPhase('results')}>See Results →</Button>}
          </div>
          {questions.map((q,qi) => {
            const ans = answered[qi];
            return (
              <div key={qi} className="bg-surface2 border border-border rounded-2xl p-5 mb-4">
                <div className="text-[11px] text-text3 uppercase tracking-wide mb-2">Question {qi+1}</div>
                <div className="text-[15px] text-text mb-4 leading-relaxed">{q.question}</div>
                <div className="space-y-2">
                  {q.options.map((opt,oi) => {
                    let style: React.CSSProperties = { background:'var(--surface)', borderColor:'var(--border2)', color:'var(--text2)' };
                    if (ans !== undefined) {
                      if (oi === q.correct) style = { background:'rgba(62,207,142,.1)', borderColor:'var(--green)', color:'var(--green)' };
                      else if (ans === oi) style = { background:'rgba(247,111,111,.1)', borderColor:'var(--red)', color:'var(--red)' };
                    }
                    return (
                      <button key={oi} disabled={ans!==undefined} onClick={()=>answer(qi,oi)} style={{...style,display:'block',width:'100%',textAlign:'left',padding:'10px 14px',borderRadius:8,border:'1px solid',cursor:ans!==undefined?'default':'pointer',fontFamily:'var(--font-outfit)',fontSize:13.5,transition:'all .15s'}}>
                        {String.fromCharCode(65+oi)}. {opt}
                      </button>
                    );
                  })}
                </div>
                {ans !== undefined && <div className="mt-3 p-3 rounded-lg text-[13px] text-text2 leading-relaxed" style={{background:'var(--surface3)',borderLeft:'3px solid var(--accent)'}}>💡 {q.explanation}</div>}
              </div>
            );
          })}
        </div>
      )}

      {phase === 'results' && (
        <div className="max-w-3xl page-anim">
          <div className="rounded-2xl p-6 mb-6 flex items-center justify-between" style={{background:'rgba(62,207,142,.07)',border:'1px solid var(--green)'}}>
            <div>
              <div className="font-dm-serif text-[44px]" style={{color: pct>=80?'var(--green)':pct>=60?'var(--accent)':'var(--amber)'}}>{pct}%</div>
              <div className="text-[14px] mt-1" style={{color: pct>=80?'var(--green)':pct>=60?'var(--accent)':'var(--amber)'}}>{pct>=80?'Excellent! 🎉':pct>=60?'Good effort! 👍':'Keep studying! 📚'}</div>
              <div className="text-[13px] text-text3 mt-1">{score} of {total} correct</div>
            </div>
            <Button size="sm" variant="ghost" onClick={()=>{setPhase('setup');setQuestions([]);setAnswered({});setScore(0);}}>↺ New Quiz</Button>
          </div>
          {questions.map((q,qi) => {
            const ans = answered[qi]; const ok = ans===q.correct;
            return (
              <div key={qi} className="rounded-2xl p-4 mb-3" style={{background:'var(--surface2)',border:`1px solid ${ok?'rgba(62,207,142,.3)':'rgba(247,111,111,.25)'}`}}>
                <div className="flex gap-2 mb-2"><span>{ok?'✅':'❌'}</span><div className="text-[14px] text-text">{q.question}</div></div>
                <div className="text-[13px] text-text2 p-3 rounded-lg" style={{background:'var(--surface3)',borderLeft:'3px solid var(--accent)'}}>💡 {q.explanation}</div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
