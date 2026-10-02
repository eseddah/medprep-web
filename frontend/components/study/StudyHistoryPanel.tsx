'use client';
import { useCallback, useEffect, useState } from 'react';
import { Clock3, RotateCcw, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { StudyHistoryEntry, StudyHistorySection } from '@/lib/studyHistory';

type Props = {
  section: StudyHistorySection;
  onRestore: (entry: StudyHistoryEntry) => void;
};

export default function StudyHistoryPanel({ section, onRestore }: Props) {
  const [entries, setEntries] = useState<StudyHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState('');

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/history', { params: { section } });
      setEntries(data.entries || []);
    } catch {
      setEntries([]);
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

  return (
    <section className="mt-6 border-t border-border pt-4" aria-labelledby={`history-${section}`}>
      <div className="mb-3 flex items-center gap-2">
        <Clock3 size={15} className="text-text3" aria-hidden="true" />
        <h2 id={`history-${section}`} className="text-[13px] font-semibold text-text">Recent history</h2>
        <span className="text-[11px] text-text3">{entries.length}</span>
      </div>
      {loading ? <p className="text-[12px] text-text3">Loading history…</p>
        : entries.length === 0 ? <p className="text-[12px] text-text3">Past prompts and responses will appear here.</p>
          : <ul className="divide-y divide-border border-y border-border">
            {entries.map(entry => {
              const expanded = expandedId === entry._id;
              return <li key={entry._id} className="py-2.5">
                <div className="flex min-w-0 items-start gap-2">
                  <button type="button" onClick={() => setExpandedId(expanded ? '' : entry._id)} aria-expanded={expanded} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[12px] font-medium text-text">{entry.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-text3">{entry.prompt}</span>
                    <span className="mt-0.5 block text-[10px] text-text3">{new Date(entry.createdAt).toLocaleString()}</span>
                  </button>
                  <button type="button" onClick={() => onRestore(entry)} aria-label={`Restore ${entry.title}`} title="Restore this response" className="shrink-0 rounded-md border border-border2 bg-surface p-2 text-text2 hover:border-accent hover:text-accent"><RotateCcw size={13} /></button>
                  <button type="button" onClick={() => void removeEntry(entry._id)} aria-label={`Delete ${entry.title} from history`} title="Delete history item" className="shrink-0 rounded-md border border-border2 bg-surface p-2 text-text2 hover:border-red hover:text-red"><Trash2 size={13} /></button>
                </div>
                {expanded && <div className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border bg-surface2 p-3 text-[11px] leading-relaxed text-text2">{entry.response}</div>}
              </li>;
            })}
          </ul>}
    </section>
  );
}
