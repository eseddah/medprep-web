'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Plus, Save, Slash } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type DiscountCode = { _id: string; code: string; percentOff: number; expiresAt: string; useLimit: number; usedCount: number; isActive: boolean };
type SavedQuestion = { _id: string; courseId: string; topic: string; question: string; options: string[]; correctIndex: number; explanation: string; difficulty: 'easy' | 'medium' | 'hard'; isActive: boolean };
type QuestionForm = Omit<SavedQuestion, '_id' | 'isActive'>;

const initialQuestion: QuestionForm = { courseId: '', topic: '', question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', difficulty: 'medium' };
const inputClass = 'w-full rounded-md border border-border2 bg-surface px-3 py-2.5 text-[13px] text-text placeholder:text-text3';

function defaultExpiry() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [questions, setQuestions] = useState<SavedQuestion[]>([]);
  const [code, setCode] = useState('');
  const [percentOff, setPercentOff] = useState('10');
  const [expiresAt, setExpiresAt] = useState(defaultExpiry);
  const [useLimit, setUseLimit] = useState('100');
  const [question, setQuestion] = useState<QuestionForm>(initialQuestion);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAdminData = async () => {
    const [codeResponse, questionResponse] = await Promise.all([api.get('/admin/codes'), api.get('/admin/questions')]);
    setCodes(codeResponse.data.codes || []);
    setQuestions(questionResponse.data.questions || []);
  };

  useEffect(() => {
    let active = true;
    api.get('/admin/access')
      .then(async () => {
        if (!active) return;
        setAuthorized(true);
        await loadAdminData();
      })
      .catch(() => {
        if (active) router.replace('/courses');
      })
      .finally(() => { if (active) setCheckingAccess(false); });
    return () => { active = false; };
  }, [router]);

  const createCode = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/admin/codes', { code, percentOff: Number(percentOff), expiresAt: new Date(expiresAt).toISOString(), useLimit: Number(useLimit) });
      setCodes(previous => [data.code, ...previous]);
      setCode('');
      toast.success('Discount code created');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Could not create code');
    } finally {
      setSaving(false);
    }
  };

  const disableCode = async (id: string) => {
    try {
      const { data } = await api.patch(`/admin/codes/${id}/disable`);
      setCodes(previous => previous.map(item => item._id === id ? { ...item, isActive: data.code.isActive } : item));
      toast.success('Code disabled');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Could not disable code');
    }
  };

  const saveQuestion = async (event: FormEvent) => {
    event.preventDefault();
    const values = { ...question, options: question.options.filter(option => option.trim()) };
    setSaving(true);
    try {
      if (editingId) {
        const { data } = await api.put(`/admin/questions/${editingId}`, values);
        setQuestions(previous => previous.map(item => item._id === editingId ? data.question : item));
        toast.success('Question updated');
      } else {
        const { data } = await api.post('/admin/questions', values);
        setQuestions(previous => [data.question, ...previous]);
        toast.success('Question saved');
      }
      setQuestion(initialQuestion);
      setEditingId('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Could not save question');
    } finally {
      setSaving(false);
    }
  };

  const editQuestion = (item: SavedQuestion) => {
    setEditingId(item._id);
    setQuestion({ courseId: item.courseId, topic: item.topic, question: item.question, options: item.options, correctIndex: item.correctIndex, explanation: item.explanation, difficulty: item.difficulty });
    document.getElementById('question-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (checkingAccess || !authorized) return <div className="flex min-h-screen items-center justify-center bg-bg"><Spinner /></div>;

  return (
    <DashboardLayout title="Admin" sub="Manage discount codes and saved questions">
      <div className="max-w-4xl space-y-8">
        <section aria-labelledby="codes-heading">
          <div className="mb-4">
            <h2 id="codes-heading" className="font-dm-serif text-[21px] text-text">Discount codes</h2>
            <p className="mt-1 text-[12px] text-text3">Codes are validated and priced on the server. Referral rewards are configured separately.</p>
          </div>
          <form onSubmit={createCode} className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
            <div><label htmlFor="promo-code" className="mb-1.5 block text-[12px] font-medium text-text2">Code</label><input id="promo-code" value={code} onChange={event => setCode(event.target.value.toUpperCase())} required maxLength={32} pattern="[A-Za-z0-9_-]{4,32}" className={inputClass} placeholder="STUDY20" /></div>
            <div><label htmlFor="promo-percent" className="mb-1.5 block text-[12px] font-medium text-text2">Discount percentage</label><input id="promo-percent" type="number" min="1" max="99" step="1" value={percentOff} onChange={event => setPercentOff(event.target.value)} required className={inputClass} /></div>
            <div><label htmlFor="promo-expiry" className="mb-1.5 block text-[12px] font-medium text-text2">Expires</label><input id="promo-expiry" type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} required className={inputClass} /></div>
            <div><label htmlFor="promo-limit" className="mb-1.5 block text-[12px] font-medium text-text2">Use limit</label><input id="promo-limit" type="number" min="1" max="100000" step="1" value={useLimit} onChange={event => setUseLimit(event.target.value)} required className={inputClass} /></div>
            <div className="sm:col-span-2"><Button type="submit" variant="primary" disabled={saving}><Plus size={15} />Create code</Button></div>
          </form>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[560px] border-collapse text-left text-[12px]"><thead className="bg-surface2 text-text"><tr><th className="px-3 py-2.5">Code</th><th className="px-3 py-2.5">Off</th><th className="px-3 py-2.5">Uses</th><th className="px-3 py-2.5">Expires</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Action</th></tr></thead><tbody>
              {codes.map(item => <tr key={item._id} className="border-t border-border"><td className="px-3 py-2.5 font-semibold text-text">{item.code}</td><td className="px-3 py-2.5 text-text2">{item.percentOff}%</td><td className="px-3 py-2.5 tabular-nums text-text2">{item.usedCount}/{item.useLimit}</td><td className="px-3 py-2.5 text-text2">{new Date(item.expiresAt).toLocaleDateString()}</td><td className="px-3 py-2.5 text-text2">{item.isActive ? 'Active' : 'Disabled'}</td><td className="px-3 py-2.5">{item.isActive && <button type="button" onClick={() => void disableCode(item._id)} aria-label={`Disable ${item.code}`} title="Disable code" className="rounded-md border border-border2 p-2 text-text2 hover:text-red"><Slash size={14} /></button>}</td></tr>)}
              {!codes.length && <tr><td colSpan={6} className="px-3 py-5 text-center text-text3">No discount codes yet.</td></tr>}
            </tbody></table>
          </div>
        </section>

        <section aria-labelledby="questions-heading">
          <div className="mb-4"><h2 id="questions-heading" className="font-dm-serif text-[21px] text-text">Saved questions</h2><p className="mt-1 text-[12px] text-text3">Create and edit questions in the shared question bank.</p></div>
          <form id="question-editor" onSubmit={saveQuestion} className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-surface p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label htmlFor="question-course" className="mb-1.5 block text-[12px] font-medium text-text2">Course ID (optional)</label><input id="question-course" value={question.courseId} onChange={event => setQuestion({ ...question, courseId: event.target.value })} maxLength={80} className={inputClass} /></div>
              <div><label htmlFor="question-topic" className="mb-1.5 block text-[12px] font-medium text-text2">Topic</label><input id="question-topic" value={question.topic} onChange={event => setQuestion({ ...question, topic: event.target.value })} required maxLength={180} className={inputClass} /></div>
            </div>
            <div><label htmlFor="question-prompt" className="mb-1.5 block text-[12px] font-medium text-text2">Question</label><textarea id="question-prompt" value={question.question} onChange={event => setQuestion({ ...question, question: event.target.value })} required maxLength={5000} rows={3} className={inputClass} /></div>
            <div><label htmlFor="question-options" className="mb-1.5 block text-[12px] font-medium text-text2">Answer options (one per line)</label><textarea id="question-options" value={question.options.join('\n')} onChange={event => setQuestion({ ...question, options: event.target.value.split('\n') })} required rows={4} className={inputClass} /></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label htmlFor="question-correct" className="mb-1.5 block text-[12px] font-medium text-text2">Correct option number</label><input id="question-correct" type="number" min="1" max={question.options.length} value={question.correctIndex + 1} onChange={event => setQuestion({ ...question, correctIndex: Number(event.target.value) - 1 })} required className={inputClass} /></div>
              <div><label htmlFor="question-difficulty" className="mb-1.5 block text-[12px] font-medium text-text2">Difficulty</label><select id="question-difficulty" value={question.difficulty} onChange={event => setQuestion({ ...question, difficulty: event.target.value as QuestionForm['difficulty'] })} className={inputClass}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
            </div>
            <div><label htmlFor="question-explanation" className="mb-1.5 block text-[12px] font-medium text-text2">Explanation</label><textarea id="question-explanation" value={question.explanation} onChange={event => setQuestion({ ...question, explanation: event.target.value })} maxLength={5000} rows={3} className={inputClass} /></div>
            <div className="flex flex-wrap gap-2"><Button type="submit" variant="primary" disabled={saving}><Save size={15} />{editingId ? 'Save question' : 'Add question'}</Button>{editingId && <Button type="button" variant="ghost" onClick={() => { setEditingId(''); setQuestion(initialQuestion); }}>Cancel edit</Button>}</div>
          </form>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {questions.map(item => <li key={item._id} className="flex min-w-0 items-start gap-3 py-3"><div className="min-w-0 flex-1"><p className="text-[11px] text-text3">{item.courseId || 'General'} · {item.topic} · {item.difficulty}</p><p className="mt-1 break-words text-[13px] font-medium text-text">{item.question}</p><p className="mt-1 text-[11px] text-text3">{item.options.length} choices · answer {item.correctIndex + 1}</p></div><button type="button" onClick={() => editQuestion(item)} aria-label={`Edit question about ${item.topic}`} title="Edit question" className="shrink-0 rounded-md border border-border2 p-2 text-text2 hover:text-accent"><Edit2 size={14} /></button></li>)}
            {!questions.length && <li className="py-5 text-center text-[12px] text-text3">No saved questions yet.</li>}
          </ul>
        </section>
      </div>
    </DashboardLayout>
  );
}
