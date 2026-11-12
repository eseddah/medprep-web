'use client';
import { useCallback, useEffect, useState } from 'react';
import { Clock3, RotateCcw, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { StudyHistoryEntry, StudyHistorySection } from '@/lib/studyHistory';
import TextToSpeech from '@/components/ui/TextToSpeech';

type Props = {
  section: StudyHistorySection;
  onRestore: (entry: StudyHistoryEntry) => void;
};

export default function StudyHistoryPanel({ section, onRestore }: Props) {
  const [entries, setEntries] = useState<StudyHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/history', { params: { section } });
      setEntries(data.entries || []);
      setError('');
    } catch {
      setError('Recent history could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    void refresh();
    const handleUpdate = (event: Event) => {
      if ((event as CustomEvent<StudyHistorySection>).detail === section) void refresh();
    };
    window.addEventListener('study-history-updated', handleUpdate);
    return () => window.removeEventListener('study-history-updated', handleUpdate);
  }, [refresh, section]);

  const removeEntry = async (id: string) => {
    try {
      await api.delete(`/history/${id}`);
      setEntries(previous => previous.filter(entry => entry._id !== id));
      if (expandedId === id) setExpandedId('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Could not remove this history item');
    }
  };

  const readableResponse = (entry: StudyHistoryEntry) => {
    let response: unknown;
    try { response = JSON.parse(entry.response); } catch { return entry.response; }

    if (entry.section === 'quiz' && Array.isArray(response)) {
      return response.map((item, index) => {
        const question = item && typeof item === 'object' ? item as { question?: string; options?: string[]; correct?: number; explanation?: string } : {};
        const correctIndex = typeof question.correct === 'number' && Number.isInteger(question.correct) ? question.correct : 0;
        return [
          `Question ${index + 1}: ${question.question || ''}`,
          `Answer: ${question.options?.[correctIndex] || ''}`,
          question.explanation || '',
        ].filter(Boolean).join('\n');
      }).join('\n\n');
    }

    if (entry.section === 'flashcards' && Array.isArray(response)) {
      return response.map((item, index) => {
        const card = item && typeof item === 'object' ? item as { front?: string; back?: string } : {};
        return `Card ${index + 1}: ${card.front || ''}\nAnswer: ${card.back || ''}`;
      }).join('\n\n');
    }

    if (entry.section === 'tutor' && Array.isArray(response)) {
      return response.map(item => {
        const message = item && typeof item === 'object' ? item as { role?: string; content?: string } : {};
        return `${message.role === 'assistant' ? 'Tutor' : 'You'}: ${message.content || ''}`;
      }).join('\n\n');
    }

    if (entry.section === 'case' && response && typeof response === 'object') {
      const saved = response as { caseStudy?: { title?: string; caseStem?: string; steps?: Array<{ prompt?: string; options?: string[]; correctIndex?: number; explanation?: string }>; debrief?: string } };
      if (saved.caseStudy) {
        const study = saved.caseStudy;
        return [
          study.title,
          study.caseStem,
          ...(Array.isArray(study.steps) ? study.steps : []).map((step, index) => {
            const correctIndex = typeof step?.correctIndex === 'number' && Number.isInteger(step.correctIndex) ? step.correctIndex : 0;
            return `Decision ${index + 1}: ${step?.prompt || ''}\nAnswer: ${step?.options?.[correctIndex] || ''}\n${step?.explanation || ''}`;
          }),
          study.debrief,
        ].filter(Boolean).join('\n\n');
      }
    }

    return typeof response === 'string' ? response : JSON.stringify(response, null, 2);
  };

  return (
    <section className="mt-7 border-t border-border pt-6" aria-labelledby={`history-${section}`}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent"><Clock3 size={17} aria-hidden="true" /></span>
        <div>
          <h2 id={`history-${section}`} className="text-[17px] font-semibold text-text">Recent history</h2>
          <p className="text-[13px] text-text3">Reopen a previous study session or review its response.</p>
        </div>
        <span className="ml-auto rounded-full border border-border bg-surface px-2.5 py-1 text-[13px] font-medium text-text2">{entries.length}</span>
      </div>
      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading recent history">
          {[0, 1].map(item => <div key={item} className="h-24 animate-pulse rounded-xl border border-border bg-surface" />)}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p role="alert" className="text-[14px] text-text2">{error}</p>
          <button type="button" onClick={() => void refresh()} className="mt-2 text-[14px] font-semibold text-accent hover:underline">Try again</button>
        </div>
      ) : entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border2 bg-surface/70 px-5 py-6 text-[14px] text-text3">Past prompts and responses will appear here after you complete a study session.</p>
      ) : (
        <ul className="space-y-3">
          {entries.map(entry => {
            const expanded = expandedId === entry._id;
            const date = new Date(entry.createdAt);
            const response = readableResponse(entry);
            return <li key={entry._id} className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border2 sm:p-5">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
                <button type="button" onClick={() => setExpandedId(expanded ? '' : entry._id)} aria-expanded={expanded} className="min-w-0 flex-1 text-left">
                  <span className="block break-words text-[16px] font-semibold leading-snug text-text">{entry.title || 'Study session'}</span>
                  {entry.prompt && <span className="mt-1.5 block break-words text-[14px] leading-relaxed text-text2">{entry.prompt}</span>}
                  <span className="mt-2 block text-[13px] text-text3">{Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString()}</span>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => onRestore(entry)} aria-label={`Restore ${entry.title}`} title="Restore this session" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border2 bg-bg px-2.5 text-[13px] font-medium text-text2 transition hover:border-accent hover:text-accent"><RotateCcw size={14} /><span>Restore</span></button>
                  <button type="button" onClick={() => void removeEntry(entry._id)} aria-label={`Delete ${entry.title} from history`} title="Delete history item" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border2 bg-bg px-2.5 text-[13px] font-medium text-text2 transition hover:border-red hover:text-red"><Trash2 size={14} /><span>Delete</span></button>
                </div>
              </div>
              {expanded && <div className="mt-4 rounded-lg border border-border bg-surface2 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[14px] font-semibold text-text">Response</h3>
                  <TextToSpeech text={response} />
                </div>
                <div className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words text-[14px] leading-relaxed text-text2">{response}</div>
              </div>}
            </li>;
          })}
        </ul>
      )}
    </section>
  );
}
