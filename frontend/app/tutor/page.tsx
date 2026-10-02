'use client';
import { FormEvent, KeyboardEvent, useState } from 'react';
import { useStore } from '@/lib/store';
import { COURSES } from '@/lib/courses';
import api from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { BookOpen, LockKeyhole, Send } from 'lucide-react';
import Link from 'next/link';
import { formatLesson } from '@/lib/lessonContent';
import toast from 'react-hot-toast';
import StudyHistoryPanel from '@/components/study/StudyHistoryPanel';
import { parseStudyResponse, saveStudyHistory, type StudyHistoryEntry } from '@/lib/studyHistory';

type TutorMessage = { role: 'user' | 'assistant'; content: string };

export default function TutorPage() {
  const user = useStore(state => state.user);
  const isPro = ['pro', 'annual'].includes(user?.plan || '');
  const [courseId, setCourseId] = useState(COURSES[0].id);
  const [topic, setTopic] = useState(COURSES[0].topics[0]);
  const [messages, setMessages] = useState<TutorMessage[]>([
    { role: 'assistant', content: 'Tell me what you are studying or where you got stuck. I will work through the idea with you step by step.' },
  ]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const selectedCourse = COURSES.find(course => course.id === courseId) || COURSES[0];

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || loading || !isPro) return;
    const nextMessages = [...messages, { role: 'user' as const, content: question }];
    setMessages(nextMessages);
    setDraft('');
    setLoading(true);
    try {
      const { data } = await api.post('/ai/tutor', {
        context: `${selectedCourse.title}: ${topic}`,
        messages: nextMessages.slice(-16),
      });
      const assistantMessage = { role: 'assistant' as const, content: data.message };
      const turn = [...nextMessages, assistantMessage];
      setMessages(turn);
      await saveStudyHistory({ section: 'tutor', title: question.slice(0, 180), prompt: question, response: JSON.stringify(turn.slice(-16)) });
    } catch (error: any) {
      setMessages(previous => previous.slice(0, -1));
      setDraft(question);
      toast.error(error.response?.data?.error || 'Tutor is unavailable right now');
    } finally {
      setLoading(false);
    }
  };

  const restoreConversation = (entry: StudyHistoryEntry) => {
    const saved = parseStudyResponse<TutorMessage[]>(entry);
    if (!saved?.length || saved.some(message => !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string')) {
      toast.error('This tutor history item could not be restored');
      return;
    }
    setMessages(saved);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <DashboardLayout title="AI Tutor" sub="A guided study partner for your course work">
      {!isPro ? (
        <Card className="max-w-2xl py-12 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent"><LockKeyhole size={21} /></span>
          <h2 className="font-dm-serif text-[24px] text-text mb-2">AI Tutor is part of Pro</h2>
          <p className="mx-auto max-w-md text-[13px] text-text2 mb-5">Work through difficult concepts with step-by-step explanations, worked examples, and follow-up questions.</p>
          <Link href="/billing" className="inline-flex rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-white">View Pro plans</Link>
        </Card>
      ) : (
        <div className="grid min-h-[min(720px,calc(100dvh-190px))] grid-cols-1 overflow-hidden rounded-xl border border-border bg-surface lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b border-border bg-surface2 p-4 lg:border-b-0 lg:border-r">
            <p className="text-[11px] uppercase tracking-wide text-text3 mb-3">Learning context</p>
            <label htmlFor="tutor-course" className="mb-1.5 block text-[12px] font-medium text-text2">Course</label>
            <select id="tutor-course" value={courseId} onChange={event => {
              const nextCourse = COURSES.find(course => course.id === event.target.value) || COURSES[0];
              setCourseId(nextCourse.id);
              setTopic(nextCourse.topics[0]);
            }} className="mb-4 w-full rounded-lg border border-border2 bg-surface px-3 py-2.5 text-[12px] text-text">
              {COURSES.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
            <label htmlFor="tutor-topic" className="mb-1.5 block text-[12px] font-medium text-text2">Topic</label>
            <select id="tutor-topic" value={topic} onChange={event => setTopic(event.target.value)} className="w-full rounded-lg border border-border2 bg-surface px-3 py-2.5 text-[12px] text-text">
              {selectedCourse.topics.map(item => <option key={item}>{item}</option>)}
            </select>
            <div className="mt-5 border-t border-border pt-4 flex gap-2 text-[11px] leading-relaxed text-text3">
              <BookOpen size={15} className="mt-0.5 shrink-0 text-accent" />
              Responses are for learning support. Check important clinical decisions against your course and current guidelines.
            </div>
          </aside>

          <section className="flex min-h-[520px] min-w-0 flex-col" aria-label="AI tutor conversation">
            <div className="flex-1 space-y-4 overflow-y-auto bg-bg px-4 py-5 md:px-7">
              {messages.map((message, index) => (
                <article key={`${index}-${message.role}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] break-words rounded-xl px-4 py-3 text-[13px] leading-relaxed ${message.role === 'user' ? 'whitespace-pre-wrap rounded-br-sm bg-accent text-white' : 'rounded-bl-sm border border-border2 bg-surface text-text'}`}>
                    {message.role === 'assistant' ? formatLesson(message.content) : message.content}
                  </div>
                </article>
              ))}
              {loading && <p className="text-[12px] text-text3">Tutor is thinking…</p>}
            </div>
            <form onSubmit={send} className="flex items-end gap-2 border-t border-border bg-surface p-3 md:p-4">
              <label className="sr-only" htmlFor="tutor-prompt">Ask the tutor</label>
              <textarea id="tutor-prompt" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={handleKeyDown} maxLength={4000} rows={2} placeholder={`Ask about ${topic}…`} className="min-h-11 max-h-32 flex-1 resize-y rounded-lg border border-border2 bg-surface2 px-3.5 py-3 text-[13px] text-text placeholder:text-text3" />
              <Button type="submit" variant="primary" disabled={!draft.trim() || loading} className="h-11 w-11 justify-center !p-0" aria-label="Send question"><Send size={17} /></Button>
            </form>
          </section>
        </div>
      )}
      <StudyHistoryPanel section="tutor" onRestore={restoreConversation} />
    </DashboardLayout>
  );
}
