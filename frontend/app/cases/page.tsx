'use client';
import { useState } from 'react';
import { BookOpenCheck, ChevronRight, RotateCcw, Sparkles } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { COURSES, Course } from '@/lib/courses';
import { formatLesson } from '@/lib/lessonContent';
import api from '@/lib/api';
import { recordStreakActivity } from '@/lib/streak';
import toast from 'react-hot-toast';

type CaseStep = { prompt: string; options: string[]; correctIndex: number; explanation: string };
type CaseStudy = { title: string; caseStem: string; learningObjectives: string[]; illustration: string; steps: CaseStep[]; debrief: string };

export default function CasesPage() {
  const [track, setTrack] = useState<'Medical' | 'Premed'>('Medical');
  const courses = COURSES.filter(course => course.cat === track);
  const [courseId, setCourseId] = useState(courses[0]?.id || 'anatomy');
  const course = COURSES.find(item => item.id === courseId && item.cat === track) || courses[0] || COURSES[0];
  const [topic, setTopic] = useState(course.topics[0]);
  const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);

  const changeTrack = (nextTrack: 'Medical' | 'Premed') => {
    const nextCourse = COURSES.find(item => item.cat === nextTrack) || COURSES[0];
    setTrack(nextTrack);
    setCourseId(nextCourse.id);
    setTopic(nextCourse.topics[0]);
    setCaseStudy(null);
  };

  const changeCourse = (nextId: string) => {
    const nextCourse = COURSES.find(item => item.id === nextId) || course;
    setCourseId(nextId);
    setTopic(nextCourse.topics[0]);
  };

  const generate = async () => {
    setLoading(true);
    setCaseStudy(null);
    try {
      const { data } = await api.post('/ai/case', { track: track.toLowerCase(), courseId: course.id, topic });
      setCaseStudy(data.caseStudy);
      setStepIndex(0);
      setChoice(null);
      setRevealed(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Could not generate this case');
    } finally {
      setLoading(false);
    }
  };

  const continueCase = () => {
    if (caseStudy && stepIndex === caseStudy.steps.length - 1) {
      void recordStreakActivity().catch(() => toast.error('Case complete, but your streak could not be updated.'));
    }
    setStepIndex(index => index + 1);
    setChoice(null);
    setRevealed(false);
  };

  const checkAnswer = () => {
    if (!step || choice === null || !caseStudy) return;
    setRevealed(true);
    void api.post('/review/attempt', {
      courseId: course.id,
      topic,
      prompt: `${caseStudy.title}: ${step.prompt}`,
      options: step.options,
      correctIndex: step.correctIndex,
      explanation: step.explanation,
      isCorrect: choice === step.correctIndex,
    }).catch(() => toast.error('Your answer was recorded, but review data could not sync.'));
  };

  const step = caseStudy?.steps[stepIndex];

  return (
    <DashboardLayout title="Clinical Case Rounds" sub="Practice reasoning through progressive medical and premed scenarios">
      {!caseStudy ? (
        <div className="max-w-3xl">
          <Card className="mb-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-text3 mb-1">Choose a study track</p>
                <h2 className="font-dm-serif text-[21px] text-text">Build a case round</h2>
              </div>
              <div className="inline-flex rounded-lg border border-border2 bg-surface2 p-1" role="group" aria-label="Study track">
                {(['Medical', 'Premed'] as const).map(option => <button key={option} type="button" aria-pressed={track === option} onClick={() => changeTrack(option)} className={`rounded-md px-3 py-2 text-[12px] font-medium ${track === option ? 'bg-accent text-white' : 'text-text2'}`}>{option}</button>)}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="case-course" className="mb-1.5 block text-[12px] font-medium text-text2">Course</label>
                <select id="case-course" value={course.id} onChange={event => changeCourse(event.target.value)} className="w-full rounded-lg border border-border2 bg-surface2 px-3 py-2.5 text-[13px] text-text">
                  {courses.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="case-topic" className="mb-1.5 block text-[12px] font-medium text-text2">Topic</label>
                <select id="case-topic" value={topic} onChange={event => setTopic(event.target.value)} className="w-full rounded-lg border border-border2 bg-surface2 px-3 py-2.5 text-[13px] text-text">
                  {course.topics.map(item => <option key={item}>{item}</option>)}
                </select>
              </div>
            </div>
          </Card>
          <Button variant="primary" onClick={generate} disabled={loading}>
            {loading ? <><Spinner />Building case…</> : <><Sparkles size={16} /> Generate case round</>}
          </Button>
          <p className="mt-3 max-w-xl text-[11px] leading-relaxed text-text3">Cases are synthetic learning exercises, not advice for real patient care. Each round includes three decisions and concept explanations.</p>
        </div>
      ) : (
        <div className="max-w-4xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-text3">{track} · {course.title} · {topic}</p>
              <h2 className="font-dm-serif text-[24px] text-text">{caseStudy.title}</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={generate} disabled={loading}><RotateCcw size={15} /> New case</Button>
          </div>
          <Card>
            <div className="text-[14px] leading-relaxed text-text2">{formatLesson(caseStudy.caseStem)}</div>
            {caseStudy.learningObjectives?.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{caseStudy.learningObjectives.map(objective => <span key={objective} className="rounded-md border border-border bg-surface2 px-2.5 py-1 text-[11px] text-text2">{objective}</span>)}</div>}
          </Card>
          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-accent"><BookOpenCheck size={16} /> Case reasoning</div>
              <span className="text-[11px] text-text3">{step ? `Decision ${stepIndex + 1} of ${caseStudy.steps.length}` : 'Debrief'}</span>
            </div>
            {!step ? (
              <div>
                <h3 className="font-semibold text-text mb-2">Case debrief</h3>
                <div className="space-y-2 text-[13px] leading-relaxed text-text2">{formatLesson(caseStudy.debrief)}</div>
                <Button variant="primary" size="sm" className="mt-5" onClick={generate}>Try another case</Button>
              </div>
            ) : (
              <>
                <div className="mb-4 text-[14px] leading-relaxed text-text">{formatLesson(step.prompt)}</div>
                <div className="space-y-2">
                  {step.options.map((option, index) => {
                    const correct = revealed && index === step.correctIndex;
                    const incorrect = revealed && choice === index && index !== step.correctIndex;
                    return <button key={option} type="button" disabled={revealed} onClick={() => setChoice(index)} className={`w-full rounded-lg border px-3.5 py-3 text-left text-[13px] transition-colors ${correct ? 'border-green bg-green/10 text-green' : incorrect ? 'border-red bg-red/10 text-red' : choice === index ? 'border-accent bg-accent/10 text-text' : 'border-border2 bg-surface2 text-text2 hover:border-accent'}`}>
                      <span className="mr-2 font-semibold">{String.fromCharCode(65 + index)}.</span>{option}
                    </button>;
                  })}
                </div>
                {revealed && <div className="mt-4 rounded-lg border-l-[3px] border-accent bg-surface2 px-4 py-3 text-[13px] leading-relaxed text-text2">{formatLesson(step.explanation)}</div>}
                <div className="mt-4 flex justify-end">
                  {!revealed
                    ? <Button variant="primary" size="sm" onClick={checkAnswer} disabled={choice === null}>Check answer</Button>
                    : <Button variant="primary" size="sm" onClick={continueCase}>Continue <ChevronRight size={15} /></Button>}
                </div>
              </>
            )}
          </Card>
          {caseStudy.illustration && <pre className="overflow-x-auto rounded-lg border border-border bg-surface2 p-4 text-[12px] leading-relaxed text-text2 whitespace-pre-wrap">{caseStudy.illustration}</pre>}
        </div>
      )}
    </DashboardLayout>
  );
}
