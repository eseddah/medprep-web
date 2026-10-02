'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Target } from 'lucide-react';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { COURSES as FRONTEND_COURSES } from '@/lib/courses';

type MasteryTopic = { name: string; level: string; accuracy: number; attemptCount: number; reviewCount: number; recentMisses: number };
type MasteryCourse = { id: string; title: string; topics: MasteryTopic[] };
type WeakSpot = { courseId: string; topic: string; accuracy: number; recentMisses: number };

const LEVEL_STYLES: Record<string, string> = {
  'Not started': 'bg-surface2 text-text3 border-border2',
  Attempted: 'bg-red/10 text-red border-red/30',
  Familiar: 'bg-amber/10 text-amber border-amber/30',
  Proficient: 'bg-accent/10 text-accent border-accent/30',
  Mastered: 'bg-green/10 text-green border-green/30',
};

export default function ReviewDashboard() {
  const [courses, setCourses] = useState<MasteryCourse[]>([]);
  const [weakSpots, setWeakSpots] = useState<WeakSpot[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get('/review/mastery').then(({ data }) => {
      setCourses(data.courses || []);
      setWeakSpots(data.weakSpots || []);
      setSelectedCourse(current => current || data.courses?.[0]?.id || '');
    }).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  const activeCourse = courses.find(course => course.id === selectedCourse) || courses[0];

  return (
    <div className="mt-8 space-y-5">
      <section aria-labelledby="weak-spots-heading">
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="weak-spots-heading" className="font-dm-serif text-[20px] text-text">Weak spots</h2>
              <p className="mt-1 text-[12px] text-text3">Topics that have been costing you marks recently.</p>
            </div>
            <Link href="/review" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent hover:underline">Review due items <ArrowRight size={14} /></Link>
          </div>
          {loading ? <p role="status" className="py-3 text-[13px] text-text3">Loading study data…</p>
            : error ? <p role="alert" className="py-3 text-[13px] text-red">Study data could not be loaded.</p>
              : weakSpots.length ? <ul className="divide-y divide-border">
                {weakSpots.map((spot, index) => (
                  <li key={`${spot.courseId}:${spot.topic}`} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red/10 text-[11px] font-semibold text-red">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="break-words text-[13px] font-medium text-text">{spot.topic}</p>
                        <p className="mt-0.5 text-[11px] text-text3">{spot.recentMisses} recent misses · {spot.accuracy}% accuracy</p>
                      </div>
                    </div>
                    <Link href={`/quiz?topic=${encodeURIComponent(spot.courseId ? `${FRONTEND_COURSES.find(course => course.id === spot.courseId)?.title || ''}: ${spot.topic}` : spot.topic)}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border2 px-3 py-2 text-[11px] font-semibold text-text2 hover:border-accent hover:text-accent">Practise now <ArrowRight size={13} /></Link>
                  </li>
                ))}
              </ul> : <p className="py-3 text-[13px] text-text3">Complete a quiz or review session to see your strongest opportunities for practice.</p>}
        </Card>
      </section>

      <section aria-labelledby="mastery-heading">
        <Card>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2 text-accent"><Target size={16} aria-hidden="true" /><span className="text-[11px] font-semibold uppercase">Learning progress</span></div>
              <h2 id="mastery-heading" className="font-dm-serif text-[20px] text-text">Topic mastery</h2>
            </div>
            <label className="sr-only" htmlFor="mastery-course">Choose course</label>
            <select id="mastery-course" value={selectedCourse} onChange={event => setSelectedCourse(event.target.value)} className="max-w-full rounded-lg border border-border2 bg-surface2 px-3 py-2 text-[12px] text-text">
              {courses.map(course => <option key={course.id || 'other'} value={course.id}>{course.title}</option>)}
            </select>
          </div>
          {loading ? <p role="status" className="py-3 text-[13px] text-text3">Loading mastery map…</p>
            : error ? <p role="alert" className="py-3 text-[13px] text-red">Mastery map could not be loaded.</p>
              : activeCourse ? <>
                <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-text3" aria-label="Mastery levels">
                  {['Not started', 'Attempted', 'Familiar', 'Proficient', 'Mastered'].map(level => <span key={level} className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${LEVEL_STYLES[level].split(' ')[0]}`} />{level}</span>)}
                </div>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {activeCourse.topics.map(topic => (
                    <li key={topic.name} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5">
                      <span className="min-w-0 break-words text-[12px] text-text">{topic.name}</span>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-medium ${LEVEL_STYLES[topic.level] || LEVEL_STYLES['Not started']}`}>{topic.level}</span>
                    </li>
                  ))}
                </ul>
              </> : null}
        </Card>
      </section>
    </div>
  );
}