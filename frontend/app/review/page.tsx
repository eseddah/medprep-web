'use client';
import { useEffect, useState } from 'react';
import { Lightbulb, RotateCcw } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import api from '@/lib/api';
import { recordStreakActivity } from '@/lib/streak';
import toast from 'react-hot-toast';
import StudyHistoryPanel from '@/components/study/StudyHistoryPanel';
import { saveStudyHistory, type StudyHistoryEntry } from '@/lib/studyHistory';

type ReviewItem = {
  id: string;
  type: 'question' | 'flashcard';
  courseId: string;
  topic: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  answer: string;
  explanation: string;
};

const RATINGS = [
  { value: 'again', label: 'Again', help: 'Did not recall' },
  { value: 'hard', label: 'Hard', help: 'Difficult to recall' },
  { value: 'good', label: 'Good', help: 'Recalled with effort' },
  { value: 'easy', label: 'Easy', help: 'Recalled instantly' },
] as const;

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [finished, setFinished] = useState(false);

  const loadDueItems = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/review/due');
      setItems(data.items || []);
      setDueCount(data.dueCount || 0);
      setFinished(false);
    } catch (loadError: any) {
      setError(loadError.response?.data?.error || 'Review items could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDueItems(); }, []);

  const current = items[0];
  const correct = current?.type === 'question' && selectedAnswer === current.correctIndex;

  const rateItem = async (rating: typeof RATINGS[number]['value']) => {
    if (!current || busy || !revealed) return;
    setBusy(true);
    try {
      await api.post(`/review/${current.id}/rate`, { rating });
      const remaining = items.slice(1);
      setItems(remaining);
      setRevealed(false);
      setSelectedAnswer(null);
      setAiExplanation('');
      if (!remaining.length) {
        setFinished(true);
        void recordStreakActivity().catch(() => toast.error('Review complete, but your streak could not be updated.'));
      }
    } catch (rateError: any) {
      toast.error(rateError.response?.data?.error || 'This review could not be saved. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const explainAnswer = async () => {
    if (!current || explaining) return;
    setExplaining(true);
    try {
      const { data } = await api.post(`/review/${current.id}/explain`);
      setAiExplanation(data.explanation || 'No explanation was returned.');
      const explanation = data.explanation || 'No explanation was returned.';
      await saveStudyHistory({ section: 'review', title: `${current.topic}: ${current.prompt}`.slice(0, 180), prompt: current.prompt.slice(0, 2000), response: explanation });
    } catch (explainError: any) {
      setAiExplanation(current.explanation || explainError.response?.data?.error || 'An explanation is unavailable right now.');
    } finally {
      setExplaining(false);
    }
  };

  const restoreExplanation = (entry: StudyHistoryEntry) => setAiExplanation(entry.response);

  return (
    <DashboardLayout title="Smart Review" sub="A short daily review keeps important ideas within reach">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase text-text3">Due today</p>
            <p className="mt-1 font-dm-serif text-[28px] text-text">{loading ? '—' : dueCount} <span className="text-[15px] text-text3">{dueCount === 1 ? 'item' : 'items'}</span></p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void loadDueItems()} disabled={loading}><RotateCcw size={14} /> Refresh</Button>
        </div>

        {loading ? <Card><div role="status" className="flex items-center justify-center gap-3 py-12 text-[13px] text-text3"><Spinner />Loading your review queue…</div></Card>
          : error ? <Card><div className="py-6 text-center"><p role="alert" className="text-[13px] text-red">{error}</p><Button className="mt-4" onClick={() => void loadDueItems()}>Try again</Button></div></Card>
            : !current ? <Card><div className="py-10 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-green/10 text-green">✓</div>
              <h2 className="font-dm-serif text-[20px] text-text">{finished ? 'Review complete' : 'You’re all caught up'}</h2>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-text3">{finished ? 'Your completed review session counts toward today’s streak.' : 'New items will appear here when they’re due.'}</p>
            </div></Card>
              : <Card>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase text-accent">{current.topic}</p>
                    <p className="mt-1 text-[11px] text-text3">{current.type === 'question' ? 'Question' : 'Flashcard'} · {dueCount - items.length + 1} of {dueCount}</p>
                  </div>
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface3" aria-label={`${dueCount - items.length + 1} of ${dueCount} reviewed`}>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, ((dueCount - items.length + 1) / dueCount) * 100)}%` }} />
                  </div>
                </div>

                <h2 className="break-words text-[17px] font-medium leading-relaxed text-text">{current.prompt}</h2>
                {current.type === 'question' && current.options.length > 0 && (
                  <div className="mt-5 space-y-2">
                    {current.options.map((option, index) => {
                      const isCorrect = revealed && index === current.correctIndex;
                      const isSelectedWrong = revealed && index === selectedAnswer && !correct;
                      return <button key={`${current.id}-${index}`} type="button" disabled={revealed} onClick={() => { setSelectedAnswer(index); setRevealed(true); }} className={`w-full rounded-lg border px-3.5 py-3 text-left text-[13px] ${isCorrect ? 'border-green bg-green/10 text-green' : isSelectedWrong ? 'border-red bg-red/10 text-red' : 'border-border2 bg-surface2 text-text2 hover:border-accent'}`}>
                        <span className="mr-2 font-semibold">{String.fromCharCode(65 + index)}.</span>{option}
                      </button>;
                    })}
                  </div>
                )}
                {current.type === 'flashcard' && revealed && <div className="mt-5 rounded-lg border-l-[3px] border-accent bg-surface2 px-4 py-3 text-[14px] leading-relaxed text-text">{current.answer}</div>}
                {current.type === 'flashcard' && !revealed && <Button className="mt-5" variant="primary" onClick={() => setRevealed(true)}>Show answer</Button>}
                {current.type === 'question' && revealed && <p className={`mt-4 text-[13px] font-medium ${correct ? 'text-green' : 'text-red'}`}>{correct ? 'Correct. Choose how well you recalled it.' : 'Not quite. Review the answer, then rate how well you know it.'}</p>}
                {current.type === 'question' && revealed && <div className="mt-3 rounded-lg border-l-[3px] border-accent bg-surface2 px-4 py-3 text-[13px] leading-relaxed text-text2">
                  <p className="font-medium text-text">{current.options[current.correctIndex] || current.answer}</p>
                  {current.explanation && <p className="mt-2">{current.explanation}</p>}
                </div>}
                {current.type === 'question' && revealed && !correct && <button type="button" onClick={() => void explainAnswer()} disabled={explaining} className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent hover:underline disabled:opacity-60"><Lightbulb size={14} />{explaining ? 'Explaining…' : 'Explain'}</button>}
                {aiExplanation && <p className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-surface2 p-3 text-[13px] leading-relaxed text-text2">{aiExplanation}</p>}

                {revealed && <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {RATINGS.map(rating => <button key={rating.value} type="button" disabled={busy} onClick={() => void rateItem(rating.value)} className="flex min-h-14 flex-col items-center justify-center rounded-lg border border-border2 bg-surface2 px-2 py-2 text-text hover:border-accent hover:bg-accent/5 disabled:opacity-50">
                    <span className="text-[13px] font-semibold">{rating.label}</span><span className="mt-0.5 text-[10px] text-text3">{rating.help}</span>
                  </button>)}
                </div>}
              </Card>}
              <StudyHistoryPanel section="review" onRestore={restoreExplanation} />
      </div>
    </DashboardLayout>
  );
}