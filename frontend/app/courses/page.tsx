'use client';
import { useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { COURSES } from '@/lib/courses';
import ReviewDashboard from '@/components/review/ReviewDashboard';
import { isPro } from '@/lib/auth';
import CourseDiagram from '@/components/courses/CourseDiagram';

export default function CoursesPage() {
  const user = useStore(s => s.user);
  const hasProAccess = isPro(user);
  const [filter, setFilter] = useState<'All'|'Medical'|'Premed'>('All');
  const filtered = filter === 'All' ? COURSES : COURSES.filter(c => c.cat === filter);

  return (
    <DashboardLayout title="Courses" sub="Structured study paths across medicine, science, and mathematics">
      <section className="relative overflow-hidden rounded-xl border border-border bg-surface mb-7 min-h-[190px]">
        <div className="absolute inset-0"><CourseDiagram course={COURSES[0]} compact /></div>
        <div className="absolute inset-0" style={{background:'linear-gradient(90deg,rgba(18,38,33,.94) 0%,rgba(18,38,33,.76) 52%,rgba(18,38,33,.18) 100%)'}} />
        <div className="relative max-w-xl p-6 md:p-8 text-white">
          <p className="text-[11px] uppercase tracking-wide text-white/75 mb-2">Study library · {COURSES.length} courses</p>
          <h2 className="font-dm-serif text-[25px] md:text-[29px] mb-2">Build understanding, one system at a time.</h2>
          <p className="text-[13px] leading-relaxed text-white/85">Choose a course to explore illustrated topics, detailed lessons, and practice tools.</p>
        </div>
      </section>
      <div className="flex gap-2 mb-6">
        {(['All','Medical','Premed'] as const).map(f => (
          <Button key={f} size="sm" variant={filter===f?'primary':'ghost'} onClick={()=>setFilter(f)}>{f}</Button>
        ))}
        <span className="ml-auto self-center text-[13px] text-text3">{filtered.length} courses</span>
      </div>
      <ReviewDashboard />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(course => {
          const locked = !course.free && !hasProAccess;
          return (
            <div key={course.id} className={`bg-surface border border-border rounded-xl overflow-hidden transition-all hover:border-border2 hover:-translate-y-0.5 ${locked?'opacity-90':''}`}>
              <div className="relative h-44 overflow-hidden bg-surface2">
                <CourseDiagram course={course} compact />
                <div className="absolute inset-0" style={{background:'linear-gradient(0deg,rgba(17,33,29,.63),transparent 70%)'}} />
                <span className="absolute bottom-3 left-4 text-white text-[12px] font-medium">{course.title}</span>
                <span className="absolute top-3 left-3 w-1 h-10 rounded-full" style={{background:course.color}} />
              </div>
              <div className="p-4 md:p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-dm-serif text-[16px] text-text">{course.title}</h3>
                  <div className="flex gap-1.5 flex-wrap justify-end ml-2">
                    <Badge color={course.cat==='Medical'?'#4f8ef7':'#3ecf8e'}>{course.cat}</Badge>
                    {course.free && <Badge color="#3ecf8e">Free</Badge>}
                    {locked && <Badge color="#f5a623">Pro</Badge>}
                  </div>
                </div>
                <p className="text-[12.5px] text-text2 leading-relaxed mb-3">{course.desc}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {course.topics.slice(0,4).map(t => (
                    <span key={t} className="text-[11px] bg-surface2 border border-border rounded-md px-2 py-0.5 text-text3">{t}</span>
                  ))}
                  {course.topics.length > 4 && <span className="text-[11px] text-text3 self-center">+{course.topics.length-4} more</span>}
                </div>
                {locked
                  ? <Link href="/billing"><Button variant="primary" full size="sm">🔒 Unlock with Pro</Button></Link>
                  : <Link href={`/courses/${course.id}`}><Button variant="primary" full size="sm">Start Learning →</Button></Link>}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
